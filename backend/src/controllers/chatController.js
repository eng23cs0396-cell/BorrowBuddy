const ChatMessage = require('../models/ChatMessage');

exports.getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = Math.min(Number(req.query.limit || 50), 100);

    const messages = await ChatMessage.find({ roomId })
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.status(200).json({
      count: messages.length,
      messages: messages.reverse(),
    });
  } catch (error) {
    console.error('Get room messages error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

