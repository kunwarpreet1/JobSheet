const notificationService = require('../services/notificationService');

/**
 * Get notifications for a user / center
 * GET /api/notifications
 */
exports.getNotifications = async (req, res) => {
  try {
    const { userId, type, isRead, limit, userRole } = req.query;
    const notifications = await notificationService.getNotifications({
      userId,
      type,
      isRead,
      limit,
      userRole,
    });

    res.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    console.error('[getNotifications Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications',
      error: err.message,
    });
  }
};

/**
 * Mark single notification as read
 * PATCH /api/notifications/:id/read
 */
exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await notificationService.markNotificationRead(id);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.json({
      success: true,
      notification: updated,
    });
  } catch (err) {
    console.error('[markRead Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: err.message,
    });
  }
};

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
exports.markAllRead = async (req, res) => {
  try {
    const { userId, userRole } = req.body;
    await notificationService.markAllNotificationsRead(userId, userRole);

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (err) {
    console.error('[markAllRead Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: err.message,
    });
  }
};

/**
 * Delete a single notification
 * DELETE /api/notifications/:id
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await notificationService.deleteNotification(id);

    res.json({
      success: true,
      message: `Notification ${id} deleted successfully`,
    });
  } catch (err) {
    console.error('[deleteNotification Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: err.message,
    });
  }
};

/**
 * Delete all notifications
 * DELETE /api/notifications
 */
exports.deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId;
    const userRole = req.query.userRole || req.body.userRole;

    await notificationService.deleteAllNotifications(userId, userRole);

    res.json({
      success: true,
      message: 'All notifications deleted successfully',
    });
  } catch (err) {
    console.error('[deleteAllNotifications Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete all notifications',
      error: err.message,
    });
  }
};
