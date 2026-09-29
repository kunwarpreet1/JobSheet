import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useApp } from '../context/AppContext';
import VectorIcon from '../components/VectorIcon';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import { COLORS, SPACING, isTablet } from '../styles/theme';
import { formatDateStr } from '../utils/deadlineCalculator';
import {
  isJobSheetAssignedToUser,
  isTaskAssignedToUser,
  isUserJobSheetManager,
  isStatusDone,
} from '../utils/storage';

function JobSheetCard({ sheet, onPress, isEmployee = false, currentUser = null, activeEmployee = '' }) {
  const isManager = isUserJobSheetManager(sheet, currentUser, activeEmployee);

  // If the user is the Production Manager for this Job Sheet, they oversee ALL stages!
  const relevantStages = isEmployee && !isManager
    ? (sheet.stages || []).filter((s) => isTaskAssignedToUser(s, currentUser, activeEmployee))
    : (sheet.stages || []);

  const doneStages = relevantStages.filter((s) => isStatusDone(s.status)).length;
  const totalStages = relevantStages.length > 0 ? relevantStages.length : (sheet.stages?.length || 11);
  const hasOverdue = relevantStages.some((s) => s.status === 'Overdue' || s.status === 'OVERDUE');
  const activeStage = relevantStages.find((s) => !isStatusDone(s.status)) || null;

  const displayStatus = hasOverdue
    ? 'Overdue'
    : isEmployee && !isManager
    ? (relevantStages.length > 0 && doneStages === relevantStages.length)
      ? 'Done'
      : (relevantStages.length > 0 && doneStages > 0)
      ? 'In Progress'
      : sheet.overallStatus || 'In Progress'
    : sheet.overallStatus || 'In Progress';

  return (
    <TouchableOpacity
      style={[styles.sheetCard, hasOverdue && styles.sheetCardOverdue]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Top Row: Job ID & Status Badge */}
      <View style={styles.cardHeader}>
        <View style={styles.idBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.sheetIdText}>{sheet.id}</Text>
            {isManager && (
              <View style={styles.managerCardBadge}>
                <Text style={styles.managerCardBadgeText}>MANAGER</Text>
              </View>
            )}
          </View>
          <Text style={styles.partyNameText} numberOfLines={1}>
            {sheet.party}
          </Text>
        </View>
        <StatusBadge status={displayStatus} size="small" />
      </View>

      {/* Info Grid */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCol}>
          <Text style={styles.infoLabel}>Fabric</Text>
          <Text style={styles.infoVal} numberOfLines={1}>
            {sheet.fabric || 'N/A'}
          </Text>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.infoLabel}>Salesman</Text>
          <Text style={styles.infoVal} numberOfLines={1}>
            {sheet.salesman || 'N/A'}
          </Text>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.infoLabel}>Manager</Text>
          <Text style={[styles.infoVal, isManager && { color: '#4F46E5', fontWeight: '800' }]} numberOfLines={1}>
            {sheet.manager || 'Unassigned'}
          </Text>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.infoLabel}>Date</Text>
          <Text style={styles.infoVal} numberOfLines={1}>
            {formatDateStr(sheet.date)}
          </Text>
        </View>
      </View>

      {/* Progress Bar Section */}
      <View style={styles.progressSection}>
        <ProgressBar
          completedCount={doneStages}
          totalCount={totalStages}
          height={6}
          showLabel={true}
        />
      </View>

      {/* Current / Active Stage Indicator */}
      {activeStage && (
        <View style={styles.activeStageRow}>
          <View style={[styles.activeStageDot, hasOverdue && { backgroundColor: '#EF4444' }]} />
          <Text style={styles.activeStageLabel}>Current Stage:</Text>
          <Text style={styles.activeStageName} numberOfLines={1}>
            {activeStage.name}
            {activeStage.assignedTo ? ` (${activeStage.assignedTo})` : ''}
          </Text>
        </View>
      )}

      {/* Card Footer: Clickable Action CTA */}
      <View style={styles.cardFooter}>
        <Text style={styles.viewDetailsText}>View Full Job Sheet</Text>
        <VectorIcon name="chevron-right" size={14} color={COLORS.accent} />
      </View>
    </TouchableOpacity>
  );
}

export default function JobSheetsScreen() {
  const {
    jobSheets,
    setActiveTab,
    setSelectedJobSheetId,
    role,
    currentUser,
    activeEmployee,
    openAuthFlow,
    refreshJobSheets,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, IN_PROGRESS, DONE, OVERDUE
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

  if (role === 'GUEST') {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.guestCard}>
          <View style={styles.guestIconCircle}>
            <VectorIcon name="lock" size={32} color="#6366F1" />
          </View>
          <Text style={styles.guestCardTitle}>Sign In Required</Text>
          <Text style={styles.guestCardSubtitle}>
            Please log in with your credentials to view job sheets and manage production flows.
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
      </View>
    );
  }

  const isEmployee = role === 'EMPLOYEE';

  // Employees should ONLY see Job Sheets that contain tasks assigned to them!
  const baseSheets = isEmployee
    ? jobSheets.filter((sheet) => isJobSheetAssignedToUser(sheet, currentUser, activeEmployee))
    : jobSheets;

  // Filter job sheets based on search and status
  const filteredSheets = baseSheets.filter((sheet) => {
    const matchesSearch =
      sheet.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.party?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.fabric?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.salesman?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'IN_PROGRESS') return !isStatusDone(sheet.overallStatus) && sheet.overallStatus !== 'Overdue';
    if (statusFilter === 'DONE') return isStatusDone(sheet.overallStatus);
    if (statusFilter === 'OVERDUE') {
      return (sheet.stages || []).some((st) => st.status === 'Overdue' || st.status === 'OVERDUE');
    }
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Top Search & Filter Bar */}
      <View style={styles.filterHeader}>
        <View style={styles.searchBar}>
          <VectorIcon name="search" size={15} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={isEmployee ? "Search your assigned job sheets..." : "Search by Job ID, Party, Fabric, Salesman..."}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <VectorIcon name="close" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {[
            { key: 'ALL', label: 'All' },
            { key: 'IN_PROGRESS', label: 'In Progress' },
            { key: 'DONE', label: 'Completed' },
            { key: 'OVERDUE', label: 'Overdue' },
          ].map((item) => {
            const isSelected = statusFilter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                onPress={() => setStatusFilter(item.key)}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Count Banner */}
      <View style={styles.resultsBanner}>
        <Text style={styles.resultsCountText}>
          {isEmployee ? `Assigned to You: ` : ''}
          {filteredSheets.length} {filteredSheets.length === 1 ? 'Job Sheet' : 'Job Sheets'} Found
        </Text>
        {statusFilter !== 'ALL' && (
          <TouchableOpacity onPress={() => setStatusFilter('ALL')}>
            <Text style={styles.clearFilterText}>Reset Filter</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Full-Screen Vertical List of All Job Sheets */}
      <FlatList
        data={filteredSheets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[COLORS.accent]} />
        }
        renderItem={({ item }) => (
          <JobSheetCard
            sheet={item}
            onPress={() => setSelectedJobSheetId(item.id)}
            isEmployee={isEmployee}
            currentUser={currentUser}
            activeEmployee={activeEmployee}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <VectorIcon name="clipboard" size={54} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>
              {isEmployee
                ? baseSheets.length === 0
                  ? 'No Job Sheets Assigned'
                  : 'No Matching Assigned Sheets'
                : jobSheets.length === 0
                ? 'No Job Sheets in System'
                : 'No Matching Job Sheets'}
            </Text>
            <Text style={styles.emptySub}>
              {isEmployee
                ? baseSheets.length === 0
                  ? `You (${activeEmployee}) currently have no tasks assigned in any active job sheet.`
                  : 'Try adjusting your search query or status filter.'
                : jobSheets.length === 0
                ? 'Create a new Job Sheet to begin tracking production workflows.'
                : 'Try adjusting your search query or status filter.'}
            </Text>
            {!isEmployee && jobSheets.length === 0 ? (
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => setActiveTab('Create')}
                activeOpacity={0.8}
              >
                <Text style={styles.createBtnText}>+ Create New Job Sheet</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
              >
                <Text style={styles.clearBtnText}>Clear Search & Filters</Text>
              </TouchableOpacity>
            )}
          </View>
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
  filterHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    height: 38,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  filterScroll: {
    marginVertical: SPACING.xs,
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: COLORS.bgLight,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  resultsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sheetCardOverdue: {
    borderColor: '#FECACA',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  idBox: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  sheetIdText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  managerCardBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  managerCardBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  partyNameText: {
    fontSize: isTablet ? 15 : 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: SPACING.xs + 2,
    marginVertical: SPACING.xs,
  },
  infoCol: {
    flex: 1,
    paddingHorizontal: 4,
  },
  infoLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoVal: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  progressSection: {
    marginTop: 2,
  },
  activeStageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  activeStageDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.accent,
  },
  activeStageLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  activeStageName: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: SPACING.xs + 2,
    gap: 2,
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.accent,
  },
  emptyContainer: {
    flex: 1,
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
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
    maxWidth: 280,
  },
  createBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  clearBtn: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  guestContainer: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
  },
  guestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    width: '100%',
    maxWidth: 420,
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
