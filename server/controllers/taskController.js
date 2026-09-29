const supabase = require('../supabase');
const notificationService = require('../services/notificationService');
const { formatJobSheet } = require('./jobSheetController');

/**
 * Update task status and trigger lifecycle events (ONGOING / DONE)
 * PATCH /api/tasks/:taskId/status or PATCH /api/jobsheets/:jobSheetId/tasks/:taskId/status
 */
exports.updateTaskStatus = async (req, res) => {
  try {
    const { taskId, jobSheetId: paramJobSheetId } = req.params;
    const {
      status, // 'ONGOING' | 'DONE' | 'In Progress' | 'Done' | 'Not Started'
      completedBy,
      assignedTo: overrideAssignedTo,
      notes,
      image,
      jobSheetId: bodyJobSheetId,
    } = req.body;

    const targetJobSheetId = paramJobSheetId || bodyJobSheetId;

    const normalizedStatus =
      status === 'ONGOING' || status === 'In Progress'
        ? 'ONGOING'
        : status === 'DONE' || status === 'Done'
        ? 'Done'
        : status === 'Not Started' || status === 'NOT_STARTED'
        ? 'Not Started'
        : status;

    let sheet = null;
    let stageIndex = -1;

    if (targetJobSheetId) {
      const { data: found } = await supabase
        .from('job_sheets')
        .select('*')
        .ilike('id', String(targetJobSheetId).trim())
        .maybeSingle();

      if (found) {
        sheet = formatJobSheet(found);
        stageIndex = (sheet.stages || []).findIndex(
          (s) =>
            s.taskId === taskId ||
            String(s.id) === String(taskId) ||
            `TASK-${s.id}` === taskId
        );
      }
    }

    if (!sheet || stageIndex === -1) {
      const { data: allSheets } = await supabase.from('job_sheets').select('*');
      for (const raw of allSheets || []) {
        const s = formatJobSheet(raw);
        const idx = (s.stages || []).findIndex(
          (st) =>
            st.taskId === taskId ||
            String(st.id) === String(taskId) ||
            `TASK-${st.id}` === taskId
        );
        if (idx !== -1) {
          sheet = s;
          stageIndex = idx;
          break;
        }
      }
    }

    if (!sheet || stageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Task ${taskId} not found in any Job Sheet`,
      });
    }

    const currentStage = sheet.stages[stageIndex];
    const previousStatus = currentStage.status;
    const assignedUser = overrideAssignedTo || currentStage.assignedTo || 'Unassigned';
    const taskTitle = currentStage.title || currentStage.name || `Task ${taskId}`;
    const cleanTaskId = currentStage.taskId || `TASK-${currentStage.id}`;
    const timestamp = new Date().toISOString();

    const requesterRole = req.body.role;
    const requesterEmpId = req.body.employeeId;
    const requesterUser = req.body.author || completedBy;

    if (requesterRole === 'employee' || requesterRole === 'EMPLOYEE' || requesterRole === 'manager') {
      const stageAssigned = String(currentStage.assignedTo || '').trim().toLowerCase();
      const stageAssignedId = String(currentStage.assignedEmployeeId || '').trim().toLowerCase();
      const sheetManager = String(sheet.manager || '').trim().toLowerCase();
      const sheetManagerId = String(sheet.managerEmployeeId || '').trim().toLowerCase();
      const reqName = String(requesterUser || '').trim().toLowerCase();
      const reqEmpId = String(requesterEmpId || '').trim().toLowerCase();

      const isManager =
        Boolean(req.body.isManager) ||
        requesterRole === 'manager' ||
        (sheetManager && sheetManager !== 'unassigned' && (
          (reqName && (sheetManager === reqName || sheetManager.includes(reqName) || reqName.includes(sheetManager))) ||
          (reqEmpId && (sheetManager === reqEmpId || sheetManagerId === reqEmpId || sheetManager.includes(reqEmpId)))
        ));

      const isAssigned =
        (reqName && (stageAssigned === reqName || stageAssigned.includes(reqName) || reqName.includes(stageAssigned))) ||
        (reqEmpId && (stageAssigned === reqEmpId || stageAssignedId === reqEmpId || stageAssigned.includes(reqEmpId)));

      if (!isManager && !isAssigned) {
        return res.status(403).json({
          success: false,
          message: `Permission Denied: Only the Owner, Production Manager (${sheet.manager || 'Unassigned'}), or assigned employee can update this task.`,
        });
      }
    }

    // 1. Status = DONE
    if (normalizedStatus === 'DONE' || normalizedStatus === 'Done') {
      const isAlreadyDone = previousStatus === 'DONE' || previousStatus === 'Done';

      currentStage.status = 'Done';
      currentStage.completedBy = completedBy || assignedUser;
      currentStage.completedAt = currentStage.completedAt || timestamp;
      if (notes !== undefined) currentStage.notes = notes;
      if (image !== undefined) currentStage.image = image;

      const cleanStages = sheet.stages.filter(
        (s) =>
          s.key !== 'JOB_SHEET' &&
          s.name !== 'JOB SHEET' &&
          s.name !== 'Job Sheet' &&
          !String(s.name || '').toLowerCase().includes('job sheet')
      );
      const doneCount = cleanStages.filter((s) => s.status === 'DONE' || s.status === 'Done').length;
      const totalCount = cleanStages.length > 0 ? cleanStages.length : 10;
      const progressPercent = Math.round((doneCount / totalCount) * 100);
      sheet.overallStatus = doneCount === totalCount ? 'Done' : 'In Progress';

      const progressText = `Progress: ${doneCount}/${totalCount} stages (${progressPercent}%)`;
      sheet.activityLogs.unshift({
        id: 'log-' + Date.now(),
        timestamp,
        author: completedBy || assignedUser,
        text: `✓ ${completedBy || assignedUser} completed ${taskTitle}. ${progressText}`,
      });

      const { data: updated, error: updateErr } = await supabase
        .from('job_sheets')
        .update({
          stages: sheet.stages,
          overall_status: sheet.overallStatus,
          activity_logs: sheet.activityLogs,
          updated_at: timestamp,
        })
        .ilike('id', sheet.id)
        .select()
        .single();

      if (updateErr) {
        return res.status(500).json({ success: false, message: updateErr.message });
      }

      const savedSheet = formatJobSheet(updated);

      if (!isAlreadyDone) {
        try {
          await notificationService.createTaskCompletedNotification({
            jobSheetId: sheet.id,
            taskId: cleanTaskId,
            stageId: currentStage.id || taskId,
            taskTitle,
            completedBy: completedBy || assignedUser,
            assignedTo: assignedUser,
            completedAt: currentStage.completedAt,
            managerName: sheet.manager,
            managerEmployeeId: sheet.managerEmployeeId,
            party: sheet.party,
            doneCount,
            totalCount,
            progressPercent,
          });
        } catch (err) {
          console.warn('⚠️ [DONE Notification Warning]:', err.message);
        }
      }

      return res.json({
        success: true,
        message: `Task ${cleanTaskId} marked as DONE`,
        task: currentStage,
        jobSheet: savedSheet,
      });
    }

    // 2. Status = ONGOING
    if (normalizedStatus === 'ONGOING') {
      currentStage.status = 'ONGOING';
      if (overrideAssignedTo) {
        currentStage.assignedTo = overrideAssignedTo;
        let finalEmpId = req.body.assignedEmployeeId || '';
        if (!finalEmpId && overrideAssignedTo !== 'Unassigned') {
          const empInfo = await notificationService.resolveEmployeeIdentifier(overrideAssignedTo);
          if (empInfo.employeeId) finalEmpId = empInfo.employeeId;
        }
        if (finalEmpId) {
          currentStage.assignedEmployeeId = finalEmpId;
        }
      }
      if (notes !== undefined) currentStage.notes = notes;
      if (image !== undefined) currentStage.image = image;

      sheet.activityLogs.unshift({
        id: 'log-' + Date.now(),
        timestamp,
        author: requesterUser || 'Manager',
        text: `Started task "${taskTitle}" (assigned to ${assignedUser}).`,
      });

      const { data: updated, error: updateErr } = await supabase
        .from('job_sheets')
        .update({
          stages: sheet.stages,
          activity_logs: sheet.activityLogs,
          updated_at: timestamp,
        })
        .ilike('id', sheet.id)
        .select()
        .single();

      if (updateErr) {
        return res.status(500).json({ success: false, message: updateErr.message });
      }

      const savedSheet = formatJobSheet(updated);

      let pushInfo = null;
      try {
        const notifyResult = await notificationService.createTaskOngoingNotification({
          jobSheetId: sheet.id,
          taskId: cleanTaskId,
          taskTitle,
          assignedTo: assignedUser,
        });
        pushInfo = notifyResult?.pushResult;
      } catch (pushErr) {
        console.warn(`⚠️ [Push Notification Warning]:`, pushErr.message);
      }

      return res.json({
        success: true,
        message: `Task ${cleanTaskId} is now ONGOING. Notification sent to ${assignedUser}.`,
        task: currentStage,
        jobSheet: savedSheet,
        pushInfo,
      });
    }

    // 3. Other status updates
    currentStage.status = normalizedStatus;
    if (overrideAssignedTo) {
      currentStage.assignedTo = overrideAssignedTo;
      let finalEmpId = req.body.assignedEmployeeId || '';
      if (!finalEmpId && overrideAssignedTo !== 'Unassigned') {
        const empInfo = await notificationService.resolveEmployeeIdentifier(overrideAssignedTo);
        if (empInfo.employeeId) finalEmpId = empInfo.employeeId;
      }
      if (finalEmpId) {
        currentStage.assignedEmployeeId = finalEmpId;
      }
    }
    if (notes !== undefined) currentStage.notes = notes;
    if (image !== undefined) currentStage.image = image;

    const { data: updated, error: updateErr } = await supabase
      .from('job_sheets')
      .update({
        stages: sheet.stages,
        updated_at: timestamp,
      })
      .ilike('id', sheet.id)
      .select()
      .single();

    if (updateErr) {
      return res.status(500).json({ success: false, message: updateErr.message });
    }

    return res.json({
      success: true,
      message: `Task ${cleanTaskId} status updated to ${normalizedStatus}`,
      task: currentStage,
      jobSheet: formatJobSheet(updated),
    });
  } catch (err) {
    console.error('[updateTaskStatus Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update task status',
      error: err.message,
    });
  }
};

/**
 * Get task details by taskId
 * GET /api/tasks/:taskId
 */
exports.getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;

    const { data: allSheets, error } = await supabase.from('job_sheets').select('*');
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    let foundSheet = null;
    let foundStage = null;

    for (const raw of allSheets || []) {
      const s = formatJobSheet(raw);
      const stage = (s.stages || []).find(
        (st) =>
          st.taskId === taskId ||
          String(st.id) === String(taskId) ||
          `TASK-${st.id}` === taskId
      );
      if (stage) {
        foundSheet = s;
        foundStage = stage;
        break;
      }
    }

    if (!foundStage || !foundSheet) {
      return res.status(404).json({
        success: false,
        message: `Task ${taskId} not found`,
      });
    }

    res.json({
      success: true,
      task: foundStage,
      jobSheetId: foundSheet.id,
      party: foundSheet.party,
    });
  } catch (err) {
    console.error('[getTaskById Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve task',
      error: err.message,
    });
  }
};
