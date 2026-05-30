const verifiedMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      message: 'Only verified users can perform this action',
    });
  }

  if (req.user.status === 'banned') {
    return res.status(403).json({ message: 'Your account is banned' });
  }

  next();
};

module.exports = verifiedMiddleware;

