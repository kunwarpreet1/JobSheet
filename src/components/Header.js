import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import VectorIcon from './VectorIcon';
import { isTablet } from '../styles/theme';

export default function Header() {
  const {
    currentUser,
    role,
    unreadCount,
    setActiveTab,
  } = useApp();

  const isOwner = role === 'OWNER';
  const isEmployee = role === 'EMPLOYEE';
  const isGuest = !isOwner && !isEmployee;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {/* Left: Brand Name & Vector Logo */}
        <TouchableOpacity
          style={styles.brandContainer}
          onPress={() => setActiveTab('Dashboard')}
          activeOpacity={0.8}
        >
          <View style={styles.brandIconBox}>
            <VectorIcon name="shield" size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text style={isTablet ? styles.brandTitleTablet : styles.brandTitleMobile}>
              JobSheetFlow
            </Text>
            <Text style={styles.brandSubtitle}>Production Management</Text>
          </View>
        </TouchableOpacity>

        {/* Right Group: User Persona Pill / Profile Link, Notifications */}
        <View style={styles.rightGroup}>
          {!isGuest && (
            <>
              {/* Persona Pill -> Tapping opens Profile Tab */}
              <TouchableOpacity
                style={[
                  styles.personaPill,
                  isOwner ? styles.personaPillOwner : styles.personaPillEmployee,
                ]}
                onPress={() => setActiveTab('Profile')}
                activeOpacity={0.7}
              >
                <VectorIcon
                  name={isOwner ? 'shield' : 'user'}
                  size={14}
                  color={isOwner ? '#4F46E5' : '#0D9488'}
                />
                <View>
                  <Text style={styles.personaName} numberOfLines={1}>
                    {currentUser?.name || (isOwner ? 'Owner' : 'Employee')}
                  </Text>
                  <Text
                    style={isOwner ? styles.personaRoleOwner : styles.personaRoleEmployee}
                  >
                    {isOwner ? 'OWNER' : 'EMPLOYEE'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Vector Notification Bell Icon */}
              <TouchableOpacity
                style={styles.bellBtn}
                onPress={() => setActiveTab('Notifications')}
                activeOpacity={0.7}
              >
                <VectorIcon name="bell" size={18} color="#0F172A" />
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleTablet: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '900',
    color: '#0F172A',
  },
  brandTitleMobile: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  brandSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    color: '#94A3B8',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  personaPillOwner: {
    backgroundColor: '#EEF2FF',
  },
  personaPillEmployee: {
    backgroundColor: '#ECFDF5',
  },
  personaName: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  personaRoleOwner: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '900',
    color: '#6366F1',
  },
  personaRoleEmployee: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '900',
    color: '#0D9488',
  },
  bellBtn: {
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#EF4444',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
