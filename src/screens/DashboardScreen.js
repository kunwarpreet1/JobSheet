import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import VectorIcon from '../components/VectorIcon';
import { COLORS, SPACING, isTablet } from '../styles/theme';
import {
  isTaskAssignedToUser,
  getEmployeeTasks,
  isJobSheetAssignedToUser,
  isStatusDone,
} from '../utils/storage';

export default function DashboardScreen() {
  const {
    role,
    activeEmployee,
    currentUser,
    jobSheets,
    setActiveTab,
    setSelectedJobSheetId,
    openAuthFlow,
    refreshJobSheets,
  } = useApp();

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshJobSheets?.();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshJobSheets?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Metrics calculation for Owner
  const totalSheets = jobSheets.length;
  const inProgressSheets = jobSheets.filter((s) => s.overallStatus === 'In Progress').length;
  const completedSheets = jobSheets.filter((s) => s.overallStatus === 'Done').length;

  // Flatten all tasks
  const allTasks = [];
  jobSheets.forEach((sheet) => {
    (sheet.stages || []).forEach((stage) => {
      allTasks.push({
        ...stage,
        jobSheetId: sheet.id,
        party: sheet.party,
      });
    });
  });

  const overdueTasks = allTasks.filter((t) => t.status === 'Overdue');

  // Employee-specific metrics: includes assigned stages + manager duty task (+1 for each managed sheet)
  const employeeTasks = getEmployeeTasks(jobSheets, currentUser, activeEmployee);
  const myPendingTasks = employeeTasks.filter((t) => !isStatusDone(t.status));
  const myCompletedTasks = employeeTasks.filter((t) => isStatusDone(t.status));
  const myOverdueTasks = employeeTasks.filter((t) => t.status === 'Overdue' || t.status === 'OVERDUE');
  const myJobSheetsCount = jobSheets.filter((s) =>
    isJobSheetAssignedToUser(s, currentUser, activeEmployee)
  ).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const openJobSheet = (id) => {
    setSelectedJobSheetId(id);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[COLORS.accent]} />
      }
    >
      {/* Welcome Banner */}
      <View style={styles.welcomeBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingText}>{getGreeting()}</Text>
          <Text style={styles.roleSubtext}>
            {role === 'OWNER'
              ? "Here's your production overview."
              : role === 'EMPLOYEE'
                ? `Workspace overview for ${activeEmployee}`
                : 'Please log in to view your assigned work.'}
          </Text>
        </View>


      </View>

      {/* OWNER DASHBOARD VIEW */}
      {role === 'OWNER' ? (
        <>
          {/* Overview Stat Cards Grid */}
          <Text style={styles.sectionTitle}>TODAY'S PRODUCTION OVERVIEW</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{totalSheets}</Text>
              <Text style={styles.statLabel}>Total Job Sheets</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Text style={[styles.statNum, { color: COLORS.statusInProgress }]}>{inProgressSheets}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <Text style={[styles.statNum, { color: COLORS.statusDone }]}>{completedSheets}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Text style={[styles.statNum, { color: COLORS.statusOverdue }]}>{overdueTasks.length}</Text>
              <Text style={styles.statLabel}>Overdue Tasks</Text>
            </View>
          </View>

          {/* Urgent Overdue Tasks Alert Section */}
          {overdueTasks.length > 0 && (
            <View style={styles.alertSection}>
              <View style={styles.alertHeader}>
                <VectorIcon name="alert" size={16} color={COLORS.statusOverdue} />
                <Text style={styles.alertTitle}>URGENT: {overdueTasks.length} OVERDUE TASKS</Text>
              </View>
              {overdueTasks.slice(0, 3).map((task, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.alertRow}
                  onPress={() => openJobSheet(task.jobSheetId)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.alertTaskName}>{task.name} ({task.jobSheetId})</Text>
                    <Text style={styles.alertTaskDetail}>
                      Party: {task.party} • Assigned to: {task.assignedTo || 'Unassigned'}
                    </Text>
                  </View>
                  <StatusBadge status="Overdue" size="small" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Quick Navigation Hub Cards */}
          <View style={styles.hubGrid}>

          </View>
        </>
      ) : role === 'EMPLOYEE' ? (
        /* EMPLOYEE DASHBOARD VIEW */
        <>
          <Text style={styles.sectionTitle}>MY WORKSPACE OVERVIEW</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Text style={[styles.statNum, { color: COLORS.statusInProgress }]}>{myPendingTasks.length}</Text>
              <Text style={styles.statLabel}>Pending Tasks</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <Text style={[styles.statNum, { color: COLORS.statusDone }]}>{myCompletedTasks.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{myJobSheetsCount}</Text>
              <Text style={styles.statLabel}>My Job Sheets</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Text style={[styles.statNum, { color: COLORS.statusOverdue }]}>{myOverdueTasks.length}</Text>
              <Text style={styles.statLabel}>Overdue</Text>
            </View>
          </View>
        </>
      ) : (
        /* GUEST DASHBOARD VIEW */
        <View style={styles.guestCard}>
          <View style={styles.guestIconCircle}>
            <VectorIcon name="lock" size={32} color="#6366F1" />
          </View>
          <Text style={styles.guestCardTitle}>Sign In Required</Text>
          <Text style={styles.guestCardSubtitle}>
            Please log in with your credentials to view your assigned work, tasks, and update production stages.
          </Text>
          <TouchableOpacity
            style={styles.guestLoginActionBtn}
            onPress={openAuthFlow}
            activeOpacity={0.8}
          >
            <VectorIcon name="login" size={16} color="#6366F1" />
            <Text style={styles.guestLoginActionText}>Log In with Credentials</Text>
          </TouchableOpacity>
        </View>
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
    padding: SPACING.lg,
  },
  welcomeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  greetingText: {
    fontSize: isTablet ? 20 : 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  roleSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  createBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    minWidth: isTablet ? 160 : '45%',
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statNum: {
    fontSize: isTablet ? 26 : 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  alertSection: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.statusOverdue,
    letterSpacing: 0.5,
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: SPACING.sm,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alertTaskName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  alertTaskDetail: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  hubGrid: {
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  navHubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  navHubIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navHubTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  navHubSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  navHubAction: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.accent,
  },
  guestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  guestIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  guestCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  guestCardSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
    marginBottom: SPACING.lg,
  },
  guestLoginActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  guestLoginActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
  },
});
