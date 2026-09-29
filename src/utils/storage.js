/**
 * Master Data & Initial State for JobSheetFlow
 * System starts completely empty with 0 pre-populated Job Sheets.
 */

export const INITIAL_MASTER_DATA = {
  employees: [],
  models: [
    { id: 'mod-1', name: 'Regal Velvet L-Shape Sofa' },
    { id: 'mod-2', name: 'Chesterfield Teak Armchair' },
    { id: 'mod-3', name: 'Nordic Modular Sectional' },
    { id: 'mod-4', name: 'Contemporary Dining Chair' },
  ],
  fabrics: [
    { id: 'fab-1', name: 'Italian Velvet (EV-901)' },
    { id: 'fab-2', name: 'Tan Leather (TL-305)' },
    { id: 'fab-3', name: 'Boucle Cream (BC-112)' },
    { id: 'fab-4', name: 'Matte Suede (CS-804)' },
  ],
  parties: [
    { id: 'pty-1', name: 'Apex Luxury Living' },
    { id: 'pty-2', name: 'Royal Grand Hotel' },
    { id: 'pty-3', name: 'Urban Spaces Studio' },
  ],
  salesmen: [
    { id: 'sal-1', name: 'Rohan Malhotra' },
    { id: 'sal-2', name: 'Karan Mehra' },
    { id: 'sal-3', name: 'Simran Kaur' },
  ],
  departments: [
    { id: 'dep-1', name: 'Carpentry' },
    { id: 'dep-2', name: 'QC' },
    { id: 'dep-3', name: 'Cushion' },
    { id: 'dep-4', name: 'Fabric' },
    { id: 'dep-5', name: 'Fitting' },
    { id: 'dep-6', name: 'Packing' },
  ],
};

export const STANDARD_STAGES = [
  { id: 1, key: 'FABRIC_ORDER', name: 'FABRIC ORDER', defaultDept: 'Fabric' },
  { id: 2, key: 'NOTIFY_PARTY', name: 'NOTIFY PARTY (if In Stock)', defaultDept: 'Admin' },
  { id: 3, key: 'FABRIC_RECEIVED', name: 'FABRIC RECEIVED', defaultDept: 'Fabric' },
  { id: 4, key: 'FRAME_ORDER', name: 'FRAME/THIPA ORDER', defaultDept: 'Carpentry' },
  { id: 5, key: 'FRAME_RECEIVED', name: 'FRAME/THIPA RECEIVED', defaultDept: 'Carpentry' },
  { id: 6, key: 'CUSHION_MASTER', name: 'CUSHION MASTER', defaultDept: 'Cushion' },
  { id: 7, key: 'CUSHION_READY', name: 'CUSHION READY', defaultDept: 'Cushion' },
  { id: 8, key: 'LEGS_READY', name: 'LEGS/THIPA READY', defaultDept: 'Carpentry' },
  { id: 9, key: 'FITTING', name: 'FITTING', defaultDept: 'Fitting' },
  { id: 10, key: 'PACKING', name: 'PACKING', defaultDept: 'Packing' },
];

/**
 * Returns 0 initial job sheets (completely clean system)
 */
export function getInitialJobSheets() {
  return [];
}

/**
 * Returns 0 initial notifications
 */
export function getInitialNotifications() {
  return [];
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_STORAGE_KEY = '@JobSheetFlow:sessionUser';

// Global active session state (restored automatically on app load if logged in)
let savedSessionUser = null;

export async function saveSessionUser(user) {
  savedSessionUser = user;
  try {
    if (user) {
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('[Storage Error] Failed to persist session user:', err);
  }
}

export async function loadPersistedSessionUser() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      savedSessionUser = parsed;
      return parsed;
    }
  } catch (err) {
    console.warn('[Storage Error] Failed to load persisted session user:', err);
  }
  return null;
}

export function getSavedSessionUser() {
  return savedSessionUser;
}

export async function clearSavedSessionUser() {
  savedSessionUser = null;
  try {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (err) {
    console.warn('[Storage Error] Failed to clear session user:', err);
  }
}

/**
 * Helper to check if a stage/task status is Done/Completed (case-insensitive)
 */
export function isStatusDone(status) {
  if (!status) return false;
  const s = String(status).trim().toUpperCase();
  return s === 'DONE' || s === 'COMPLETED';
}

/**
 * Helper to check if a stage/task status is Ongoing/In Progress (case-insensitive)
 */
export function isStatusOngoing(status) {
  if (!status) return false;
  const s = String(status).trim().toUpperCase();
  return s === 'ONGOING' || s === 'IN PROGRESS' || s === 'IN_PROGRESS' || s === 'ON TRACK';
}

/**
 * Helper to check if a stage/task status is Not Started / Pending (case-insensitive)
 */
export function isStatusNotStarted(status) {
  if (!status) return true;
  const s = String(status).trim().toUpperCase();
  return s === 'NOT STARTED' || s === 'NOT_STARTED' || s === 'PENDING';
}

/**
 * Clean helper to check if a task / stage is assigned to the current employee user
 */
export function isTaskAssignedToUser(stage, currentUser, activeEmployee) {
  if (!stage) return false;

  const assigned = String(stage.assignedTo || '').trim().toLowerCase();
  const assignedId = String(stage.assignedEmployeeId || '').trim().toLowerCase();

  if (!assigned && !assignedId) return false;
  if (assigned === 'unassigned') return false;

  const currentName = String(currentUser?.name || activeEmployee || '').trim().toLowerCase();
  const currentEmpId = String(currentUser?.employeeId || '').trim().toLowerCase();
  const currentUid = String(currentUser?.uid || '').trim().toLowerCase();
  const currentEmail = String(currentUser?.email || '').trim().toLowerCase();

  // Match against employee name, employee ID, UID, or email
  return Boolean(
    (currentName && (assigned === currentName || assigned.includes(currentName) || currentName.includes(assigned))) ||
    (currentEmpId && (assigned === currentEmpId || assignedId === currentEmpId || assigned.includes(currentEmpId))) ||
    (currentUid && (assigned === currentUid || assignedId === currentUid)) ||
    (currentEmail && (assigned === currentEmail || assigned.includes(currentEmail)))
  );
}

/**
 * Helper to check if the current user is the Production Manager for this Job Sheet
 */
export function isUserJobSheetManager(sheet, currentUser, activeEmployee) {
  if (!sheet) return false;
  const currentName = String(currentUser?.name || activeEmployee || '').trim().toLowerCase();
  const currentEmpId = String(currentUser?.employeeId || '').trim().toLowerCase();
  const currentEmail = String(currentUser?.email || '').trim().toLowerCase();

  const manager = String(sheet.manager || '').trim().toLowerCase();
  const managerId = String(sheet.managerEmployeeId || '').trim().toLowerCase();

  if (!manager && !managerId) return false;
  if (manager === 'unassigned') return false;

  return Boolean(
    (currentName && (manager === currentName || manager.includes(currentName) || currentName.includes(manager))) ||
    (currentEmpId && (manager === currentEmpId || managerId === currentEmpId || manager.includes(currentEmpId))) ||
    (currentEmail && manager === currentEmail)
  );
}

/**
 * Clean helper to check if a Job Sheet is relevant to the employee user:
 * - If user is the Production Manager for this Job Sheet -> TRUE (full management access)
 * - If user has at least one assigned task in this Job Sheet -> TRUE
 */
export function isJobSheetAssignedToUser(sheet, currentUser, activeEmployee) {
  if (!sheet) return false;
  // If user is the Production Manager for this Job Sheet, they have full access!
  if (isUserJobSheetManager(sheet, currentUser, activeEmployee)) return true;
  if (!Array.isArray(sheet.stages)) return false;
  return sheet.stages.some((stage) => isTaskAssignedToUser(stage, currentUser, activeEmployee));
}

/**
 * Creates a synthetic management duty task object for an assigned Production Manager.
 * Gives the manager their active management task (+1) with direct navigation to the Job Sheet.
 */
export function createManagerDutyTask(sheet) {
  if (!sheet) return null;
  const isDone =
    sheet.overallStatus === 'Done' ||
    sheet.overallStatus === 'DONE' ||
    (Array.isArray(sheet.stages) &&
      sheet.stages.length > 0 &&
      sheet.stages.every((st) => isStatusDone(st.status)));

  return {
    id: `mgr-${sheet.id}`,
    taskId: `TASK-MGR-${sheet.id}`,
    name: `Production Management (${sheet.id})`,
    title: `Production Management (${sheet.id})`,
    jobSheetId: sheet.id,
    party: sheet.party || 'Customer',
    fabric: sheet.fabric || 'Standard Fabric',
    status: isDone ? 'Done' : (sheet.overallStatus || 'In Progress'),
    assignedTo: sheet.manager || 'Manager',
    assignedEmployeeId: sheet.managerEmployeeId || '',
    isManagerDuty: true,
    deadline: sheet.deadline || (sheet.stages && sheet.stages[sheet.stages.length - 1]?.deadline) || null,
    notes: `Production Manager responsible for stage assignments and progress supervision for ${sheet.party || sheet.id}.`,
  };
}

/**
 * Returns all tasks relevant to an employee across all Job Sheets:
 * 1. Their individual assigned production stages.
 * 2. +1 Management duty task for each Job Sheet where they are assigned as Production Manager.
 */
export function getEmployeeTasks(jobSheets, currentUser, activeEmployee) {
  if (!Array.isArray(jobSheets)) return [];
  const tasks = [];

  jobSheets.forEach((sheet) => {
    // 1. If user is Production Manager for this Job Sheet, add manager duty task (+1)
    if (isUserJobSheetManager(sheet, currentUser, activeEmployee)) {
      const mgrTask = createManagerDutyTask(sheet);
      if (mgrTask) {
        tasks.push(mgrTask);
      }
    }

    // 2. Add individual stages assigned to this user
    if (Array.isArray(sheet.stages)) {
      sheet.stages.forEach((stage) => {
        if (isTaskAssignedToUser(stage, currentUser, activeEmployee)) {
          tasks.push({
            ...stage,
            jobSheetId: sheet.id,
            party: sheet.party,
            fabric: sheet.fabric,
          });
        }
      });
    }
  });

  return tasks;
}


/**
 * Clean helper to check if a notification belongs to the current user
 * - Owner: receives/views all notifications
 * - Employee: receives/views notifications for tasks assigned to them OR when assigned as Production Manager
 */
export function isNotificationForUser(notif, currentUser, activeEmployee, role) {
  if (role === 'OWNER') return true;
  if (!notif) return false;

  // For Employee: strictly ignore general broadcasts like JOB_SHEET_CREATED
  if (notif.type === 'JOB_SHEET_CREATED') return false;

  const currentName = (currentUser?.name || activeEmployee || '').trim().toLowerCase();
  const currentEmpId = (currentUser?.employeeId || '').trim().toLowerCase();
  const currentUid = (currentUser?.uid || '').trim().toLowerCase();
  const currentEmail = (currentUser?.email || '').trim().toLowerCase();

  const notifUserId = (notif.userId || '').trim().toLowerCase();
  const notifEmpId = (notif.metadata?.employeeId || notif.metadata?.managerEmployeeId || '').trim().toLowerCase();
  const notifAssignedTo = (notif.metadata?.assignedTo || notif.metadata?.employeeName || notif.metadata?.managerName || '').trim().toLowerCase();

  // Match if notification is addressed to this employee or task assigned to this employee or as manager
  const isMatch = Boolean(
    (currentEmpId && (notifUserId === currentEmpId || notifEmpId === currentEmpId || notifAssignedTo === currentEmpId)) ||
    (currentName && (notifUserId === currentName || notifAssignedTo === currentName || notifEmpId === currentName)) ||
    (currentUid && notifUserId === currentUid) ||
    (currentEmail && notifUserId === currentEmail)
  );

  if (isMatch) return true;

  // If notification was explicitly broadcast to 'ALL', do not show to employee unless matched above
  if (notifUserId === 'all') return false;

  return false;
}

