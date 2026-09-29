import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import VectorIcon from '../components/VectorIcon';
import { COLORS, SPACING, isTablet } from '../styles/theme';
import { formatFullTimestamp } from '../utils/deadlineCalculator';
import { isNotificationForUser } from '../utils/storage';

export default function NotificationsScreen() {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
    setSelectedJobSheetId,
    role,
    currentUser,
    activeEmployee,
  } = useApp();

  const [filterType, setFilterType] = useState('ALL');
  const isEmployee = role === 'EMPLOYEE';

  // For Employee: ONLY notifications for tasks that are assigned to this employee
  // For Owner: all notifications remain
  const scopedNotifs = isEmployee
    ? notifications.filter((n) => isNotificationForUser(n, currentUser, activeEmployee, role))
    : notifications;

  const filteredNotifs = scopedNotifs.filter((n) => {
    if (filterType === 'UNREAD') return !n.read;
    if (filterType === 'PROGRESS') return n.type === 'PROGRESS_UPDATED' || n.type === 'TASK_UPDATED';
    if (filterType === 'TASK_ASSIGNED') return n.type === 'TASK_ASSIGNED' || n.type === 'assigned';
    if (filterType === 'TASK_ONGOING') return n.type === 'TASK_ONGOING';
    if (filterType === 'COMPLETED') return n.type === 'TASK_COMPLETED' || n.type === 'completed';
    if (filterType === 'JOB_SHEETS') return n.type === 'JOB_SHEET_CREATED';
    return true;
  });

  const handleDeleteNotification = (notifId, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    Alert.alert(
      'Remove Notification',
      'Are you sure you want to remove this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteNotification(notifId),
        },
      ]
    );
  };

  const handleRemoveAllNotifications = () => {
    Alert.alert(
      'Remove All Notifications',
      isEmployee
        ? 'Are you sure you want to remove all your notifications?'
        : 'Are you sure you want to remove all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove All',
          style: 'destructive',
          onPress: () => clearAllNotifications(),
        },
      ]
    );
  };

  const handleOpenJobSheet = (notif) => {
    markNotificationRead(notif.id);
    if (notif.jobSheetId) {
      setSelectedJobSheetId(notif.jobSheetId);
    }
  };

  const getNotifBadgeConfig = (type) => {
    switch (type) {
      case 'MANAGER_ASSIGNED':
        return {
          label: 'MANAGER',
          bg: '#EEF2FF',
          color: '#4F46E5',
          icon: 'user',
        };
      case 'PROGRESS_UPDATED':
      case 'TASK_UPDATED':
        return {
          label: 'PROGRESS',
          bg: '#F5F3FF',
          color: '#7C3AED',
          icon: 'clock',
        };
      case 'TASK_ASSIGNED':
      case 'assigned':
        return {
          label: 'ASSIGNED',
          bg: '#EEF2FF',
          color: '#4F46E5',
          icon: 'user',
        };
      case 'TASK_ONGOING':
        return {
          label: 'ONGOING',
          bg: '#FEF3C7',
          color: '#B45309',
          icon: 'clock',
        };
      case 'TASK_COMPLETED':
      case 'completed':
        return {
          label: 'COMPLETED',
          bg: '#ECFDF5',
          color: '#059669',
          icon: 'check',
        };
      case 'JOB_SHEET_CREATED':
        return {
          label: 'JOB SHEET',
          bg: '#EFF6FF',
          color: '#2563EB',
          icon: 'plus',
        };
      case 'TASK_OVERDUE':
      case 'overdue':
        return {
          label: 'OVERDUE',
          bg: '#FEF2F2',
          color: '#DC2626',
          icon: 'alert',
        };
      default:
        return {
          label: 'ALERT',
          bg: '#F1F5F9',
          color: '#475569',
          icon: 'bell',
        };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>NOTIFICATIONS CENTER</Text>
          <Text style={styles.sub}>Job Sheets, Task Assignments & Push Notifications</Text>
        </View>
        <TouchableOpacity style={styles.readAllBtn} onPress={markAllNotificationsRead}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <VectorIcon name="check" size={12} color={COLORS.accent} />
            <Text style={styles.readAllText}>Mark All Read</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {[
          { key: 'ALL', label: 'All' },
          { key: 'UNREAD', label: 'Unread' },
          { key: 'PROGRESS', label: 'Progress' },
          { key: 'TASK_ASSIGNED', label: 'Assigned' },
          { key: 'TASK_ONGOING', label: 'Ongoing' },
          { key: 'COMPLETED', label: 'Completed' },
          { key: 'JOB_SHEETS', label: 'Job Sheets' },
        ]
          .filter((cat) => {
            if (isEmployee && cat.key === 'JOB_SHEETS') return false;
            return true;
          })
          .map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.tabChip, filterType === cat.key && styles.tabChipActive]}
              onPress={() => setFilterType(cat.key)}
            >
              <Text style={[styles.tabText, filterType === cat.key && styles.tabTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <VectorIcon name="bell" size={36} color={COLORS.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>
              {isEmployee ? 'No Assigned Task Notifications' : 'No Notifications'}
            </Text>
            <Text style={styles.emptySub}>
              {isEmployee
                ? 'You will receive notifications here whenever a task is assigned to you.'
                : 'You are all caught up with production alerts.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const badge = getNotifBadgeConfig(item.type);

          let displayTitle = item.title;
          let displayMsg = item.message;

          if (!isEmployee && item.type === 'MANAGER_ASSIGNED') {
            displayTitle = '📋 Manager Assigned';
            const mgr = item.metadata?.managerName || item.metadata?.employeeName || 'this employee';
            const partySuffix = item.metadata?.party ? ` (${item.metadata.party})` : '';
            displayMsg = `You assigned ${mgr} manager role for Job Sheet #${item.jobSheetId || ''}${partySuffix}.`;
          }

          return (
            <TouchableOpacity
              style={[styles.notifCard, !item.read && styles.notifCardUnread]}
              onPress={() => handleOpenJobSheet(item)}
              activeOpacity={0.8}
            >
              <View style={styles.notifHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
                  <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                    <VectorIcon name={badge.icon} size={10} color={badge.color} />
                    <Text style={[styles.typeBadgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                  <Text style={styles.notifTitle} numberOfLines={1}>
                    {displayTitle}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {!item.read && <View style={styles.unreadDot} />}
                  <TouchableOpacity
                    style={styles.deleteCardBtn}
                    onPress={(e) => handleDeleteNotification(item.id, e)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <VectorIcon name="trash" size={13} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.notifMsg}>{displayMsg}</Text>

              {item.metadata?.progressText && (
                <View style={styles.progressChip}>
                  <VectorIcon name="check-circle" size={11} color="#059669" />
                  <Text style={styles.progressChipText}>{item.metadata.progressText}</Text>
                </View>
              )}

              <View style={styles.notifFooter}>
                <Text style={styles.notifTime}>{formatFullTimestamp(item.timestamp)}</Text>
                {item.jobSheetId && (
                  <Text style={styles.openLink}>Open Job Sheet {item.jobSheetId} →</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          filteredNotifs.length > 0 ? (
            <View style={styles.footerContainer}>
              <TouchableOpacity
                style={styles.removeAllNotifsBtn}
                onPress={handleRemoveAllNotifications}
                activeOpacity={0.8}
              >
                <VectorIcon name="trash" size={13} color="#EF4444" />
                <Text style={styles.removeAllNotifsBtnText}>Remove All Notifications</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sub: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  readAllBtn: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 8,
  },
  readAllText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.accent,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: 6,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listPadding: {
    padding: SPACING.md,
  },
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notifCardUnread: {
    backgroundColor: '#F0F7FF',
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  notifMsg: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  progressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginVertical: 4,
  },
  progressChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  notifFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  notifTime: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  openLink: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.accent,
  },
  emptyBox: {
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  deleteCardBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  footerContainer: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  removeAllNotifsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
  },
  removeAllNotifsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
});
