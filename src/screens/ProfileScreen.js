import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import VectorIcon from '../components/VectorIcon';
import { COLORS, SPACING, isTablet } from '../styles/theme';
import { getEmployeeTasks, isStatusDone } from '../utils/storage';
import { pickImageFromGallery, captureImageFromCamera } from '../utils/imagePickerHelper';

export default function ProfileScreen() {
  const {
    role,
    currentUser,
    activeEmployee,
    logout,
    openAuthFlow,
    setActiveTab,
    jobSheets,
    goBack,
    updateUserName,
    updateUserProfilePhoto,
  } = useApp();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const isOwner = role === 'OWNER';
  const isEmployee = role === 'EMPLOYEE';
  const displayMobile = role === 'GUEST'
    ? 'NA'
    : currentUser?.mobileNumber || currentUser?.phone || (isOwner ? '+91 98765 43210' : 'NA');

  const isPhotoUri = (uri) =>
    typeof uri === 'string' &&
    (uri.startsWith('http') || uri.startsWith('data:') || uri.startsWith('file:') || uri.startsWith('content:'));
  const profilePhoto = isPhotoUri(currentUser?.photo)
    ? currentUser.photo
    : isPhotoUri(currentUser?.avatar)
      ? currentUser.avatar
      : null;

  const displayEmpId = isOwner
    ? '4821'
    : currentUser?.employeeId || (role === 'GUEST' ? 'GUEST' : 'NA');

  const handleSelectPhotoOption = () => {
    const options = [
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          try {
            const uri = await pickImageFromGallery();
            if (uri && updateUserProfilePhoto) {
              await updateUserProfilePhoto(uri);
            }
          } catch (e) {
            Alert.alert('Error', 'Failed to pick image from gallery.');
          }
        },
      },
      {
        text: 'Take Photo',
        onPress: async () => {
          try {
            const uri = await captureImageFromCamera();
            if (uri && updateUserProfilePhoto) {
              await updateUserProfilePhoto(uri);
            }
          } catch (e) {
            Alert.alert('Error', 'Failed to capture photo.');
          }
        },
      },
    ];

    if (profilePhoto) {
      options.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: async () => {
          if (updateUserProfilePhoto) {
            await updateUserProfilePhoto(null);
          }
        },
      });
    }

    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Profile Photo', 'Add or change your profile picture', options);
  };

  const handleOpenEdit = () => {
    setEditedName(currentUser?.name || activeEmployee || '');
    setShowEditModal(true);
  };

  const handleSaveName = async () => {
    const trimmed = editedName.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Name cannot be empty.');
      return;
    }
    setIsSavingName(true);
    try {
      const res = await updateUserName(trimmed);
      if (res && res.success) {
        setShowEditModal(false);
        Alert.alert('Success', 'Profile name updated successfully.');
      } else {
        Alert.alert('Error', res?.message || 'Failed to update name.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'An error occurred.');
    } finally {
      setIsSavingName(false);
    }
  };

  // Calculate task statistics for employee (including assigned stages + manager duties)
  const myTasks = getEmployeeTasks(jobSheets, currentUser, activeEmployee);
  const completedTasksCount = myTasks.filter((t) => isStatusDone(t.status)).length;
  const pendingTasksCount = myTasks.filter((t) => !isStatusDone(t.status)).length;

  const handleLogout = () => {
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleSwitchAccount = () => {
    Alert.alert(
      'Confirm Switch Account',
      'Are you sure you want to switch account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Banner Header */}
      <View style={styles.topBanner}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity
            style={[
              styles.avatarCircle,
              isOwner ? styles.avatarOwner : isEmployee ? styles.avatarEmployee : styles.avatarGuest,
            ]}
            onPress={handleSelectPhotoOption}
            activeOpacity={0.8}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
            ) : (
              <VectorIcon
                name={isOwner ? 'shield' : 'user'}
                size={36}
                color="#FFFFFF"
              />
            )}
            <View style={styles.cameraIconBadge}>
              <VectorIcon name="camera" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Just below profile photo: replaced mobile number with EMP ID */}
        <View style={styles.empIdHeaderTagBox}>
          <VectorIcon name="tag" size={12} color="#4F46E5" />
          <Text style={styles.empIdHeaderTagText}>
            {isOwner ? 'OWNER ID: 4821' : `EMP ID: ${displayEmpId}`}
          </Text>
        </View>

        <View style={styles.nameHeaderRow}>
          <Text style={styles.userName}>
            {isOwner
              ? currentUser?.name || 'Kunwarpreet Singh (Owner)'
              : isEmployee
                ? currentUser?.name || activeEmployee
                : 'Guest User'}
          </Text>
          {(isOwner || isEmployee) && (
            <TouchableOpacity style={styles.editBtnSmall} onPress={handleOpenEdit} activeOpacity={0.7}>
              <VectorIcon name="edit" size={13} color="#6366F1" />
            </TouchableOpacity>
          )}
        </View>

        <View
          style={[
            styles.roleBadge,
            isOwner
              ? styles.roleBadgeOwner
              : isEmployee
                ? styles.roleBadgeEmployee
                : styles.roleBadgeGuest,
          ]}
        >
          <VectorIcon
            name={isOwner ? 'shield' : 'user'}
            size={12}
            color={isOwner ? '#4338CA' : isEmployee ? '#0F766E' : '#475569'}
          />
          <Text
            style={[
              styles.roleBadgeText,
              isOwner
                ? styles.roleBadgeTextOwner
                : isEmployee
                  ? styles.roleBadgeTextEmployee
                  : styles.roleBadgeTextGuest,
            ]}
          >
            {isOwner ? 'OWNER' : isEmployee ? 'EMPLOYEE' : 'GUEST'}
          </Text>
        </View>
      </View>

      {/* Account Details Card */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>ACCOUNT INFORMATION</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <VectorIcon name="user" size={16} color={COLORS.textSecondary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>
              {currentUser?.name || (isOwner ? 'Kunwarpreet Singh' : "Guest")}
            </Text>
          </View>
          {(isOwner || isEmployee) && (
            <TouchableOpacity style={styles.editActionBtn} onPress={handleOpenEdit} activeOpacity={0.7}>
              <VectorIcon name="edit" size={13} color="#6366F1" />
              <Text style={styles.editActionBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <VectorIcon name="shield" size={16} color={COLORS.textSecondary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Employee ID</Text>
            <Text style={styles.infoValue}>
              {displayEmpId}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <VectorIcon name="phone" size={16} color={COLORS.textSecondary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Mobile Number</Text>
            <Text style={styles.infoValue}>
              {displayMobile}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <VectorIcon name="tag" size={16} color={COLORS.textSecondary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Role Permission</Text>
            <Text style={styles.infoValue}>
              {isOwner ? 'Owner' : isEmployee ? 'Employee' : 'Guest'}
            </Text>
          </View>
        </View>


      </View>

      {/* Role-Specific Stats & Navigation Cards */}
      {isOwner && (
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>QUICK MANAGEMENT SHORTCUTS</Text>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => setActiveTab('MasterData')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#EEF2FF' }]}>
              <VectorIcon name="settings" size={18} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Master Settings & Data</Text>
              <Text style={styles.actionSub}>Manage employees, models, fabrics & parties</Text>
            </View>
            <VectorIcon name="chevron-right" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => setActiveTab('Performance')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#ECFDF5' }]}>
              <VectorIcon name="chart" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Production Analytics</Text>
              <Text style={styles.actionSub}>Track efficiency, delays, and employee metrics</Text>
            </View>
            <VectorIcon name="chevron-right" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => setActiveTab('JobSheets')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#FEF3C7' }]}>
              <VectorIcon name="jobsheets" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>All Job Sheets ({jobSheets.length})</Text>
              <Text style={styles.actionSub}>Inspect workflow pipelines & order statuses</Text>
            </View>
            <VectorIcon name="chevron-right" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      )}

      {isEmployee && (
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>EMPLOYEE TASK OVERVIEW</Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: '#EFF6FF' }]}>
              <Text style={[styles.statNum, { color: '#2563EB' }]}>{myTasks.length}</Text>
              <Text style={styles.statLabel}>Total Assigned</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#ECFDF5' }]}>
              <Text style={[styles.statNum, { color: '#059669' }]}>{completedTasksCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#FFFBEB' }]}>
              <Text style={[styles.statNum, { color: '#D97706' }]}>{pendingTasksCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.actionItem, { marginTop: SPACING.md }]}
            onPress={() => setActiveTab('MyTasks')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#ECFDF5' }]}>
              <VectorIcon name="mytasks" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Open My Assigned Tasks</Text>
              <Text style={styles.actionSub}>Update stage statuses and photo proofs</Text>
            </View>
            <VectorIcon name="chevron-right" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      )}

      {/* Account Switcher & Sign Out Actions (Only for Authenticated Owner & Employee) */}
      {(isOwner || isEmployee) && (
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>ACCOUNT CONTROLS</Text>

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={handleSwitchAccount}
            activeOpacity={0.8}
          >
            <VectorIcon name="user" size={16} color="#4F46E5" />
            <Text style={styles.switchBtnText}>Switch Account / Login Another Number</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <VectorIcon name="logout" size={16} color="#EF4444" />
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.versionFooter}>
        JobSheetFlow v2.0 • Unified Production Tracking System
      </Text>

      {/* EDIT NAME MODAL */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <VectorIcon name="edit" size={20} color="#6366F1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Edit Profile Name</Text>
                <Text style={styles.modalSubtitle}>Update your display name across the workspace</Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>FULL NAME</Text>
            <View style={styles.textInputBox}>
              <VectorIcon name="user" size={18} color="#6366F1" />
              <TextInput
                style={styles.textInput}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter your name"
                placeholderTextColor="#94A3B8"
                autoFocus
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowEditModal(false)}
                disabled={isSavingName}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveModalBtn, isSavingName && { opacity: 0.7 }]}
                onPress={handleSaveName}
                disabled={isSavingName}
                activeOpacity={0.8}
              >
                {isSavingName ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveModalBtnText}>Save Changes</Text>
                )}
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
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl * 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: SPACING.md,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  topBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    marginBottom: SPACING.md,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarOwner: {
    backgroundColor: '#4F46E5',
  },
  avatarEmployee: {
    backgroundColor: '#0D9488',
  },
  avatarGuest: {
    backgroundColor: '#64748B',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#4F46E5',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  empIdHeaderTagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 8,
  },
  empIdHeaderTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: isTablet ? 22 : 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
    marginBottom: 6,
  },
  roleBadgeOwner: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  roleBadgeEmployee: {
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  roleBadgeGuest: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roleBadgeTextOwner: {
    color: '#4338CA',
  },
  roleBadgeTextEmployee: {
    color: '#0F766E',
  },
  roleBadgeTextGuest: {
    color: '#475569',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  infoIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 12,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 10,
  },
  switchBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },
  versionFooter: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: SPACING.sm,
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  editBtnSmall: {
    padding: 5,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  editActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  editActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.lg,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: SPACING.xl,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    padding: 0,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  saveModalBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveModalBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
