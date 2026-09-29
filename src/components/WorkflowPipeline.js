import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import StatusBadge from './StatusBadge';
import VectorIcon from './VectorIcon';
import { COLORS, SPACING, isTablet } from '../styles/theme';
import { formatDateStr, formatTimeStr, calculateDelayText } from '../utils/deadlineCalculator';
import { isTaskAssignedToUser, isStatusDone, isStatusOngoing, isStatusNotStarted } from '../utils/storage';

export default function WorkflowPipeline({
  stages = [],
  onTaskPress,
  onMarkDonePress,
  onStartTaskPress,
  onEditTaskPress,
  activeEmployee,
  currentUser,
  isOwner,
  isManager = false,
}) {
  const canManage = isOwner || isManager;

  return (
    <View style={styles.container}>
      <View style={styles.headerTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isOwner
              ? 'PRODUCTION PIPELINE (ASSIGNED BY MANAGER)'
              : isManager
              ? 'PRODUCTION PIPELINE (MANAGER SUPERVISION)'
              : 'MY ASSIGNED TASKS IN THIS JOB SHEET'}
          </Text>
          <Text style={styles.headerSub}>
            {isOwner
              ? `${stages.length} Stage(s) Assigned by Manager • Tracking Progress`
              : isManager
              ? `${stages.length} Sequential Stages Starting with Fabric Order • Sequential Assignment`
              : `${stages.length} Active / Completed Task(s) Assigned to You`}
          </Text>
        </View>
        {isManager && (
          <View style={styles.managerHeaderBadge}>
            <VectorIcon name="user" size={12} color="#4F46E5" />
            <Text style={styles.managerHeaderBadgeText}>MANAGER</Text>
          </View>
        )}
      </View>

      {stages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <VectorIcon name="clock" size={32} color={COLORS.accent} style={{ marginBottom: 6 }} />
          <Text style={styles.emptyTitle}>
            {isOwner
              ? 'No Tasks Assigned by Manager Yet'
              : isManager
              ? 'No Stages Available'
              : 'No Active Tasks Yet'}
          </Text>
          <Text style={styles.emptySub}>
            {isOwner
              ? 'Production pipeline stages assigned to workers by the Production Manager will appear here.'
              : isManager
              ? 'Production stages will appear here.'
              : 'Tasks assigned to your account will appear here once the Owner or Manager starts them.'}
          </Text>
        </View>
      ) : (
        <View style={styles.pipelineList}>
          {stages.map((stage, index) => {
            const isLast = index === stages.length - 1;
            const isAssignedToCurrent = isTaskAssignedToUser(stage, currentUser, activeEmployee);

            const isOverdue = stage.status === 'Overdue' || stage.status === 'OVERDUE';
            const isDone = isStatusDone(stage.status);
            const isOngoing = isStatusOngoing(stage.status);
            const isNotStarted = isStatusNotStarted(stage.status);
            const isUnassigned = !stage.assignedTo || stage.assignedTo === 'Unassigned';

            const formattedDeadline = stage.deadline
              ? `${formatDateStr(stage.deadline)} at ${formatTimeStr(stage.deadline)}`
              : 'Not set';

            const delayStr = isOverdue
              ? calculateDelayText(stage.deadline)
              : isDone && stage.completedAt && stage.deadline && new Date(stage.completedAt) > new Date(stage.deadline)
              ? calculateDelayText(stage.deadline, stage.completedAt)
              : null;

            return (
              <View key={stage.id} style={styles.stageRowContainer}>
                {/* Left Column: Flowchart Connector Line & Step Circle */}
                <View style={styles.timelineCol}>
                  <View
                    style={[
                      styles.stepCircle,
                      isDone && styles.stepCircleDone,
                      isOverdue && styles.stepCircleOverdue,
                      isOngoing && styles.stepCircleInProgress,
                    ]}
                  >
                    <Text style={[styles.stepNum, (isDone || isOverdue || isOngoing) && styles.stepNumWhite]}>
                      {stage.id}
                    </Text>
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        styles.connectorLine,
                        isDone && styles.connectorLineDone,
                      ]}
                    />
                  )}
                </View>

                {/* Right Column: Stage Card */}
                <TouchableOpacity
                  style={[
                    styles.stageCard,
                    isAssignedToCurrent && styles.stageCardAssigned,
                    isOverdue && styles.stageCardOverdue,
                  ]}
                  onPress={() => (canManage && onEditTaskPress ? onEditTaskPress(stage) : onTaskPress && onTaskPress(stage))}
                  activeOpacity={0.8}
                >
                  <View style={styles.stageCardHeader}>
                    <View style={styles.titleWrap}>
                      <Text style={styles.stageName}>{stage.name}</Text>
                      {isAssignedToCurrent && (
                        <View style={styles.assignedPill}>
                          <Text style={styles.assignedPillText}>Your Task</Text>
                        </View>
                      )}
                      {isUnassigned && canManage && (
                        <View style={styles.unassignedPill}>
                          <Text style={styles.unassignedPillText}>Unassigned</Text>
                        </View>
                      )}
                    </View>
                    <StatusBadge status={stage.status} size="small" />
                  </View>

                  {/* Stage Info Body */}
                  <View style={styles.stageBody}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Assigned To:</Text>
                      <Text style={[styles.infoValHighlight, isUnassigned && styles.unassignedText]}>
                        {stage.assignedTo || 'Unassigned'}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Deadline:</Text>
                      <Text style={[styles.infoVal, isOverdue && styles.overdueText]}>
                        {formattedDeadline}
                      </Text>
                    </View>

                    {delayStr && (
                      <View style={styles.delayBanner}>
                        <VectorIcon name="alert" size={12} color={COLORS.statusOverdue} />
                        <Text style={styles.delayText}>
                          {isOverdue ? `Overdue by ${delayStr}` : `Completed ${delayStr} late`}
                        </Text>
                      </View>
                    )}

                    {stage.notes ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <VectorIcon name="chat" size={11} color={COLORS.textSecondary} />
                        <Text style={styles.notesText} numberOfLines={2}>
                          Note: {stage.notes}
                        </Text>
                      </View>
                    ) : null}

                    {stage.image ? (
                      <View style={styles.photoIndicator}>
                        <VectorIcon name="camera" size={12} color={COLORS.accent} />
                        <Text style={styles.photoText}>Photo Attached</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Quick Action Buttons */}
                  <View style={styles.actionRow}>
                    {/* Assign Employee button for unassigned stages */}
                    {canManage && isUnassigned && onEditTaskPress && (
                      <TouchableOpacity
                        style={styles.assignBtn}
                        onPress={() => onEditTaskPress(stage)}
                        activeOpacity={0.8}
                      >
                        <VectorIcon name="user" size={12} color="#FFFFFF" />
                        <Text style={styles.assignBtnText}>+ ASSIGN EMPLOYEE</Text>
                      </TouchableOpacity>
                    )}

                    {/* Start Task: available to Owner or Manager when task is assigned and not started */}
                    {canManage && !isUnassigned && !isDone && !isOngoing && onStartTaskPress && (
                      <TouchableOpacity
                        style={styles.startBtn}
                        onPress={() => onStartTaskPress(stage)}
                        activeOpacity={0.8}
                      >
                        <VectorIcon name="clock" size={12} color="#FFFFFF" />
                        <Text style={styles.startBtnText}>START TASK</Text>
                      </TouchableOpacity>
                    )}

                    {/* Mark Done: available to Owner/Manager after starting, OR to the assigned employee */}
                    {((canManage && isOngoing && !isDone) || (!canManage && isAssignedToCurrent && isOngoing && !isDone)) && onMarkDonePress && (
                      <TouchableOpacity
                        style={styles.doneBtn}
                        onPress={() => onMarkDonePress(stage)}
                        activeOpacity={0.8}
                      >
                        <VectorIcon name="check" size={12} color="#FFFFFF" />
                        <Text style={styles.doneBtnText}>MARK DONE</Text>
                      </TouchableOpacity>
                    )}

                    {!canManage && !isAssignedToCurrent && !isDone && (
                      <View style={styles.lockedPill}>
                        <VectorIcon name="lock" size={11} color={COLORS.textMuted} />
                        <Text style={styles.lockedPillText}>
                          {!isUnassigned ? `Assigned to ${stage.assignedTo}` : 'Unassigned'}
                        </Text>
                      </View>
                    )}

                    {isDone && (
                      <View style={styles.donePill}>
                        <VectorIcon name="check" size={11} color={COLORS.statusDone} />
                        <Text style={styles.donePillText}>Completed</Text>
                      </View>
                    )}

                    {/* Edit / Reassign button for Owner/Manager if already assigned */}
                    {canManage && !isUnassigned && (
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => onEditTaskPress ? onEditTaskPress(stage) : onTaskPress && onTaskPress(stage)}
                        activeOpacity={0.8}
                      >
                        <VectorIcon name="edit" size={12} color={COLORS.accent} />
                        <Text style={styles.editBtnText}>Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  managerHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  managerHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  pipelineList: {
    gap: 0,
  },
  stageRowContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  timelineCol: {
    width: 36,
    alignItems: 'center',
    marginRight: 8,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stepCircleDone: {
    backgroundColor: COLORS.statusDone,
  },
  stepCircleOverdue: {
    backgroundColor: COLORS.statusOverdue,
  },
  stepCircleInProgress: {
    backgroundColor: COLORS.statusInProgress,
  },
  stepNum: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  stepNumWhite: {
    color: '#FFFFFF',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: -2,
    zIndex: 1,
  },
  connectorLineDone: {
    backgroundColor: COLORS.statusDone,
  },
  stageCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  stageCardAssigned: {
    borderColor: COLORS.accent,
    borderWidth: 1.5,
    backgroundColor: '#F8FAFF',
  },
  stageCardOverdue: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFFBFB',
  },
  stageCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  stageName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  assignedPill: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  assignedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
  },
  unassignedPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unassignedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  unassignedText: {
    color: '#D97706',
    fontWeight: '700',
  },
  stageBody: {
    gap: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoVal: {
    fontSize: 11,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  infoValHighlight: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '700',
  },
  overdueText: {
    color: COLORS.statusOverdue,
    fontWeight: '700',
  },
  delayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  delayText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.statusOverdue,
  },
  notesText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  photoText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.accent,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    gap: 4,
  },
  assignBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.statusDone,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    gap: 4,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.statusInProgress,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    gap: 4,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: '#EEF2FF',
  },
  editBtnText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
  },
  donePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.statusDone,
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 5,
  },
  lockedPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    padding: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
