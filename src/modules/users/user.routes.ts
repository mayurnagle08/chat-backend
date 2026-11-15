import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../utils/async-handler';
import { ChatController } from '../chats/chat.controller';

const router = Router();
const controller = new ChatController();

router.get('/:userId/chats', requireAuth, asyncHandler((req, res) => controller.listUserChats(req, res)));

export default router;
