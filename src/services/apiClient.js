import { Platform } from 'react-native';

// Production URL – replace with your actual Render service URL after deploying
const PRODUCTION_API_URL = 'https://jobsheetflow-server.onrender.com';

// In dev builds use local server; in release builds use the deployed Render URL
export const API_BASE_URL = __DEV__
  ? Platform.select({
      android: 'http://10.0.2.2:5001',
      ios: 'http://localhost:5001',
      default: 'http://localhost:5001',
    })
  : PRODUCTION_API_URL;

/**
 * Helper to execute JSON requests with timeout and proper error handling
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), __DEV__ ? 8000 : 30000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Network request timed out. Please check if the backend server is running.');
    }
    throw err;
  }
}

/**
 * 1. Login with 4-digit Employee ID
 */
export async function loginWithEmployeeId(employeeId) {
  return request('/api/auth/employee-id', {
    method: 'POST',
    body: JSON.stringify({ employeeId }),
  });
}


/**
 * 2. Send Mobile Verification OTP
 */
export async function sendOtpApi({ mobileNumber }) {
  return request('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber }),
  });
}

/**
 * 3. Verify OTP & Authenticate / Register Employee
 */
export async function verifyOtpApi({ mobileNumber, otp, name, isOwnerSetup, employeeId }) {
  return request('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber, otp, name, isOwnerSetup, employeeId }),
  });
}

/**
 * 4. Setup / Update Owner Profile (4821)
 */
export async function setupOwnerProfileApi({ name, mobileNumber }) {
  return request('/api/auth/owner-setup', {
    method: 'POST',
    body: JSON.stringify({ name, mobileNumber }),
  });
}


/**
 * 6. Register new Employee (name, mobileNumber, password)
 */
export async function registerEmployee({ name, mobileNumber, email, password }) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, mobileNumber, email, password }),
  });
}

/**
 * 5. Get Employee Profile by ID
 */
export async function getEmployee(employeeId) {
  return request(`/api/employees/${employeeId}`, {
    method: 'GET',
  });
}

/**
 * 5b. Fetch All Employees from Database
 */
export async function fetchEmployeesApi() {
  return request('/api/employees', {
    method: 'GET',
  });
}

/**
 * 5c. Create New Employee in Database (Master Data)
 */
export async function createEmployeeApi(employeeData) {
  return request('/api/employees', {
    method: 'POST',
    body: JSON.stringify(employeeData),
  });
}

/**
 * 5d. Update Employee in Database
 */
export async function updateEmployeeApi(employeeId, data) {
  return request(`/api/employees/${employeeId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * 5e. Toggle Employee Availability for Job Sheets
 */
export async function toggleEmployeeAvailabilityApi(employeeId, isAvailableForJobSheet) {
  return request(`/api/employees/${employeeId}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ isAvailableForJobSheet }),
  });
}

/**
 * 5f. Delete Employee from Database
 */
export async function deleteEmployeeApi(employeeId) {
  return request(`/api/employees/${employeeId}`, {
    method: 'DELETE',
  });
}

/**
 * 6. Get All Job Sheets from Database (supports employeeId and role filtering)
 */
export async function fetchJobSheetsApi(filters = {}) {
  const params = new URLSearchParams();
  if (filters.employeeId) params.append('employeeId', filters.employeeId);
  if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
  if (filters.userRole) params.append('userRole', filters.userRole);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return request(`/api/jobsheets${queryStr}`, {
    method: 'GET',
  });
}

/**
 * 7. Get Job Sheet by ID from Database
 */
export async function getJobSheetByIdApi(id) {
  return request(`/api/jobsheets/${id}`, {
    method: 'GET',
  });
}

/**
 * 8. Create Job Sheet in Database
 */
export async function createJobSheetApi(jobSheetData) {
  return request('/api/jobsheets', {
    method: 'POST',
    body: JSON.stringify(jobSheetData),
  });
}

/**
 * 9. Update Job Sheet in Database
 */
export async function updateJobSheetApi(id, updates) {
  return request(`/api/jobsheets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/**
 * 10. Update Stage Status in Database
 */
export async function updateStageStatusApi(id, stageId, stageData) {
  return request(`/api/jobsheets/${id}/stages/${stageId}`, {
    method: 'PATCH',
    body: JSON.stringify(stageData),
  });
}

/**
 * 11. Delete Job Sheet from Database
 */
export async function deleteJobSheetApi(id) {
  return request(`/api/jobsheets/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 12. Clear All Job Sheets from Database
 */
export async function clearAllJobSheetsApi() {
  return request('/api/jobsheets', {
    method: 'DELETE',
  });
}

/**
 * 13. Register Device Token with Backend
 */
export async function registerDeviceApi(deviceData) {
  return request('/api/devices/register', {
    method: 'POST',
    body: JSON.stringify(deviceData),
  });
}

/**
 * 14. Deactivate Device Token on Logout
 */
export async function deactivateDeviceApi(userId, deviceToken) {
  return request('/api/devices/deactivate', {
    method: 'POST',
    body: JSON.stringify({ userId, deviceToken }),
  });
}

/**
 * 15. Fetch Notifications from MongoDB
 */
export async function fetchNotificationsApi(userId, type, isRead, userRole) {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (type) params.append('type', type);
  if (isRead !== undefined) params.append('isRead', String(isRead));
  if (userRole) params.append('userRole', userRole);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return request(`/api/notifications${queryStr}`, {
    method: 'GET',
  });
}

/**
 * 16. Mark Notification Read
 */
export async function markNotificationReadApi(id) {
  return request(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

/**
 * 17. Mark All Notifications Read
 */
export async function markAllNotificationsReadApi(userId, userRole) {
  return request('/api/notifications/read-all', {
    method: 'PATCH',
    body: JSON.stringify({ userId, userRole }),
  });
}

/**
 * 18. Update Task Status Lifecycle (ONGOING / DONE)
 */
export async function updateTaskLifecycleApi(jobSheetId, taskId, status, extraData = {}) {
  return request(`/api/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      jobSheetId,
      status,
      ...extraData,
    }),
  });
}

/**
 * 19. Delete a specific stage from a Job Sheet
 */
export async function deleteStageApi(jobSheetId, stageId) {
  return request(`/api/jobsheets/${jobSheetId}/stages/${stageId}`, {
    method: 'DELETE',
  });
}

/**
 * 20. Remove all assigned stages from a Job Sheet
 */
export async function removeAllStagesApi(jobSheetId) {
  return request(`/api/jobsheets/${jobSheetId}/stages`, {
    method: 'DELETE',
  });
}

/**
 * 21. Delete single notification
 */
export async function deleteNotificationApi(notificationId) {
  return request(`/api/notifications/${notificationId}`, {
    method: 'DELETE',
  });
}

/**
 * 22. Delete all notifications (scoped by user / role)
 */
export async function deleteAllNotificationsApi(userId, userRole) {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (userRole) params.append('userRole', userRole);
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return request(`/api/notifications${queryStr}`, {
    method: 'DELETE',
  });
}

/**
 * 23. Fetch pending push notifications for device (background/foreground push receiver)
 */
export async function fetchPendingPushesApi(userId, since) {
  const params = new URLSearchParams();
  if (since) params.append('since', since);
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return request(`/api/devices/pending-pushes/${encodeURIComponent(userId)}${queryStr}`);
}
