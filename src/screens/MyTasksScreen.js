import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import VectorIcon from '../components/VectorIcon';
import { COLORS, SPACING, isTablet } from '../styles/theme';
import { formatDateStr, formatTimeStr } from '../utils/deadlineCalculator';
import {
  isTaskAssignedToUser,
  getEmployeeTasks,
  isStatusDone,
} from '../utils/storage';

export default function MyTasksScreen() {
  const {
    activeEmployee,
    currentUser,
    jobSheets,
    setSelectedJobSheetId,
    deleteStageFromJobSheet,
    refreshJobSheets,
  } = useApp();

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (refreshJobSheets) {
      refreshJobSheets();
    }
  }, []);

  const onRefresh = async () => {
    if (refreshJobSheets) {
      setIsRefreshing(true);
      await refreshJobSheets();
      setIsRefreshing(false);
    }
  };

  const myTasks = getEmployeeTasks(jobSheets, currentUser, activeEmployee);

  const pendingTasks = myTasks.filter((t) => !isStatusDone(t.status));
  const completedTasks = myTasks.filter((t) => isStatusDone(t.status));

  const handleOpenTask = (task) => {
    setSelectedJobSheetId(task.jobSheetId);
  };

  const handleDeleteTask = (task, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const alertTitle = task.isManagerDuty ? 'Remove Manager Assignment' : 'Delete Assigned Task';
    const alertMessage = task.isManagerDuty
      ? `Are you sure you want to remove your Production Manager duty for Job Sheet ${task.jobSheetId}?`
      : `Are you sure you want to remove "${task.name}" for Job Sheet ${task.jobSheetId}?`;

    Alert.alert(
      alertTitle,
      alertMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStageFromJobSheet(task.jobSheetId, task.id);
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to remove task.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[COLORS.accent]} />}
    >
      <View style={styles.titleBanner}>
        <VectorIcon name="user" size={24} color={COLORS.statusDone} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>MY ASSIGNED TASKS</Text>
          <Text style={styles.sub}>
            Assigned Workspace for {activeEmployee} • Tap task card to update status
          </Text>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
          <VectorIcon name="clock" size={22} color={COLORS.statusInProgress} style={{ marginBottom: 4 }} />
          <Text style={[styles.statNum, { color: COLORS.statusInProgress }]}>{pendingTasks.length}</Text>
          <Text style={styles.statLabel}>Pending Tasks</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
          <VectorIcon name="check" size={22} color={COLORS.statusDone} style={{ marginBottom: 4 }} />
          <Text style={[styles.statNum, { color: COLORS.statusDone }]}>{completedTasks.length}</Text>
          <Text style={styles.statLabel}>Completed Tasks</Text>
        </View>
      </View>

      {/* Pending Tasks Section */}
      <Text style={styles.sectionHeader}>PENDING TASKS ({pendingTasks.length})</Text>
      {pendingTasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <VectorIcon name="check-circle" size={40} color={COLORS.statusDone} style={{ marginBottom: SPACING.sm }} />
          <Text style={styles.emptyTitle}>No Pending Tasks</Text>
          <Text style={styles.emptySub}>Great job! All your assigned tasks are completed.</Text>
        </View>
      ) : (
        pendingTasks.map((task, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.taskCard, task.isManagerDuty && styles.managerTaskCard]}
            onPress={() => handleOpenTask(task)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.taskName}>{task.name}</Text>
                  {task.isManagerDuty && (
                    <View style={styles.managerRoleBadge}>
                      <Text style={styles.managerRoleBadgeText}>MANAGER</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.jobSheetId}>
                  Job Sheet: <Text style={{ fontWeight: '800' }}>{task.jobSheetId}</Text> • {task.party}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <StatusBadge status={task.status} />
                <TouchableOpacity
                  style={styles.deleteCardBtn}
                  onPress={(e) => handleDeleteTask(task, e)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <VectorIcon name="trash" size={13} color="#EF4444" />
                  <Text style={styles.deleteCardBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.deadlineBox, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
              <VectorIcon name="clock" size={13} color={COLORS.statusOverdue} />
              <Text style={styles.deadlineText}>
                {task.isManagerDuty
                  ? `Role: Production Manager • Party: ${task.party}`
                  : `Deadline: ${task.deadline ? `${formatDateStr(task.deadline)} at ${formatTimeStr(task.deadline)}` : 'As scheduled'}`}
              </Text>
            </View>

            <View style={styles.footerRow}>
              <Text style={[styles.tapText, task.isManagerDuty && { color: '#4F46E5', fontWeight: '800' }]}>
                {task.isManagerDuty ? 'Tap to Manage Job Sheet & Assign Stages →' : 'Tap to Open & Mark DONE →'}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Completed Tasks History Section */}
      {completedTasks.length > 0 && (
        <>
          <Text style={[styles.sectionHeader, { marginTop: SPACING.lg }]}>COMPLETED TASKS ({completedTasks.length})</Text>
          {completedTasks.map((task, idx) => (
            <View key={idx} style={[styles.taskCard, styles.completedCard]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.taskName}>{task.name}</Text>
                  <Text style={styles.jobSheetId}>{task.jobSheetId} • {task.party}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status="Done" size="small" />
                  <TouchableOpacity
                    style={styles.deleteCardBtn}
                    onPress={(e) => handleDeleteTask(task, e)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <VectorIcon name="trash" size={13} color="#EF4444" />
                    <Text style={styles.deleteCardBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </>
      )}
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
  titleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: isTablet ? 22 : 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statBox: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  completedCard: {
    borderColor: COLORS.border,
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  jobSheetId: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  deadlineBox: {
    backgroundColor: '#FEF2F2',
    padding: 6,
    borderRadius: 6,
    marginTop: SPACING.xs,
  },
  deadlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.statusOverdue,
  },
  footerRow: {
    marginTop: SPACING.sm,
    alignItems: 'flex-end',
  },
  tapText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accent,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  deleteCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteCardBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  managerTaskCard: {
    borderColor: '#6366F1',
    backgroundColor: '#FBFBFF',
  },
  managerRoleBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  managerRoleBadgeText: {
    color: '#4F46E5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
