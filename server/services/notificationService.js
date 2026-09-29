const supabase = require('../supabase');
const deviceService = require('./deviceService');
const pushNotificationService = require('./pushNotificationService');

/**
 * Format notification row from Supabase
 */
function formatNotification(n) {
  if (!n) return null;
  return {
    id: n.id,
    _id: n.id,
    userId: n.user_id,
    type: n.type,
    title: n.title,
    message: n.message,
    jobSheetId: n.job_sheet_id,
    taskId: n.task_id,
    isRead: n.is_read,
    read: n.is_read,
    metadata: n.metadata || {},
    createdAt: n.created_at,
    timestamp: n.created_at,
  };
}

/**
 * Helper to resolve employeeId, name, and document for any identifier (employeeId or name)
 */
async function resolveEmployeeIdentifier(identifier) {
  if (!identifier || identifier === 'ALL' || identifier === 'Unassigned') {
    return { employeeId: null, name: identifier, emp: null };
  }

  const clean = String(identifier).trim();
  try {
    const { data: emps, error } = await supabase
      .from('employees')
      .select('*')
      .or(`employee_id.eq.${clean},name.ilike.${clean},email.eq.${clean.toLowerCase()}`)
      .limit(1);

    if (!error && emps && emps.length > 0) {
      const emp = emps[0];
      return {
        employeeId: emp.employee_id,
        name: emp.name,
        emp,
      };
    }
  } catch (err) {
    console.warn('[resolveEmployeeIdentifier Warning]:', err.message);
  }

  return { employeeId: clean, name: clean, emp: null };
}

/**
 * 1. Generate & Save JOB_SHEET_CREATED notification
 */
async function createJobSheetNotification(jobSheet) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: 'ALL',
        type: 'JOB_SHEET_CREATED',
        title: 'Job Sheet Created',
        message: `Job Sheet #${jobSheet.id} has been created.`,
        job_sheet_id: jobSheet.id,
        metadata: {
          party: jobSheet.party,
          salesman: jobSheet.salesman,
          fabric: jobSheet.fabric,
        },
      })
      .select()
      .single();

    if (error) {
      console.error(`[Supabase Notification Error - JOB_SHEET_CREATED]:`, error.message);
      return null;
    }

    console.log(` [Notification Created via Supabase]: JOB_SHEET_CREATED for ${jobSheet.id}`);
    return formatNotification(data);
  } catch (err) {
    console.error(`❌ [Notification Error - JOB_SHEET_CREATED]:`, err.message);
    return null;
  }
}

/**
 * 1B. Generate & Save MANAGER_ASSIGNED notification mapped to the Production Manager
 */
async function createManagerAssignedNotification({ jobSheetId, managerName, party }) {
  if (!managerName || managerName === 'Unassigned') {
    return null;
  }

  try {
    const empInfo = await resolveEmployeeIdentifier(managerName);
    const targetUserId = empInfo.employeeId || managerName;

    const title = `📋 Assigned as Production Manager`;
    const message = `You have been assigned as Production Manager for Job Sheet #${jobSheetId}${party ? ` (${party})` : ''}. You can now assign and manage production tasks.`;

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: targetUserId,
        type: 'MANAGER_ASSIGNED',
        title,
        message,
        job_sheet_id: jobSheetId,
        metadata: {
          jobSheetId,
          employeeId: empInfo.employeeId || '',
          employeeName: empInfo.name || managerName,
          managerName: empInfo.name || managerName,
          assignedTo: empInfo.name || managerName,
          party,
          role: 'manager',
        },
      })
      .select()
      .single();

    if (error) {
      console.error(` [Supabase Notification Error - MANAGER_ASSIGNED]:`, error.message);
      return null;
    }

    // Also record notification for Owner
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: '4821',
          type: 'MANAGER_ASSIGNED',
          title: '📋 Manager Assigned',
          message: `You assigned ${empInfo.name || managerName} manager role for Job Sheet #${jobSheetId}${party ? ` (${party})` : ''}.`,
          job_sheet_id: jobSheetId,
          metadata: {
            jobSheetId,
            employeeId: empInfo.employeeId || '',
            employeeName: empInfo.name || managerName,
            managerName: empInfo.name || managerName,
            party,
            role: 'owner',
          },
        });
    } catch (ownerNotifErr) {
      console.warn('⚠️ [Owner Notification Warning]:', ownerNotifErr.message);
    }

    console.log(` [Notification Created via Supabase]: MANAGER_ASSIGNED for ${jobSheetId} to ${managerName}`);

    // Dispatch native push notification to Manager
    try {
      await pushNotificationService.sendPushNotificationToUser(
        targetUserId,
        title,
        message,
        {
          jobSheetId,
          type: 'MANAGER_ASSIGNED',
          managerName,
          party,
        }
      );
    } catch (pushErr) {
      console.warn('⚠️ [Push Notification Warning - Manager]:', pushErr.message);
    }

    return formatNotification(data);
  } catch (err) {
    console.error(`❌ [Notification Error - MANAGER_ASSIGNED]:`, err.message);
    return null;
  }
}

/**
 * 2. Generate & Save TASK_ASSIGNED notification mapped to Employee ID
 */
async function createTaskAssignedNotification({
  jobSheetId,
  taskId,
  taskTitle,
  assignedTo,
  party,
  deadline,
}) {
  if (!assignedTo || assignedTo === 'Unassigned') {
    return null;
  }

  const safeTitle = taskTitle || 'Task';
  const empInfo = await resolveEmployeeIdentifier(assignedTo);
  const targetUserId = empInfo.employeeId || assignedTo;

  // Prevent duplicate TASK_ASSIGNED notification
  const { data: existing } = await supabase
    .from('notifications')
    .select('*')
    .eq('type', 'TASK_ASSIGNED')
    .eq('job_sheet_id', jobSheetId)
    .eq('task_id', taskId)
    .eq('user_id', targetUserId)
    .maybeSingle();

  if (existing) {
    return { isDuplicate: true, notification: formatNotification(existing) };
  }

  const message = party
    ? `You have been assigned to "${safeTitle}" for Job Sheet #${jobSheetId} (${party}).`
    : `You have been assigned to "${safeTitle}" for Job Sheet #${jobSheetId}.`;

  const { data: savedNotification, error } = await supabase
    .from('notifications')
    .insert({
      user_id: targetUserId,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message,
      job_sheet_id: jobSheetId,
      task_id: taskId,
      is_read: false,
      metadata: {
        employeeId: empInfo.employeeId,
        employeeName: empInfo.name,
        assignedTo,
        party,
        deadline,
      },
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase createTaskAssignedNotification Error]:', error.message);
    return null;
  }

  console.log(`🔔 [Notification Created via Supabase]: TASK_ASSIGNED for ${taskId} (${jobSheetId}) mapped to Employee ID "${targetUserId}"`);

  // Dispatch Push Notification
  let pushResult = { total: 0, sent: 0, failed: 0 };
  try {
    const deviceTokens = await deviceService.getActiveDeviceTokensForUser(targetUserId);

    if (deviceTokens.length > 0) {
      pushResult = await pushNotificationService.sendPushToDevices({
        deviceTokens,
        title: 'New Task Assigned',
        body: message,
        data: {
          type: 'TASK_ASSIGNED',
          taskId: String(taskId),
          jobSheetId: String(jobSheetId),
          employeeId: String(targetUserId),
        },
      });
      console.log(`📲 [Push Notification]: Sent TASK_ASSIGNED to ${pushResult.sent} device(s) for Employee "${targetUserId}"`);
    }
  } catch (pushErr) {
    console.warn(`⚠️ [Push Delivery Warning]: Push delivery failed for "${targetUserId}":`, pushErr.message);
  }

  return { notification: formatNotification(savedNotification), pushResult };
}

/**
 * 3. Generate & Save TASK_ONGOING notification & deliver Push Notification
 */
async function createTaskOngoingNotification({ jobSheetId, taskId, taskTitle, assignedTo }) {
  const safeTitle = taskTitle || 'Task';
  const empInfo = await resolveEmployeeIdentifier(assignedTo);
  const targetUserId = empInfo.employeeId || assignedTo || 'Unassigned';

  const { data: existingOngoing } = await supabase
    .from('notifications')
    .select('*')
    .eq('type', 'TASK_ONGOING')
    .eq('job_sheet_id', jobSheetId)
    .eq('task_id', taskId)
    .eq('user_id', targetUserId)
    .maybeSingle();

  if (existingOngoing) {
    return { isDuplicate: true, notification: formatNotification(existingOngoing), pushResult: { total: 0, sent: 0, failed: 0 } };
  }

  // Supersede older TASK_ASSIGNED notification
  try {
    await supabase
      .from('notifications')
      .delete()
      .eq('type', 'TASK_ASSIGNED')
      .eq('job_sheet_id', jobSheetId)
      .eq('task_id', taskId)
      .eq('user_id', targetUserId);
  } catch (cleanErr) {
    console.warn('[Cleanup Old Notification Warning]:', cleanErr.message);
  }

  const { data: savedNotification, error } = await supabase
    .from('notifications')
    .insert({
      user_id: targetUserId,
      type: 'TASK_ONGOING',
      title: 'Task Started',
      message: `"${safeTitle}" is currently ongoing and has been assigned to you.`,
      job_sheet_id: jobSheetId,
      task_id: taskId,
      is_read: false,
      metadata: {
        employeeId: empInfo.employeeId,
        employeeName: empInfo.name,
        assignedTo: empInfo.name || targetUserId,
      },
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase createTaskOngoingNotification Error]:', error.message);
    return null;
  }

  console.log(`🔔 [Notification Created via Supabase]: TASK_ONGOING for ${taskId} (${jobSheetId})`);

  let pushResult = { total: 0, sent: 0, failed: 0 };
  try {
    const deviceTokens = await deviceService.getActiveDeviceTokensForUser(targetUserId);

    if (deviceTokens.length > 0) {
      pushResult = await pushNotificationService.sendPushToDevices({
        deviceTokens,
        title: 'Task Started',
        body: `"${safeTitle}" is currently ongoing and has been assigned to you.`,
        data: {
          type: 'TASK_ONGOING',
          taskId: String(taskId),
          jobSheetId: String(jobSheetId),
          employeeId: String(targetUserId),
        },
      });
      console.log(`📲 [Push Notification]: Sent to ${pushResult.sent} device(s) for user "${targetUserId}"`);
    }
  } catch (pushErr) {
    console.warn(`⚠️ [Push Delivery Warning]:`, pushErr.message);
  }

  return { notification: formatNotification(savedNotification), pushResult };
}

/**
 * 4. Generate & Save TASK_COMPLETED event
 */
async function createTaskCompletedNotification({
  jobSheetId,
  taskId,
  stageId,
  taskTitle,
  completedBy,
  assignedTo,
  completedAt = new Date().toISOString(),
  managerName,
  managerEmployeeId,
  party,
  doneCount,
  totalCount,
  progressPercent,
}) {
  const { data: existingEvent } = await supabase
    .from('notifications')
    .select('*')
    .eq('type', 'TASK_COMPLETED')
    .eq('job_sheet_id', jobSheetId)
    .eq('task_id', taskId)
    .maybeSingle();

  if (existingEvent) {
    return { isDuplicate: true, notification: formatNotification(existingEvent) };
  }

  const safeTitle = taskTitle || 'Task';
  const completer = completedBy || assignedTo || 'Employee';
  const progressText = (doneCount !== undefined && totalCount !== undefined)
    ? `Progress: ${doneCount}/${totalCount} stages (${progressPercent || Math.round((doneCount / totalCount) * 100)}%)`
    : '';

  const ownerMessage = `${completer} marked "${safeTitle}" as Done for Job Sheet #${jobSheetId}${party ? ` (${party})` : ''}.${progressText ? ` ${progressText}.` : ''}`;
  const managerMessage = `Employee ${completer} marked "${safeTitle}" as Done for Job Sheet #${jobSheetId}${party ? ` (${party})` : ''}.${progressText ? ` ${progressText}.` : ''}`;

  const results = [];

  // 1. Notification for Owner (userId: 'ALL')
  const { data: savedOwner } = await supabase
    .from('notifications')
    .insert({
      user_id: 'ALL',
      type: 'TASK_COMPLETED',
      title: `✓ Task Completed: ${safeTitle}`,
      message: ownerMessage,
      job_sheet_id: jobSheetId,
      task_id: taskId,
      is_read: false,
      metadata: {
        type: 'TASK_COMPLETED',
        taskId,
        stageId: stageId || taskId,
        jobSheetId,
        completedBy: completer,
        assignedTo: assignedTo || 'User',
        managerName: managerName || '',
        managerEmployeeId: managerEmployeeId || '',
        party: party || '',
        progressText,
        doneCount,
        totalCount,
        progressPercent,
        completedAt,
      },
    })
    .select()
    .single();

  if (savedOwner) results.push(formatNotification(savedOwner));

  // 2. Targeted Notification for Production Manager
  if (managerName && managerName !== 'Unassigned' && managerName.toLowerCase() !== 'unassigned') {
    let targetMgrId = managerEmployeeId || '';
    if (!targetMgrId) {
      const empInfo = await resolveEmployeeIdentifier(managerName);
      targetMgrId = empInfo.employeeId || managerName;
    }

    const { data: savedMgr } = await supabase
      .from('notifications')
      .insert({
        user_id: targetMgrId,
        type: 'TASK_COMPLETED',
        title: `✓ Task Completed: ${safeTitle}`,
        message: managerMessage,
        job_sheet_id: jobSheetId,
        task_id: taskId,
        is_read: false,
        metadata: {
          type: 'TASK_COMPLETED',
          taskId,
          stageId: stageId || taskId,
          jobSheetId,
          completedBy: completer,
          assignedTo: assignedTo || 'User',
          managerName: managerName || '',
          managerEmployeeId: targetMgrId,
          party: party || '',
          progressText,
          doneCount,
          totalCount,
          progressPercent,
          completedAt,
        },
      })
      .select()
      .single();

    if (savedMgr) {
      results.push(formatNotification(savedMgr));
      try {
        await pushNotificationService.sendPushNotificationToUser(
          targetMgrId,
          `✓ Task Completed: ${safeTitle}`,
          managerMessage,
          { jobSheetId, taskId, type: 'TASK_COMPLETED', progressText, party }
        );
      } catch (pushErr) {
        console.warn('⚠️ [Push Notification Warning - Manager Task Done]:', pushErr.message);
      }
    }
  }

  return { isDuplicate: false, notifications: results };
}

/**
 * 5. Notify Manager and Owner when the Manager changes progress of a Job Sheet
 */
async function notifyManagerProgressChange({
  jobSheetId,
  stageId,
  stageName,
  status,
  assignedTo,
  managerName,
  managerEmployeeId,
  party,
  actionText,
}) {
  try {
    const results = [];
    const safeTitle = stageName || `Stage ${stageId}`;
    const cleanStatus = status || 'Updated';

    let targetMgrId = managerEmployeeId || '';
    let resolvedMgrName = managerName || '';
    if (managerName && managerName !== 'Unassigned') {
      const empInfo = await resolveEmployeeIdentifier(managerName);
      if (empInfo.employeeId) targetMgrId = empInfo.employeeId;
      if (empInfo.name) resolvedMgrName = empInfo.name;
    }

    if (targetMgrId || (resolvedMgrName && resolvedMgrName !== 'Unassigned')) {
      const mgrUserId = targetMgrId || resolvedMgrName;
      const mgrTitle = `🔄 Progress Updated: ${safeTitle}`;
      const mgrMessage =
        actionText ||
        `Progress updated on Job Sheet #${jobSheetId} (${safeTitle} → ${cleanStatus}).`;

      const { data: savedMgrNotif } = await supabase
        .from('notifications')
        .insert({
          user_id: mgrUserId,
          type: 'PROGRESS_UPDATED',
          title: mgrTitle,
          message: mgrMessage,
          job_sheet_id: String(jobSheetId),
          task_id: String(stageId),
          is_read: false,
          metadata: {
            jobSheetId: String(jobSheetId),
            stageId: String(stageId),
            stageName: safeTitle,
            status: cleanStatus,
            assignedTo: assignedTo || 'Unassigned',
            managerName: resolvedMgrName || 'Manager',
            managerEmployeeId: targetMgrId || '',
            party: party || '',
          },
        })
        .select()
        .single();

      if (savedMgrNotif) {
        results.push(formatNotification(savedMgrNotif));
        try {
          await pushNotificationService.sendPushNotificationToUser(
            mgrUserId,
            mgrTitle,
            mgrMessage,
            { jobSheetId: String(jobSheetId), taskId: String(stageId), type: 'PROGRESS_UPDATED', status: cleanStatus }
          );
        } catch (pushErr) {
          console.warn(' [Push Notification Warning - Manager Progress]:', pushErr.message);
        }
      }
    }

    // Notification to Owner (In-app, visible to Owner)
    const ownerTitle = ` Manager Updated Progress: ${safeTitle}`;
    const ownerMessage =
      actionText ||
      `Manager ${resolvedMgrName || 'Manager'} updated "${safeTitle}" to ${cleanStatus} on Job Sheet #${jobSheetId}${party ? ` (${party})` : ''}.`;

    const { data: savedOwnerNotif } = await supabase
      .from('notifications')
      .insert({
        user_id: 'ALL',
        type: 'PROGRESS_UPDATED',
        title: ownerTitle,
        message: ownerMessage,
        job_sheet_id: String(jobSheetId),
        task_id: String(stageId),
        is_read: false,
        metadata: {
          jobSheetId: String(jobSheetId),
          stageId: String(stageId),
          stageName: safeTitle,
          status: cleanStatus,
          assignedTo: assignedTo || 'Unassigned',
          managerName: resolvedMgrName || 'Manager',
          managerEmployeeId: targetMgrId || '',
          party: party || '',
        },
      })
      .select()
      .single();

    if (savedOwnerNotif) results.push(formatNotification(savedOwnerNotif));

    return results;
  } catch (err) {
    console.error('❌ [Notification Error - notifyManagerProgressChange]:', err.message);
    return [];
  }
}

/**
 * Query notifications with user filtering and read/unread status from Supabase.
 */
async function getNotifications({ userId, type, isRead, limit = 50, userRole }) {
  try {
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
    const isEmployee = userRole === 'employee' || userRole === 'EMPLOYEE';

    if (isEmployee && userId) {
      const cleanUserId = String(userId).trim();
      const empInfo = await resolveEmployeeIdentifier(cleanUserId);
      const targetIds = [cleanUserId];

      if (empInfo.employeeId && !targetIds.includes(empInfo.employeeId)) targetIds.push(empInfo.employeeId);
      if (empInfo.name && !targetIds.includes(empInfo.name)) targetIds.push(empInfo.name);

      query = query
        .neq('user_id', 'ALL')
        .neq('type', 'JOB_SHEET_CREATED')
        .or(
          targetIds.map((tid) => `user_id.eq.${tid},metadata->>employeeId.eq.${tid},metadata->>assignedTo.eq.${tid},metadata->>managerEmployeeId.eq.${tid},metadata->>managerName.eq.${tid}`).join(',')
        );
    } else if (userId && userId !== 'ALL') {
      const cleanUserId = String(userId).trim();
      const empInfo = await resolveEmployeeIdentifier(cleanUserId);
      const targetIds = [cleanUserId, 'ALL'];

      if (empInfo.employeeId && !targetIds.includes(empInfo.employeeId)) targetIds.push(empInfo.employeeId);
      if (empInfo.name && !targetIds.includes(empInfo.name)) targetIds.push(empInfo.name);

      query = query.in('user_id', targetIds);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (isRead !== undefined) {
      const readBool = isRead === 'true' || isRead === true;
      query = query.eq('is_read', readBool);
    }

    if (limit) {
      query = query.limit(Number(limit));
    }

    const { data, error } = await query;
    if (error) {
      console.error('[Supabase getNotifications Error]:', error.message);
      return [];
    }

    return (data || []).map(formatNotification);
  } catch (err) {
    console.error('[getNotifications Error]:', err.message);
    return [];
  }
}

/**
 * Mark a single notification as read
 */
async function markNotificationRead(id) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[Supabase markNotificationRead Warning]:', error.message);
      return null;
    }
    return formatNotification(data);
  } catch (err) {
    console.warn('[markNotificationRead Warning]:', err.message);
    return null;
  }
}

/**
 * Mark all notifications as read for a user
 */
async function markAllNotificationsRead(userId, userRole) {
  try {
    let query = supabase.from('notifications').update({ is_read: true, updated_at: new Date().toISOString() });
    const isEmployee = userRole === 'employee' || userRole === 'EMPLOYEE';

    if (isEmployee && userId) {
      const cleanUserId = String(userId).trim();
      const empInfo = await resolveEmployeeIdentifier(cleanUserId);
      const targetIds = [cleanUserId];
      if (empInfo.employeeId && !targetIds.includes(empInfo.employeeId)) targetIds.push(empInfo.employeeId);
      if (empInfo.name && !targetIds.includes(empInfo.name)) targetIds.push(empInfo.name);

      query = query.neq('user_id', 'ALL').in('user_id', targetIds);
    } else if (userId && userId !== 'ALL') {
      const cleanUserId = String(userId).trim();
      const empInfo = await resolveEmployeeIdentifier(cleanUserId);
      const targetIds = [cleanUserId, 'ALL'];
      if (empInfo.employeeId && !targetIds.includes(empInfo.employeeId)) targetIds.push(empInfo.employeeId);
      if (empInfo.name && !targetIds.includes(empInfo.name)) targetIds.push(empInfo.name);

      query = query.in('user_id', targetIds);
    } else {
      query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { error } = await query;
    if (error) console.warn('[Supabase markAllNotificationsRead Warning]:', error.message);
    return true;
  } catch (err) {
    console.warn('[markAllNotificationsRead Warning]:', err.message);
    return false;
  }
}

/**
 * Delete a single notification by ID
 */
async function deleteNotification(id) {
  try {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[deleteNotification Error]:', err.message);
    throw err;
  }
}

/**
 * Delete all notifications (scoped for employee or wiped completely for owner)
 */
async function deleteAllNotifications(userId, userRole) {
  try {
    let query = supabase.from('notifications').delete();
    const isEmployee = userRole === 'employee' || userRole === 'EMPLOYEE';

    if (isEmployee && userId) {
      const cleanUserId = String(userId).trim();
      const empInfo = await resolveEmployeeIdentifier(cleanUserId);
      const targetIds = [cleanUserId];
      if (empInfo.employeeId && !targetIds.includes(empInfo.employeeId)) targetIds.push(empInfo.employeeId);
      if (empInfo.name && !targetIds.includes(empInfo.name)) targetIds.push(empInfo.name);

      query = query.neq('user_id', 'ALL').in('user_id', targetIds);
    } else if (userId && userId !== 'ALL') {
      query = query.eq('user_id', userId);
    } else {
      query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { error } = await query;
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[deleteAllNotifications Error]:', err.message);
    throw err;
  }
}

module.exports = {
  resolveEmployeeIdentifier,
  createJobSheetNotification,
  createManagerAssignedNotification,
  createTaskAssignedNotification,
  createTaskOngoingNotification,
  createTaskCompletedNotification,
  notifyManagerProgressChange,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  formatNotification,
};
