const supabase = require('../supabase');

/**
 * Register or update device information for a user
 * @param {Object} params
 * @param {string} params.userId - User ID, Employee ID, or Name
 * @param {string} params.deviceToken - FCM Device Registration Token
 * @param {string} [params.platform] - 'android' | 'ios' | 'web'
 * @param {string} [params.deviceModel] - e.g. 'Pixel 8'
 * @param {string} [params.osVersion] - e.g. 'Android 15'
 * @param {string} [params.appVersion] - e.g. '1.0.0'
 * @returns {Promise<Object>}
 */
async function registerDevice({
  userId,
  deviceToken,
  platform = 'android',
  deviceModel = 'Unknown Device',
  osVersion = 'Unknown OS',
  appVersion = '1.0.0',
}) {
  if (!userId || !deviceToken) {
    throw new Error('userId and deviceToken are required to register a device');
  }

  const cleanUserId = userId.trim();
  const cleanToken = deviceToken.trim();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('devices')
    .upsert(
      {
        user_id: cleanUserId,
        device_token: cleanToken,
        platform: (platform || 'android').toLowerCase(),
        device_model: deviceModel || 'Unknown Device',
        os_version: osVersion || 'Unknown OS',
        app_version: appVersion || '1.0.0',
        is_active: true,
        updated_at: now,
      },
      { onConflict: 'device_token' }
    )
    .select()
    .single();

  if (error) {
    console.error('[Supabase registerDevice Error]:', error.message);
    throw new Error(error.message);
  }

  console.log(`📱 [Device Registered via Supabase]: User "${cleanUserId}" on ${platform} (${deviceModel}), active: true`);
  return {
    userId: data.user_id,
    deviceToken: data.device_token,
    platform: data.platform,
    deviceModel: data.device_model,
    osVersion: data.os_version,
    appVersion: data.app_version,
    isActive: data.is_active,
    updatedAt: data.updated_at,
  };
}

/**
 * Deactivate a device token when user logs out
 * @param {Object} params
 * @param {string} [params.userId]
 * @param {string} [params.deviceToken]
 * @returns {Promise<boolean>}
 */
async function deactivateDevice({ userId, deviceToken }) {
  let query = supabase.from('devices').update({ is_active: false, updated_at: new Date().toISOString() });

  if (deviceToken) {
    query = query.eq('device_token', deviceToken.trim());
  } else if (userId) {
    query = query.eq('user_id', userId.trim());
  } else {
    return false;
  }

  const { error } = await query;
  if (error) {
    console.warn('[Supabase deactivateDevice Warning]:', error.message);
    return false;
  }

  console.log(`[Device Deactivated via Supabase]: Token marked inactive on logout`);
  return true;
}

/**
 * Find all active device tokens for a given user
 * Handles user matching by userId, employeeId, or employee name
 * @param {string} userId
 * @returns {Promise<string[]>} Array of active deviceTokens
 */
async function getActiveDeviceTokensForUser(userId) {
  if (!userId) return [];
  const cleanId = userId.trim();

  // Also lookup alternate identifiers if userId is an employee name or employeeId
  const matchingUserIds = [cleanId];

  try {
    const { data: emps } = await supabase
      .from('employees')
      .select('employee_id, name, mobile_number')
      .or(`employee_id.eq.${cleanId},name.ilike.${cleanId},mobile_number.eq.${cleanId}`)
      .limit(1);

    if (emps && emps.length > 0) {
      const emp = emps[0];
      if (emp.employee_id && !matchingUserIds.includes(emp.employee_id)) matchingUserIds.push(emp.employee_id);
      if (emp.name && !matchingUserIds.includes(emp.name)) matchingUserIds.push(emp.name);
    }
  } catch (err) {
    // Non-critical employee lookup
  }

  const { data: devices, error } = await supabase
    .from('devices')
    .select('device_token')
    .in('user_id', matchingUserIds)
    .eq('is_active', true);

  if (error) {
    console.warn('[Supabase getActiveDeviceTokens Warning]:', error.message);
    return [];
  }

  return (devices || []).map((d) => d.device_token).filter(Boolean);
}

module.exports = {
  registerDevice,
  deactivateDevice,
  getActiveDeviceTokensForUser,
};
