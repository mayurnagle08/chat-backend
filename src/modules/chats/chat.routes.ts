import { Router } from 'express';
import { ChatController } from './chat.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();
const controller = new ChatController();

router.use(requireAuth);
router.post('/create', asyncHandler((req, res) => controller.create(req, res)));
router.post('/:chatId/message/send', asyncHandler((req, res) => controller.send(req, res)));
router.get('/:chatId/messages', asyncHandler((req, res) => controller.messages(req, res)));
router.post('/:chatId/message/:messageId/read', asyncHandler((req, res) => controller.read(req, res)));
router.post('/:chatId/lastseen', asyncHandler((req, res) => controller.lastSeen(req, res)));
router.patch('/:chatId/message/:messageId', asyncHandler((req, res) => controller.edit(req, res)));
router.delete('/:chatId/message/:messageId', asyncHandler((req, res) => controller.delete(req, res)));

export default router;
