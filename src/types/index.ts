export interface AuthUser {
  userId: string;
  email: string;
}

export interface MessageRecord {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  sentAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  readBy: string[];
}
