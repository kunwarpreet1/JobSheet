const supabase = require('../supabase');

/**
 * Generate a random, unique 4-digit Employee ID as a string (e.g. "4821", "7392")
 * Ensures it does not already exist in Supabase database.
 */
async function generateUniqueEmployeeId() {
  let isUnique = false;
  let candidateId = '';
  let attempts = 0;
  const maxAttempts = 50;

  while (!isUnique && attempts < maxAttempts) {
    attempts++;
    // Generate random 4-digit integer between 1000 and 9999
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    candidateId = randomNum.toString();

    // Check if it already exists in Supabase
    const { data: existing } = await supabase
      .from('employees')
      .select('employee_id')
      .eq('employee_id', candidateId)
      .maybeSingle();

    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    throw new Error('Unable to generate unique 4-digit Employee ID after multiple attempts');
  }

  return candidateId;
}

module.exports = {
  generateUniqueEmployeeId,
};
