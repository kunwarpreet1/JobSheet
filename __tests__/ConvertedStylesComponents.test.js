import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/services/apiClient', () => ({
  fetchJobSheetsApi: jest.fn().mockResolvedValue({ success: true, jobSheets: [] }),
  fetchNotificationsApi: jest.fn().mockResolvedValue({ success: true, notifications: [] }),
  fetchEmployeesApi: jest.fn().mockResolvedValue({ success: true, employees: [] }),
  loginWithEmployeeId: jest.fn().mockResolvedValue({ success: true, employee: { employeeId: '1001', name: 'Test User', role: 'employee' } }),
  sendOtpApi: jest.fn().mockResolvedValue({ success: true, otp: '123456' }),
  verifyOtpApi: jest.fn().mockResolvedValue({ success: true, employee: { employeeId: '1001', name: 'Test User', role: 'employee' } }),
  setupOwnerProfileApi: jest.fn().mockResolvedValue({ success: true }),
  createJobSheetApi: jest.fn().mockResolvedValue({ success: true }),
  updateJobSheetApi: jest.fn().mockResolvedValue({ success: true }),
  updateStageStatusApi: jest.fn().mockResolvedValue({ success: true }),
  deleteJobSheetApi: jest.fn().mockResolvedValue({ success: true }),
  clearAllJobSheetsApi: jest.fn().mockResolvedValue({ success: true }),
  markNotificationReadApi: jest.fn().mockResolvedValue({ success: true }),
  markAllNotificationsReadApi: jest.fn().mockResolvedValue({ success: true }),
  updateTaskLifecycleApi: jest.fn().mockResolvedValue({ success: true }),
  createEmployeeApi: jest.fn().mockResolvedValue({ success: true }),
  updateEmployeeApi: jest.fn().mockResolvedValue({ success: true }),
  toggleEmployeeAvailabilityApi: jest.fn().mockResolvedValue({ success: true }),
  deleteEmployeeApi: jest.fn().mockResolvedValue({ success: true }),
  deleteStageApi: jest.fn().mockResolvedValue({ success: true }),
  removeAllStagesApi: jest.fn().mockResolvedValue({ success: true }),
  deleteNotificationApi: jest.fn().mockResolvedValue({ success: true }),
  deleteAllNotificationsApi: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../src/services/pushNotificationManager', () => ({
  registerDeviceForUser: jest.fn(),
  deactivateDeviceForUser: jest.fn().mockResolvedValue(true),
  addNotificationListener: jest.fn(() => () => {}),
  emitIncomingNotification: jest.fn(),
  displaySystemNotification: jest.fn(),
  displayOtpNotification: jest.fn(),
  startPushNotificationService: jest.fn(),
}));

import { AppProvider } from '../src/context/AppContext';
import BottomNav from '../src/components/BottomNav';
import Header from '../src/components/Header';
import SidebarNav from '../src/components/SidebarNav';
import LoginScreen from '../src/screens/LoginScreen';
import RegisterScreen from '../src/screens/RegisterScreen';

describe('Converted Components and Screens Styling Test', () => {
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });
  test('BottomNav renders correctly with StyleSheet styles', async () => {
    let renderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <AppProvider>
          <BottomNav />
        </AppProvider>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
  });

  test('Header renders correctly with StyleSheet styles', async () => {
    let renderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <AppProvider>
          <Header />
        </AppProvider>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
  });

  test('SidebarNav renders correctly with StyleSheet styles', async () => {
    let renderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <AppProvider>
          <SidebarNav />
        </AppProvider>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
  });

  test('LoginScreen renders correctly with StyleSheet styles', async () => {
    let renderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <AppProvider>
          <LoginScreen onBack={jest.fn()} />
        </AppProvider>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
  });

  test('RegisterScreen renders correctly with StyleSheet styles', async () => {
    let renderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <AppProvider>
          <RegisterScreen
            onBack={jest.fn()}
          />
        </AppProvider>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
  });
});
