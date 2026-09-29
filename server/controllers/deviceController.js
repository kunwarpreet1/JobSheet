const deviceService = require('../services/deviceService');

/**
 * Register or update device token
 * POST /api/devices/register
 */
exports.registerDevice = async (req, res) => {
  try {
    const { userId, deviceToken, platform, deviceModel, osVersion, appVersion } = req.body;

    if (!userId || !deviceToken) {
      return res.status(400).json({
        success: false,
        message: 'userId and deviceToken are required',
      });
    }

    if (String(userId).trim().toLowerCase() === 'owner' || String(userId).trim().toLowerCase() === 'admin') {
      return res.status(200).json({
        success: true,
        message: 'Owner role does not receive push notifications',
      });
    }

    const device = await deviceService.registerDevice({
      userId,
      deviceToken,
      platform,
      deviceModel,
      osVersion,
      appVersion,
    });

    res.status(200).json({
      success: true,
      message: 'Device registered successfully',
      device: {
        userId: device.userId,
        platform: device.platform,
        deviceModel: device.deviceModel,
        isActive: device.isActive,
        updatedAt: device.updatedAt,
      },
    });
  } catch (err) {
    console.error('[registerDevice Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to register device',
      error: err.message,
    });
  }
};

/**
 * Deactivate device token on logout
 * POST /api/devices/deactivate
 */
exports.deactivateDevice = async (req, res) => {
  try {
    const { userId, deviceToken } = req.body;

    if (!userId && !deviceToken) {
      return res.status(400).json({
        success: false,
        message: 'userId or deviceToken is required to deactivate device',
      });
    }

    await deviceService.deactivateDevice({ userId, deviceToken });

    res.status(200).json({
      success: true,
      message: 'Device token deactivated successfully',
    });
  } catch (err) {
    console.error('[deactivateDevice Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate device',
      error: err.message,
    });
  }
};

/**
 * Retrieve pending push notifications for an employee/device (for background/foreground sync)
 * GET /api/devices/pending-pushes/:userId
 */
exports.getPendingPushes = async (req, res) => {
  try {
    const { userId } = req.params;
    const { since } = req.query;

    if (userId && (String(userId).trim().toLowerCase() === 'owner' || String(userId).trim().toLowerCase() === 'admin')) {
      return res.status(200).json({ success: true, pushes: [] });
    }

    const notificationService = require('../services/notificationService');
    const supabase = require('../supabase');

    let query = supabase
      .from('notifications')
      .select('*')
      .in('type', ['TASK_ASSIGNED', 'TASK_ONGOING', 'MANAGER_ASSIGNED', 'PROGRESS_UPDATED'])
      .order('created_at', { ascending: false })
      .limit(30);

    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        // Buffer by 30 seconds to prevent clock skew from dropping notifications
        const bufferedSince = new Date(sinceDate.getTime() - 30000).toISOString();
        query = query.gt('created_at', bufferedSince);
      }
    }

    const { data: rows, error } = await query;
    if (error) {
      console.warn('[getPendingPushes Supabase Warning]:', error.message);
    }

    let pushes = rows || [];

    if (userId && userId !== 'ALL') {
      const empInfo = await notificationService.resolveEmployeeIdentifier(userId);
      const targetIds = [String(userId).trim()];
      if (empInfo.employeeId && !targetIds.includes(empInfo.employeeId)) targetIds.push(empInfo.employeeId);
      if (empInfo.name && !targetIds.includes(empInfo.name)) targetIds.push(empInfo.name);

      pushes = pushes.filter((p) => {
        if (targetIds.includes(p.user_id)) return true;
        const meta = p.metadata || {};
        if (targetIds.includes(meta.employeeId)) return true;
        if (targetIds.includes(meta.assignedTo)) return true;
        if (targetIds.includes(meta.managerEmployeeId)) return true;
        if (targetIds.includes(meta.managerName)) return true;
        return false;
      });
    }

    pushes = pushes.slice(0, 20);

    res.json({
      success: true,
      pushes: pushes.map((p) => ({
        id: p.id,
        type: p.type,
        title: p.title,
        body: p.message,
        jobSheetId: p.job_sheet_id,
        taskId: p.task_id,
        metadata: p.metadata || {},
        createdAt: p.created_at,
      })),
    });
  } catch (err) {
    console.error('[getPendingPushes Error]:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch pending pushes', error: err.message });
  }
};
