/**
 * Working hours: 9:00 AM - 8:00 PM (09:00 - 20:00)
 * Sunday: Off Day (Automatically shifts to Monday 9:00 AM)
 */

export const WORK_START_HOUR = 9;   // 9:00 AM
export const WORK_START_MINUTE = 0;
export const WORK_END_HOUR = 20;    // 8:00 PM = 20:00
export const WORK_END_MINUTE = 0;

/**
 * Checks if a given Date object falls on a Sunday.
 */
export function isSunday(date) {
  const d = new Date(date);
  return d.getDay() === 0;
}

/**
 * Returns a valid default working deadline (today or next working day at 18:00 / 6:00 PM, or 9:00 AM)
 */
export function getDefaultWorkingDeadline(offsetDays = 0, hour = 18, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return calculateValidDeadline(d).deadlineDate;
}

/**
 * Formats a Date object to readable date string (e.g., "Mon, 17 Aug 2026")
 */
export function formatDateStr(date) {
  if (!date) return '';
  const d = new Date(date);
  const options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
  return d.toLocaleDateString('en-US', options);
}

/**
 * Formats a Date object to 12-hour time string (e.g., "04:30 PM")
 */
export function formatTimeStr(date) {
  if (!date) return '';
  const d = new Date(date);
  let hours = d.getHours();
  let minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strMinutes = minutes < 10 ? '0' + minutes : minutes;
  const strHours = hours < 10 ? '0' + hours : hours;
  return `${strHours}:${strMinutes} ${ampm}`;
}

/**
 * Process a user-selected date and time, applying Sunday off-day rollover
 * and working hour adjustments (9:00 AM to 8:00 PM).
 */
export function calculateValidDeadline(dateObj, timeObj) {
  const target = new Date(dateObj);
  
  if (timeObj) {
    const t = new Date(timeObj);
    target.setHours(t.getHours(), t.getMinutes(), 0, 0);
  }

  let wasSundayAdjusted = false;
  let originalSundayDate = null;

  // Check if Sunday (0) -> Off-day, roll over to Monday
  if (target.getDay() === 0) {
    wasSundayAdjusted = true;
    originalSundayDate = new Date(target);
    // Add 1 day to shift to Monday
    target.setDate(target.getDate() + 1);
  }

  // Ensure hours are strictly within 9:00 AM - 8:00 PM (09:00 - 20:00)
  let currentHours = target.getHours();
  let currentMinutes = target.getMinutes();

  if (currentHours < WORK_START_HOUR) {
    target.setHours(WORK_START_HOUR, WORK_START_MINUTE, 0, 0);
  } else if (currentHours > WORK_END_HOUR || (currentHours === WORK_END_HOUR && currentMinutes > WORK_END_MINUTE)) {
    target.setHours(WORK_END_HOUR, WORK_END_MINUTE, 0, 0);
  }

  return {
    deadlineDate: target.toISOString(),
    isSundayAdjusted: wasSundayAdjusted,
    originalSundayStr: originalSundayDate ? formatDateStr(originalSundayDate) : null,
    formattedDate: formatDateStr(target),
    formattedTime: formatTimeStr(target),
  };
}

/**
 * Determines task status:
 * - 'Done' if completed
 * - 'Overdue' if not done and current time > deadline
 * - 'In Progress' if started or currently active
 * - 'Not Started' if not started and deadline is in future
 */
export function getTaskStatus(task, currentTime = new Date()) {
  if (task.status === 'Done') {
    if (task.completedAt && task.deadline) {
      const completedDate = new Date(task.completedAt);
      const deadlineDate = new Date(task.deadline);
      if (completedDate > deadlineDate) {
        return 'Delayed'; // Completed late
      }
    }
    return 'Done';
  }

  if (task.deadline) {
    const deadlineDate = new Date(task.deadline);
    if (currentTime > deadlineDate) {
      return 'Overdue';
    }
  }

  if (task.assignedTo && task.assignedTo !== 'Unassigned') {
    return 'In Progress';
  }

  return 'Not Started';
}

/**
 * Calculates delay duration between deadline and completion or current time.
 */
export function calculateDelayText(deadlineISO, endISO = new Date().toISOString()) {
  if (!deadlineISO) return '';
  const start = new Date(deadlineISO).getTime();
  const end = new Date(endISO).getTime();
  const diffMs = end - start;
  
  if (diffMs <= 0) return '';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} mins`;
}

/**
 * Formats full timestamp for log display (e.g. "12 Aug 2026, 04:30 PM")
 */
export function formatFullTimestamp(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return `${formatDateStr(d)}, ${formatTimeStr(d)}`;
}
