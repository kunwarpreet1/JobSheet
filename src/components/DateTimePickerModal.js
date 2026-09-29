import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import VectorIcon from './VectorIcon';
import { calculateValidDeadline, isSunday, formatDateStr } from '../utils/deadlineCalculator';
import { COLORS, SPACING, isTablet } from '../styles/theme';

export default function DateTimePickerModal({
  visible,
  onClose,
  onSelectDeadline,
  initialDate,
}) {
  const now = new Date();
  
  // Base date state
  const [selectedDayOffset, setSelectedDayOffset] = useState(0); // 0 = Today, 1 = Tomorrow, etc.
  const [selectedHour, setSelectedHour] = useState(16); // Default 4:00 PM (16)
  const [selectedMinute, setSelectedMinute] = useState(30); // Default 30 mins

  // Generate next 14 available days for picker
  const daysList = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    return {
      offset: i,
      dateObj: d,
      isSun: isSunday(d),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNum: d.getDate(),
      monthName: d.toLocaleDateString('en-US', { month: 'short' }),
      formatted: formatDateStr(d),
    };
  });

  const activeDayItem = daysList[selectedDayOffset] || daysList[0];

  // Calculate target date with selected hour & minute
  const targetDateObj = new Date(activeDayItem.dateObj);
  targetDateObj.setHours(selectedHour, selectedMinute, 0, 0);

  // Run calculation through deadline rules engine (Sunday check + Working hours check)
  const deadlineResult = calculateValidDeadline(targetDateObj);

  // Standard working hours list: 9:00 AM to 8:00 PM (09:00 to 20:00)
  const hoursList = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const minutesList = selectedHour === 20 ? [0] : [0, 15, 30, 45];

  const handleHourSelect = (h) => {
    setSelectedHour(h);
    if (h === 20 && selectedMinute > 0) {
      setSelectedMinute(0);
    }
  };

  const handleConfirm = () => {
    onSelectDeadline(deadlineResult.deadlineDate);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Title */}
          <Text style={styles.modalTitle}>Set Task Deadline & Time</Text>
          <Text style={styles.modalSub}>
            Working Hours: 9:00 AM – 8:00 PM • Sunday is Off-Day
          </Text>

          {/* Date Selector Row */}
          <Text style={styles.sectionHeader}>SELECT DATE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
            {daysList.map((item) => {
              const isSelected = item.offset === selectedDayOffset;
              return (
                <TouchableOpacity
                  key={item.offset}
                  style={[
                    styles.dateChip,
                    isSelected && styles.dateChipSelected,
                    item.isSun && styles.sundayChip,
                    isSelected && item.isSun && styles.sundayChipSelected,
                  ]}
                  onPress={() => setSelectedDayOffset(item.offset)}
                >
                  <Text style={[styles.dayName, isSelected && styles.dateChipTextSelected]}>
                    {item.dayName}
                  </Text>
                  <Text style={[styles.dateNum, isSelected && styles.dateChipTextSelected]}>
                    {item.dateNum}
                  </Text>
                  <Text style={[styles.monthName, isSelected && styles.dateChipTextSelected]}>
                    {item.monthName}
                  </Text>
                  {item.isSun && (
                    <Text style={styles.offTag}>OFF</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Sunday Auto-Adjustment Warning Banner */}
          {deadlineResult.isSundayAdjusted && (
            <View style={styles.sundayNoticeBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <VectorIcon name="alert" size={14} color={COLORS.statusOverdue} />
                <Text style={styles.sundayNoticeTitle}>SUNDAY IS AN OFF-DAY</Text>
              </View>
              <Text style={styles.sundayNoticeText}>
                Selected date ({deadlineResult.originalSundayStr}) falls on Sunday.
              </Text>
              <Text style={styles.sundayNoticeHighlight}>
                Auto-shifted to Next Working Day: {deadlineResult.formattedDate}
              </Text>
            </View>
          )}

          {/* Time Picker Section */}
          <Text style={styles.sectionHeader}>SELECT TIME (WORKING HOURS 09:00 - 20:00)</Text>
          <View style={styles.timePickerRow}>
            {/* Hours */}
            <View style={styles.timeCol}>
              <Text style={styles.timeColLabel}>Hour</Text>
              <ScrollView style={styles.timeScroll} nestedScrollEnabled>
                {hoursList.map((h) => {
                  const ampm = h >= 12 ? 'PM' : 'AM';
                  const displayH = h % 12 === 0 ? 12 : h % 12;
                  const isHSelected = selectedHour === h;
                  return (
                    <TouchableOpacity
                      key={h}
                      style={[styles.timeChip, isHSelected && styles.timeChipSelected]}
                      onPress={() => handleHourSelect(h)}
                    >
                      <Text style={[styles.timeChipText, isHSelected && styles.timeChipTextSelected]}>
                        {displayH < 10 ? `0${displayH}` : displayH} {ampm}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Minutes */}
            <View style={styles.timeCol}>
              <Text style={styles.timeColLabel}>Minute</Text>
              <ScrollView style={styles.timeScroll} nestedScrollEnabled>
                {minutesList.map((m) => {
                  const isMSelected = selectedMinute === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.timeChip, isMSelected && styles.timeChipSelected]}
                      onPress={() => setSelectedMinute(m)}
                    >
                      <Text style={[styles.timeChipText, isMSelected && styles.timeChipTextSelected]}>
                        :{m < 10 ? `0${m}` : m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* Final Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Final Calculated Deadline:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <VectorIcon name="calendar" size={15} color={COLORS.accent} />
              <Text style={styles.summaryValue}>
                {deadlineResult.formattedDate} at {deadlineResult.formattedTime}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>Set Deadline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING.lg,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: isTablet ? 20 : 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  dateScroll: {
    flexGrow: 0,
    marginBottom: SPACING.sm,
  },
  dateChip: {
    width: 65,
    height: 80,
    borderRadius: 12,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    padding: 4,
  },
  dateChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  sundayChip: {
    backgroundColor: COLORS.sundayBg,
    borderColor: COLORS.sundayBorder,
  },
  sundayChipSelected: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  dayName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  dateNum: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginVertical: 2,
  },
  monthName: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  dateChipTextSelected: {
    color: '#FFFFFF',
  },
  offTag: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.sundayText,
    backgroundColor: '#FDE68A',
    paddingHorizontal: 4,
    borderRadius: 4,
    marginTop: 2,
  },
  sundayNoticeBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sundayNoticeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  sundayNoticeText: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
  },
  sundayNoticeHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
    marginTop: 4,
  },
  timePickerRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    height: 120,
    marginBottom: SPACING.md,
  },
  timeCol: {
    flex: 1,
  },
  timeColLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  timeScroll: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 10,
    padding: 4,
  },
  timeChip: {
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    marginBottom: 2,
  },
  timeChipSelected: {
    backgroundColor: COLORS.accent,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  timeChipTextSelected: {
    color: '#FFFFFF',
  },
  summaryCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#075985',
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
