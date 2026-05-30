const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { sendEmail } = require('./emailService');

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const processDueReminders = async () => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + MS_IN_DAY);

  const dueSoonTransactions = await Transaction.find({
    transactionType: 'library_borrow',
    status: { $in: ['approved', 'active', 'overdue'] },
    dueDate: { $gte: now, $lte: tomorrow },
  }).populate('requester', 'name email');

  let sentCount = 0;
  for (const txn of dueSoonTransactions) {
    const user = txn.requester;
    if (!user || !user.email) continue;

    await sendEmail({
      to: user.email,
      subject: 'Library Book Due Reminder',
      html: `
        <p>Hi ${user.name || 'Student'},</p>
        <p>Your borrowed library book is due on ${new Date(txn.dueDate).toDateString()}.</p>
        <p>Please return it on time to avoid overdue fines.</p>
      `,
    });
    sentCount += 1;
  }

  return { sentCount };
};

module.exports = {
  processDueReminders,
};

