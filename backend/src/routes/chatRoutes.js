const express = require('express');
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/rooms/:roomId/messages', authMiddleware, chatController.getRoomMessages);

module.exports = router;

