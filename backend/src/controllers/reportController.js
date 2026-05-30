const { validationResult } = require('express-validator');
const Report = require('../models/Report');
const ListedBook = require('../models/ListedBook');

exports.createReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { targetType, targetId, reason, description } = req.body;

    const payload = {
      reporter: req.user._id,
      targetType,
      reason,
      description: description || '',
      status: 'pending',
    };

    if (targetType === 'user') payload.targetUser = targetId;
    if (targetType === 'listing') payload.targetListing = targetId;
    if (targetType === 'review') payload.targetReview = targetId;
    if (targetType === 'transaction') payload.targetTransaction = targetId;

    const report = await Report.create(payload);

    if (targetType === 'listing' && targetId) {
      await ListedBook.findByIdAndUpdate(targetId, {
        $set: { status: 'flagged', isApproved: false },
      });
    }

    return res.status(201).json({
      message: 'Report submitted successfully',
      report,
    });
  } catch (error) {
    console.error('Create report error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ reporter: req.user._id })
      .sort({ createdAt: -1 })
      .populate('targetUser', 'name email')
      .populate('targetListing', 'title listingType status')
      .populate('reviewedBy', 'name email');

    return res.status(200).json({
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error('Get my reports error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

