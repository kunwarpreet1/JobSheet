import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { STANDARD_STAGES } from '../utils/storage';
import VectorIcon from '../components/VectorIcon';
import { pickImageFromGallery } from '../utils/imagePickerHelper';
import { COLORS, SPACING, isTablet } from '../styles/theme';
import { getDefaultWorkingDeadline } from '../utils/deadlineCalculator';

export default function CreateJobSheetScreen() {
  const { role, masterData, addJobSheet, setSelectedJobSheetId } = useApp();

  // Basic Info Form State
  const [selectedParty, setSelectedParty] = useState(masterData.parties[0]?.name || '');
  const [selectedSalesman, setSelectedSalesman] = useState(masterData.salesmen[0]?.name || '');
  const [selectedFabric, setSelectedFabric] = useState(masterData.fabrics[0]?.name || '');

  // Filter out Owner (4821): Owner is NOT applicable to become a manager
  const isEligibleStaff = (e) =>
    (e.role || '').toLowerCase() !== 'owner' &&
    String(e.employeeId).trim() !== '4821' &&
    (e.name || '').toLowerCase() !== 'owner' &&
    (e.name || '').toLowerCase() !== 'admin';

  // Selectable employees: only eligible staff marked available in Master Data
  const availableEmployees = (masterData.employees || []).filter(
    (e) => e.isAvailableForJobSheet !== false && isEligibleStaff(e)
  );
  const selectableEmployees =
    availableEmployees.length > 0
      ? availableEmployees
      : (masterData.employees || []).filter(isEligibleStaff);

  // Carpentry QC Setup
  const [qcCheckedBy, setQcCheckedBy] = useState(selectableEmployees[0]?.name || '');
  const [qcCushionBy, setQcCushionBy] = useState(
    selectableEmployees.find((e) => e.department === 'Cushion')?.name ||
    selectableEmployees[1]?.name ||
    selectableEmployees[0]?.name ||
    ''
  );
  const [qcModel, setQcModel] = useState(masterData.models[0]?.name || '');
  const [qcImage, setQcImage] = useState(null);
  const [qcNotes] = useState('');

  const handlePickQcImage = async () => {
    const uri = await pickImageFromGallery();
    if (uri) {
      setQcImage(uri);
    }
  };

  // Production Manager Selection (Owner selects one employee responsible for this Job Sheet)
  const [selectedManager, setSelectedManager] = useState(selectableEmployees[0]?.name || '');

  // Sync default manager when selectableEmployees updates from database
  useEffect(() => {
    if (selectableEmployees.length > 0) {
      if (!qcCheckedBy) {
        setQcCheckedBy(selectableEmployees[0]?.name || '');
      }
      if (!qcCushionBy) {
        const cushionEmp = selectableEmployees.find((e) => e.department === 'Cushion') || selectableEmployees[0];
        setQcCushionBy(cushionEmp?.name || '');
      }
      if (!selectedManager || selectedManager.toLowerCase() === 'owner' || selectedManager.toLowerCase() === 'john doe') {
        setSelectedManager(selectableEmployees[0]?.name || '');
      }
    }
  }, [selectableEmployees.length]);

  if (role !== 'OWNER') {
    return (
      <View style={styles.restrictedContainer}>
        <VectorIcon name="lock" size={36} color={COLORS.accent} style={{ marginBottom: SPACING.sm }} />
        <Text style={styles.restrictedTitle}>Owner Access Required</Text>
        <Text style={styles.restrictedSub}>
          Creating new Job Sheets and assigning Production Managers is restricted to the Owner/Admin role only.
        </Text>
      </View>
    );
  }

  const handleCreateAndSend = async () => {
    if (!selectedParty) {
      Alert.alert('Validation Error', 'Please select a Customer / Party.');
      return;
    }

    if (!selectedManager) {
      Alert.alert('Validation Error', 'Please select a Production Manager for this Job Sheet.');
      return;
    }

    const matchedManager = selectableEmployees.find(
      (e) => e.name.toLowerCase() === selectedManager.toLowerCase()
    );
    const managerEmployeeId = matchedManager?.employeeId || '';

    // Standard sequential production stages initially starting unassigned
    // The assigned Manager will progressively assign tasks one-by-one as production advances!
    const initialStages = STANDARD_STAGES.map((st) => ({
      id: st.id,
      name: st.name,
      assignedTo: 'Unassigned',
      assignedEmployeeId: '',
      status: 'Not Started',
      deadline: getDefaultWorkingDeadline(st.id, 18, 0),
      notes: '',
    }));

    // Save job sheet via AppContext (persists to MongoDB & triggers MANAGER_ASSIGNED notification to the selected manager)
    const createdSheet = addJobSheet({
      party: selectedParty,
      salesman: selectedSalesman,
      fabric: selectedFabric,
      qcCheckedBy,
      cushionBy: qcCushionBy,
      model: qcModel,
      qcImage,
      qcNotes,
      qcBox: {
        qcCheckedBy,
        cushionBy: qcCushionBy,
        model: qcModel,
        image: qcImage,
        notes: qcNotes,
      },
      manager: selectedManager,
      managerEmployeeId,
      stages: initialStages,
    });

    Alert.alert(
      '🎉 Job Sheet Created & Assigned!',
      `Job Sheet ${createdSheet.id} has been created and assigned to Production Manager "${selectedManager}".`,
      [
        {
          text: 'Open Job Sheet',
          onPress: () => {
            setSelectedJobSheetId(createdSheet.id);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>CREATE NEW JOB SHEET</Text>
      <Text style={styles.sub}>Master Data Driven Setup • Auto Deadline System</Text>

      {/* Basic Info Section */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>1. BASIC INFORMATION</Text>

        {/* Party Selector */}
        <Text style={styles.fieldLabel}>Party / Customer:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {masterData.parties.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, selectedParty === p.name && styles.chipSelected]}
              onPress={() => setSelectedParty(p.name)}
            >
              <Text style={[styles.chipText, selectedParty === p.name && styles.chipTextSelected]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Salesman Selector */}
        <Text style={styles.fieldLabel}>Salesman:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {masterData.salesmen.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.chip, selectedSalesman === s.name && styles.chipSelected]}
              onPress={() => setSelectedSalesman(s.name)}
            >
              <Text style={[styles.chipText, selectedSalesman === s.name && styles.chipTextSelected]}>
                {s.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Fabric Selector */}
        <Text style={styles.fieldLabel}>Fabric Selection:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {masterData.fabrics.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.chip, selectedFabric === f.name && styles.chipSelected]}
              onPress={() => setSelectedFabric(f.name)}
            >
              <Text style={[styles.chipText, selectedFabric === f.name && styles.chipTextSelected]}>
                {f.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Carpentry QC Box Section */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>2. CARPENTRY QC SETUP</Text>

        <Text style={styles.fieldLabel}>QC Checked By:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {selectableEmployees.length === 0 ? (
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, paddingVertical: 6 }}>
              No employees registered yet. Add in Master Data.
            </Text>
          ) : (
            selectableEmployees.map((e) => {
              const isSelected = qcCheckedBy === e.name;
              return (
                <TouchableOpacity
                  key={e.id || e.employeeId}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setQcCheckedBy(e.name)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {e.name}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <Text style={styles.fieldLabel}>Cushion Person:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {selectableEmployees.length === 0 ? (
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, paddingVertical: 6 }}>
              No employees registered yet. Add in Master Data.
            </Text>
          ) : (
            selectableEmployees.map((e) => {
              const isSelected = qcCushionBy === e.name;
              return (
                <TouchableOpacity
                  key={e.id || e.employeeId}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setQcCushionBy(e.name)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {e.name}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <Text style={styles.fieldLabel}>Model:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {masterData.models.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.chip, qcModel === m.name && styles.chipSelected]}
              onPress={() => setQcModel(m.name)}
            >
              <Text style={[styles.chipText, qcModel === m.name && styles.chipTextSelected]}>
                {m.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {qcImage ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: qcImage }} style={styles.qcImagePreview} />
            <View style={styles.imagePreviewActions}>
              <TouchableOpacity style={styles.changeImageBtn} onPress={handlePickQcImage}>
                <VectorIcon name="camera" size={13} color={COLORS.accent} />
                <Text style={styles.changeImageText}>Change Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => setQcImage(null)}>
                <VectorIcon name="x" size={13} color="#EF4444" />
                <Text style={styles.removeImageText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addPhotoBtn} onPress={handlePickQcImage}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <VectorIcon name="camera" size={14} color={COLORS.accent} />
              <Text style={styles.addPhotoText}>Upload QC Photo from Gallery (Optional)</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Production Manager Assignment */}
      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.cardSectionTitle}>3. PRODUCTION MANAGER ASSIGNMENT</Text>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>RESPONSIBLE MANAGER</Text>
          </View>
        </View>
        <Text style={styles.cardSub}>
          Select one employee as the Manager responsible for supervising this Job Sheet and assigning subsequent production tasks:
        </Text>

        {/* Manager Selection List */}
        <View style={styles.managerListContainer}>
          {selectableEmployees.length === 0 ? (
            <View style={{ padding: 14, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 }}>
                No employees registered in database yet.{'\n'}Go to Master Data tab to register employees.
              </Text>
            </View>
          ) : (
            selectableEmployees.map((emp) => {
              const isSelected =
                selectedManager.toLowerCase() === emp.name.toLowerCase();
              return (
                <TouchableOpacity
                  key={emp.id || emp.employeeId}
                  style={[styles.managerCard, isSelected && styles.managerCardSelected]}
                  onPress={() => setSelectedManager(emp.name)}
                  activeOpacity={0.8}
                >
                  <View style={styles.managerCardLeft}>
                    <View style={[styles.managerAvatar, isSelected && styles.managerAvatarSelected]}>
                      <Text style={[styles.managerAvatarText, isSelected && styles.managerAvatarTextSelected]}>
                        {(emp.name || 'E').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.managerName, isSelected && styles.managerNameSelected]}>
                        {emp.name}
                      </Text>
                      <Text style={styles.managerDept}>
                        {emp.department || 'Production'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <VectorIcon name="check" size={13} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Workflow Info Box */}
        <View style={styles.workflowInfoBox}>
          <VectorIcon name="info" size={18} color="#2563EB" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.workflowInfoTitle}>Sequential Task Assignment Workflow</Text>
            <Text style={styles.workflowInfoText}>
              The selected Manager will receive an instant notification. The Manager can then progressively assign production tasks (Fabric Order, Cutting, Stitching, QC, Packing) one-by-one as production advances.
            </Text>
          </View>
        </View>
      </View>

      {/* Main SEND & Create Button */}
      <TouchableOpacity style={styles.sendBigBtn} onPress={handleCreateAndSend} activeOpacity={0.8}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <VectorIcon name="send" size={18} color="#FFFFFF" />
          <Text style={styles.sendBigBtnText}>CREATE & ASSIGN TO MANAGER</Text>
        </View>
      </TouchableOpacity>
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
    paddingBottom: SPACING.xxl,
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  cardSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
    marginBottom: 4,
  },
  chipScroll: {
    marginBottom: SPACING.sm,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
  },
  chipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  addPhotoBtn: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  addPhotoText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  imagePreviewContainer: {
    marginTop: SPACING.sm,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    padding: SPACING.sm,
  },
  qcImagePreview: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  imagePreviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: 4,
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  changeImageText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  removeImageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgePill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgePillText: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '800',
  },
  managerListContainer: {
    marginBottom: SPACING.md,
    gap: 8,
  },
  managerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  managerCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  managerCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  managerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  managerAvatarSelected: {
    backgroundColor: '#4F46E5',
  },
  managerAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  managerAvatarTextSelected: {
    color: '#FFFFFF',
  },
  managerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  managerNameSelected: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  empIdBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  empIdBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  managerDept: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioCircleSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#4F46E5',
  },
  workflowInfoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  workflowInfoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 2,
  },
  workflowInfoText: {
    fontSize: 11,
    color: '#3B82F6',
    lineHeight: 16,
  },
  sendBigBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  sendBigBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
    backgroundColor: COLORS.bgLight,
  },
  restrictedIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  restrictedSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
