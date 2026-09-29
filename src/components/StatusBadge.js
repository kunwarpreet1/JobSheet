import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../styles/theme';
import { isStatusDone, isStatusOngoing } from '../utils/storage';

export default function StatusBadge({ status, size = 'medium' }) {
  let badgeBg = COLORS.statusNotStartedBg;
  let badgeBorder = COLORS.statusNotStartedBorder;
  let dotColor = COLORS.statusNotStarted;
  let label = status || 'Not Started';

  const sUpper = String(status || '').trim().toUpperCase();

  if (isStatusDone(status)) {
    badgeBg = COLORS.statusDoneBg;
    badgeBorder = COLORS.statusDoneBorder;
    dotColor = COLORS.statusDone;
    label = 'Done';
  } else if (isStatusOngoing(status)) {
    badgeBg = COLORS.statusInProgressBg;
    badgeBorder = COLORS.statusInProgressBorder;
    dotColor = COLORS.statusInProgress;
    label = sUpper === 'ON TRACK' ? 'ON TRACK' : sUpper === 'ONGOING' ? 'ONGOING' : 'In Progress';
  } else if (sUpper === 'OVERDUE' || sUpper === 'DELAYED') {
    badgeBg = COLORS.statusOverdueBg;
    badgeBorder = COLORS.statusOverdueBorder;
    dotColor = COLORS.statusOverdue;
    label = sUpper === 'DELAYED' ? 'Delayed' : 'Overdue';
  } else {
    badgeBg = COLORS.statusNotStartedBg;
    badgeBorder = COLORS.statusNotStartedBorder;
    dotColor = COLORS.statusNotStarted;
    label = 'Not Started';
  }

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: badgeBg, borderColor: badgeBorder },
        isSmall && styles.badgeSmall,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: dotColor }, isSmall && styles.dotSmall]} />
      <Text style={[styles.text, { color: dotColor }, isSmall && styles.textSmall]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  textSmall: {
    fontSize: 10,
    fontWeight: '800',
  },
});
