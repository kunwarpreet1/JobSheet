import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import WorkflowPipeline from '../components/WorkflowPipeline';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import VectorIcon from '../components/VectorIcon';
import DateTimePickerModal from '../components/DateTimePickerModal';
import StageDetailModal from '../components/StageDetailModal';
import { pickImageFromGallery } from '../utils/imagePickerHelper';
import { COLORS, SPACING, isTablet } from '../styles/theme';
import { formatDateStr, formatFullTimestamp } from '../utils/deadlineCalculator';
import {
  isTaskAssignedToUser,
  isJobSheetAssignedToUser,
  isUserJobSheetManager,
  isStatusDone,
  isStatusNotStarted,
  isStatusOngoing,
} from '../utils/storage';
import { getJobSheetByIdApi } from '../services/apiClient';

export default function JobSheetDetailScreen({ jobSheetId, onBack, isTabletView = false }) {
  const {
    jobSheets,
    setJobSheets,
    deleteJobSheet,
    deleteStageFromJobSheet,
    masterData,
    updateTaskStatus,
    updateQCBox,
    updateJobSheetManager,
    role,
    currentUser,
    activeEmployee,
  } = useApp();

  const cleanId = String(jobSheetId || '').trim().toLowerCase();
  const foundSheet = jobSheets.find(
    (s) =>
      s.id === jobSheetId ||
      s._id === jobSheetId ||
      String(s.id || '').trim().toLowerCase() === cleanId ||
      String(s._id || '').trim().toLowerCase() === cleanId ||
      String(s.jobSheetId || '').trim().toLowerCase() === cleanId
  );

  const [fetchedSheet, setFetchedSheet] = useState(null);
  const [localSheet, setLocalSheet] = useState(foundSheet || null);
  const [isLoadingSheet, setIsLoadingSheet] = useState(!foundSheet && Boolean(jobSheetId));

  // Sync foundSheet into localSheet if localSheet is not yet populated
  useEffect(() => {
    if (foundSheet && !localSheet) {
      setLocalSheet(foundSheet);
      setFetchedSheet(foundSheet);
    }
  }, [foundSheet, localSheet]);

  // ALWAYS fetch fresh Job Sheet details from MongoDB on mount/focus to guarantee all assigned tasks are visible
  useEffect(() => {
    if (!jobSheetId) return;
    let isMounted = true;
    if (!foundSheet && !localSheet) {
      setIsLoadingSheet(true);
    }
    getJobSheetByIdApi(jobSheetId)
      .then((res) => {
        if (isMounted && res.success && res.jobSheet) {
          setFetchedSheet(res.jobSheet);
          setLocalSheet(res.jobSheet);
          setJobSheets((prev) => {
            const cleanTargetId = String(jobSheetId).trim().toLowerCase();
            const exists = prev.some(
              (s) =>
                s.id === res.jobSheet.id ||
                s._id === res.jobSheet._id ||
                String(s.id || '').trim().toLowerCase() === cleanTargetId ||
                String(s._id || '').trim().toLowerCase() === cleanTargetId ||
                String(s.jobSheetId || '').trim().toLowerCase() === cleanTargetId
            );
            if (!exists) {
              return [res.jobSheet, ...prev];
            }
            return prev.map((s) => {
              const isMatch =
                s.id === res.jobSheet.id ||
                s._id === res.jobSheet._id ||
                String(s.id || '').trim().toLowerCase() === cleanTargetId ||
                String(s._id || '').trim().toLowerCase() === cleanTargetId ||
                String(s.jobSheetId || '').trim().toLowerCase() === cleanTargetId;
              return isMatch ? res.jobSheet : s;
            });
          });
        }
      })
      .catch((err) => {
        console.warn('[Fetch JobSheet Detail Error]:', err.message);
      })
      .finally(() => {
        if (isMounted) setIsLoadingSheet(false);
      });
    return () => {
      isMounted = false;
    };
  }, [jobSheetId]);

  const sheet = localSheet || foundSheet || fetchedSheet;

  // Modal States
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showStageInspector, setShowStageInspector] = useState(false);
  const [inspectorStage, setInspectorStage] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showChangeManagerModal, setShowChangeManagerModal] = useState(false);
  const [selectedNewManager, setSelectedNewManager] = useState('');

  // Edit Task State
  const [taskNotes, setTaskNotes] = useState('');
  const [taskImage, setTaskImage] = useState(null);
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskDeadline, setTaskDeadline] = useState(null);

  const isOwnerStaff = (emp) => {
    if (!emp) return false;
    const roleClean = String(emp.role || '').trim().toLowerCase();
    const idClean = String(emp.employeeId || '').trim();
    const nameClean = String(emp.name || '').trim().toLowerCase();
    return (
      roleClean === 'owner' ||
      roleClean === 'admin' ||
      idClean === '4821' ||
      nameClean === 'owner' ||
      nameClean === 'admin'
    );
  };

  const eligibleEmployees = (masterData.employees || []).filter((emp) => !isOwnerStaff(emp));

  // Carpentry QC Edit state
  const [showQCModal, setShowQCModal] = useState(false);
  const [qcCheckedBy, setQcCheckedBy] = useState(sheet?.qcBox?.qcCheckedBy || '');
  const [qcCushionBy, setQcCushionBy] = useState(sheet?.qcBox?.cushionBy || '');
  const [qcModel, setQcModel] = useState(sheet?.qcBox?.model || '');
  const [qcImage, setQcImage] = useState(sheet?.qcBox?.image || null);
  const [qcNotes, setQcNotes] = useState(sheet?.qcBox?.notes || '');

  useEffect(() => {
    if (sheet?.qcBox) {
      setQcCheckedBy(sheet.qcBox.qcCheckedBy || '');
      setQcCushionBy(sheet.qcBox.cushionBy || '');
      setQcModel(sheet.qcBox.model || '');
      setQcImage(sheet.qcBox.image || null);
      setQcNotes(sheet.qcBox.notes || '');
    }
  }, [sheet]);

  const handlePickTaskImage = async () => {
    const uri = await pickImageFromGallery();
    if (uri) {
      setTaskImage(uri);
    }
  };

  const handlePickQcImage = async () => {
    const uri = await pickImageFromGallery();
    if (uri) {
      setQcImage(uri);
    }
  };

  if (isLoadingSheet) {
    return (
      <View style={styles.errorBox}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={[styles.errorText, { marginTop: 12, color: COLORS.textPrimary }]}>Loading Job Sheet details...</Text>
      </View>
    );
  }

  if (!sheet) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>Job Sheet not found.</Text>
        {onBack && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>← Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Permission Check: Employee can ONLY view Job Sheets that contain their assigned tasks or if they are Manager!
  const isEmployee = role === 'EMPLOYEE';
  const isOwner = role === 'OWNER';
  const isManager = isUserJobSheetManager(sheet, currentUser, activeEmployee);
  const canManageJobSheet = isOwner || isManager;
  const hasAssignedTask = !isEmployee || isJobSheetAssignedToUser(sheet, currentUser, activeEmployee);

  if (isEmployee && !hasAssignedTask) {
    return (
      <View style={styles.errorBox}>
        <VectorIcon name="lock" size={48} color={COLORS.statusOverdue} style={{ marginBottom: SPACING.md }} />
        <Text style={[styles.errorText, { fontSize: 18, color: COLORS.textPrimary }]}>Access Restricted</Text>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, maxWidth: 300, lineHeight: 18 }}>
          This Job Sheet does not contain any tasks assigned to your employee account ({activeEmployee}).
        </Text>
        {onBack && (
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: COLORS.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 18 }]} onPress={onBack}>
            <Text style={[styles.backBtnText, { color: '#FFFFFF', marginTop: 0 }]}>← Back to My Job Sheets</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const updateLocalSheetStage = (stageId, updatedProps) => {
    const mutateStages = (baseSheet) => {
      if (!baseSheet) return null;
      const idx = (baseSheet.stages || []).findIndex(
        (s) =>
          s.id === stageId ||
          String(s.id) === String(stageId) ||
          s.taskId === stageId ||
          `TASK-${s.id}` === stageId
      );
      if (idx === -1) return baseSheet;
      const newStages = [...baseSheet.stages];
      newStages[idx] = { ...newStages[idx], ...updatedProps };
      return { ...baseSheet, stages: newStages };
    };

    setLocalSheet((prev) => mutateStages(prev || foundSheet || fetchedSheet));
    setFetchedSheet((prev) => mutateStages(prev || foundSheet || localSheet));
  };

  // Remove any legacy "JOB SHEET" stage so production pipeline strictly starts with "FABRIC ORDER"
  const cleanStages = (sheet.stages || []).filter(
    (s) =>
      s.key !== 'JOB_SHEET' &&
      s.name !== 'JOB SHEET' &&
      s.name !== 'Job Sheet' &&
      !String(s.name || '').toLowerCase().includes('job sheet')
  );

  const employeeAssignedStages = cleanStages.filter((s) =>
    isTaskAssignedToUser(s, currentUser, activeEmployee)
  );

  // Requirements:
  // 1. Owner can ONLY see production pipeline who is getting assigned by manager
  // 2. Manager sees full production pipeline starting with Fabric Order (10 sequential stages to assign)
  // 3. Worker sees all production stages assigned to their employee account
  const visibleStages = isOwner
    ? cleanStages.filter((s) => s.assignedTo && s.assignedTo !== 'Unassigned')
    : isManager
      ? cleanStages
      : employeeAssignedStages;

  // Overall progress calculation:
  // For Owner and Manager: track across all 10 production stages
  // For Employee: track across their assigned stages
  const relevantStages = canManageJobSheet ? cleanStages : employeeAssignedStages;
  const doneCount = relevantStages.filter((s) => isStatusDone(s.status)).length;
  const totalCount = relevantStages.length > 0 ? relevantStages.length : 10;

  const handleInspectStage = (stage) => {
    setInspectorStage(stage);
    setShowStageInspector(true);
  };

  const handleOpenTaskModal = (task) => {
    setSelectedTask(task);
    setTaskNotes(task.notes || '');
    setTaskImage(task.image || null);
    setTaskAssignedTo(task.assignedTo && task.assignedTo !== 'Unassigned' ? task.assignedTo : (eligibleEmployees[0]?.name || ''));
    setTaskDeadline(task.deadline || null);
    setShowTaskModal(true);
  };

  const handleSaveTaskUpdates = (newStatus) => {
    if (!selectedTask) return;

    // Task completion check
    if (newStatus === 'Done') {
      if (canManageJobSheet) {
        // Owner or Manager is permitted to mark Done once task has been started
        if (isStatusNotStarted(selectedTask.status)) {
          Alert.alert('Start Task First', 'Please start the task before marking it as Done.');
          return;
        }
      } else {
        // Employee can only mark Done tasks assigned to their account
        if (!isTaskAssignedToUser(selectedTask, currentUser, activeEmployee)) {
          Alert.alert(
            'Permission Denied',
            `You can only mark DONE tasks assigned to your employee account. This task is assigned to "${selectedTask.assignedTo}".`
          );
          return;
        }
      }
    }

    const matchedEmployee = (masterData.employees || []).find(
      (e) => e.name.toLowerCase() === (taskAssignedTo || '').toLowerCase()
    );
    const assignedEmployeeId = matchedEmployee?.employeeId || selectedTask?.assignedEmployeeId || '';

    updateTaskStatus(sheet.id, selectedTask.id, newStatus, {
      assignedTo: taskAssignedTo,
      assignedEmployeeId,
      deadline: taskDeadline,
      notes: taskNotes,
      image: taskImage,
      isManager: canManageJobSheet,
      sheet,
    });
    updateLocalSheetStage(selectedTask.id, {
      status: newStatus,
      assignedTo: taskAssignedTo,
      assignedEmployeeId,
      deadline: taskDeadline,
      notes: taskNotes,
      image: taskImage,
      completedAt: isStatusDone(newStatus) ? new Date().toISOString() : null,
    });
    setShowTaskModal(false);
  };

  const handleStartTask = (task) => {
    // Owner or Production Manager can start assigned tasks
    if (!canManageJobSheet) {
      Alert.alert(
        'Permission Denied',
        'Only the Owner or Production Manager can start assigned tasks.'
      );
      return;
    }

    if (!task.assignedTo || task.assignedTo === 'Unassigned') {
      Alert.alert(
        'Assign Employee First',
        'Please assign an employee to this task before starting it.'
      );
      return;
    }

    updateTaskStatus(sheet.id, task.id, 'ONGOING', {
      assignedTo: task.assignedTo,
      assignedEmployeeId: task.assignedEmployeeId,
      isManager: canManageJobSheet,
      sheet,
    });
    updateLocalSheetStage(task.id, {
      status: 'ONGOING',
    });
    Alert.alert('🚀 Task Started', `"${task.name}" is now ONGOING. Notification sent to ${task.assignedTo}.`);
  };

  const handleDeleteCurrentTask = () => {
    if (!selectedTask || !sheet) return;
    Alert.alert(
      'Delete Assigned Task',
      `Are you sure you want to remove "${selectedTask.name}" from Job Sheet ${sheet.id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStageFromJobSheet(sheet.id, selectedTask.id);
              setShowTaskModal(false);
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete task.');
            }
          },
        },
      ]
    );
  };

  const handleChangeManager = (newManager) => {
    if (!newManager) return;
    const emp = (masterData.employees || []).find((e) => e.name.toLowerCase() === newManager.toLowerCase());
    const managerEmpId = emp?.employeeId || '';

    updateJobSheetManager(sheet.id, newManager, managerEmpId);
    setFetchedSheet((prev) => (prev ? { ...prev, manager: newManager, managerEmployeeId: managerEmpId } : prev));
    setLocalSheet((prev) => (prev ? { ...prev, manager: newManager, managerEmployeeId: managerEmpId } : prev));
    setShowChangeManagerModal(false);
    Alert.alert('Manager Updated', `"${newManager}" has been assigned as the Production Manager for this Job Sheet.`);
  };

  const handleSaveQCBox = () => {
    updateQCBox(sheet.id, {
      qcCheckedBy,
      cushionBy: qcCushionBy,
      model: qcModel,
      image: qcImage,
      notes: qcNotes,
    });
    setShowQCModal(false);
    Alert.alert('QC Updated', 'Carpentry QC Box information saved successfully.');
  };

  const isCurrentTaskAssigned = isTaskAssignedToUser(selectedTask, currentUser, activeEmployee);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>


      {/* Main Job Sheet Banner */}
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.sheetTitle}>{sheet.id}</Text>
            <Text style={styles.partyName}>{sheet.party}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <StatusBadge status={sheet.overallStatus} />
            {role === 'OWNER' && (
              <TouchableOpacity
                style={styles.deleteSheetBtn}
                onPress={() =>
                  Alert.alert(
                    'Delete Job Sheet',
                    `Are you sure you want to delete ${sheet.id}?`,
                    [
                      { text: 'Cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          deleteJobSheet(sheet.id);
                          if (onBack) onBack();
                        },
                      },
                    ]
                  )
                }
              >
                <VectorIcon name="trash" size={13} color="#EF4444" />
                <Text style={styles.deleteSheetText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Basic Information Grid */}
        <View style={styles.basicInfoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.label}>Salesman:</Text>
            <Text style={styles.val}>{sheet.salesman || 'N/A'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.label}>Fabric:</Text>
            <Text style={styles.val}>{sheet.fabric || 'N/A'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.label}>Created Date:</Text>
            <Text style={styles.val}>{formatDateStr(sheet.date)}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <ProgressBar completedCount={doneCount} totalCount={totalCount} height={10} />
        </View>

        {/* Production Manager Banner */}
        <View style={styles.managerBanner}>
          <View style={styles.managerBannerLeft}>
            <View style={styles.managerBadgeCircle}>
              <VectorIcon name="user" size={15} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.managerBannerLabel}>PRODUCTION MANAGER</Text>
                {sheet.managerEmployeeId ? (
                  <View style={styles.managerIdBadge}>
                    <Text style={styles.managerIdBadgeText}>{sheet.managerEmployeeId}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.managerBannerName}>{sheet.manager || 'Unassigned'}</Text>
              {isManager && (
                <Text style={styles.managerDutyNote}>
                  👑 You are managing this Job Sheet. Assign tasks below sequentially.
                </Text>
              )}
            </View>
          </View>
          {isOwner && (
            <TouchableOpacity
              style={styles.changeManagerBtn}
              onPress={() => {
                setSelectedNewManager(sheet.manager || '');
                setShowChangeManagerModal(true);
              }}
              activeOpacity={0.7}
            >
              <VectorIcon name="edit" size={12} color="#4F46E5" />
              <Text style={styles.changeManagerBtnText}>Change</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SECTION 3: CARPENTRY QC / PRODUCTION BOX */}
      <View style={styles.qcBoxContainer}>
        <View style={styles.qcHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <VectorIcon name="carpentry" size={16} color={COLORS.accent} />
            <Text style={styles.qcTitle}>CARPENTRY QC / PRODUCTION BOX</Text>
          </View>
          {canManageJobSheet && (
            <TouchableOpacity style={styles.editQcBtn} onPress={() => setShowQCModal(true)}>
              <VectorIcon name="edit" size={12} color={COLORS.accent} />
              <Text style={styles.editQcBtnText}>Edit QC</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.qcGrid}>
          <View style={styles.qcItem}>
            <Text style={styles.qcLabel}>QC Checked:</Text>
            <Text style={styles.qcVal}>{sheet?.qcBox?.qcCheckedBy || 'Unassigned'}</Text>
          </View>
          <View style={styles.qcItem}>
            <Text style={styles.qcLabel}>Cushion:</Text>
            <Text style={styles.qcVal}>{sheet?.qcBox?.cushionBy || 'Unassigned'}</Text>
          </View>
          <View style={styles.qcItem}>
            <Text style={styles.qcLabel}>Model:</Text>
            <Text style={styles.qcVal}>{sheet?.qcBox?.model || 'N/A'}</Text>
          </View>
        </View>

        {/* Image Attachment (Optional) */}
        {(sheet?.qcBox?.image || sheet?.qcImage || sheet?.image) ? (
          <View style={styles.qcImagePreviewBox}>
            <Image
              source={{ uri: sheet?.qcBox?.image || sheet?.qcImage || sheet?.image }}
              style={styles.qcImg}
              resizeMode="cover"
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <VectorIcon name="camera" size={12} color={COLORS.accent} />
              <Text style={styles.qcImgTag}>Attached QC Inspection Photo</Text>
            </View>
          </View>
        ) : canManageJobSheet ? (
          <TouchableOpacity style={styles.uploadQCImgBtn} onPress={() => setShowQCModal(true)}>
            <VectorIcon name="camera" size={13} color={COLORS.accent} />
            <Text style={styles.uploadQCImgText}>Upload QC Image (Optional)</Text>
          </TouchableOpacity>
        ) : null}

        {sheet?.qcBox?.notes ? (
          <Text style={styles.qcNotesText}>Note: {sheet.qcBox.notes}</Text>
        ) : null}
      </View>

      {/* SECTION 4: PRODUCTION WORKFLOW PIPELINE */}
      <WorkflowPipeline
        stages={visibleStages}
        onTaskPress={handleInspectStage}
        onStartTaskPress={handleStartTask}
        onEditTaskPress={handleOpenTaskModal}
        onMarkDonePress={(task) => {
          if (canManageJobSheet) {
            updateTaskStatus(sheet.id, task.id, 'Done', {
              assignedTo: task.assignedTo || activeEmployee,
              assignedEmployeeId: task.assignedEmployeeId || '',
              isManager: canManageJobSheet,
              sheet,
            });
            updateLocalSheetStage(task.id, {
              status: 'Done',
              completedAt: new Date().toISOString(),
            });
            Alert.alert('Task Completed', `"${task.name}" has been marked as Done.`);
          } else {
            handleOpenTaskModal(task);
          }
        }}
        activeEmployee={activeEmployee}
        currentUser={currentUser}
        isOwner={isOwner}
        isManager={isManager}
      />

      {/* MODAL: TASK UPDATE / COMPLETE MODAL */}
      <Modal visible={showTaskModal} transparent animationType="slide" onRequestClose={() => setShowTaskModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedTask?.name}</Text>
            <Text style={styles.modalSub}>
              Job Sheet: {sheet.id} • {sheet.party}
            </Text>

            <ScrollView style={{ maxHeight: 350 }}>
              {/* Responsible Person Section */}
              <Text style={styles.fieldLabel}>Assigned Responsible Person:</Text>
              {canManageJobSheet ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {eligibleEmployees.map((emp) => {
                    const isSelected = taskAssignedTo === emp.name;
                    return (
                      <TouchableOpacity
                        key={emp.id || emp.employeeId}
                        style={[styles.empChip, isSelected && styles.empChipSelected]}
                        onPress={() => setTaskAssignedTo(emp.name)}
                      >
                        <Text style={[styles.empChipText, isSelected && styles.empChipTextSelected]}>
                          {emp.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.readOnlyField}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <VectorIcon name="user" size={13} color={COLORS.textSecondary} />
                    <Text style={styles.readOnlyText}>{taskAssignedTo || 'Unassigned'} (Set by Manager/Owner)</Text>
                  </View>
                </View>
              )}

              {/* Deadline & Time Section */}
              <Text style={styles.fieldLabel}>Deadline & Time:</Text>
              {canManageJobSheet ? (
                <TouchableOpacity
                  style={styles.deadlineBtn}
                  onPress={() => setShowDatePicker(true)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <VectorIcon name="calendar" size={14} color={COLORS.accent} />
                    <Text style={styles.deadlineBtnText}>
                      {taskDeadline ? formatFullTimestamp(taskDeadline) : 'Set Deadline Date & Clock Time'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.readOnlyField}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <VectorIcon name="clock" size={13} color={COLORS.textSecondary} />
                    <Text style={styles.readOnlyText}>
                      {taskDeadline ? formatFullTimestamp(taskDeadline) : 'As per schedule'} (Set by Manager/Owner)
                    </Text>
                  </View>
                </View>
              )}

              {/* Notes */}
              <Text style={styles.fieldLabel}>Task Notes / Comments:</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Enter remarks or progress notes..."
                value={taskNotes}
                onChangeText={setTaskNotes}
                multiline
                numberOfLines={3}
              />

              {/* Optional Photo Attachment */}
              <Text style={styles.fieldLabel}>Proof Photo (Optional):</Text>
              {taskImage ? (
                <View style={styles.taskImgPreviewBox}>
                  <Image source={{ uri: taskImage }} style={styles.taskImg} />
                  <TouchableOpacity onPress={() => setTaskImage(null)}>
                    <Text style={styles.removeImgText}>Remove Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addPhotoBtn} onPress={handlePickTaskImage}>
                  <VectorIcon name="camera" size={14} color={COLORS.accent} />
                  <Text style={styles.addPhotoBtnText}>Attach Photo from Gallery</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Action Buttons */}
            {canManageJobSheet ? (
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.markDoneBigBtn, { backgroundColor: COLORS.accent, flex: 1 }]}
                  onPress={() => handleSaveTaskUpdates(selectedTask?.status || 'Not Started')}
                >
                  <Text style={styles.markDoneBigBtnText}>SAVE TASK ASSIGNMENT</Text>
                </TouchableOpacity>
                {selectedTask?.status !== 'Not Started' && selectedTask?.status !== 'Done' && (
                  <TouchableOpacity
                    style={[styles.markDoneBigBtn, { backgroundColor: COLORS.statusDone, flex: 1, marginLeft: 8 }]}
                    onPress={() => handleSaveTaskUpdates('Done')}
                  >
                    <Text style={styles.markDoneBigBtnText}>MARK DONE</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : isCurrentTaskAssigned ? (
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.notDoneBtn}
                  onPress={() => handleSaveTaskUpdates('Not Done')}
                >
                  <Text style={styles.notDoneBtnText}>NOT DONE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.markDoneBigBtn}
                  onPress={() => handleSaveTaskUpdates('Done')}
                >
                  <Text style={styles.markDoneBigBtnText}>MARK DONE</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.readOnlyTaskBanner}>
                <VectorIcon name="lock" size={14} color="#B45309" />
                <Text style={styles.readOnlyTaskBannerText}>
                  Read-Only: Assigned to {selectedTask?.assignedTo || 'Other'}. Only the assigned employee can mark this DONE.
                </Text>
              </View>
            )}

            {(canManageJobSheet || isCurrentTaskAssigned || role === 'OWNER') && (
              <TouchableOpacity
                style={styles.deleteTaskModalBtn}
                onPress={handleDeleteCurrentTask}
                activeOpacity={0.7}
              >
                <VectorIcon name="trash" size={14} color="#EF4444" />
                <Text style={styles.deleteTaskModalBtnText}>Delete This Task</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowTaskModal(false)}>
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: CARPENTRY QC EDIT */}
      <Modal visible={showQCModal} transparent animationType="slide" onRequestClose={() => setShowQCModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Carpentry QC / Production Setup</Text>
            <Text style={styles.modalSub}>Only selectable options created by Owner:</Text>

            <ScrollView style={{ maxHeight: 380 }}>
              {/* QC Checked Dropdown */}
              <Text style={styles.fieldLabel}>QC Checked By:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {eligibleEmployees.map((emp) => (
                  <TouchableOpacity
                    key={emp.id || emp.employeeId}
                    style={[styles.empChip, qcCheckedBy === emp.name && styles.empChipSelected]}
                    onPress={() => setQcCheckedBy(emp.name)}
                  >
                    <Text style={[styles.empChipText, qcCheckedBy === emp.name && styles.empChipTextSelected]}>
                      {emp.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Cushion Person Dropdown */}
              <Text style={styles.fieldLabel}>Cushion Person:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {eligibleEmployees.map((emp) => (
                  <TouchableOpacity
                    key={emp.id || emp.employeeId}
                    style={[styles.empChip, qcCushionBy === emp.name && styles.empChipSelected]}
                    onPress={() => setQcCushionBy(emp.name)}
                  >
                    <Text style={[styles.empChipText, qcCushionBy === emp.name && styles.empChipTextSelected]}>
                      {emp.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Model Selectable Dropdown */}
              <Text style={styles.fieldLabel}>Model Selection:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {masterData.models.map((mod) => (
                  <TouchableOpacity
                    key={mod.id}
                    style={[styles.empChip, qcModel === mod.name && styles.empChipSelected]}
                    onPress={() => setQcModel(mod.name)}
                  >
                    <Text style={[styles.empChipText, qcModel === mod.name && styles.empChipTextSelected]}>
                      {mod.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Image Upload */}
              <Text style={styles.fieldLabel}>QC Image (Optional):</Text>
              {qcImage ? (
                <View style={styles.taskImgPreviewBox}>
                  <Image source={{ uri: qcImage }} style={styles.taskImg} />
                  <TouchableOpacity onPress={() => setQcImage(null)}>
                    <Text style={styles.removeImgText}>Remove Image</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addPhotoBtn} onPress={handlePickQcImage}>
                  <VectorIcon name="camera" size={14} color={COLORS.accent} />
                  <Text style={styles.addPhotoBtnText}>Upload QC Image from Gallery</Text>
                </TouchableOpacity>
              )}

              {/* Notes */}
              <Text style={styles.fieldLabel}>QC Notes:</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="QC inspection remarks..."
                value={qcNotes}
                onChangeText={setQcNotes}
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowQCModal(false)}>
                <Text style={styles.closeModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveQCBtn} onPress={handleSaveQCBox}>
                <Text style={styles.saveQCBtnText}>Save QC Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: CHANGE PRODUCTION MANAGER (Owner Only) */}
      <Modal
        visible={showChangeManagerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangeManagerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Production Manager</Text>
            <Text style={styles.modalSub}>
              Select the employee responsible for supervising Job Sheet {sheet.id} and assigning production tasks:
            </Text>

            <ScrollView style={{ maxHeight: 300, marginVertical: 12 }}>
              {(masterData.employees || [])
                .filter(
                  (emp) =>
                    (emp.role || '').toLowerCase() !== 'owner' &&
                    String(emp.employeeId).trim() !== '4821' &&
                    (emp.name || '').toLowerCase() !== 'owner' &&
                    (emp.name || '').toLowerCase() !== 'admin'
                )
                .map((emp) => {
                  const isSelected = (selectedNewManager || sheet.manager || '').toLowerCase() === emp.name.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={emp.id || emp.employeeId}
                      style={[styles.managerSelectCard, isSelected && styles.managerSelectCardSelected]}
                      onPress={() => setSelectedNewManager(emp.name)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={[styles.managerAvatarSmall, isSelected && styles.managerAvatarSmallSelected]}>
                          <Text style={[styles.managerAvatarSmallText, isSelected && { color: '#FFFFFF' }]}>
                            {(emp.name || 'E').substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={[styles.managerSelectName, isSelected && styles.managerSelectNameSelected]}>
                            {emp.name}
                          </Text>
                          <Text style={styles.managerSelectDept}>{emp.department || 'Production'}</Text>
                        </View>
                      </View>
                      <View style={[styles.radioDot, isSelected && styles.radioDotSelected]}>
                        {isSelected && <VectorIcon name="check" size={12} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.closeModalBtn, { flex: 1 }]}
                onPress={() => setShowChangeManagerModal(false)}
              >
                <Text style={styles.closeModalBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveQCBtn, { flex: 1, backgroundColor: '#4F46E5' }]}
                onPress={() => handleChangeManager(selectedNewManager || sheet.manager)}
              >
                <Text style={styles.saveQCBtnText}>CONFIRM & NOTIFY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date & Time Picker Modal */}
      <DateTimePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        initialDate={taskDeadline}
        onSelectDeadline={(newDeadline) => setTaskDeadline(newDeadline)}
      />

      {/* Stage Detail Inspector Modal */}
      <StageDetailModal
        visible={showStageInspector}
        onClose={() => setShowStageInspector(false)}
        stage={inspectorStage}
        jobSheet={sheet}
        onActionPress={handleOpenTaskModal}
        isOwner={canManageJobSheet}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
  },
  content: {
    padding: SPACING.md,
  },
  topBackBtn: {
    marginBottom: SPACING.md,
  },
  topBackText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.accent,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sheetTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  partyName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
  },
  basicInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    backgroundColor: COLORS.bgLight,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  infoCol: {
    flex: 1,
    minWidth: 100,
  },
  label: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  val: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 4,
  },
  managerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: SPACING.sm + 2,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  managerBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  managerBadgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  managerBannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  managerIdBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  managerIdBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#3730A3',
  },
  managerBannerName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  managerDutyNote: {
    fontSize: 10,
    color: '#4F46E5',
    marginTop: 2,
    fontWeight: '600',
  },
  changeManagerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  changeManagerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  managerSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: SPACING.sm,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  managerSelectCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  managerAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  managerAvatarSmallSelected: {
    backgroundColor: '#4F46E5',
  },
  managerAvatarSmallText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  managerSelectName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  managerSelectNameSelected: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  managerSelectDept: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioDotSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#4F46E5',
  },
  qcBoxContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qcHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  qcTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  editQcBtn: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editQcBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.accent,
  },
  qcGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  qcItem: {
    flex: 1,
    minWidth: 100,
    backgroundColor: COLORS.bgLight,
    padding: SPACING.sm,
    borderRadius: 8,
  },
  qcLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  qcVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  qcImagePreviewBox: {
    marginVertical: SPACING.xs,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qcImg: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  qcImgTag: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#FFFFFF',
    fontSize: 11,
    padding: 6,
    textAlign: 'center',
  },
  uploadQCImgBtn: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: SPACING.md,
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  uploadQCImgText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  qcNotesText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  activitySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginTop: 4,
    marginRight: 10,
  },
  logText: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  logTime: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  noLogsText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  errorBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.statusOverdue,
  },
  backBtn: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
  },
  backBtnText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING.lg,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  empChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
  },
  empChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  empChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  empChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  deadlineBtn: {
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    borderRadius: 10,
    marginBottom: SPACING.sm,
  },
  deadlineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
  },
  notesInput: {
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: SPACING.md,
    fontSize: 13,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    marginBottom: SPACING.sm,
  },
  addPhotoBtn: {
    backgroundColor: COLORS.accentLight,
    padding: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  addPhotoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  taskImgPreviewBox: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  taskImg: {
    width: '100%',
    height: 120,
    borderRadius: 10,
  },
  removeImgText: {
    color: COLORS.statusOverdue,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  notDoneBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  notDoneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  markDoneBigBtn: {
    flex: 2,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.statusDone,
    alignItems: 'center',
  },
  markDoneBigBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeModalBtn: {
    marginTop: SPACING.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  closeModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  saveQCBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  saveQCBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  deleteSheetBtn: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteSheetText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.statusOverdue,
  },
  readOnlyField: {
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    borderRadius: 10,
    marginBottom: SPACING.sm,
  },
  readOnlyText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  readOnlyTaskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: SPACING.md,
    borderRadius: 12,
    marginVertical: SPACING.sm,
    gap: 8,
  },
  readOnlyTaskBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    lineHeight: 16,
  },
  deleteTaskModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 10,
    marginBottom: 4,
  },
  deleteTaskModalBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },
});
