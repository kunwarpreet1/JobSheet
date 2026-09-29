import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import {
  INITIAL_MASTER_DATA,
  getInitialJobSheets,
  getInitialNotifications,
  getSavedSessionUser,
  loadPersistedSessionUser,
  saveSessionUser,
  clearSavedSessionUser,
  isTaskAssignedToUser,
  isJobSheetAssignedToUser,
  isUserJobSheetManager,
  isNotificationForUser,
  isStatusDone,
  isStatusOngoing,
  isStatusNotStarted,
} from '../utils/storage';
import { getTaskStatus } from '../utils/deadlineCalculator';
import {
  loginWithEmployeeId as apiLoginEmployeeId,
  registerEmployee as apiRegisterEmployee,
  sendOtpApi,
  verifyOtpApi,
  setupOwnerProfileApi,
  fetchJobSheetsApi,
  createJobSheetApi,
  updateJobSheetApi,
  updateStageStatusApi,
  deleteJobSheetApi,
  clearAllJobSheetsApi,
  fetchNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  updateTaskLifecycleApi,
  fetchEmployeesApi,
  createEmployeeApi,
  updateEmployeeApi,
  toggleEmployeeAvailabilityApi,
  deleteEmployeeApi,
  deleteStageApi,
  removeAllStagesApi,
  deleteNotificationApi,
  deleteAllNotificationsApi,
} from '../services/apiClient';
import {
  registerDeviceForUser,
  deactivateDeviceForUser,
  addNotificationListener,
  emitIncomingNotification,
  displaySystemNotification,
  displayOtpNotification,
  startPushNotificationService,
} from '../services/pushNotificationManager';


const AppContext = createContext();

const HOME_ROUTE = { name: 'Dashboard', params: {} };

/**
 * Deduplicate and sanitize notifications so employees never see duplicate notifications for the same task.
 * When a task is started ('TASK_ONGOING'), the earlier 'TASK_ASSIGNED' notification for that task is superseded.
 */
function sanitizeAndDeduplicateNotifications(notifs) {
  if (!Array.isArray(notifs)) return [];

  const ongoingOrCompletedTaskKeys = new Set();
  notifs.forEach((n) => {
    if (n.jobSheetId && n.taskId && (n.type === 'TASK_ONGOING' || n.type === 'TASK_COMPLETED')) {
      ongoingOrCompletedTaskKeys.add(`${n.jobSheetId}_${n.taskId}`);
    }
  });

  const seenKeys = new Set();
  const result = [];

  for (const n of notifs) {
    const taskKey = n.jobSheetId && n.taskId ? `${n.jobSheetId}_${n.taskId}` : null;

    // If task is already started / ongoing, hide the obsolete TASK_ASSIGNED notification
    if (taskKey && n.type === 'TASK_ASSIGNED' && ongoingOrCompletedTaskKeys.has(taskKey)) {
      continue;
    }

    // Deduplicate notifications by taskKey + type, or fallback to id
    const uniqueKey = taskKey ? `${taskKey}_${n.type}` : (n.id || `${n.title}_${n.timestamp}`);
    if (seenKeys.has(uniqueKey)) {
      continue;
    }
    seenKeys.add(uniqueKey);
    result.push(n);
  }

  return result;
}

export function AppProvider({ children }) {
  const initialSavedUser = getSavedSessionUser();

  const getInitialRole = (user) => {
    if (!user) return 'GUEST';
    return (user.role || '').toLowerCase() === 'owner' ? 'OWNER' : 'EMPLOYEE';
  };

  const [isAuthenticated, setIsAuthenticated] = useState(!!initialSavedUser);
  const [currentUser, setCurrentUser] = useState(initialSavedUser);
  const [role, setRole] = useState(getInitialRole(initialSavedUser)); // 'OWNER', 'EMPLOYEE', or 'GUEST'

  const [activeEmployee, setActiveEmployee] = useState(
    initialSavedUser?.role === 'employee' ? (initialSavedUser.name || `${initialSavedUser.firstName || ''} ${initialSavedUser.lastName || ''}`.trim() || '') : ''
  );
  const [isSessionRestoring, setIsSessionRestoring] = useState(true);

  // Restore persistent session from device storage on launch
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const persistedUser = await loadPersistedSessionUser();
        if (isMounted && persistedUser) {
          const userRole = (persistedUser.role || '').toLowerCase() === 'owner' ? 'OWNER' : 'EMPLOYEE';
          setCurrentUser(persistedUser);
          setRole(userRole);
          if (userRole === 'EMPLOYEE') {
            setActiveEmployee(persistedUser.name || 'Employee');
          }
          setIsAuthenticated(true);
          resetStack(getInitialNavStack(persistedUser));
        }
      } catch (err) {
        console.warn('[Session Restore Warning]:', err.message);
      } finally {
        if (isMounted) {
          setIsSessionRestoring(false);
        }
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);
  const [masterData, setMasterData] = useState(INITIAL_MASTER_DATA);
  const [jobSheets, setJobSheets] = useState(getInitialJobSheets());
  const [notifications, setNotifications] = useState(getInitialNotifications());
  const [selectedJobSheetId, setSelectedJobSheetIdState] = useState(null);
  const [activeBanner, setActiveBanner] = useState(null);

  // Helper to refresh employees from MongoDB database
  const refreshEmployeesFromDb = async () => {
    try {
      const res = await fetchEmployeesApi();
      if (res.success && Array.isArray(res.employees)) {
        const dbEmps = res.employees.map((e) => ({
          id: e.id || `emp-${e.employeeId}`,
          employeeId: e.employeeId,
          name: e.name,
          role: e.role === 'owner' ? 'Owner / Admin' : `${e.department || 'Production'} Specialist`,
          phone: e.phone || e.mobileNumber || '',
          mobileNumber: e.mobileNumber || e.phone || '',
          department: e.department || 'Production',
          email: e.email || '',
          isAvailableForJobSheet: e.isAvailableForJobSheet !== false,
          active: e.isAvailableForJobSheet !== false,
        }));
        setMasterData((prev) => ({
          ...prev,
          employees: dbEmps,
        }));
        return dbEmps;
      }
    } catch (err) {
      console.warn('[Fetch Employees Warning]:', err.message);
    }
    return [];
  };

  // Load Job Sheets, Notifications, and Registered Employees from backend MongoDB on startup
  useEffect(() => {
    let isMounted = true;
    const loadDbData = async () => {
      try {
        const isEmp = role === 'EMPLOYEE' || currentUser?.role === 'employee';
        const sheetFilters = isEmp
          ? {
              employeeId: currentUser?.employeeId || '',
              assignedTo: currentUser?.name || activeEmployee || '',
              userRole: 'employee',
            }
          : {};

        const notifTargetUser = isEmp
          ? (currentUser?.employeeId || currentUser?.name || activeEmployee)
          : 'ALL';
        const notifRole = isEmp ? 'employee' : 'owner';

        const [sheetsRes, notifsRes, empsRes] = await Promise.allSettled([
          fetchJobSheetsApi(sheetFilters),
          fetchNotificationsApi(notifTargetUser, undefined, undefined, notifRole),
          fetchEmployeesApi(),
        ]);

        if (isMounted) {
          if (sheetsRes.status === 'fulfilled' && sheetsRes.value.success && Array.isArray(sheetsRes.value.jobSheets)) {
            const rawSheets = sheetsRes.value.jobSheets;
            const finalSheets = isEmp
              ? rawSheets.filter((s) => isJobSheetAssignedToUser(s, currentUser, activeEmployee))
              : rawSheets;
            setJobSheets(finalSheets);
          }
          if (notifsRes.status === 'fulfilled' && notifsRes.value.success && Array.isArray(notifsRes.value.notifications)) {
            const mappedNotifs = notifsRes.value.notifications.map((n) => ({
              id: n._id || n.id,
              title: n.title,
              message: n.message,
              type: n.type,
              jobSheetId: n.jobSheetId,
              taskId: n.taskId,
              read: n.isRead,
              timestamp: n.createdAt,
              userId: n.userId,
              metadata: n.metadata,
            }));
            const finalNotifs = isEmp
              ? mappedNotifs.filter((n) => isNotificationForUser(n, currentUser, activeEmployee, role))
              : mappedNotifs;
            setNotifications(sanitizeAndDeduplicateNotifications(finalNotifs));
          }
          if (empsRes.status === 'fulfilled' && empsRes.value.success && Array.isArray(empsRes.value.employees)) {
            const dbEmps = empsRes.value.employees.map((e) => ({
              id: e.id || `emp-${e.employeeId}`,
              employeeId: e.employeeId,
              name: e.name,
              role: e.role === 'owner' ? 'Owner / Admin' : `${e.department || 'Production'} Specialist`,
              phone: e.phone || e.mobileNumber || '',
              mobileNumber: e.mobileNumber || e.phone || '',
              department: e.department || 'Production',
              email: e.email || '',
              isAvailableForJobSheet: e.isAvailableForJobSheet !== false,
              active: e.isAvailableForJobSheet !== false,
            }));
            setMasterData((prev) => ({
              ...prev,
              employees: dbEmps,
            }));
          }
        }
      } catch (err) {
        console.warn('[Database Connection]: Offline or fallback to local state', err.message);
      }
    };
    loadDbData();
    return () => {
      isMounted = false;
    };
  }, [currentUser, role, activeEmployee]);

  const refreshInFlightRef = useRef(false);
  const refreshTimeoutRef = useRef(null);

  const refreshJobSheets = async (immediate = false) => {
    if (immediate) {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      if (refreshInFlightRef.current) return;
      refreshInFlightRef.current = true;
      try {
        const isEmp = role === 'EMPLOYEE' || currentUser?.role === 'employee';
        const sheetFilters = isEmp
          ? {
              employeeId: currentUser?.employeeId || '',
              assignedTo: currentUser?.name || activeEmployee || '',
              userRole: 'employee',
            }
          : {};

        const sheetsRes = await fetchJobSheetsApi(sheetFilters);
        if (sheetsRes.success && Array.isArray(sheetsRes.jobSheets)) {
          const rawSheets = sheetsRes.jobSheets;
          const finalSheets = isEmp
            ? rawSheets.filter((s) => isJobSheetAssignedToUser(s, currentUser, activeEmployee))
            : rawSheets;
          setJobSheets(finalSheets);
          return finalSheets;
        }
      } catch (err) {
        console.warn('[refreshJobSheets Error]:', err.message);
      } finally {
        refreshInFlightRef.current = false;
      }
      return;
    }

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    return new Promise((resolve) => {
      refreshTimeoutRef.current = setTimeout(async () => {
        if (refreshInFlightRef.current) {
          resolve();
          return;
        }
        refreshInFlightRef.current = true;
        try {
          const isEmp = role === 'EMPLOYEE' || currentUser?.role === 'employee';
          const sheetFilters = isEmp
            ? {
                employeeId: currentUser?.employeeId || '',
                assignedTo: currentUser?.name || activeEmployee || '',
                userRole: 'employee',
              }
            : {};

          const sheetsRes = await fetchJobSheetsApi(sheetFilters);
          if (sheetsRes.success && Array.isArray(sheetsRes.jobSheets)) {
            const rawSheets = sheetsRes.jobSheets;
            const finalSheets = isEmp
              ? rawSheets.filter((s) => isJobSheetAssignedToUser(s, currentUser, activeEmployee))
              : rawSheets;
            setJobSheets(finalSheets);
            resolve(finalSheets);
            return;
          }
        } catch (err) {
          console.warn('[refreshJobSheets Error]:', err.message);
        } finally {
          refreshInFlightRef.current = false;
          resolve();
        }
      }, 350);
    });
  };

  // Real-time silent background sync (every 4 seconds) to guarantee instant notification & task delivery without manual refresh
  useEffect(() => {
    let isMounted = true;
    const syncSilent = async () => {
      try {
        const isEmp = role === 'EMPLOYEE' || currentUser?.role === 'employee';
        const notifTargetUser = isEmp
          ? (currentUser?.employeeId || currentUser?.name || activeEmployee)
          : 'ALL';
        const notifRole = isEmp ? 'employee' : 'owner';
        const sheetFilters = isEmp
          ? {
              employeeId: currentUser?.employeeId || '',
              assignedTo: currentUser?.name || activeEmployee || '',
              userRole: 'employee',
            }
          : {};

        const [notifsRes, sheetsRes] = await Promise.allSettled([
          fetchNotificationsApi(notifTargetUser, undefined, undefined, notifRole),
          fetchJobSheetsApi(sheetFilters),
        ]);

        if (isMounted) {
          if (notifsRes.status === 'fulfilled' && notifsRes.value.success && Array.isArray(notifsRes.value.notifications)) {
            const mappedNotifs = notifsRes.value.notifications.map((n) => ({
              id: n._id || n.id,
              title: n.title,
              message: n.message,
              type: n.type,
              jobSheetId: n.jobSheetId,
              taskId: n.taskId,
              read: n.isRead,
              timestamp: n.createdAt,
              userId: n.userId,
              metadata: n.metadata,
            }));
            const finalNotifs = isEmp
              ? mappedNotifs.filter((n) => isNotificationForUser(n, currentUser, activeEmployee, role))
              : mappedNotifs;
            setNotifications(sanitizeAndDeduplicateNotifications(finalNotifs));
          }

          if (sheetsRes.status === 'fulfilled' && sheetsRes.value.success && Array.isArray(sheetsRes.value.jobSheets)) {
            const rawSheets = sheetsRes.value.jobSheets;
            const finalSheets = isEmp
              ? rawSheets.filter((s) => isJobSheetAssignedToUser(s, currentUser, activeEmployee))
              : rawSheets;
            setJobSheets(finalSheets);
          }
        }
      } catch (e) {
        // silent fallback
      }
    };

    const interval = setInterval(syncSilent, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [role, currentUser, activeEmployee]);

  // Initialize Push Notification Service strictly for Employees (ONLY for their assigned tasks)
  useEffect(() => {
    if (isAuthenticated && role === 'EMPLOYEE') {
      const targetUserId =
        currentUser?.employeeId ||
        currentUser?.name ||
        activeEmployee ||
        '4821';

      const stopPushService = startPushNotificationService(
        targetUserId,
        ({ jobSheetId, taskId }) => {
          refreshJobSheets();
          if (jobSheetId) {
            setSelectedJobSheetId(jobSheetId);
          }
        },
        'EMPLOYEE'
      );

      return () => {
        stopPushService();
      };
    }
  }, [isAuthenticated, currentUser, activeEmployee, role]);

  // Listen for push notifications and display in-app banner toast (ONLY for Employee for their assigned task)
  useEffect(() => {
    const unsubscribe = addNotificationListener((notif) => {
      if (notif.type === 'OTP') {
        setActiveBanner(notif);
        setTimeout(() => setActiveBanner(null), 8000);
        return;
      }

      // Owner must NEVER see push notification toasts/banners
      if (role !== 'EMPLOYEE') {
        return;
      }

      const notifTargetId =
        notif.employeeId ||
        notif.data?.employeeId ||
        notif.userId ||
        notif.metadata?.employeeId ||
        notif.data?.managerEmployeeId ||
        notif.metadata?.managerEmployeeId ||
        notif.managerEmployeeId;

      const notifTargetName =
        notif.assignedTo ||
        notif.data?.assignedTo ||
        notif.metadata?.assignedTo ||
        notif.managerName ||
        notif.data?.managerName ||
        notif.metadata?.managerName;

      const currentEmpId = currentUser?.employeeId ? String(currentUser.employeeId).trim() : null;
      const currentName = (currentUser?.name || activeEmployee || '').trim().toLowerCase();

      const matchesUser =
        (currentEmpId && notifTargetId && String(notifTargetId).trim() === currentEmpId) ||
        (currentName && notifTargetName && String(notifTargetName).trim().toLowerCase() === currentName) ||
        (notifTargetId === 'ALL');

      if (!matchesUser) {
        return;
      }

      refreshJobSheets();
      setActiveBanner(notif);
      setTimeout(() => setActiveBanner(null), 6000);
    });
    return unsubscribe;
  }, [role, currentUser, activeEmployee]);

  // Universal Navigation History Stack
  const getInitialNavStack = (user) => {
    if (!user) {
      return [{ name: 'Login', params: {} }];
    }
    const userRole = (user.role || '').toLowerCase();
    if (userRole === 'owner') {
      return [HOME_ROUTE];
    }
    return [HOME_ROUTE, { name: 'MyTasks' }];
  };

  const [navStack, setNavStack] = useState(getInitialNavStack(initialSavedUser));
  const lastBackPressTime = useRef(0);

  const currentRoute = navStack[navStack.length - 1] || { name: 'Login', params: {} };
  const isHomeScreen = currentRoute.name === 'Dashboard' && navStack.length === 1;

  const canGoBack = () => {
    if (currentRoute.name === 'Login') {
      return false;
    }
    return navStack.length > 1 || currentRoute.name !== 'Dashboard';
  };

  const navigate = (routeName, params = {}) => {
    if (routeName === 'Login') {
      setNavStack([{ name: 'Login', params }]);
      return;
    }
    setNavStack((prevStack) => {
      const top = prevStack[prevStack.length - 1];
      if (
        top &&
        top.name === routeName &&
        JSON.stringify(top.params || {}) === JSON.stringify(params || {})
      ) {
        return prevStack;
      }
      if (routeName === 'Dashboard' && prevStack.length === 1 && top?.name === 'Dashboard') {
        return prevStack;
      }
      return [...prevStack, { name: routeName, params }];
    });

    if (params?.jobSheetId) {
      setSelectedJobSheetIdState(params.jobSheetId);
    }
  };

  const goBack = () => {
    const now = Date.now();
    if (now - lastBackPressTime.current < 250) {
      return true;
    }
    lastBackPressTime.current = now;

    // If on Login screen -> ALWAYS cleanly exit the app!
    if (currentRoute.name === 'Login') {
      BackHandler.exitApp();
      return true;
    }

    if (navStack.length > 1) {
      const nextStack = navStack.slice(0, navStack.length - 1);
      const newTop = nextStack[nextStack.length - 1];
      setNavStack(nextStack);
      if (newTop?.params?.jobSheetId) {
        setSelectedJobSheetIdState(newTop.params.jobSheetId);
      } else if (newTop?.name !== 'JobSheetDetail') {
        setSelectedJobSheetIdState(null);
      }
      return true;
    }

    if (currentRoute.name !== 'Dashboard') {
      setNavStack([HOME_ROUTE]);
      setSelectedJobSheetIdState(null);
      return true;
    }

    // At HomeScreen with 1 item in stack -> exit
    BackHandler.exitApp();
    return true;
  };

  const resetStack = (newStack = [HOME_ROUTE]) => {
    const finalStack = newStack.length > 0 ? newStack : [HOME_ROUTE];
    setNavStack(finalStack);
    const top = finalStack[finalStack.length - 1];
    if (top?.params?.jobSheetId) {
      setSelectedJobSheetIdState(top.params.jobSheetId);
    } else {
      setSelectedJobSheetIdState(null);
    }
  };

  const replace = (routeName, params = {}) => {
    setNavStack((prevStack) => {
      if (prevStack.length <= 1) {
        return [{ name: routeName, params }];
      }
      return [...prevStack.slice(0, prevStack.length - 1), { name: routeName, params }];
    });
    if (params?.jobSheetId) {
      setSelectedJobSheetIdState(params.jobSheetId);
    }
  };

  // Helper properties derived from current route
  const activeTab = ['Dashboard', 'JobSheets', 'Create', 'Performance', 'Notifications', 'MasterData', 'MyTasks', 'Profile'].includes(currentRoute.name)
    ? currentRoute.name
    : 'Dashboard';

  const authStage = currentRoute.name === 'Register'
    ? 'REGISTER'
    : currentRoute.name === 'Login'
      ? 'LOGIN'
      : isAuthenticated
        ? 'AUTHENTICATED'
        : 'LOGIN';

  const isAuthModalVisible = ['Login', 'Register'].includes(currentRoute.name);

  const setActiveTab = (tabName) => {
    navigate(tabName);
  };

  const setSelectedJobSheetId = (id) => {
    setSelectedJobSheetIdState(id);
    if (id) {
      navigate('JobSheetDetail', { jobSheetId: id });
    } else if (currentRoute.name === 'JobSheetDetail') {
      goBack();
    }
  };

  const openAuthFlow = () => {
    clearSavedSessionUser();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveEmployee('');
    setRole('GUEST');
    setNavStack([{ name: 'Login', params: {} }]);
  };

  const closeAuthFlow = () => {
    // Pop auth routes back to previous non-auth screen
    setNavStack((prevStack) => {
      let filtered = [...prevStack];
      while (
        filtered.length > 1 &&
        ['Login', 'Register'].includes(filtered[filtered.length - 1].name)
      ) {
        filtered.pop();
      }
      if (filtered.length === 1 && ['Login', 'Register'].includes(filtered[0].name)) {
        return [HOME_ROUTE];
      }
      return filtered.length > 0 ? filtered : [HOME_ROUTE];
    });
  };

  // 1. Employee ID Login via Supabase
  const loginByEmployeeId = async (employeeId) => {
    try {
      const res = await apiLoginEmployeeId(employeeId);
      if (res.success && res.employee) {
        // If owner account (4821) needs first-time name/phone setup
        if (res.needsProfileSetup) {
          return { success: true, needsProfileSetup: true, employee: res.employee };
        }

        const emp = res.employee;
        saveSessionUser(emp);
        const userRole = (emp.role || '').toLowerCase() === 'owner' ? 'OWNER' : 'EMPLOYEE';
        setRole(userRole);
        if (userRole === 'EMPLOYEE') {
          setActiveEmployee(emp.name || 'Employee');
        }
        setCurrentUser(emp);
        setIsAuthenticated(true);

        if (userRole === 'EMPLOYEE') {
          resetStack([HOME_ROUTE, { name: 'MyTasks' }]);
        } else {
          resetStack([HOME_ROUTE]);
        }
        return { success: true, needsProfileSetup: false, employee: emp };
      }
      return { success: false, message: res.message || 'Employee ID not found' };
    } catch (err) {
      return { success: false, message: err.message || 'Employee ID not found' };
    }
  };

  // 2. Send Mobile Verification OTP & Trigger Drop-down Notification Banner
  const sendOtp = async (mobileNumber) => {
    try {
      const res = await sendOtpApi({ mobileNumber });
      if (res.success && res.otp) {
        // Dispatches both native system notification & drop-down in-app banner
        displayOtpNotification({ otp: res.otp, mobileNumber: res.mobileNumber });
      }
      return res;
    } catch (err) {
      return { success: false, message: err.message || 'Failed to send OTP' };
    }
  };

  // 3. Verify OTP & Authenticate/Register
  const verifyOtp = async ({ mobileNumber, otp, name, isOwnerSetup, employeeId }) => {
    try {
      const res = await verifyOtpApi({ mobileNumber, otp, name, isOwnerSetup, employeeId });
      return res;
    } catch (err) {
      return { success: false, message: err.message || 'Failed to verify OTP' };
    }
  };

  // 4. Setup Owner Profile (4821)
  const setupOwnerProfile = async ({ name, mobileNumber }) => {
    try {
      const res = await setupOwnerProfileApi({ name, mobileNumber });
      if (res.success && res.employee) {
        const emp = res.employee;
        saveSessionUser(emp);
        setRole('OWNER');
        setCurrentUser(emp);
        setIsAuthenticated(true);
        resetStack([HOME_ROUTE]);
      }
      return res;
    } catch (err) {
      return { success: false, message: err.message || 'Failed to setup owner profile' };
    }
  };



  // 6. Register First-Time Profile
  const completeRegistrationProfile = async ({ name, mobileNumber, email, password }) => {
    try {
      const res = await apiRegisterEmployee({ name, mobileNumber, email, password });
      if (res.success && res.employee) {
        return { success: true, employee: res.employee };
      }
      return { success: false, message: res.message || 'Registration failed' };
    } catch (err) {
      return { success: false, message: err.message || 'Registration failed' };
    }
  };

  // 7. Complete login after employee reviews their generated 4-digit ID
  const loginAfterRegistration = (employee) => {
    saveSessionUser(employee);
    const userRole = (employee.role || '').toLowerCase() === 'owner' ? 'OWNER' : 'EMPLOYEE';
    setRole(userRole);
    if (userRole === 'EMPLOYEE') {
      setActiveEmployee(employee.name || 'Employee');
    }
    setCurrentUser(employee);
    setIsAuthenticated(true);

    if (userRole === 'EMPLOYEE') {
      resetStack([HOME_ROUTE, { name: 'MyTasks' }]);
    } else {
      resetStack([HOME_ROUTE]);
    }
  };

  const loginAsOwner = () => {
    setRole('OWNER');
    const user = {
      uid: 'admin-owner',
      name: 'Kunwarpreet Singh',
      email: 'owner@jobsheetflow.com',
      phoneNumber: '+919876543210',
      role: 'owner',
      avatar: '👤',
    };
    saveSessionUser(user);
    setCurrentUser(user);
    setIsAuthenticated(true);
    resetStack([HOME_ROUTE]);
  };

  const loginAsEmployee = (employeeName) => {
    setRole('EMPLOYEE');
    setActiveEmployee(employeeName);
    const emp = masterData.employees.find((e) => e.name === employeeName);
    const user = {
      uid: emp?.id || `emp-${Date.now()}`,
      employeeId: emp?.employeeId || '',
      name: employeeName,
      email: emp?.email || 'employee@jobsheetflow.com',
      phoneNumber: emp?.phone || '',
      role: 'employee',
      department: emp?.department || 'Production',
      avatar: '👤',
    };
    saveSessionUser(user);
    setCurrentUser(user);
    setIsAuthenticated(true);
    resetStack([HOME_ROUTE, { name: 'MyTasks' }]);
  };

  const logout = async () => {
    const userToDeactivate = currentUser?.employeeId || currentUser?.name || currentUser?.uid;
    if (userToDeactivate) {
      deactivateDeviceForUser(userToDeactivate);
    }
    clearSavedSessionUser();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveEmployee('');
    setRole('GUEST');
    setNavStack([{ name: 'Login', params: {} }]);
  };

  const addEmployeeAccount = ({ phoneNumber, firstName, lastName, email, department }) => {
    if (role !== 'OWNER') return;
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber.replace(/\s+/g, '')}`;
    const newEmpUser = {
      uid: `usr_emp_${Date.now()}`,
      phoneNumber: formattedPhone,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email,
      role: 'employee',
      department: department || 'Carpentry',
      active: true,
      avatar: '👤',
    };

    // Also add to Master Data employees
    addMasterItem('employees', {
      name: `${firstName} ${lastName}`,
      role: `${department} Specialist`,
      phone: formattedPhone,
      department: department || 'Carpentry',
      email,
    });
  };

  const clearAllData = async () => {
    setJobSheets([]);
    setNotifications([]);
    setSelectedJobSheetId(null);
    try {
      await clearAllJobSheetsApi();
    } catch (err) {
      console.warn('[Clear DB JobSheets Warning]:', err.message);
    }
  };

  // Periodically check deadlines every 60 seconds to update Overdue status automatically
  useEffect(() => {
    const checkDeadlines = () => {
      const now = new Date();
      setJobSheets((prevSheets) => {
        let hasChanges = false;
        const updated = prevSheets.map((sheet) => {
          let sheetUpdated = false;
          const newStages = sheet.stages.map((stage) => {
            const currentStatus = getTaskStatus(stage, now);
            if (currentStatus === 'Overdue' && stage.status !== 'Overdue' && stage.status !== 'Done') {
              sheetUpdated = true;
              hasChanges = true;

              // Trigger overdue notification
              addNotificationInternal({
                title: '⚠️ Task Overdue Alert',
                message: `Job Sheet ${sheet.id}: ${stage.name} assigned to ${stage.assignedTo || 'Employee'} is Overdue!`,
                type: 'overdue',
                jobSheetId: sheet.id,
              });

              return { ...stage, status: 'Overdue' };
            }
            return stage;
          });

          if (sheetUpdated) {
            return { ...sheet, stages: newStages };
          }
          return sheet;
        });

        return hasChanges ? updated : prevSheets;
      });
    };

    checkDeadlines();
    const interval = setInterval(checkDeadlines, 30000);
    return () => clearInterval(interval);
  }, []);

  const addNotificationInternal = (notif) => {
    const newNotif = {
      id: 'notif-' + Date.now() + Math.random().toString().slice(2, 6),
      timestamp: new Date().toISOString(),
      read: false,
      ...notif,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const toggleRole = (newRole) => {
    setRole(newRole);
    if (newRole === 'EMPLOYEE' && activeTab === 'Create') {
      setActiveTab('Dashboard');
    }
  };

  const markNotificationRead = async (notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
    try {
      await markNotificationReadApi(notifId);
    } catch (err) {
      console.warn('Mark read warning:', err.message);
    }
  };

  const markAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const targetUserId = role === 'OWNER' ? 'ALL' : (currentUser?.employeeId || currentUser?.name || activeEmployee);
    try {
      await markAllNotificationsReadApi(targetUserId, role === 'EMPLOYEE' ? 'employee' : 'owner');
    } catch (err) {
      console.warn('Mark all read warning:', err.message);
    }
  };

  // Add new Job Sheet (Owner only) -> Persists to MongoDB
  const addJobSheet = (newSheet) => {
    const id = newSheet.id || `JS-${1000 + jobSheets.length + 1}`;
    const timestamp = new Date().toISOString();

    const createdSheet = {
      id,
      date: newSheet.date || timestamp,
      party: newSheet.party,
      salesman: newSheet.salesman || 'General Sales',
      fabric: newSheet.fabric || 'Standard Fabric',
      manager: newSheet.manager || 'Unassigned',
      managerEmployeeId: newSheet.managerEmployeeId || '',
      overallStatus: 'In Progress',
      qcBox: {
        qcCheckedBy: newSheet.qcCheckedBy || 'Unassigned',
        cushionBy: newSheet.cushionBy || 'Unassigned',
        model: newSheet.model || masterData.models[0]?.name || 'Standard Model',
        image: newSheet.qcImage || null,
        notes: newSheet.qcNotes || '',
      },
      stages: newSheet.stages.map((st) => ({
        ...st,
        status: st.status || 'Not Started',
        completedAt: null,
      })),
      activityLogs: [
        {
          id: 'log-' + Date.now(),
          timestamp,
          author: 'Owner',
          text: `Created Job Sheet ${id} for ${newSheet.party}${newSheet.manager ? ` (Manager: ${newSheet.manager})` : ''}`,
        },
      ],
    };

    // Update local state immediately
    setJobSheets((prev) => [createdSheet, ...prev]);

    // If Manager assigned, trigger manager notification immediately!
    if (newSheet.manager && newSheet.manager !== 'Unassigned') {
      const managerNotif = {
        title: '📋 Assigned as Production Manager',
        message: `You have been assigned as Production Manager for Job Sheet #${id} (${newSheet.party}). You can now assign production tasks.`,
        type: 'MANAGER_ASSIGNED',
        jobSheetId: id,
        userId: newSheet.managerEmployeeId || newSheet.manager,
        metadata: {
          employeeId: newSheet.managerEmployeeId,
          employeeName: newSheet.manager,
          managerName: newSheet.manager,
          assignedTo: newSheet.manager,
          party: newSheet.party,
          role: 'manager',
        },
      };
      addNotificationInternal(managerNotif);

      const ownerNotif = {
        title: '📋 Manager Assigned',
        message: `You assigned ${newSheet.manager} manager role for Job Sheet #${id}${newSheet.party ? ` (${newSheet.party})` : ''}.`,
        type: 'MANAGER_ASSIGNED',
        jobSheetId: id,
        userId: '4821',
        metadata: {
          employeeId: newSheet.managerEmployeeId,
          employeeName: newSheet.manager,
          managerName: newSheet.manager,
          assignedTo: newSheet.manager,
          party: newSheet.party,
          role: 'owner',
        },
      };
      addNotificationInternal(ownerNotif);
    }

    // Local notifications for assigned tasks so UI shows immediately
    newSheet.stages.forEach((stage) => {
      if (stage.assignedTo && stage.assignedTo !== 'Unassigned') {
        const notifData = {
          title: 'New Task Assigned',
          message: `You have been assigned to "${stage.name}" for Job Sheet #${id} (${newSheet.party}).`,
          type: 'TASK_ASSIGNED',
          jobSheetId: id,
          taskId: stage.taskId || `TASK-${stage.id}`,
          userId: stage.assignedEmployeeId || stage.assignedTo,
          metadata: {
            employeeId: stage.assignedEmployeeId,
            employeeName: stage.assignedTo,
            assignedTo: stage.assignedTo,
            party: newSheet.party,
            deadline: stage.deadline,
          },
        };
        addNotificationInternal(notifData);
      }
    });

    // Persist to MongoDB in background
    createJobSheetApi(createdSheet)
      .then(async (res) => {
        if (res.success && res.jobSheet) {
          // Sync with MongoDB version
          setJobSheets((prev) =>
            prev.map((s) => (s.id === id ? res.jobSheet : s))
          );
        }
        // Refetch notifications from MongoDB to stay in sync
        const notifTargetUser = role === 'EMPLOYEE'
          ? (currentUser?.employeeId || currentUser?.name || activeEmployee)
          : 'ALL';
        const notifRole = role === 'EMPLOYEE' ? 'employee' : 'owner';
        try {
          const refreshedNotifs = await fetchNotificationsApi(notifTargetUser, undefined, undefined, notifRole);
          if (refreshedNotifs.success && Array.isArray(refreshedNotifs.notifications)) {
            const mappedNotifs = refreshedNotifs.notifications.map((n) => ({
              id: n._id || n.id,
              title: n.title,
              message: n.message,
              type: n.type,
              jobSheetId: n.jobSheetId,
              taskId: n.taskId,
              read: n.isRead,
              timestamp: n.createdAt,
              userId: n.userId,
              metadata: n.metadata,
            }));
            const finalNotifs = role === 'EMPLOYEE'
              ? mappedNotifs.filter((n) => isNotificationForUser(n, currentUser, activeEmployee, role))
              : mappedNotifs;
            setNotifications(finalNotifs);
          }
        } catch (e) {
          // background sync fallback
        }
      })
      .catch((err) => {
        console.warn('[Save JobSheet to DB Error]:', err.message);
      });

    addNotificationInternal({
      title: 'New Job Sheet Created',
      message: `Job Sheet ${id} created for customer ${newSheet.party}.`,
      type: 'JOB_SHEET_CREATED',
      jobSheetId: id,
    });

    return createdSheet;
  };

  const deleteJobSheet = async (id) => {
    if (role !== 'OWNER') return;
    setJobSheets((prev) => prev.filter((s) => s.id !== id));
    if (selectedJobSheetId === id) {
      setSelectedJobSheetId(null);
    }
    try {
      await deleteJobSheetApi(id);
    } catch (err) {
      console.warn('[Delete JobSheet DB Error]:', err.message);
    }
  };

  // Update Task Status (Employee or Owner)
  const updateTaskStatus = (jobSheetId, stageId, newStatus, extraData = {}) => {
    const now = new Date();
    const timestamp = now.toISOString();
    const cleanTargetJobSheetId = String(jobSheetId || '').trim().toLowerCase();

    // 1. Identify sheet from current state to verify permissions and details
    const targetSheet =
      extraData.sheet ||
      jobSheets.find(
        (s) =>
          s.id === jobSheetId ||
          s._id === jobSheetId ||
          (s.id && String(s.id).trim().toLowerCase() === cleanTargetJobSheetId) ||
          (s._id && String(s._id).trim().toLowerCase() === cleanTargetJobSheetId) ||
          (s.jobSheetId && String(s.jobSheetId).trim().toLowerCase() === cleanTargetJobSheetId)
      );

    const isManagerUser = Boolean(
      extraData.isManager ||
      isUserJobSheetManager(targetSheet, currentUser, activeEmployee) ||
      isUserJobSheetManager(extraData.sheet, currentUser, activeEmployee)
    );

    if (targetSheet) {
      const stageIdx = (targetSheet.stages || []).findIndex(
        (s) =>
          s.id === stageId ||
          String(s.id) === String(stageId) ||
          s.taskId === stageId ||
          `TASK-${s.id}` === stageId
      );
      if (stageIdx !== -1) {
        const stage = targetSheet.stages[stageIdx];
        const isAssigned = isTaskAssignedToUser(stage, currentUser, activeEmployee);
        if (role === 'EMPLOYEE' && !isManagerUser && !isAssigned) {
          console.warn('[updateTaskStatus]: Unauthorized task update blocked for employee', activeEmployee);
          return;
        }
      }
    }

    // 2. Compute finalStatus and timestamp
    let completedAt = null;
    let finalStatus = newStatus;
    if (isStatusDone(newStatus)) {
      finalStatus = 'Done';
      completedAt = timestamp;
    } else if (isStatusOngoing(newStatus)) {
      finalStatus = 'ONGOING';
      completedAt = null;
    } else if (newStatus === 'Not Done' || isStatusNotStarted(newStatus)) {
      finalStatus = 'Not Started';
      completedAt = null;
    }

    const currentAuthor =
      currentUser?.name || activeEmployee || (role === 'OWNER' ? 'Owner' : 'Employee');

    let capturedOldStage = null;
    let capturedAssignedEmployee = null;
    let capturedAssignedEmployeeId = '';
    let capturedProgressText = '';
    let capturedDoneCount = 0;
    let capturedTotalCount = 10;
    let capturedProgressPercent = 0;
    let capturedSheetManager = targetSheet?.manager || '';
    let capturedSheetManagerId = targetSheet?.managerEmployeeId || '';
    let capturedParty = targetSheet?.party || '';

    // 3. PURE STATE UPDATE FOR jobSheets (Guaranteed synchronous state update)
    setJobSheets((prevSheets) => {
      let hasMatchedSheet = false;
      const updatedSheets = prevSheets.map((sheet) => {
        const isSheetMatch =
          sheet.id === jobSheetId ||
          sheet._id === jobSheetId ||
          (sheet.id && String(sheet.id).trim().toLowerCase() === cleanTargetJobSheetId) ||
          (sheet._id && String(sheet._id).trim().toLowerCase() === cleanTargetJobSheetId) ||
          (sheet.jobSheetId && String(sheet.jobSheetId).trim().toLowerCase() === cleanTargetJobSheetId);

        if (!isSheetMatch) return sheet;
        hasMatchedSheet = true;

        const stageIndex = (sheet.stages || []).findIndex(
          (s) =>
            s.id === stageId ||
            String(s.id) === String(stageId) ||
            s.taskId === stageId ||
            `TASK-${s.id}` === stageId
        );
        if (stageIndex === -1) return sheet;

        const oldStage = sheet.stages[stageIndex];
        const assignedEmployee = extraData.assignedTo || oldStage.assignedTo || activeEmployee;
        const assignedEmployeeId =
          extraData.assignedEmployeeId !== undefined
            ? extraData.assignedEmployeeId
            : oldStage.assignedEmployeeId || '';

        const updatedStage = {
          ...oldStage,
          status: finalStatus,
          assignedTo: assignedEmployee,
          assignedEmployeeId,
          completedAt: completedAt !== null ? completedAt : oldStage.completedAt,
          notes: extraData.notes !== undefined ? extraData.notes : oldStage.notes,
          image: extraData.image !== undefined ? extraData.image : oldStage.image,
          deadline: extraData.deadline !== undefined ? extraData.deadline : oldStage.deadline,
        };

        const updatedStages = [...sheet.stages];
        updatedStages[stageIndex] = updatedStage;

        const cleanStages = updatedStages.filter(
          (s) =>
            s.key !== 'JOB_SHEET' &&
            s.name !== 'JOB SHEET' &&
            s.name !== 'Job Sheet' &&
            !String(s.name || '').toLowerCase().includes('job sheet')
        );

        const doneCount = cleanStages.filter((s) => isStatusDone(s.status)).length;
        const totalCount = cleanStages.length > 0 ? cleanStages.length : 10;
        const progressPercent = Math.round((doneCount / totalCount) * 100);
        const isAllDone = doneCount === totalCount;
        const overallStatus = isAllDone ? 'Done' : 'In Progress';
        const progressText = `Progress: ${doneCount}/${totalCount} stages (${progressPercent}%)`;

        let logText = isManagerUser
          ? `Manager ${currentAuthor} updated ${oldStage.name} status to ${finalStatus} (Assigned: ${assignedEmployee}). ${progressText}`
          : `${assignedEmployee} updated ${oldStage.name} status to ${finalStatus}. ${progressText}`;
        if (isStatusDone(finalStatus)) {
          logText = `✓ ${currentAuthor} completed ${oldStage.name}. ${progressText}`;
        }

        const newActivityLogs = [
          {
            id: 'log-' + Date.now(),
            timestamp,
            author: currentAuthor,
            text: logText,
          },
          ...(sheet.activityLogs || []),
        ];

        // Capture for side-effects outside of setJobSheets
        capturedOldStage = oldStage;
        capturedAssignedEmployee = assignedEmployee;
        capturedAssignedEmployeeId = assignedEmployeeId;
        capturedProgressText = progressText;
        capturedDoneCount = doneCount;
        capturedTotalCount = totalCount;
        capturedProgressPercent = progressPercent;
        capturedSheetManager = sheet.manager || capturedSheetManager;
        capturedSheetManagerId = sheet.managerEmployeeId || capturedSheetManagerId;
        capturedParty = sheet.party || capturedParty;

        return {
          ...sheet,
          overallStatus,
          stages: updatedStages,
          activityLogs: newActivityLogs,
        };
      });

      if (!hasMatchedSheet && extraData.sheet) {
        const fallbackSheet = extraData.sheet;
        const stageIndex = (fallbackSheet.stages || []).findIndex(
          (s) =>
            s.id === stageId ||
            String(s.id) === String(stageId) ||
            s.taskId === stageId ||
            `TASK-${s.id}` === stageId
        );
        if (stageIndex !== -1) {
          const oldStage = fallbackSheet.stages[stageIndex];
          const assignedEmployee = extraData.assignedTo || oldStage.assignedTo || activeEmployee;
          const assignedEmployeeId =
            extraData.assignedEmployeeId !== undefined
              ? extraData.assignedEmployeeId
              : oldStage.assignedEmployeeId || '';

          const updatedStage = {
            ...oldStage,
            status: finalStatus,
            assignedTo: assignedEmployee,
            assignedEmployeeId,
            completedAt: completedAt !== null ? completedAt : oldStage.completedAt,
            notes: extraData.notes !== undefined ? extraData.notes : oldStage.notes,
            image: extraData.image !== undefined ? extraData.image : oldStage.image,
            deadline: extraData.deadline !== undefined ? extraData.deadline : oldStage.deadline,
          };
          const updatedStages = [...fallbackSheet.stages];
          updatedStages[stageIndex] = updatedStage;
          const cleanStages = updatedStages.filter(
            (s) =>
              s.key !== 'JOB_SHEET' &&
              s.name !== 'JOB SHEET' &&
              s.name !== 'Job Sheet' &&
              !String(s.name || '').toLowerCase().includes('job sheet')
          );
          const doneCount = cleanStages.filter((s) => isStatusDone(s.status)).length;
          const totalCount = cleanStages.length > 0 ? cleanStages.length : 10;
          const progressPercent = Math.round((doneCount / totalCount) * 100);
          const isAllDone = doneCount === totalCount;
          const overallStatus = isAllDone ? 'Done' : 'In Progress';
          const progressText = `Progress: ${doneCount}/${totalCount} stages (${progressPercent}%)`;
          let logText = isManagerUser
            ? `Manager ${currentAuthor} updated ${oldStage.name} status to ${finalStatus} (Assigned: ${assignedEmployee}). ${progressText}`
            : `${assignedEmployee} updated ${oldStage.name} status to ${finalStatus}. ${progressText}`;
          if (isStatusDone(finalStatus)) {
            logText = `✓ ${currentAuthor} completed ${oldStage.name}. ${progressText}`;
          }
          const newActivityLogs = [
            {
              id: 'log-' + Date.now(),
              timestamp,
              author: currentAuthor,
              text: logText,
            },
            ...(fallbackSheet.activityLogs || []),
          ];
          capturedOldStage = oldStage;
          capturedAssignedEmployee = assignedEmployee;
          capturedAssignedEmployeeId = assignedEmployeeId;
          capturedProgressText = progressText;
          capturedDoneCount = doneCount;
          capturedTotalCount = totalCount;
          capturedProgressPercent = progressPercent;
          capturedSheetManager = fallbackSheet.manager || capturedSheetManager;
          capturedSheetManagerId = fallbackSheet.managerEmployeeId || capturedSheetManagerId;
          capturedParty = fallbackSheet.party || capturedParty;
          return [
            {
              ...fallbackSheet,
              overallStatus,
              stages: updatedStages,
              activityLogs: newActivityLogs,
            },
            ...prevSheets,
          ];
        }
      }
      return updatedSheets;
    });

    // 4. SIDE EFFECTS (NOTIFICATIONS & APIS) EXECUTED SAFELY OUTSIDE setJobSheets
    const stageName = capturedOldStage?.name || `Stage ${stageId}`;
    const assignedEmployee = capturedAssignedEmployee || extraData.assignedTo || activeEmployee;
    const assignedEmployeeId =
      extraData.assignedEmployeeId !== undefined
        ? extraData.assignedEmployeeId
        : (capturedAssignedEmployeeId || capturedOldStage?.assignedEmployeeId || '');
    const progressText = capturedProgressText || 'Progress updated';
    const partyName = capturedParty;
    const managerName = capturedSheetManager;
    const managerEmployeeId = capturedSheetManagerId;

    const newNotificationsToAdd = [];

    // Notification handling:
    if (isStatusDone(finalStatus)) {
      // Owner Notification
      newNotificationsToAdd.push({
        id: 'notif-owner-done-' + Date.now(),
        title: `✓ Task Completed: ${stageName}`,
        message: `${currentAuthor} completed "${stageName}" for Job Sheet #${jobSheetId}${partyName ? ` (${partyName})` : ''}. ${progressText}.`,
        type: 'TASK_COMPLETED',
        jobSheetId: String(jobSheetId),
        taskId: String(stageId),
        read: false,
        timestamp,
        userId: 'ALL',
        metadata: {
          jobSheetId: String(jobSheetId),
          stageId: String(stageId),
          stageName,
          status: 'Done',
          completedBy: currentAuthor,
          assignedTo: assignedEmployee,
          managerName,
          managerEmployeeId,
          party: partyName,
          progressText,
          doneCount: capturedDoneCount,
          totalCount: capturedTotalCount,
          progressPercent: capturedProgressPercent,
        },
      });

      // Manager Notification
      if (managerName && managerName !== 'Unassigned' && managerName.toLowerCase() !== 'unassigned') {
        const mgrTargetId = managerEmployeeId || managerName;
        newNotificationsToAdd.push({
          id: 'notif-mgr-done-' + Date.now() + '-m',
          title: `✓ Task Completed: ${stageName}`,
          message: `${currentAuthor} completed "${stageName}" for Job Sheet #${jobSheetId}${partyName ? ` (${partyName})` : ''}. ${progressText}.`,
          type: 'TASK_COMPLETED',
          jobSheetId: String(jobSheetId),
          taskId: String(stageId),
          read: false,
          timestamp,
          userId: mgrTargetId,
          metadata: {
            jobSheetId: String(jobSheetId),
            stageId: String(stageId),
            stageName,
            status: 'Done',
            completedBy: currentAuthor,
            assignedTo: assignedEmployee,
            managerName,
            managerEmployeeId,
            party: partyName,
            progressText,
            doneCount: capturedDoneCount,
            totalCount: capturedTotalCount,
            progressPercent: capturedProgressPercent,
          },
        });

        // Trigger native heads-up alert for Manager
        displaySystemNotification({
          title: `✓ Task Completed: ${stageName}`,
          body: `${currentAuthor} completed "${stageName}". ${progressText}.`,
          data: {
            id: 'sys-mgr-' + Date.now(),
            type: 'TASK_COMPLETED',
            jobSheetId: String(jobSheetId),
            taskId: String(stageId),
            role: 'manager',
          },
        }).catch(() => {});
      }
    } else if (isManagerUser) {
      const mgrTargetId = currentUser?.employeeId || currentUser?.name || activeEmployee;
      newNotificationsToAdd.push({
        id: 'notif-mgr-' + Date.now(),
        title: `🔄 Progress Updated: ${stageName}`,
        message: `Progress updated on Job Sheet #${jobSheetId} (${stageName} → ${finalStatus}). ${progressText}.`,
        type: 'PROGRESS_UPDATED',
        jobSheetId: String(jobSheetId),
        taskId: String(stageId),
        read: false,
        timestamp,
        userId: mgrTargetId,
        metadata: {
          jobSheetId: String(jobSheetId),
          stageId: String(stageId),
          stageName,
          status: finalStatus,
          assignedTo: assignedEmployee,
          managerName,
          managerEmployeeId,
          party: partyName,
          progressText,
          doneCount: capturedDoneCount,
          totalCount: capturedTotalCount,
          progressPercent: capturedProgressPercent,
        },
      });

      newNotificationsToAdd.push({
        id: 'notif-owner-' + Date.now(),
        title: `🔄 Manager Updated Progress: ${stageName}`,
        message: `Manager ${managerName || currentAuthor} updated "${stageName}" to ${finalStatus} on Job Sheet #${jobSheetId}${partyName ? ` (${partyName})` : ''}. ${progressText}.`,
        type: 'PROGRESS_UPDATED',
        jobSheetId: String(jobSheetId),
        taskId: String(stageId),
        read: false,
        timestamp,
        userId: 'ALL',
        metadata: {
          jobSheetId: String(jobSheetId),
          stageId: String(stageId),
          stageName,
          status: finalStatus,
          assignedTo: assignedEmployee,
          managerName,
          managerEmployeeId,
          party: partyName,
          progressText,
          doneCount: capturedDoneCount,
          totalCount: capturedTotalCount,
          progressPercent: capturedProgressPercent,
        },
      });
    }

    // Also notify assigned worker when assigned or started
    if (assignedEmployee && assignedEmployee !== 'Unassigned') {
      const empInfo = (masterData.employees || []).find(
        (e) => e.name.toLowerCase() === assignedEmployee.toLowerCase()
      );
      const targetWorkerId = extraData.assignedEmployeeId || empInfo?.employeeId || assignedEmployee;
      const isOngoing = isStatusOngoing(finalStatus);
      const workerNotifTitle = isOngoing ? 'Task Started' : 'New Task Assigned';
      const workerNotifBody = isOngoing
        ? `"${stageName}" is currently ongoing and has been assigned to you.`
        : `You have been assigned to "${stageName}" for Job Sheet #${jobSheetId}${partyName ? ` (${partyName})` : ''}.`;

      newNotificationsToAdd.push({
        id: 'notif-worker-' + Date.now(),
        title: workerNotifTitle,
        message: workerNotifBody,
        type: isOngoing ? 'TASK_ONGOING' : 'TASK_ASSIGNED',
        jobSheetId: String(jobSheetId),
        taskId: String(stageId),
        read: false,
        timestamp,
        userId: targetWorkerId,
        metadata: {
          jobSheetId: String(jobSheetId),
          stageId: String(stageId),
          stageName,
          status: finalStatus,
          assignedTo: assignedEmployee,
          employeeId: targetWorkerId,
          party: partyName,
          deadline: extraData.deadline,
        },
      });

      displaySystemNotification({
        title: workerNotifTitle,
        body: workerNotifBody,
        data: {
          id: 'sys-worker-' + Date.now(),
          type: isOngoing ? 'TASK_ONGOING' : 'TASK_ASSIGNED',
          jobSheetId: String(jobSheetId),
          taskId: String(stageId),
          employeeId: targetWorkerId,
          role: 'employee',
        },
      }).catch(() => {});
    }

    if (newNotificationsToAdd.length > 0) {
      setNotifications((prev) => [...newNotificationsToAdd, ...prev]);
    }

    // 5. PERSIST TO MONGODB API
    const isLifecycleStatus = isStatusOngoing(finalStatus) || isStatusDone(finalStatus);
    const lifecyclePromise = isLifecycleStatus
      ? updateTaskLifecycleApi(jobSheetId, stageId, finalStatus, {
          completedBy: currentAuthor,
          assignedTo: assignedEmployee,
          assignedEmployeeId,
          notes: extraData.notes,
          image: extraData.image,
          role: role === 'OWNER' ? 'owner' : (isManagerUser ? 'manager' : 'employee'),
          employeeId: currentUser?.employeeId || '',
          author: currentAuthor,
          isManager: isManagerUser,
        })
      : updateStageStatusApi(jobSheetId, stageId, {
          status: finalStatus,
          assignedTo: assignedEmployee,
          assignedEmployeeId,
          deadline: extraData.deadline,
          completedAt,
          notes: extraData.notes,
          image: extraData.image,
          author: currentAuthor,
          role: role === 'OWNER' ? 'owner' : (isManagerUser ? 'manager' : 'employee'),
          employeeId: currentUser?.employeeId || '',
          isManager: isManagerUser,
        });

    lifecyclePromise
      .then((res) => {
        if (res && res.success && res.jobSheet) {
          setJobSheets((prev) =>
            prev.map((s) => {
              const isMatch =
                s.id === res.jobSheet.id ||
                s._id === res.jobSheet._id ||
                (s.id && String(s.id).trim().toLowerCase() === cleanTargetJobSheetId) ||
                (s._id && String(s._id).trim().toLowerCase() === cleanTargetJobSheetId) ||
                (s.jobSheetId && String(s.jobSheetId).trim().toLowerCase() === cleanTargetJobSheetId);
              return isMatch ? res.jobSheet : s;
            })
          );
        }
      })
      .catch((err) => console.warn('[Update Stage DB Error]:', err.message));
  };

  const updateJobSheetManager = (jobSheetId, managerName, managerEmployeeId) => {
    const timestamp = new Date().toISOString();
    const cleanMgrTargetSheetId = String(jobSheetId || '').trim().toLowerCase();
    let targetParty = 'Customer';

    setJobSheets((prev) =>
      prev.map((s) => {
        const isMatch =
          s.id === jobSheetId ||
          s._id === jobSheetId ||
          (s.id && String(s.id).trim().toLowerCase() === cleanMgrTargetSheetId) ||
          (s._id && String(s._id).trim().toLowerCase() === cleanMgrTargetSheetId) ||
          (s.jobSheetId && String(s.jobSheetId).trim().toLowerCase() === cleanMgrTargetSheetId);
        if (!isMatch) return s;
        targetParty = s.party || targetParty;
        const newLogs = [
          {
            id: 'log-' + Date.now(),
            timestamp,
            author: currentUser?.name || (role === 'OWNER' ? 'Owner' : 'Manager'),
            text: `Assigned ${managerName} as Production Manager.`,
          },
          ...(s.activityLogs || []),
        ];
        return {
          ...s,
          manager: managerName,
          managerEmployeeId,
          activityLogs: newLogs,
        };
      })
    );

    if (managerName && managerName !== 'Unassigned') {
      const managerNotif = {
        title: '📋 Assigned as Production Manager',
        message: `You have been assigned as Production Manager for Job Sheet #${jobSheetId} (${targetParty}). You can now assign production tasks.`,
        type: 'MANAGER_ASSIGNED',
        jobSheetId,
        userId: managerEmployeeId || managerName,
        metadata: {
          employeeId: managerEmployeeId,
          employeeName: managerName,
          managerName,
          assignedTo: managerName,
          party: targetParty,
          role: 'manager',
        },
      };
      addNotificationInternal(managerNotif);

      const ownerNotif = {
        title: '📋 Manager Assigned',
        message: `You assigned ${managerName} manager role for Job Sheet #${jobSheetId}${targetParty ? ` (${targetParty})` : ''}.`,
        type: 'MANAGER_ASSIGNED',
        jobSheetId,
        userId: '4821',
        metadata: {
          employeeId: managerEmployeeId,
          employeeName: managerName,
          managerName,
          assignedTo: managerName,
          party: targetParty,
          role: 'owner',
        },
      };
      addNotificationInternal(ownerNotif);
    }

    updateJobSheetApi(jobSheetId, { manager: managerName, managerEmployeeId }).catch((err) =>
      console.warn('[updateJobSheetManager DB Error]:', err.message)
    );
  };

  const updateQCBox = (jobSheetId, qcData) => {
    if (role !== 'OWNER') return;

    setJobSheets((prev) =>
      prev.map((s) => {
        if (s.id !== jobSheetId) return s;
        const updatedQc = { ...s.qcBox, ...qcData };

        // Persist to MongoDB
        updateJobSheetApi(jobSheetId, { qcBox: updatedQc }).catch((err) =>
          console.warn('[Update QC Box DB Error]:', err.message)
        );

        return { ...s, qcBox: updatedQc };
      })
    );
  };

  // Master Data CRUD (Owner Only)
  const addMasterItem = (category, item) => {
    if (role !== 'OWNER') return;
    setMasterData((prev) => ({
      ...prev,
      [category]: [...(prev[category] || []), item],
    }));
  };

  const deleteMasterItem = (category, itemId) => {
    if (role !== 'OWNER') return;
    setMasterData((prev) => ({
      ...prev,
      [category]: (prev[category] || []).filter((it) => it.id !== itemId),
    }));
  };

  // Toggle employee availability for Job Sheet Creation in Master Data
  const toggleEmployeeAvailabilityInContext = async (employeeId, isAvailable) => {
    const nextVal = typeof isAvailable === 'boolean' ? isAvailable : undefined;
    setMasterData((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => {
        if (e.employeeId === employeeId) {
          const updatedVal = nextVal !== undefined ? nextVal : !e.isAvailableForJobSheet;
          return {
            ...e,
            isAvailableForJobSheet: updatedVal,
            active: updatedVal,
          };
        }
        return e;
      }),
    }));

    try {
      await toggleEmployeeAvailabilityApi(employeeId, nextVal);
    } catch (err) {
      console.warn('[toggleEmployeeAvailability Warning]:', err.message);
    }
  };

  // Add new employee directly to Database (Master Data)
  const addEmployeeToDatabase = async (empData) => {
    try {
      const res = await createEmployeeApi(empData);
      if (res.success && res.employee) {
        const newEmp = {
          id: res.employee.id || `emp-${res.employee.employeeId}`,
          employeeId: res.employee.employeeId,
          name: res.employee.name,
          role: `${res.employee.department || 'Production'} Specialist`,
          phone: res.employee.phone || res.employee.mobileNumber || '',
          mobileNumber: res.employee.mobileNumber || res.employee.phone || '',
          department: res.employee.department || 'Production',
          email: res.employee.email || '',
          isAvailableForJobSheet: true,
          active: true,
        };
        setMasterData((prev) => ({
          ...prev,
          employees: [...prev.employees.filter((e) => e.employeeId !== newEmp.employeeId), newEmp],
        }));
        return { success: true, employee: newEmp };
      }
      return { success: false, message: res.message || 'Failed to add employee' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Delete employee from Database
  const deleteEmployeeFromDatabase = async (employeeId) => {
    setMasterData((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => e.employeeId !== employeeId),
    }));
    try {
      await deleteEmployeeApi(employeeId);
      return { success: true };
    } catch (err) {
      console.warn('[deleteEmployeeFromDatabase Warning]:', err.message);
      return { success: false, message: err.message };
    }
  };

  // Delete a specific stage from a Job Sheet (Owner only, Not Started status)
  const deleteStageFromJobSheet = async (jobSheetId, stageId) => {
    // If Employee: unassign the task / remove from their workspace so dashboard immediately updates
    // If Owner: delete the stage
    setJobSheets((prev) =>
      prev.map((sheet) => {
        if (sheet.id !== jobSheetId && sheet._id !== jobSheetId) return sheet;
        if (role === 'EMPLOYEE') {
          return {
            ...sheet,
            stages: (sheet.stages || []).map((s) => {
              if (
                s.id === stageId ||
                String(s.id) === String(stageId) ||
                s.taskId === stageId ||
                `TASK-${s.id}` === stageId
              ) {
                return {
                  ...s,
                  assignedTo: 'Unassigned',
                  assignedEmployeeId: '',
                  status: 'Not Started',
                };
              }
              return s;
            }),
          };
        }
        return {
          ...sheet,
          stages: (sheet.stages || []).filter(
            (s) =>
              s.id !== stageId &&
              String(s.id) !== String(stageId) &&
              s.taskId !== stageId &&
              s.taskId !== `TASK-${stageId}`
          ),
        };
      })
    );

    // Remove notification corresponding to this task for the current employee
    setNotifications((prev) =>
      prev.filter(
        (n) =>
          !(
            (n.jobSheetId === jobSheetId || n.metadata?.jobSheetId === jobSheetId) &&
            (n.taskId === String(stageId) || n.metadata?.stageId === String(stageId))
          )
      )
    );

    try {
      await deleteStageApi(jobSheetId, stageId, {
        role: role === 'OWNER' ? 'owner' : 'employee',
        employeeId: currentUser?.employeeId || '',
      });
    } catch (err) {
      console.warn('[deleteStageFromJobSheet Warning]:', err.message);
    }
  };

  // Remove all assigned stages from a Job Sheet (Owner only)
  const removeAllStagesFromJobSheet = async (jobSheetId) => {
    if (role !== 'OWNER') return;
    setJobSheets((prev) =>
      prev.map((sheet) => {
        if (sheet.id !== jobSheetId) return sheet;
        return {
          ...sheet,
          stages: [],
        };
      })
    );
    try {
      await removeAllStagesApi(jobSheetId);
    } catch (err) {
      console.warn('[removeAllStagesFromJobSheet Warning]:', err.message);
    }
  };

  // Delete a single notification
  const deleteNotification = async (notifId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    try {
      await deleteNotificationApi(notifId);
    } catch (err) {
      console.warn('[deleteNotification Warning]:', err.message);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (role === 'OWNER') {
      setNotifications([]);
    } else {
      setNotifications((prev) =>
        prev.filter((n) => !isNotificationForUser(n, currentUser, activeEmployee, role))
      );
    }
    const targetUserId = role === 'OWNER' ? 'ALL' : (currentUser?.employeeId || currentUser?.name || activeEmployee);
    const notifRole = role === 'EMPLOYEE' ? 'employee' : 'owner';
    try {
      await deleteAllNotificationsApi(targetUserId, notifRole);
    } catch (err) {
      console.warn('[clearAllNotifications Warning]:', err.message);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        isSessionRestoring,
        isAuthenticated,
        isAuthModalVisible,
        openAuthFlow,
        closeAuthFlow,
        loginByEmployeeId,
        sendOtp,
        verifyOtp,
        setupOwnerProfile,
        loginAfterRegistration,
        completeRegistrationProfile,
        addEmployeeAccount,
        addEmployeeToDatabase,
        deleteEmployeeFromDatabase,
        toggleEmployeeAvailabilityInContext,
        refreshEmployeesFromDb,
        currentUser,
        loginAsOwner,
        loginAsEmployee,
        logout,
        role,
        toggleRole,
        activeEmployee,
        setActiveEmployee,
        masterData,
        jobSheets,
        setJobSheets,
        refreshJobSheets,
        notifications,
        unreadCount,
        activeTab,
        setActiveTab,
        selectedJobSheetId,
        setSelectedJobSheetId,
        navStack,
        currentRoute,
        isHomeScreen,
        canGoBack,
        navigate,
        goBack,
        resetStack,
        replace,
        addJobSheet,
        updateJobSheetManager,
        deleteJobSheet,
        deleteStageFromJobSheet,
        removeAllStagesFromJobSheet,
        updateTaskStatus,
        updateQCBox,
        addMasterItem,
        deleteMasterItem,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        clearAllNotifications,
        clearAllData,
        activeBanner,
        setActiveBanner,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
