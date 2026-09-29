const supabase = require('../supabase');
const { generateUniqueEmployeeId } = require('../utils/generateEmployeeId');

/**
 * Helper to format employee record from Supabase table format
 */
function formatEmployee(emp) {
  if (!emp) return null;
  return {
    id: emp.id,
    _id: emp.id,
    employeeId: emp.employee_id,
    name: emp.name,
    email: emp.email || '',
    phone: emp.phone || emp.mobile_number || '',
    mobileNumber: emp.mobile_number || emp.phone || '',
    role: emp.role || 'employee',
    department: emp.department || 'Production',
    isAvailableForJobSheet: emp.is_available_for_job_sheet !== false,
    createdAt: emp.created_at,
  };
}

/**
 * 1. Get All Employees from Supabase
 * GET /api/employees
 */
async function getAllEmployees(req, res) {
  try {
    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .order('employee_id', { ascending: true });

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('Supabase employees table not found. Please run supabase_schema.sql in Supabase SQL editor.');
        return res.status(200).json({ success: true, count: 0, employees: [] });
      }
      console.error('[Supabase getAllEmployees Error]:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }

    const formattedEmployees = (employees || []).map(formatEmployee);

    return res.status(200).json({
      success: true,
      count: formattedEmployees.length,
      employees: formattedEmployees,
    });
  } catch (err) {
    console.error('[getAllEmployees Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * 2. Get Employee Profile by 4-digit ID
 * GET /api/employees/:employeeId
 */
async function getEmployeeById(req, res) {
  try {
    const { employeeId } = req.params;
    const cleanId = (employeeId || '').toString().trim();

    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_id', cleanId)
      .maybeSingle();

    if (error) {
      console.error('[Supabase getEmployeeById Error]:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee ${cleanId} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      employee: formatEmployee(employee),
    });
  } catch (err) {
    console.error('[getEmployeeById Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * 3. Create / Add New Employee from Master Data
 * POST /api/employees
 */
async function createEmployee(req, res) {
  try {
    const { name, email, department, phone, mobileNumber, role, isAvailableForJobSheet } = req.body;
    const cleanName = (name || '').toString().trim();

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: 'Employee name is required',
      });
    }

    let employeeId = (req.body.employeeId || '').toString().trim();
    if (!employeeId || !/^\d{4}$/.test(employeeId)) {
      employeeId = await generateUniqueEmployeeId();
    } else {
      // Check if candidate ID already exists in Supabase
      const { data: existing } = await supabase
        .from('employees')
        .select('employee_id')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Employee ID ${employeeId} already exists`,
        });
      }
    }

    const cleanEmail = (email || '').toString().trim().toLowerCase();
    const cleanPhone = (phone || mobileNumber || '').toString().trim();

    const { data: saved, error } = await supabase
      .from('employees')
      .insert({
        employee_id: employeeId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        mobile_number: cleanPhone,
        role: role === 'owner' ? 'owner' : 'employee',
        department: department || 'Production',
        is_available_for_job_sheet: isAvailableForJobSheet !== false,
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase createEmployee Error]:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }

    console.log(`✅ [Master Data]: New employee added to Supabase -> [${saved.employee_id}] ${saved.name} (${saved.department})`);

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee: formatEmployee(saved),
    });
  } catch (err) {
    console.error('[createEmployee Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * 4. Toggle or Update Availability for Job Sheets
 * PATCH /api/employees/:employeeId/availability
 */
async function toggleAvailability(req, res) {
  try {
    const { employeeId } = req.params;
    const { isAvailableForJobSheet } = req.body;
    const cleanId = (employeeId || '').toString().trim();

    const { data: employee, error: fetchErr } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_id', cleanId)
      .maybeSingle();

    if (fetchErr || !employee) {
      return res.status(404).json({
        success: false,
        message: `Employee ${cleanId} not found`,
      });
    }

    const newAvailability =
      typeof isAvailableForJobSheet === 'boolean'
        ? isAvailableForJobSheet
        : !employee.is_available_for_job_sheet;

    const { data: updated, error: updateErr } = await supabase
      .from('employees')
      .update({ is_available_for_job_sheet: newAvailability, updated_at: new Date().toISOString() })
      .eq('employee_id', cleanId)
      .select()
      .single();

    if (updateErr) {
      console.error('[Supabase toggleAvailability Error]:', updateErr.message);
      return res.status(500).json({ success: false, message: updateErr.message });
    }

    console.log(`🔄 [Employee Availability]: ${updated.name} (${cleanId}) available for job sheets: ${newAvailability}`);

    return res.status(200).json({
      success: true,
      message: 'Employee availability updated',
      employee: formatEmployee(updated),
    });
  } catch (err) {
    console.error('[toggleAvailability Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * 5. Update Employee Details
 * PUT /api/employees/:employeeId
 */
async function updateEmployee(req, res) {
  try {
    const { employeeId } = req.params;
    const cleanId = (employeeId || '').toString().trim();
    const updates = req.body;

    // Do not allow changing employeeId
    delete updates.employeeId;
    delete updates.employee_id;

    const rowUpdates = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) rowUpdates.name = updates.name;
    if (updates.email !== undefined) rowUpdates.email = updates.email;
    if (updates.phone !== undefined) {
      rowUpdates.phone = updates.phone;
      rowUpdates.mobile_number = updates.phone;
    }
    if (updates.mobileNumber !== undefined) {
      rowUpdates.mobile_number = updates.mobileNumber;
      rowUpdates.phone = updates.mobileNumber;
    }
    if (updates.role !== undefined) rowUpdates.role = updates.role;
    if (updates.department !== undefined) rowUpdates.department = updates.department;
    if (updates.isAvailableForJobSheet !== undefined) {
      rowUpdates.is_available_for_job_sheet = updates.isAvailableForJobSheet;
    }

    const { data: employee, error } = await supabase
      .from('employees')
      .update(rowUpdates)
      .eq('employee_id', cleanId)
      .select()
      .maybeSingle();

    if (error || !employee) {
      return res.status(404).json({
        success: false,
        message: error ? error.message : `Employee ${cleanId} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      employee: formatEmployee(employee),
    });
  } catch (err) {
    console.error('[updateEmployee Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * 6. Delete Employee from Supabase
 * DELETE /api/employees/:employeeId
 */
async function deleteEmployee(req, res) {
  try {
    const { employeeId } = req.params;
    const cleanId = (employeeId || '').toString().trim();

    const { data: employee, error: fetchErr } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_id', cleanId)
      .maybeSingle();

    if (fetchErr || !employee) {
      return res.status(404).json({
        success: false,
        message: `Employee ${cleanId} not found`,
      });
    }

    if (employee.role === 'owner') {
      return res.status(400).json({
        success: false,
        message: 'Owner account cannot be deleted',
      });
    }

    const { error: delErr } = await supabase
      .from('employees')
      .delete()
      .eq('employee_id', cleanId);

    if (delErr) {
      return res.status(500).json({ success: false, message: delErr.message });
    }

    console.log(`🗑️ [Master Data]: Deleted employee ${cleanId} (${employee.name}) from Supabase`);
    return res.status(200).json({
      success: true,
      message: `Employee ${cleanId} deleted successfully`,
    });
  } catch (err) {
    console.error('[deleteEmployee Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  toggleAvailability,
  updateEmployee,
  deleteEmployee,
  formatEmployee,
};
