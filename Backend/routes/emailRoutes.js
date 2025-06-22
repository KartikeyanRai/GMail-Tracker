
const express = require('express');
const Email = require('../models/Email');
const router = express.Router();

// Middleware to validate user ID from Authorization header or body/query
const validateUserId = (req, res, next) => {
  const auth = req.headers.authorization || req.body.userId || req.query.userId;
  if (!auth) return res.status(401).json({ error: 'User ID is required' });

  const userId = auth.replace('Bearer ', '').trim();
  req.userId = userId;
  next();
};

// Track a new email
router.post('/track', validateUserId, async (req, res) => {
  try {
    const { messageId, threadId, to, subject, sentAt, gmailMessageId } = req.body;

    const existing = await Email.findOne({ userId: req.userId, messageId });
    if (existing) {
      return res.status(200).json({ message: 'Already tracked', email: existing });
    }

    const newEmail = new Email({
      userId: req.body.userId || "unknown",
      messageId,
      threadId,
      to: Array.isArray(to) ? to : [to],
      subject,
      sentAt: sentAt || new Date(),
      gmailMessageId,
      trackingPixelViews: []
    });

    await newEmail.save();
    res.status(201).json({ message: 'Email tracked', email: newEmail });

  } catch (error) {
    console.error('Track email error:', error);
    res.status(500).json({ error: 'Failed to track email' });
  }
});

// Update read status
router.put('/read/:messageId', validateUserId, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { readAt, recipientEmail, userAgent, ipAddress } = req.body;

    const email = await Email.findOne({ userId: req.userId, messageId });
    if (!email) return res.status(404).json({ error: 'Email not found' });

    email.markAsRead(readAt || new Date());
    email.trackingPixelViews.push({
      timestamp: new Date(),
      recipientEmail: recipientEmail || 'unknown',
      userAgent: userAgent || req.get('User-Agent') || 'unknown',
      ipAddress: ipAddress || req.ip || 'unknown'
    });

    await email.save();
    res.json({ message: 'Marked as read', email });

  } catch (error) {
    console.error('Read update error:', error);
    res.status(500).json({ error: 'Failed to update read status' });
  }
});

// Get tracked emails
router.get('/tracked', validateUserId, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const query = { userId: req.userId };

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { subject: new RegExp(search, 'i') },
        { to: { $regex: search, $options: 'i' } }
      ];
    }

    const emails = await Email.find(query)
      .sort({ sentAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Email.countDocuments(query);
    res.json({
      emails,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Tracked fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Get details by messageId
router.get('/details/:messageId', validateUserId, async (req, res) => {
  try {
    const email = await Email.findOne({
      userId: req.userId,
      messageId: req.params.messageId
    });

    if (!email) return res.status(404).json({ error: 'Not found' });
    res.json({ email });

  } catch (error) {
    console.error('Fetch detail error:', error);
    res.status(500).json({ error: 'Failed to fetch details' });
  }
});

// User stats
router.get('/stats', validateUserId, async (req, res) => {
  try {
    const stats = await Email.getUserStats(req.userId);
    const recentActivity = await Email.find({
      userId: req.userId,
      $or: [
        { sentAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        { lastReadAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
      ]
    })
      .sort({ sentAt: -1 })
      .limit(10)
      .select('subject to status sentAt lastReadAt readCount')
      .lean();

    res.json({ stats, recentActivity });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Delete single email
router.delete('/:messageId', validateUserId, async (req, res) => {
  try {
    const result = await Email.deleteOne({
      userId: req.userId,
      messageId: req.params.messageId
    });

    if (!result.deletedCount) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ message: 'Deleted successfully' });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Bulk delete
router.delete('/', validateUserId, async (req, res) => {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds)) {
      return res.status(400).json({ error: 'messageIds must be an array' });
    }

    const result = await Email.deleteMany({
      userId: req.userId,
      messageId: { $in: messageIds }
    });

    res.json({ message: 'Bulk deleted', deleted: result.deletedCount });

  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Bulk delete failed' });
  }
});

// Tracking pixel
router.get('/pixel/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.query;

    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    if (!userId) {
      res.set('Content-Type', 'image/png');
      return res.send(pixel);
    }

    const email = await Email.findOne({ userId, messageId });
    if (email) {
      email.readCount += 1;
      email.lastReadAt = new Date();
      email.status = 'read';
      email.trackingPixelViews.push({
        timestamp: new Date(),
        recipientEmail: 'pixel',
        userAgent: req.get('User-Agent') || 'unknown',
        ipAddress: req.ip || 'unknown'
      });
      await email.save();
    }

    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
      'Expires': '0'
    }).send(pixel);

  } catch (err) {
    console.error('Pixel error:', err);
    const fallbackPixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    res.set('Content-Type', 'image/png').send(fallbackPixel);
  }
});

module.exports = router;


// ✅ GET tracking statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Email.getTrackingStats();
    const recentEmails = await Email.find({})
      .sort({ sentAt: -1 })
      .limit(10);
    
    res.json({
      ...stats,
      readRate: stats.total > 0 ? ((stats.seen / stats.total) * 100).toFixed(1) : 0,
      recentEmails: recentEmails.map(e => ({
        subject: e.subject,
        status: e.status,
        sentAt: e.sentAt,
        openedAt: e.openedAt
      }))
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;
