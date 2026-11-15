import { prisma } from '../../config/prisma';

export class ChatRepository {
  async isMember(chatId: string, userId: string): Promise<boolean> {
    const member = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
      select: { id: true }
    });
    return Boolean(member);
  }

  async getChat(chatId: string) {
    return prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: { select: { userId: true, joinedAt: true } } }
    });
  }
}
