import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import VectorIcon from '../components/VectorIcon';
import { COLORS, SPACING, isTablet } from '../styles/theme';

export default function MasterDataScreen() {
  const {
    role,
    masterData,
    addMasterItem,
    deleteMasterItem,
    clearAllData,
    toggleEmployeeAvailabilityInContext,
    addEmployeeToDatabase,
    deleteEmployeeFromDatabase,
    refreshEmployeesFromDb,
  } = useApp();

  const [activeTab, setActiveTab] = useState('employees'); // employees, models, fabrics, parties, salesmen
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form Inputs
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [customIdInput, setCustomIdInput] = useState('');
  const [deptInput, setDeptInput] = useState('Carpentry');

  // Load latest employees from MongoDB on mount
  useEffect(() => {
    if (role === 'OWNER') {
      refreshEmployeesFromDb();
    }
  }, [role]);

  if (role !== 'OWNER') {
    return (
      <View style={styles.restrictedContainer}>
        <VectorIcon name="lock" size={36} color={COLORS.accent} style={{ marginBottom: SPACING.sm }} />
        <Text style={styles.restrictedTitle}>Owner Access Required</Text>
        <Text style={styles.restrictedSub}>
          Master Data management (adding, selecting employees for job sheets, models, and fabrics) is restricted to the Owner/Admin role only.
        </Text>
      </View>
    );
  }

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshEmployeesFromDb();
    setIsRefreshing(false);
  };

  const handleSelectAllEmployees = (available) => {
    if (activeTab !== 'employees') return;
    const emps = masterData.employees || [];
    emps.forEach((emp) => {
      if (emp.isAvailableForJobSheet !== available) {
        toggleEmployeeAvailabilityInContext(emp.employeeId, available);
      }
    });
  };

  const handleAddItem = async () => {
    if (!nameInput.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid name.');
      return;
    }

    if (activeTab === 'employees') {
      const parts = nameInput.trim().split(' ');
      const fName = parts[0] || nameInput.trim();
      const autoEmail = emailInput.trim() || `${fName.toLowerCase()}@jobsheetflow.com`;

      const result = await addEmployeeToDatabase({
        name: nameInput.trim(),
        department: deptInput,
        email: autoEmail,
        phone: phoneInput.trim(),
        mobileNumber: phoneInput.trim(),
        employeeId: customIdInput.trim() || undefined,
        isAvailableForJobSheet: true,
      });

      if (result.success && result.employee) {
        Alert.alert(
          '🎉 Employee Registered!',
          `Employee ID [${result.employee.employeeId}] ${result.employee.name} has been added to the database and is selected for Job Sheet Creation.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to add employee');
        return;
      }
    } else {
      const id = `${activeTab.slice(0, 3)}-${Date.now()}`;
      addMasterItem(activeTab, {
        id,
        name: nameInput.trim(),
      });
    }

    setNameInput('');
    setPhoneInput('');
    setEmailInput('');
    setCustomIdInput('');
    setShowAddModal(false);
  };

  const handleDeleteEmployee = (emp) => {
    if (emp.role === 'owner') {
      Alert.alert('Cannot Delete', 'The Owner/Administrator account cannot be deleted.');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to remove [${emp.employeeId}] ${emp.name} from the database?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteEmployeeFromDatabase(emp.employeeId);
            if (res && res.message && !res.success) {
              Alert.alert('Delete Failed', res.message);
            }
          },
        },
      ]
    );
  };

  const items = masterData[activeTab] || [];
  const activeEmployeesCount = (masterData.employees || []).filter(
    (e) => e.isAvailableForJobSheet !== false
  ).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>MASTER DATA MANAGEMENT</Text>
          <Text style={styles.sub}>Owner Control Panel • Database Synced Dropdowns</Text>
        </View>
        {activeTab === 'employees' && (
          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={handleManualRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={COLORS.accent} />
            ) : (
              <VectorIcon name="refresh" size={16} color={COLORS.accent} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Selector Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        {[
          { key: 'employees', label: 'Employees (Database)', icon: 'users' },
          { key: 'models', label: 'Models', icon: 'cushion' },
          { key: 'fabrics', label: 'Fabrics', icon: 'fabric' },
          { key: 'parties', label: 'Parties', icon: 'tag' },
          { key: 'salesmen', label: 'Salesmen', icon: 'user' },
        ].map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabChip, isSelected && styles.tabChipSelected]}
              onPress={() => setActiveTab(tab.key)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <VectorIcon
                  name={tab.icon}
                  size={14}
                  color={isSelected ? '#FFFFFF' : COLORS.textSecondary}
                />
                <Text style={[styles.tabChipText, isSelected && styles.tabChipTextSelected]}>
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>


      {/* Add New Button */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <VectorIcon name="plus" size={14} color="#FFFFFF" />
          <Text style={styles.addBtnText}>
            Add New {activeTab === 'employees' ? 'Employee' : activeTab.slice(0, -1).toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Item List */}
      <View style={styles.listContainer}>
        {items.map((item) => {
          const isAvailable = item.isAvailableForJobSheet !== false;

          return (
            <View key={item.id || item.employeeId} style={styles.itemRow}>
              <View style={{ flex: 1, marginRight: SPACING.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {activeTab === 'employees' && (
                    <View style={styles.idBadge}>
                      <Text style={styles.idBadgeText}>ID: {item.employeeId}</Text>
                    </View>
                  )}
                  <Text style={styles.itemName}>{item.name}</Text>
                  {activeTab === 'employees' && item.role === 'owner' && (
                    <View style={styles.ownerBadge}>
                      <Text style={styles.ownerBadgeText}>OWNER</Text>
                    </View>
                  )}
                </View>

                {activeTab === 'employees' ? (
                  <>
                    <Text style={styles.itemSub}>
                      Dept: <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>{item.department || 'Production'}</Text>
                      {item.email ? ` • ${item.email}` : ''}
                      {item.phone ? ` • ${item.phone}` : ''}
                    </Text>
                    <Text style={[styles.itemSub, { color: COLORS.accent, fontWeight: '700', marginTop: 2 }]}>
                      🕒 Working Hours: 9:00 AM – 8:00 PM (Sunday OFF)
                    </Text>


                  </>
                ) : (
                  <Text style={styles.itemSub}>Standard Master Item</Text>
                )}
              </View>

              {/* Delete Button */}
              {activeTab === 'employees' ? (
                item.role !== 'owner' && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteEmployee(item)}
                  >
                    <VectorIcon name="trash" size={12} color="#EF4444" />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() =>
                    Alert.alert(
                      'Confirm Delete',
                      `Are you sure you want to delete ${item.name}?`,
                      [
                        { text: 'Cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => deleteMasterItem(activeTab, item.id),
                        },
                      ]
                    )
                  }
                >
                  <VectorIcon name="trash" size={12} color="#EF4444" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>


      {/* ADD ITEM MODAL */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {activeTab === 'employees' ? 'Add New Employees' : `Add New ${activeTab.slice(0, -1)}`}
            </Text>
            <Text style={styles.modalSub}>
              {activeTab === 'employees'
                ? 'Creates a real database profile with 4-digit ID and auto-selects for Job Sheet creation:'
                : 'Will appear in all selection dropdowns:'}
            </Text>

            <Text style={styles.fieldLabel}>Full Name / Title *:</Text>
            <TextInput
              style={styles.input}
              placeholder={activeTab === 'employees' ? 'e.g. Gurpreet Singh' : 'e.g. Model Velvet 300'}
              value={nameInput}
              onChangeText={setNameInput}
            />

            {activeTab === 'employees' && (
              <>
                <Text style={styles.fieldLabel}>Department *:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  {['Carpentry', 'QC', 'Cushion', 'Fabric', 'Fitting', 'Packing', 'Production'].map((dept) => (
                    <TouchableOpacity
                      key={dept}
                      style={[styles.deptChip, deptInput === dept && styles.deptChipSelected]}
                      onPress={() => setDeptInput(dept)}
                    >
                      <Text style={[styles.deptChipText, deptInput === dept && styles.deptChipTextSelected]}>
                        {dept}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.fieldLabel}>Email Address (Optional):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. gurpreet@jobsheetflow.com"
                  value={emailInput}
                  onChangeText={setEmailInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.fieldLabel}>Phone Number (Optional):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. +919876543210"
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                  keyboardType="phone-pad"
                />

                <Text style={styles.fieldLabel}>Custom 4-Digit Employee ID (Optional):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Leave blank to auto-generate unique 4-digit ID"
                  value={customIdInput}
                  onChangeText={setCustomIdInput}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmAddBtn} onPress={handleAddItem}>
                <Text style={styles.confirmAddBtnText}>Save & Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refreshIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
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
  tabScroll: {
    marginBottom: SPACING.md,
  },
  tabChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tabChipTextSelected: {
    color: '#FFFFFF',
  },
  employeeControlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  employeeControlHeader: {
    marginBottom: SPACING.sm,
  },
  employeeControlTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  employeeControlSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  batchBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  batchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  batchBtnSelectAll: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  batchBtnTextSelectAll: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  batchBtnDeselectAll: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  batchBtnTextDeselectAll: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  addBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  listContainer: {
    gap: SPACING.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  idBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  idBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  ownerBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  availabilityToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  availabilityBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  availabilityBtnInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  availabilityBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  availabilityTextActive: {
    color: '#059669',
  },
  availabilityTextInactive: {
    color: '#64748B',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  deleteBtnText: {
    color: COLORS.statusOverdue,
    fontSize: 11,
    fontWeight: '700',
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
    backgroundColor: COLORS.bgLight,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalSub: {
    fontSize: 12,
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
  input: {
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: SPACING.md,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  deptChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 4,
  },
  deptChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  deptChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  deptChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  confirmAddBtn: {
    flex: 2,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  confirmAddBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resetCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  resetTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.statusOverdue,
  },
  resetSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  resetBtn: {
    backgroundColor: COLORS.statusOverdue,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
