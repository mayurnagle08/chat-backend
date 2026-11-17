
import type { Request, Response } from 'express';
import { HttpError } from '../../utils/errors';
import { ChatService } from './chat.service';
import {
  createChatSchema,
  sendMessageSchema,
  readMessageSchema,
  lastSeenSchema,
  listMessagesQuerySchema,
  editMessageSchema,
  deleteMessageSchema
} from './chat.validation';

const service = new ChatService();

function authenticatedUserId(req: Request): string {
  if (!req.authUser) {
    throw new HttpError(401, 'Authentication required');
  }

  return req.authUser.userId;
}

// Safely extracts Express route parameters.
function getRouteParam(
  value: string | string[] | undefined,
  name: string
): string {
  const param = Array.isArray(value) ? value[0] : value;

  if (!param) {
    throw new HttpError(400, `Missing route parameter: ${name}`);
  }

  return param;
}

export class ChatController {
  async create(req: Request, res: Response) {
    const input = createChatSchema.parse(req.body);
    const currentUserId = authenticatedUserId(req);

    if (![input.userAId, input.userBId].includes(currentUserId)) {
      throw new HttpError(403, 'You can only create a chat that includes yourself');
    }

    res.status(200).json(
      await service.createOrGetChat(input.userAId, input.userBId)
    );
  }

  async send(req: Request, res: Response) {
    const input = sendMessageSchema.parse(req.body);
    const currentUserId = authenticatedUserId(req);

    if (input.senderId !== currentUserId) {
      throw new HttpError(403, 'senderId must match authenticated user');
    }

    res.status(201).json(
      await service.sendMessage(
        getRouteParam(req.params.chatId, 'chatId'),
        input.senderId,
        input.text
      )
    );
  }

  async messages(req: Request, res: Response) {
    const userId = authenticatedUserId(req);
    const query = listMessagesQuerySchema.parse(req.query);

    res.status(200).json(
      await service.getMessages(
        getRouteParam(req.params.chatId, 'chatId'),
        userId,
        query.limit,
        query.cursor
      )
    );
  }

  async read(req: Request, res: Response) {
    const input = readMessageSchema.parse(req.body);
    const currentUserId = authenticatedUserId(req);

    if (input.userId !== currentUserId) {
      throw new HttpError(403, 'userId must match authenticated user');
    }

    res.status(200).json(
      await service.markMessageRead(
        getRouteParam(req.params.chatId, 'chatId'),
        getRouteParam(req.params.messageId, 'messageId'),
        input.userId
      )
    );
  }

  async lastSeen(req: Request, res: Response) {
    const input = lastSeenSchema.parse(req.body);
    const currentUserId = authenticatedUserId(req);

    if (input.userId !== currentUserId) {
      throw new HttpError(403, 'userId must match authenticated user');
    }

    res.status(200).json(
      await service.updateLastSeen(
        getRouteParam(req.params.chatId, 'chatId'),
        input.userId,
        input.messageId
      )
    );
  }

  async listUserChats(req: Request, res: Response) {
    const currentUserId = authenticatedUserId(req);
    const requestedUserId = getRouteParam(req.params.userId, 'userId');

    if (requestedUserId !== currentUserId) {
      throw new HttpError(403, 'You can only list your own chats');
    }

    res.status(200).json({
      chats: await service.listUserChats(currentUserId)
    });
  }

  async edit(req: Request, res: Response) {
    const input = editMessageSchema.parse(req.body);
    const currentUserId = authenticatedUserId(req);

    if (input.userId !== currentUserId) {
      throw new HttpError(403, 'userId must match authenticated user');
    }

    res.status(200).json(
      await service.editMessage(
        getRouteParam(req.params.chatId, 'chatId'),
        getRouteParam(req.params.messageId, 'messageId'),
        input.userId,
        input.text
      )
    );
  }

  async delete(req: Request, res: Response) {
    const input = deleteMessageSchema.parse(req.body);
    const currentUserId = authenticatedUserId(req);

    if (input.userId !== currentUserId) {
      throw new HttpError(403, 'userId must match authenticated user');
    }

    res.status(200).json(
      await service.deleteMessage(
        getRouteParam(req.params.chatId, 'chatId'),
        getRouteParam(req.params.messageId, 'messageId'),
        input.userId
      )
    );
  }
}
