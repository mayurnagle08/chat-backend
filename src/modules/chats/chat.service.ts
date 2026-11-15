import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { firestore } from '../../config/firebase';
import { prisma } from '../../config/prisma';
import { HttpError } from '../../utils/errors';
import type { MessageRecord } from '../../types';
import { ChatRepository } from './chat.repository';

const repository = new ChatRepository();

function messageCollection(chatId: string) {
  return firestore.collection('chats').doc(chatId).collection('messages');
}
function memberDocument(chatId: string, userId: string) {
  return firestore.collection('chats').doc(chatId).collection('members').doc(userId);
}

export class ChatService {
  async createOrGetChat(userAId: string, userBId: string) {
    if (userAId === userBId) throw new HttpError(400, 'A direct chat requires two different users');

    const users = await prisma.user.findMany({
      where: { id: { in: [userAId, userBId] } },
      select: { id: true }
    });
    if (users.length !== 2) throw new HttpError(404, 'One or both users were not found');

    const [first, second] = [userAId, userBId].sort();
    const existing = await prisma.chat.findUnique({
      where: { userAId_userBId: { userAId: first, userBId: second } },
      include: { members: { select: { userId: true } } }
    });
    if (existing) return { chatId: existing.id, created: false };

    try {
      const chat = await prisma.chat.create({
        data: {
          userAId: first,
          userBId: second,
          members: { create: [{ userId: first }, { userId: second }] }
        },
        select: { id: true }
      });
      return { chatId: chat.id, created: true };
    } catch (error) {
      // Handles concurrent requests racing to create the same canonical pair.
      const raced = await prisma.chat.findUnique({
        where: { userAId_userBId: { userAId: first, userBId: second } },
        select: { id: true }
      });
      if (raced) return { chatId: raced.id, created: false };
      throw error;
    }
  }

  async sendMessage(chatId: string, senderId: string, text: string): Promise<MessageRecord> {
    await this.assertMember(chatId, senderId);
    const ref = messageCollection(chatId).doc();
    const now = Timestamp.now();
    const message = {
      chatId, senderId, text, sentAt: now, editedAt: null, deletedAt: null, readBy: [senderId]
    };
    await ref.create(message);
    await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
    return this.serializeMessage(ref.id, message);
  }

  async getMessages(chatId: string, userId: string, limit: number, cursor?: string) {
    await this.assertMember(chatId, userId);
    let query = messageCollection(chatId).orderBy('sentAt', 'desc').orderBy('__name__', 'desc');
    if (cursor) {
      const cursorSnapshot = await messageCollection(chatId).doc(cursor).get();
      if (!cursorSnapshot.exists) throw new HttpError(400, 'Invalid message cursor');
      query = query.startAfter(cursorSnapshot);
    }
    const snapshot = await query.limit(limit).get();
    const docs = snapshot.docs;
    const messages = docs.map((doc) => this.serializeMessage(doc.id, doc.data())).reverse();
    return {
      messages,
      nextCursor: docs.length === limit ? docs[docs.length - 1]?.id ?? null : null
    };
  }

  async markMessageRead(chatId: string, messageId: string, userId: string) {
    await this.assertMember(chatId, userId);
    const ref = messageCollection(chatId).doc(messageId);
    await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new HttpError(404, 'Message not found');
      transaction.update(ref, { readBy: FieldValue.arrayUnion(userId) });
    });
    return { chatId, messageId, userId, read: true };
  }

  async updateLastSeen(chatId: string, userId: string, messageId: string) {
    await this.assertMember(chatId, userId);
    const message = await messageCollection(chatId).doc(messageId).get();
    if (!message.exists) throw new HttpError(404, 'Message not found');
    await memberDocument(chatId, userId).set({
      lastSeenMessageId: messageId,
      lastSeenAt: Timestamp.now()
    }, { merge: true });
    return { chatId, userId, lastSeenMessageId: messageId };
  }

  async editMessage(chatId: string, messageId: string, userId: string, text: string) {
    await this.assertMember(chatId, userId);
    const ref = messageCollection(chatId).doc(messageId);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new HttpError(404, 'Message not found');
    const data = snapshot.data()!;
    if (data.senderId !== userId) throw new HttpError(403, 'Only the sender can edit this message');
    if (data.deletedAt) throw new HttpError(409, 'Deleted messages cannot be edited');
    const editedAt = Timestamp.now();
    await ref.update({ text, editedAt });
    return this.serializeMessage(messageId, { ...data, text, editedAt });
  }

  async deleteMessage(chatId: string, messageId: string, userId: string) {
    await this.assertMember(chatId, userId);
    const ref = messageCollection(chatId).doc(messageId);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new HttpError(404, 'Message not found');
    const data = snapshot.data()!;
    if (data.senderId !== userId) throw new HttpError(403, 'Only the sender can delete this message');
    if (!data.deletedAt) {
      const deletedAt = Timestamp.now();
      await ref.update({ text: '', deletedAt });
    }
    return { chatId, messageId, deleted: true };
  }

  async listUserChats(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new HttpError(404, 'User not found');
    const chats = await prisma.chat.findMany({
      where: { members: { some: { userId } } },
      orderBy: { updatedAt: 'desc' },
      include: {
        members: {
          select: { userId: true, user: { select: { id: true, name: true, email: true } } }
        }
      }
    });
    return chats.map((chat) => ({
      chatId: chat.id,
      memberIds: chat.members.map((member) => member.userId),
      members: chat.members.map((member) => member.user),
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt
    }));
  }

  private async assertMember(chatId: string, userId: string): Promise<void> {
    const chat = await repository.getChat(chatId);
    if (!chat) throw new HttpError(404, 'Chat not found');
    if (!chat.members.some((member) => member.userId === userId)) {
      throw new HttpError(403, 'You are not a member of this chat');
    }
  }

  private serializeMessage(id: string, data: FirebaseMessage): MessageRecord {
    return {
      id,
      chatId: data.chatId,
      senderId: data.senderId,
      text: data.deletedAt ? '' : data.text,
      sentAt: data.sentAt.toDate().toISOString(),
      editedAt: data.editedAt ? data.editedAt.toDate().toISOString() : null,
      deletedAt: data.deletedAt ? data.deletedAt.toDate().toISOString() : null,
      readBy: data.readBy ?? []
    };
  }
}

interface FirebaseMessage {
  chatId: string;
  senderId: string;
  text: string;
  sentAt: Timestamp;
  editedAt: Timestamp | null;
  deletedAt: Timestamp | null;
  readBy: string[];
}
