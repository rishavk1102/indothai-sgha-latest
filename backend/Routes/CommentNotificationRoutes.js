const express = require('express');
const User = require('../Models/User');
const Client_Registration = require('../Models/Client_Registration');
const CommentNotification = require('../NewModels/CommentNotification');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

async function resolveActor(req) {
  const requested = req.query.user_type || req.body?.user_type;
  if (!req.user?.id || (requested !== 'Client' && requested !== 'Employee')) {
    return null;
  }

  if (requested === 'Client') {
    const client = await Client_Registration.findByPk(req.user.id);
    if (!client) return null;
    return { type: 'Client', id: client.client_registration_id };
  }

  const user = await User.findByPk(req.user.id);
  if (!user) return null;
  return { type: 'Employee', id: user.user_id };
}

router.get('/comment-notifications', authenticateToken, async (req, res) => {
  try {
    const actor = await resolveActor(req);
    if (!actor) {
      return res.status(403).json({ message: 'Not allowed to read these notifications' });
    }

    const where = {
      recipient_type: actor.type,
      recipient_id: actor.id,
    };

    const [rows, unreadCount] = await Promise.all([
      CommentNotification.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: 25,
      }),
      CommentNotification.count({
        where: { ...where, read_at: null },
      }),
    ]);

    return res.status(200).json({
      message: 'Notifications retrieved successfully',
      unread_count: unreadCount,
      data: rows,
    });
  } catch (error) {
    console.error('Failed to retrieve comment notifications:', error);
    return res.status(500).json({
      message: 'Failed to retrieve comment notifications',
      error: error.message,
    });
  }
});

router.post('/comment-notifications/read', authenticateToken, async (req, res) => {
  try {
    const actor = await resolveActor(req);
    if (!actor) {
      return res.status(403).json({ message: 'Not allowed to update these notifications' });
    }

    const where = {
      recipient_type: actor.type,
      recipient_id: actor.id,
      read_at: null,
    };

    if (req.body?.notification_id) {
      where.notification_id = req.body.notification_id;
    } else if (req.body?.submission_id) {
      where.submission_id = req.body.submission_id;
    } else if (!req.body?.all) {
      return res.status(400).json({
        message: 'notification_id, submission_id, or all is required',
      });
    }

    const [updated] = await CommentNotification.update(
      { read_at: new Date() },
      { where }
    );

    return res.status(200).json({
      message: 'Notifications marked as read',
      updated,
    });
  } catch (error) {
    console.error('Failed to mark comment notifications read:', error);
    return res.status(500).json({
      message: 'Failed to mark comment notifications read',
      error: error.message,
    });
  }
});

module.exports = router;
