import { sendMessageSchema, listMessagesQuerySchema } from '../../src/modules/chats/chat.validation';

describe('chat request validation', () => {
  it('rejects empty message text', () => {
    expect(() => sendMessageSchema.parse({
      senderId: '550e8400-e29b-41d4-a716-446655440000',
      text: '   '
    })).toThrow();
  });

  it('defaults message page size to 50', () => {
    expect(listMessagesQuerySchema.parse({})).toEqual({ limit: 50 });
  });

  it('rejects a page size above 100', () => {
    expect(() => listMessagesQuerySchema.parse({ limit: '101' })).toThrow();
  });
});
