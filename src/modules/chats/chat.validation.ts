import { z } from 'zod';

const uuid = z.uuid();
export const createChatSchema = z.object({ userAId: uuid, userBId: uuid });
export const sendMessageSchema = z.object({ senderId: uuid, text: z.string().trim().min(1).max(10000) });
export const readMessageSchema = z.object({ userId: uuid });
export const lastSeenSchema = z.object({ userId: uuid, messageId: z.string().min(1) });
export const editMessageSchema = z.object({ userId: uuid, text: z.string().trim().min(1).max(10000) });
export const deleteMessageSchema = z.object({ userId: uuid });
export const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional()
});
