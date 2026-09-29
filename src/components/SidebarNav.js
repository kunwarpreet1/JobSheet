import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import VectorIcon from './VectorIcon';

export default function SidebarNav() {
  const { role, activeTab, setActiveTab, unreadCount, openAuthFlow } = useApp();

  const ownerTabs = [
    { key: 'Dashboard', label: 'Dashboard', iconName: 'home' },
    { key: 'JobSheets', label: 'Job Sheets List', iconName: 'jobsheets' },
    { key: 'Create', label: 'Create Job Sheet', iconName: 'plus' },
    { key: 'Performance', label: 'Performance Analytics', iconName: 'chart' },
    { key: 'Notifications', label: 'Notifications', iconName: 'bell', badge: unreadCount },
    { key: 'MasterData', label: 'Master Settings', iconName: 'settings' },
    { key: 'Profile', label: 'Owner Profile', iconName: 'profile' },
  ];

  const employeeTabs = [
    { key: 'Dashboard', label: 'Dashboard', iconName: 'home' },
    { key: 'MyTasks', label: 'My Assigned Tasks', iconName: 'mytasks' },
    { key: 'JobSheets', label: 'My Job Sheets', iconName: 'jobsheets' },
    { key: 'Profile', label: 'Employee Profile', iconName: 'profile' },
  ];

  const guestTabs = [
    { key: 'Dashboard', label: 'Dashboard', iconName: 'home' },
    { key: 'Login', label: 'Sign In / Login', iconName: 'login', isLoginAction: true },
  ];

  const tabs = role === 'OWNER' ? ownerTabs : role === 'EMPLOYEE' ? employeeTabs : guestTabs;

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.sectionTitle}>NAVIGATION MENU</Text>

        <View style={styles.tabsList}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const iconColor = isActive ? '#6366F1' : '#64748B';

            const handlePress = () => {
              if (tab.isLoginAction) {
                openAuthFlow();
              } else {
                setActiveTab(tab.key);
              }
            };

            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabItem,
                  isActive && styles.tabItemActive,
                ]}
                onPress={handlePress}
                activeOpacity={0.7}
              >
                <VectorIcon name={tab.iconName} color={iconColor} size={20} />
                <Text
                  style={[
                    styles.tabLabel,
                    isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{tab.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>JobSheetFlow v2.0 • Tablet Mode</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    justifyContent: 'space-between',
    width: 240,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '900',
    color: '#94A3B8',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  tabsList: {
    gap: 4,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 12,
  },
  tabItemActive: {
    backgroundColor: '#EEF2FF',
  },
  tabLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  tabLabelActive: {
    fontWeight: '800',
    color: '#6366F1',
  },
  tabLabelInactive: {
    fontWeight: '600',
    color: '#334155',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#EF4444',
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
