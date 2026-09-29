const supabase = require('../supabase');
const notificationService = require('../services/notificationService');

/**
 * Format job sheet row from Supabase
 */
function formatJobSheet(s) {
  if (!s) return null;
  return {
    id: s.id,
    _id: s.id,
    date: s.date,
    party: s.party,
    salesman: s.salesman || 'General Sales',
    fabric: s.fabric || 'Standard Fabric',
    overallStatus: s.overall_status || 'In Progress',
    manager: s.manager || 'Unassigned',
    managerEmployeeId: s.manager_employee_id || '',
    qcBox: s.qc_box || {},
    stages: s.stages || [],
    activityLogs: s.activity_logs || [],
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

/**
 * 1. Get all Job Sheets
 * GET /api/jobsheets?employeeId=...&assignedTo=...&userRole=employee
 */
exports.getAllJobSheets = async (req, res) => {
  try {
    const { employeeId, assignedTo, userRole } = req.query;

    const { data: sheets, error } = await supabase
      .from('job_sheets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('⚠️ Supabase job_sheets table not found. Please run supabase_schema.sql in Supabase SQL editor.');
        return res.status(200).json({ success: true, count: 0, jobSheets: [] });
      }
      console.error('[Supabase getAllJobSheets Error]:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve job sheets from database',
        error: error.message,
      });
    }

    let formattedSheets = (sheets || []).map(formatJobSheet);

    const targetUser = employeeId || assignedTo;
    if (targetUser && (userRole === 'employee' || userRole === 'EMPLOYEE')) {
      const empInfo = await notificationService.resolveEmployeeIdentifier(targetUser);
      const matchTargets = [String(targetUser).trim().toLowerCase()];
      if (empInfo.employeeId) matchTargets.push(String(empInfo.employeeId).trim().toLowerCase());
      if (empInfo.name) matchTargets.push(String(empInfo.name).trim().toLowerCase());

      formattedSheets = formattedSheets.filter((s) => {
        const mgr = String(s.manager || '').trim().toLowerCase();
        const mgrId = String(s.managerEmployeeId || '').trim().toLowerCase();
        if (matchTargets.includes(mgr) || matchTargets.includes(mgrId)) return true;

        if (Array.isArray(s.stages)) {
          return s.stages.some((st) => {
            const assigned = String(st.assignedTo || '').trim().toLowerCase();
            const assignedId = String(st.assignedEmployeeId || '').trim().toLowerCase();
            return matchTargets.includes(assigned) || matchTargets.includes(assignedId);
          });
        }
        return false;
      });
    }

    res.json({
      success: true,
      count: formattedSheets.length,
      jobSheets: formattedSheets,
    });
  } catch (err) {
    console.error('[getAllJobSheets Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve job sheets from database',
      error: err.message,
    });
  }
};

/**
 * 2. Get Single Job Sheet by ID
 * GET /api/jobsheets/:id
 */
exports.getJobSheetById = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = String(id || '').trim();

    const { data: sheet, error } = await supabase
      .from('job_sheets')
      .select('*')
      .ilike('id', cleanId)
      .maybeSingle();

    if (error || !sheet) {
      return res.status(404).json({
        success: false,
        message: `Job Sheet "${id}" not found in database`,
      });
    }

    res.json({
      success: true,
      jobSheet: formatJobSheet(sheet),
    });
  } catch (err) {
    console.error('[getJobSheetById Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve job sheet',
      error: err.message,
    });
  }
};

/**
 * 3. Create a new Job Sheet
 * POST /api/jobsheets
 */
exports.createJobSheet = async (req, res) => {
  try {
    let {
      id,
      date,
      party,
      salesman,
      fabric,
      qcBox,
      stages,
      activityLogs,
      overallStatus,
      manager,
      managerEmployeeId,
    } = req.body;

    if (!party) {
      return res.status(400).json({
        success: false,
        message: 'Party / Customer name is required',
      });
    }

    if (!id) {
      const { count } = await supabase.from('job_sheets').select('*', { count: 'exact', head: true });
      id = `JS-${1000 + (count || 0) + 1}`;
    }

    const timestamp = date || new Date().toISOString();

    let resolvedManagerId = managerEmployeeId || '';
    if (!resolvedManagerId && manager && manager !== 'Unassigned') {
      const mgrInfo = await notificationService.resolveEmployeeIdentifier(manager);
      if (mgrInfo.employeeId) resolvedManagerId = mgrInfo.employeeId;
    }

    // Owner (4821) is NOT applicable to become a manager
    if (resolvedManagerId === '4821' || (manager && manager.toLowerCase() === 'owner')) {
      return res.status(400).json({
        success: false,
        message: 'Owner is not applicable to become a manager. Please select an employee.',
      });
    }

    const enrichedStages = [];
    for (const stage of stages || []) {
      let assignedEmployeeId = stage.assignedEmployeeId || '';
      if (!assignedEmployeeId && stage.assignedTo && stage.assignedTo !== 'Unassigned') {
        const empInfo = await notificationService.resolveEmployeeIdentifier(stage.assignedTo);
        if (empInfo.employeeId) assignedEmployeeId = empInfo.employeeId;
      }
      enrichedStages.push({
        ...stage,
        assignedEmployeeId,
      });
    }

    const newRow = {
      id,
      date: timestamp,
      party,
      salesman: salesman || 'General Sales',
      fabric: fabric || 'Standard Fabric',
      manager: manager || 'Unassigned',
      manager_employee_id: resolvedManagerId,
      overall_status: overallStatus || 'In Progress',
      qc_box: {
        qcCheckedBy: (qcBox && qcBox.qcCheckedBy) || 'Unassigned',
        cushionBy: (qcBox && qcBox.cushionBy) || 'Unassigned',
        model: (qcBox && qcBox.model) || 'Standard Model',
        image: (qcBox && qcBox.image) || req.body.qcImage || null,
        notes: (qcBox && qcBox.notes) || '',
      },
      stages: enrichedStages,
      activity_logs:
        activityLogs && activityLogs.length > 0
          ? activityLogs
          : [
              {
                id: 'log-' + Date.now(),
                timestamp,
                author: 'Owner',
                text: `Created Job Sheet ${id} for ${party}${manager ? ` (Manager: ${manager})` : ''}`,
              },
            ],
      created_at: timestamp,
      updated_at: timestamp,
    };

    const { data: saved, error } = await supabase
      .from('job_sheets')
      .upsert(newRow, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[Supabase createJobSheet Error]:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to create job sheet in database',
        error: error.message,
      });
    }

    const savedSheet = formatJobSheet(saved);

    // 1. Trigger MANAGER_ASSIGNED notification
    if (savedSheet.manager && savedSheet.manager !== 'Unassigned') {
      try {
        await notificationService.createManagerAssignedNotification({
          jobSheetId: savedSheet.id,
          managerName: savedSheet.manager,
          party: savedSheet.party,
        });
      } catch (mgrNotifErr) {
        console.warn('⚠️ [Manager Notification Warning]:', mgrNotifErr.message);
      }
    }

    // 2. Trigger general JOB_SHEET_CREATED notification
    try {
      await notificationService.createJobSheetNotification(savedSheet);
    } catch (notifErr) {
      console.warn('⚠️ [Job Sheet Notification Warning]:', notifErr.message);
    }

    // 3. Trigger TASK_ASSIGNED notification for each assigned stage
    for (const stage of savedSheet.stages) {
      if (stage.assignedTo && stage.assignedTo !== 'Unassigned') {
        try {
          await notificationService.createTaskAssignedNotification({
            jobSheetId: savedSheet.id,
            taskId: stage.taskId || `TASK-${stage.id}`,
            taskTitle: stage.name || stage.title,
            assignedTo: stage.assignedTo,
            party: savedSheet.party,
            deadline: stage.deadline,
          });
        } catch (notifErr) {
          console.warn('⚠️ [Task Assigned Notification Warning]:', notifErr.message);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `Job Sheet ${id} saved successfully to Supabase`,
      jobSheet: savedSheet,
    });
  } catch (err) {
    console.error('[createJobSheet Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create job sheet in database',
      error: err.message,
    });
  }
};

/**
 * 4. Update Job Sheet
 * PUT /api/jobsheets/:id
 */
exports.updateJobSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = String(id || '').trim();
    const updates = req.body;

    const { data: prevSheet } = await supabase
      .from('job_sheets')
      .select('*')
      .ilike('id', cleanId)
      .maybeSingle();

    if (!prevSheet) {
      return res.status(404).json({
        success: false,
        message: `Job Sheet ${id} not found`,
      });
    }

    let managerEmployeeId = updates.managerEmployeeId || updates.manager_employee_id || prevSheet.manager_employee_id;
    if (updates.manager && updates.manager !== 'Unassigned' && !managerEmployeeId) {
      const mgrInfo = await notificationService.resolveEmployeeIdentifier(updates.manager);
      if (mgrInfo.employeeId) managerEmployeeId = mgrInfo.employeeId;
    }

    // Owner (4821) is NOT applicable to become a manager
    if (managerEmployeeId === '4821' || (updates.manager && updates.manager.toLowerCase() === 'owner')) {
      return res.status(400).json({
        success: false,
        message: 'Owner is not applicable to become a manager. Please select an employee.',
      });
    }

    let qcBox = updates.qcBox || updates.qc_box || prevSheet.qc_box || {};
    if (updates.qcImage && !qcBox.image) {
      qcBox.image = updates.qcImage;
    }

    const rowUpdates = {
      updated_at: new Date().toISOString(),
    };

    if (updates.party !== undefined) rowUpdates.party = updates.party;
    if (updates.salesman !== undefined) rowUpdates.salesman = updates.salesman;
    if (updates.fabric !== undefined) rowUpdates.fabric = updates.fabric;
    if (updates.overallStatus !== undefined) rowUpdates.overall_status = updates.overallStatus;
    if (updates.overall_status !== undefined) rowUpdates.overall_status = updates.overall_status;
    if (updates.manager !== undefined) rowUpdates.manager = updates.manager;
    if (managerEmployeeId !== undefined) rowUpdates.manager_employee_id = managerEmployeeId;
    if (qcBox !== undefined) rowUpdates.qc_box = qcBox;
    if (updates.stages !== undefined) rowUpdates.stages = updates.stages;
    if (updates.activityLogs !== undefined) rowUpdates.activity_logs = updates.activityLogs;
    if (updates.activity_logs !== undefined) rowUpdates.activity_logs = updates.activity_logs;

    const { data: updated, error } = await supabase
      .from('job_sheets')
      .update(rowUpdates)
      .ilike('id', cleanId)
      .select()
      .single();

    if (error || !updated) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update job sheet',
        error: error ? error.message : 'Not found',
      });
    }

    const sheet = formatJobSheet(updated);

    if (updates.manager && updates.manager !== 'Unassigned' && prevSheet.manager !== updates.manager) {
      try {
        await notificationService.createManagerAssignedNotification({
          jobSheetId: sheet.id,
          managerName: updates.manager,
          party: sheet.party,
        });
      } catch (err) {
        console.warn('⚠️ [Manager Reassigned Notification Warning]:', err.message);
      }
    }

    res.json({
      success: true,
      message: `Job Sheet ${id} updated successfully`,
      jobSheet: sheet,
    });
  } catch (err) {
    console.error('[updateJobSheet Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update job sheet',
      error: err.message,
    });
  }
};

/**
 * 5. Update specific stage status in a Job Sheet
 * PATCH /api/jobsheets/:id/stages/:stageId
 */
exports.updateStageStatus = async (req, res) => {
  try {
    const { id, stageId } = req.params;
    const cleanId = String(id || '').trim();
    const {
      status,
      assignedTo,
      assignedEmployeeId,
      deadline,
      completedAt,
      notes,
      image,
      logText,
      author,
      role: requesterRole,
      employeeId: requesterEmpId,
    } = req.body;

    const { data: rawSheet, error: fetchErr } = await supabase
      .from('job_sheets')
      .select('*')
      .ilike('id', cleanId)
      .maybeSingle();

    if (fetchErr || !rawSheet) {
      return res.status(404).json({
        success: false,
        message: `Job Sheet ${id} not found`,
      });
    }

    const sheet = formatJobSheet(rawSheet);
    const stageNum = Number(stageId);
    const stageIndex = (sheet.stages || []).findIndex(
      (s) =>
        s.id === stageNum ||
        String(s.id) === String(stageId) ||
        s.taskId === stageId ||
        `TASK-${s.id}` === stageId
    );

    if (stageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Stage ${stageId} not found in Job Sheet ${id}`,
      });
    }

    const stageBefore = sheet.stages[stageIndex];
    const prevStatus = stageBefore.status;
    const prevAssignedTo = stageBefore.assignedTo;
    const taskTitle = stageBefore.title || stageBefore.name || `Stage ${stageId}`;
    const cleanTaskId = stageBefore.taskId || `TASK-${stageId}`;

    // Permission check
    if (requesterRole === 'employee' || requesterRole === 'EMPLOYEE' || requesterRole === 'manager') {
      const stageAssigned = String(prevAssignedTo || '').trim().toLowerCase();
      const stageAssignedId = String(stageBefore.assignedEmployeeId || '').trim().toLowerCase();
      const sheetManager = String(sheet.manager || '').trim().toLowerCase();
      const sheetManagerId = String(sheet.managerEmployeeId || '').trim().toLowerCase();
      const reqName = String(author || '').trim().toLowerCase();
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

    const normStatus =
      status === 'ONGOING' || status === 'In Progress'
        ? 'ONGOING'
        : status === 'DONE' || status === 'Done'
        ? 'Done'
        : status === 'Not Started' || status === 'NOT_STARTED'
        ? 'Not Started'
        : status;

    if (status !== undefined) sheet.stages[stageIndex].status = normStatus;
    if (assignedTo !== undefined) {
      const isNewAssignment = assignedTo !== prevAssignedTo && assignedTo !== 'Unassigned';
      sheet.stages[stageIndex].assignedTo = assignedTo;
      let finalEmpId = assignedEmployeeId || '';
      if (!finalEmpId && assignedTo !== 'Unassigned') {
        const empInfo = await notificationService.resolveEmployeeIdentifier(assignedTo);
        if (empInfo.employeeId) finalEmpId = empInfo.employeeId;
      }
      if (finalEmpId) {
        sheet.stages[stageIndex].assignedEmployeeId = finalEmpId;
      }
      if (isNewAssignment) {
        try {
          await notificationService.createTaskAssignedNotification({
            jobSheetId: sheet.id,
            taskId: cleanTaskId,
            taskTitle,
            assignedTo,
            party: sheet.party,
            deadline: deadline || stageBefore.deadline,
          });
        } catch (err) {
          console.warn('⚠️ [Task Assigned Warning]:', err.message);
        }
      }
    }
    if (deadline !== undefined) sheet.stages[stageIndex].deadline = deadline;
    if (completedAt !== undefined) sheet.stages[stageIndex].completedAt = completedAt;
    if (notes !== undefined) sheet.stages[stageIndex].notes = notes;
    if (image !== undefined) sheet.stages[stageIndex].image = image;

    const allDone = sheet.stages.every((s) => s.status === 'DONE' || s.status === 'Done');
    sheet.overallStatus = allDone ? 'Done' : 'In Progress';

    if (logText) {
      sheet.activityLogs.unshift({
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        author: author || assignedTo || 'User',
        text: logText,
      });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('job_sheets')
      .update({
        stages: sheet.stages,
        overall_status: sheet.overallStatus,
        activity_logs: sheet.activityLogs,
        updated_at: new Date().toISOString(),
      })
      .ilike('id', cleanId)
      .select()
      .single();

    if (updateErr) {
      console.error('[Supabase updateStageStatus Error]:', updateErr.message);
      return res.status(500).json({ success: false, message: updateErr.message });
    }

    const savedSheet = formatJobSheet(updated);
    const finalAssigned = assignedTo || sheet.stages[stageIndex].assignedTo;

    if (normStatus === 'ONGOING') {
      try {
        await notificationService.createTaskOngoingNotification({
          jobSheetId: sheet.id,
          taskId: cleanTaskId,
          taskTitle,
          assignedTo: finalAssigned,
        });
      } catch (err) {
        console.warn('⚠️ [ONGOING Notification Warning]:', err.message);
      }
    } else if ((normStatus === 'DONE' || normStatus === 'Done') && prevStatus !== 'DONE' && prevStatus !== 'Done') {
      try {
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

        await notificationService.createTaskCompletedNotification({
          jobSheetId: sheet.id,
          taskId: cleanTaskId,
          stageId: stageId,
          taskTitle,
          completedBy: author || finalAssigned || 'User',
          assignedTo: finalAssigned || 'User',
          completedAt: completedAt || new Date().toISOString(),
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

    const sheetManager = (sheet.manager || '').trim().toLowerCase();
    const sheetManagerId = (sheet.managerEmployeeId || '').trim().toLowerCase();
    const reqName = (author || '').trim().toLowerCase();
    const reqEmpId = (requesterEmpId || '').trim().toLowerCase();

    const isUpdatedByManager = Boolean(
      req.body.isManager ||
      ((sheetManager && sheetManager !== 'unassigned') &&
      ((reqName && (sheetManager === reqName || sheetManager.includes(reqName) || reqName.includes(sheetManager))) ||
       (reqEmpId && (sheetManager === reqEmpId || sheetManagerId === reqEmpId || sheetManager.includes(reqEmpId)))))
    );

    if (isUpdatedByManager) {
      try {
        await notificationService.notifyManagerProgressChange({
          jobSheetId: sheet.id,
          stageId: stageId,
          stageName: taskTitle,
          status: normStatus || prevStatus,
          assignedTo: finalAssigned,
          managerName: sheet.manager,
          managerEmployeeId: sheet.managerEmployeeId,
          party: sheet.party,
          actionText: logText,
        });
      } catch (mErr) {
        console.warn('⚠️ [Manager Progress Notification Warning]:', mErr.message);
      }
    }

    res.json({
      success: true,
      message: `Stage ${stageId} updated successfully`,
      jobSheet: savedSheet,
    });
  } catch (err) {
    console.error('[updateStageStatus Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update stage',
      error: err.message,
    });
  }
};

/**
 * 6. Delete a Job Sheet
 * DELETE /api/jobsheets/:id
 */
exports.deleteJobSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = String(id || '').trim();

    const { error } = await supabase
      .from('job_sheets')
      .delete()
      .ilike('id', cleanId);

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete job sheet',
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: `Job Sheet ${id} deleted successfully from Supabase`,
    });
  } catch (err) {
    console.error('[deleteJobSheet Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete job sheet',
      error: err.message,
    });
  }
};

/**
 * 7. Clear all Job Sheets (Owner reset)
 * DELETE /api/jobsheets
 */
exports.clearAllJobSheets = async (req, res) => {
  try {
    const { error } = await supabase.from('job_sheets').delete().neq('id', '');
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to clear job sheets from database',
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: `All Job Sheets cleared from database`,
    });
  } catch (err) {
    console.error('[clearAllJobSheets Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to clear job sheets from database',
      error: err.message,
    });
  }
};

/**
 * 8. Delete a specific stage from a Job Sheet (Owner only, Not Started status)
 * DELETE /api/jobsheets/:id/stages/:stageId
 */
exports.deleteStage = async (req, res) => {
  try {
    const { id, stageId } = req.params;
    const cleanId = String(id || '').trim();

    const { data: rawSheet } = await supabase
      .from('job_sheets')
      .select('*')
      .ilike('id', cleanId)
      .maybeSingle();

    if (!rawSheet) {
      return res.status(404).json({
        success: false,
        message: `Job Sheet ${id} not found`,
      });
    }

    const sheet = formatJobSheet(rawSheet);
    const stageNum = Number(stageId);
    const stage = (sheet.stages || []).find((s) => s.id === stageNum || s.taskId === stageId);

    if (!stage) {
      return res.status(404).json({
        success: false,
        message: `Stage ${stageId} not found in Job Sheet ${id}`,
      });
    }

    if (stage.status !== 'Not Started' && stage.status !== 'Done' && stage.status !== 'DONE') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete task "${stage.name}" with status "${stage.status}". Only tasks in "Not Started" or "Done" status can be deleted.`,
      });
    }

    const requesterRole = req.body?.role || req.headers['x-user-role'];
    if (requesterRole === 'employee' || requesterRole === 'EMPLOYEE') {
      const stageIndex = sheet.stages.findIndex((s) => s.id === stageNum || s.taskId === stageId);
      if (stageIndex !== -1) {
        sheet.stages[stageIndex].assignedTo = 'Unassigned';
        sheet.stages[stageIndex].assignedEmployeeId = '';
        sheet.stages[stageIndex].status = 'Not Started';
      }
      sheet.activityLogs.unshift({
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        author: req.body?.author || 'Employee',
        text: `Unassigned task "${stage.name}" in Job Sheet ${id}.`,
      });
    } else {
      sheet.stages = sheet.stages.filter((s) => s.id !== stageNum && s.taskId !== stageId);
      sheet.activityLogs.unshift({
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        author: req.body?.author || 'User',
        text: `Removed task "${stage.name}" from Job Sheet ${id}.`,
      });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('job_sheets')
      .update({
        stages: sheet.stages,
        activity_logs: sheet.activityLogs,
        updated_at: new Date().toISOString(),
      })
      .ilike('id', cleanId)
      .select()
      .single();

    if (updateErr) {
      return res.status(500).json({ success: false, message: updateErr.message });
    }

    // Clean up notifications for this stage
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('job_sheet_id', sheet.id)
        .or(`task_id.eq.${stageId},task_id.eq.${stage.taskId}`);
    } catch (cleanErr) {
      // non-blocking
    }

    res.json({
      success: true,
      message: `Stage ${stageId} updated successfully in Job Sheet ${id}`,
      jobSheet: formatJobSheet(updated),
    });
  } catch (err) {
    console.error('[deleteStage Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete stage from job sheet',
      error: err.message,
    });
  }
};

/**
 * 9. Remove all assigned tasks/stages from a Job Sheet (Owner only)
 * DELETE /api/jobsheets/:id/stages
 */
exports.removeAllStages = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = String(id || '').trim();

    const { data: rawSheet } = await supabase
      .from('job_sheets')
      .select('*')
      .ilike('id', cleanId)
      .maybeSingle();

    if (!rawSheet) {
      return res.status(404).json({
        success: false,
        message: `Job Sheet ${id} not found`,
      });
    }

    const sheet = formatJobSheet(rawSheet);
    sheet.stages = [];
    sheet.activityLogs.unshift({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      author: 'Owner',
      text: `Removed all assigned tasks from Job Sheet ${id}.`,
    });

    const { data: updated, error: updateErr } = await supabase
      .from('job_sheets')
      .update({
        stages: sheet.stages,
        activity_logs: sheet.activityLogs,
        updated_at: new Date().toISOString(),
      })
      .ilike('id', cleanId)
      .select()
      .single();

    if (updateErr) {
      return res.status(500).json({ success: false, message: updateErr.message });
    }

    res.json({
      success: true,
      message: `All assigned tasks removed from Job Sheet ${id}`,
      jobSheet: formatJobSheet(updated),
    });
  } catch (err) {
    console.error('[removeAllStages Error]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to remove all assigned tasks from job sheet',
      error: err.message,
    });
  }
};

module.exports = {
  ...exports,
  formatJobSheet,
};
