import express from 'express';
import * as ChatController from '../controllers/chat.controller.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

router.post('/init', isAuthenticated, ChatController.initChat);
router.get('/my-chats', isAuthenticated, ChatController.getMyChats);
router.get('/:chatId/messages', isAuthenticated, ChatController.getChatMessages);
router.post('/message', isAuthenticated, ChatController.sendMessage);
router.delete('/:chatId', isAuthenticated, ChatController.deleteChat);

export default router;
