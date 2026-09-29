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

import { AppProvider, useApp } from '../src/context/AppContext';

let appContext = null;

function TestConsumer() {
  appContext = useApp();
  return null;
}

async function renderContext() {
  let testRenderer;
  await ReactTestRenderer.act(async () => {
    testRenderer = ReactTestRenderer.create(
      <AppProvider>
        <TestConsumer />
      </AppProvider>
    );
  });
  return testRenderer;
}

describe('Universal Back Navigation Stack Behavior', () => {
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Initial unauthenticated state starts on Login screen with canGoBack = false', async () => {
    await renderContext();

    expect(appContext.currentRoute.name).toBe('Login');
    expect(appContext.isHomeScreen).toBe(false);
    expect(appContext.canGoBack()).toBe(false);
    expect(appContext.goBack()).toBe(true); // Signals Android / OS BackHandler to exit app
  });

  test('Login and Switch Account flow: Login -> Dashboard -> Switch Account -> Login -> Back exits', async () => {
    await renderContext();

    // Step 1: User logs in as Owner
    await ReactTestRenderer.act(async () => {
      appContext.loginAsOwner();
    });
    expect(appContext.currentRoute.name).toBe('Dashboard');
    expect(appContext.isHomeScreen).toBe(true);
    expect(appContext.role).toBe('OWNER');

    // Step 2: Navigate to Profile
    await ReactTestRenderer.act(async () => {
      appContext.navigate('Profile');
    });
    expect(appContext.currentRoute.name).toBe('Profile');
    expect(appContext.canGoBack()).toBe(true);

    // Step 3: Switch Account / Sign Out resets stack completely to Login
    await ReactTestRenderer.act(async () => {
      await appContext.logout();
    });
    expect(appContext.currentRoute.name).toBe('Login');
    expect(appContext.role).toBe('GUEST');
    expect(appContext.canGoBack()).toBe(false);

    // Step 4: Pressing back on Login screen cleanly signals OS to exit app
    let backResult;
    await ReactTestRenderer.act(async () => {
      backResult = appContext.goBack();
    });
    expect(backResult).toBe(true);
    expect(appContext.currentRoute.name).toBe('Login'); // Never navigates back to Profile!
  });

  test('Multi-screen stack: HomeScreen -> JobSheets -> JobSheetDetail -> Back -> JobSheets -> Back -> HomeScreen', async () => {
    await renderContext();

    // Log in as Owner so root screen is Dashboard
    await ReactTestRenderer.act(async () => {
      appContext.loginAsOwner();
    });

    // Navigate: Dashboard -> JobSheets
    await ReactTestRenderer.act(async () => {
      appContext.navigate('JobSheets');
    });
    expect(appContext.currentRoute.name).toBe('JobSheets');
    expect(appContext.canGoBack()).toBe(true);

    // Navigate: JobSheets -> JobSheetDetail (JS-1001)
    await ReactTestRenderer.act(async () => {
      appContext.setSelectedJobSheetId('JS-1001');
    });
    expect(appContext.currentRoute.name).toBe('JobSheetDetail');
    expect(appContext.selectedJobSheetId).toBe('JS-1001');

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Back from JobSheetDetail -> JobSheets
    await ReactTestRenderer.act(async () => {
      appContext.goBack();
    });
    expect(appContext.currentRoute.name).toBe('JobSheets');
    expect(appContext.canGoBack()).toBe(true);

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Back from JobSheets -> Dashboard (HomeScreen)
    await ReactTestRenderer.act(async () => {
      appContext.goBack();
    });
    expect(appContext.currentRoute.name).toBe('Dashboard');
    expect(appContext.isHomeScreen).toBe(true);
    expect(appContext.canGoBack()).toBe(false);
  });

  test('Complex navigation stack does not jump directly to HomeScreen', async () => {
    await renderContext();

    // Log in as Owner so root screen is Dashboard
    await ReactTestRenderer.act(async () => {
      appContext.loginAsOwner();
    });

    // Dashboard -> Performance -> Notifications -> Profile
    await ReactTestRenderer.act(async () => {
      appContext.navigate('Performance');
    });
    await ReactTestRenderer.act(async () => {
      appContext.navigate('Notifications');
    });
    await ReactTestRenderer.act(async () => {
      appContext.navigate('Profile');
    });

    expect(appContext.currentRoute.name).toBe('Profile');

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Pop step-by-step
    await ReactTestRenderer.act(async () => {
      appContext.goBack();
    });
    expect(appContext.currentRoute.name).toBe('Notifications');

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(300);
    });

    await ReactTestRenderer.act(async () => {
      appContext.goBack();
    });
    expect(appContext.currentRoute.name).toBe('Performance');

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(300);
    });

    await ReactTestRenderer.act(async () => {
      appContext.goBack();
    });
    expect(appContext.currentRoute.name).toBe('Dashboard');
    expect(appContext.isHomeScreen).toBe(true);
  });
});
