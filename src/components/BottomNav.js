import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import VectorIcon from './VectorIcon';

export default function BottomNav() {
  const { role, activeTab, setActiveTab, openAuthFlow } = useApp();

  const ownerTabs = [
    { key: 'Dashboard', label: 'Dashboard', iconName: 'home' },
    { key: 'JobSheets', label: 'Job Sheets', iconName: 'jobsheets' },
    { key: 'Create', label: 'Create', iconName: 'plus', highlighted: true },
    { key: 'Performance', label: 'Performance', iconName: 'chart' },
    { key: 'Profile', label: 'Profile', iconName: 'profile' },
  ];

  const employeeTabs = [
    { key: 'Dashboard', label: 'Dashboard', iconName: 'home' },
    { key: 'MyTasks', label: 'My Tasks', iconName: 'mytasks' },
    { key: 'JobSheets', label: 'My Sheets', iconName: 'jobsheets' },
    { key: 'Profile', label: 'Profile', iconName: 'profile' },
  ];

  const guestTabs = [
    { key: 'Dashboard', label: 'Dashboard', iconName: 'home' },
    { key: 'Profile', label: 'Profile', iconName: 'profile' },
  ];

  const tabs = role === 'OWNER' ? ownerTabs : role === 'EMPLOYEE' ? employeeTabs : guestTabs;

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const iconColor = tab.highlighted
          ? '#FFFFFF'
          : isActive
            ? '#6366F1'
            : '#64748B';

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
              tab.highlighted && styles.tabItemHighlighted,
            ]}
            onPress={handlePress}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <VectorIcon name={tab.iconName} color={iconColor} size={20} />
              {tab.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tab.badge}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                tab.highlighted
                  ? styles.tabLabelHighlighted
                  : isActive
                    ? styles.tabLabelActive
                    : styles.tabLabelInactive,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabItemHighlighted: {
    backgroundColor: '#6366F1',
    borderRadius: 24,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  iconContainer: {
    alignSelf: 'center',
  },
  badge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: '#EF4444',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  tabLabelHighlighted: {
    fontWeight: '900',
    color: '#FFFFFF',
  },
  tabLabelActive: {
    fontWeight: '900',
    color: '#6366F1',
  },
  tabLabelInactive: {
    fontWeight: '500',
    color: '#64748B',
  },
});
