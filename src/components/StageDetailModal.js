import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import StatusBadge from './StatusBadge';
import VectorIcon from './VectorIcon';
import { COLORS, SPACING, isTablet } from '../styles/theme';
import { formatDateStr, formatTimeStr, formatFullTimestamp } from '../utils/deadlineCalculator';

export default function StageDetailModal({
  visible,
  onClose,
  stage,
  jobSheet,
  onActionPress,
  isOwner,
}) {
  if (!stage || !jobSheet) return null;

  const isDone = stage.status === 'Done';
  const isOverdue = stage.status === 'Overdue';

  const deadlineStr = stage.deadline
    ? `${formatDateStr(stage.deadline)} at ${formatTimeStr(stage.deadline)}`
    : 'Not set';

  const completedStr = stage.completedAt
    ? formatFullTimestamp(stage.completedAt)
    : null;

  // Calculate early vs late duration
  let durationBadge = null;
  if (isDone && stage.completedAt && stage.deadline) {
    const deadlineTime = new Date(stage.deadline).getTime();
    const completedTime = new Date(stage.completedAt).getTime();
    const diffMs = completedTime - deadlineTime;
    const diffMins = Math.round(Math.abs(diffMs) / (1000 * 60));

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;

    if (diffMs <= 0) {
      durationBadge = { text: `${timeStr} early`, isEarly: true };
    } else {
      durationBadge = { text: `${timeStr} late`, isEarly: false };
    }
  }

  // Filter activity history for this stage
  const stageLogs = (jobSheet.activityLogs || []).filter((log) =>
    log.text.toLowerCase().includes(stage.name.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.stageTitle}>{stage.name}</Text>
              <Text style={styles.jobSheetSub}>Job Sheet #{jobSheet.id} • {jobSheet.party}</Text>
            </View>
            <StatusBadge status={stage.status} />
          </View>

          <ScrollView style={styles.bodyScroll}>
            {/* Details Grid */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Assigned Employee:</Text>
                <Text style={styles.detailValBold}>{stage.assignedTo || 'Unassigned'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Assigned By:</Text>
                <Text style={styles.detailVal}>{stage.assignedBy || 'Owner'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Deadline:</Text>
                <Text style={[styles.detailVal, isOverdue && styles.overdueVal]}>
                  {deadlineStr}
                </Text>
              </View>

              {completedStr && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Completed At:</Text>
                  <Text style={styles.detailValDone}>{completedStr}</Text>
                </View>
              )}

              {durationBadge && (
                <View style={[styles.badgeBanner, durationBadge.isEarly ? styles.earlyBanner : styles.lateBanner, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}>
                  <VectorIcon
                    name={durationBadge.isEarly ? 'sparkles' : 'alert'}
                    size={13}
                    color={durationBadge.isEarly ? COLORS.statusDone : COLORS.statusOverdue}
                  />
                  <Text style={[styles.badgeBannerText, durationBadge.isEarly ? styles.earlyText : styles.lateText]}>
                    Completion Timing: {durationBadge.text}
                  </Text>
                </View>
              )}
            </View>

            {/* Notes Section */}
            <Text style={styles.sectionHeader}>TASK NOTES & REMARKS</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>
                {stage.notes ? stage.notes : 'No additional notes provided.'}
              </Text>
            </View>

            {/* Image Attachments */}
            <Text style={styles.sectionHeader}>TASK PROOF ATTACHMENTS</Text>
            {stage.image ? (
              <View style={styles.imageBox}>
                <Image source={{ uri: stage.image }} style={styles.imagePreview} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 4, gap: 4 }}>
                  <VectorIcon name="camera" size={12} color="#FFFFFF" />
                  <Text style={styles.imageCaption}>Photo Proof Attached</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.noImgText}>No proof images uploaded for this stage.</Text>
            )}

            {/* Stage Activity Trail */}
            <Text style={styles.sectionHeader}>STAGE ACTIVITY LOG</Text>
            {stageLogs.length > 0 ? (
              stageLogs.map((log) => (
                <View key={log.id} style={styles.logItem}>
                  <Text style={styles.logAuthor}>{log.author}:</Text>
                  <Text style={styles.logMsg}>{log.text}</Text>
                  <Text style={styles.logTime}>{formatFullTimestamp(log.timestamp)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noImgText}>No individual activity entries yet.</Text>
            )}
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footerRow}>
            {onActionPress && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  onClose();
                  onActionPress(stage);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <VectorIcon name={isDone ? 'edit' : 'check'} size={14} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>
                    {isDone ? 'Edit Task' : 'Update / Mark Done'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stageTitle: {
    fontSize: isTablet ? 20 : 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  jobSheetSub: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
  },
  bodyScroll: {
    marginBottom: SPACING.md,
  },
  detailsGrid: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 140,
  },
  detailVal: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  detailValBold: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  detailValDone: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.statusDone,
  },
  overdueVal: {
    color: COLORS.statusOverdue,
    fontWeight: '800',
  },
  badgeBanner: {
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
    alignItems: 'center',
  },
  earlyBanner: {
    backgroundColor: '#ECFDF5',
  },
  lateBanner: {
    backgroundColor: '#FEF2F2',
  },
  badgeBannerText: {
    fontSize: 11,
    fontWeight: '800',
  },
  earlyText: {
    color: COLORS.statusDone,
  },
  lateText: {
    color: COLORS.statusOverdue,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  notesBox: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 10,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  notesText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
  },
  imageBox: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  imagePreview: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  imageCaption: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#FFFFFF',
    fontSize: 10,
    padding: 4,
    textAlign: 'center',
  },
  noImgText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginBottom: SPACING.md,
  },
  logItem: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 8,
    padding: SPACING.xs,
    marginBottom: 4,
  },
  logAuthor: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  logMsg: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  logTime: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  footerRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtn: {
    flex: 2,
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
