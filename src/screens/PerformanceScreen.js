import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useApp } from '../context/AppContext';
import VectorIcon from '../components/VectorIcon';
import { COLORS, SPACING, isTablet } from '../styles/theme';
import { getEmployeeTasks, isStatusDone } from '../utils/storage';

export default function PerformanceScreen() {
  const { masterData, jobSheets } = useApp();

  const [activeSegment, setActiveSegment] = useState('EMPLOYEE'); // EMPLOYEE or DEPARTMENT

  // Collect all task stages across all Job Sheets
  const allStages = [];
  jobSheets.forEach((sheet) => {
    (sheet.stages || []).forEach((st) => {
      allStages.push({
        ...st,
        jobSheetId: sheet.id,
      });
    });
  });

  // Calculate Employee Metrics (including assigned stages + manager duty tasks)
  const employeeMetrics = masterData.employees.map((emp) => {
    const empUser = { name: emp.name, employeeId: emp.employeeId };
    const empTasks = getEmployeeTasks(jobSheets, empUser, emp.name);
    const totalAssigned = empTasks.length;
    const completed = empTasks.filter((st) => isStatusDone(st.status)).length;
    const pending = empTasks.filter((st) => !isStatusDone(st.status) && st.status !== 'Overdue').length;
    const overdue = empTasks.filter((st) => st.status === 'Overdue' || st.status === 'OVERDUE').length;

    const onTimeRate = totalAssigned > 0 ? Math.round(((completed - (emp.delayedCount || 0)) / Math.max(1, totalAssigned)) * 100) : 100;
    const delayRate = totalAssigned > 0 ? Math.round((overdue / totalAssigned) * 100) : 0;

    return {
      ...emp,
      totalAssigned,
      completed,
      pending,
      overdue,
      onTimeRate: Math.max(0, onTimeRate),
      delayRate,
      avgTime: '2h 15m',
    };
  });

  // Calculate Department / Process Metrics
  const deptList = [
    { name: 'Carpentry', stagesMatch: ['FRAME/THIPA ORDER', 'FRAME/THIPA RECEIVED', 'LEGS/THIPA READY'] },
    { name: 'QC', stagesMatch: ['JOB SHEET'] },
    { name: 'Cushion', stagesMatch: ['CUSHION MASTER', 'CUSHION READY'] },
    { name: 'Fabric', stagesMatch: ['FABRIC ORDER', 'FABRIC RECEIVED', 'NOTIFY PARTY (if In Stock)'] },
    { name: 'Fitting', stagesMatch: ['FITTING'] },
    { name: 'Packing', stagesMatch: ['PACKING'] },
  ];

  const departmentMetrics = deptList.map((dept) => {
    const deptTasks = allStages.filter((st) => dept.stagesMatch.includes(st.name));
    const total = deptTasks.length;
    const done = deptTasks.filter((st) => st.status === 'Done').length;
    const overdue = deptTasks.filter((st) => st.status === 'Overdue').length;
    const pending = total - done - overdue;
    const onTimeRate = total > 0 ? Math.round((done / total) * 100) : 100;

    return {
      name: dept.name,
      total,
      done,
      overdue,
      pending,
      onTimeRate,
    };
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>PERFORMANCE ANALYTICS</Text>
      <Text style={styles.sub}>Automatic Productivity & Delay Rate Monitoring</Text>

      {/* Segment Switcher */}
      <View style={styles.segmentBar}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'EMPLOYEE' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('EMPLOYEE')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <VectorIcon
              name="user"
              size={14}
              color={activeSegment === 'EMPLOYEE' ? '#FFFFFF' : COLORS.textSecondary}
            />
            <Text style={[styles.segmentBtnText, activeSegment === 'EMPLOYEE' && styles.segmentBtnTextActive]}>
              Employee Performance
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'DEPARTMENT' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('DEPARTMENT')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <VectorIcon
              name="tools"
              size={14}
              color={activeSegment === 'DEPARTMENT' ? '#FFFFFF' : COLORS.textSecondary}
            />
            <Text style={[styles.segmentBtnText, activeSegment === 'DEPARTMENT' && styles.segmentBtnTextActive]}>
              Process & Department
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* EMPLOYEE PERFORMANCE SECTION */}
      {activeSegment === 'EMPLOYEE' ? (
        <View style={styles.section}>
          {employeeMetrics.map((emp) => (
            <View key={emp.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.empName}>{emp.name}</Text>
                  <Text style={styles.empRole}>{emp.role} • {emp.department}</Text>
                </View>
                <View style={styles.rateBadge}>
                  <Text style={styles.rateText}>{emp.onTimeRate}% On-Time</Text>
                </View>
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{emp.totalAssigned}</Text>
                  <Text style={styles.metricLabel}>Tasks Assigned</Text>
                </View>
                <View style={[styles.metricItem, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={[styles.metricVal, { color: COLORS.statusDone }]}>{emp.completed}</Text>
                  <Text style={styles.metricLabel}>Completed</Text>
                </View>
                <View style={[styles.metricItem, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={[styles.metricVal, { color: COLORS.statusInProgress }]}>{emp.pending}</Text>
                  <Text style={styles.metricLabel}>Pending</Text>
                </View>
                <View style={[styles.metricItem, { backgroundColor: '#FEF2F2' }]}>
                  <Text style={[styles.metricVal, { color: COLORS.statusOverdue }]}>{emp.overdue}</Text>
                  <Text style={styles.metricLabel}>Overdue</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.footerInfo}>Avg Completion Time: {emp.avgTime}</Text>
                <Text style={styles.footerInfo}>Delay Rate: {emp.delayRate}%</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        /* DEPARTMENT PERFORMANCE SECTION */
        <View style={styles.section}>
          {departmentMetrics.map((dept, idx) => (
            <View key={idx} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.empName}>{dept.name} Process</Text>
                <View style={[styles.rateBadge, { backgroundColor: COLORS.accentLight }]}>
                  <Text style={[styles.rateText, { color: COLORS.accent }]}>
                    {dept.onTimeRate}% Completion Rate
                  </Text>
                </View>
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{dept.total}</Text>
                  <Text style={styles.metricLabel}>Total Stage Jobs</Text>
                </View>
                <View style={[styles.metricItem, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={[styles.metricVal, { color: COLORS.statusDone }]}>{dept.done}</Text>
                  <Text style={styles.metricLabel}>Done</Text>
                </View>
                <View style={[styles.metricItem, { backgroundColor: '#FEF2F2' }]}>
                  <Text style={[styles.metricVal, { color: COLORS.statusOverdue }]}>{dept.overdue}</Text>
                  <Text style={styles.metricLabel}>Delayed</Text>
                </View>
              </View>
            </View>
          ))}
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
    padding: SPACING.md,
  },
  title: {
    fontSize: isTablet ? 22 : 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primary,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },
  section: {
    gap: SPACING.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  empName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  empRole: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  rateBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rateText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.statusDone,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  metricItem: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
    padding: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  metricLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerInfo: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
