const supabase = require('../supabase');
const { generateUniqueEmployeeId } = require('../utils/generateEmployeeId');

// In-memory OTP storage with 5-minute expiry
const otpStore = new Map();

/**
 * Format employee row from Supabase
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
    createdAt: emp.created_at,
  };
}

/**
 * 1. Login with 4-Digit Employee ID
 * POST /api/auth/employee-id
 * Body: { employeeId: "4821" }
 */
async function loginByEmployeeId(req, res) {
  try {
    const { employeeId } = req.body;
    const cleanId = (employeeId || '').toString().trim();

    if (!/^\d{4}$/.test(cleanId)) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID must be exactly 4 digits',
      });
    }

    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_id', cleanId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST205') {
        return res.status(503).json({
          success: false,
          message: "Supabase database tables not created yet. Please run 'supabase_schema.sql' in your Supabase SQL Editor.",
        });
      }
      console.error('[Supabase loginByEmployeeId Error]:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee ID not found',
      });
    }

    // Special check for Owner (4821): check if first-time profile setup is needed
    let needsProfileSetup = false;
    if (cleanId === '4821') {
      const hasPhone = Boolean(employee.mobile_number || employee.phone);
      const isPlaceholderName = !employee.name || employee.name === 'John Doe';
      if (!hasPhone || isPlaceholderName) {
        needsProfileSetup = true;
      }
    }

    return res.status(200).json({
      success: true,
      needsProfileSetup,
      employee: formatEmployee(employee),
    });
  } catch (err) {
    console.error('[loginByEmployeeId]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * 2. Send OTP for Mobile Number Verification
 * POST /api/auth/send-otp
 * Body: { mobileNumber: "9876543210" }
 */
async function sendOtp(req, res) {
  try {
    const { mobileNumber } = req.body;
    const cleanMobile = (mobileNumber || '').toString().replace(/[^0-9]/g, '').slice(-10);

    if (cleanMobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number',
      });
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    otpStore.set(cleanMobile, { otp, expiresAt });
    console.log(`🔐 [OTP Generated for +91${cleanMobile}]: ${otp} (expires in 5m)`);

    return res.status(200).json({
      success: true,
      message: 'OTP generated and dispatched successfully',
      mobileNumber: cleanMobile,
      otp, // Provided to allow in-app drop-down notification banner
    });
  } catch (err) {
    console.error('[sendOtp Error]:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * 3. Verify OTP & Authenticate / Register Employee
 * POST /api/auth/verify-otp
 * Body: { mobileNumber: "9876543210", otp: "123456", name: "Ramesh", isOwnerSetup: false, employeeId: "4821" }
 */
async function verifyOtp(req, res) {
  try {
    const { mobileNumber, otp, name, isOwnerSetup, employeeId } = req.body;
    const cleanMobile = (mobileNumber || '').toString().replace(/[^0-9]/g, '').slice(-10);
    const cleanOtp = (otp || '').toString().trim();
    const cleanName = (name || '').toString().trim();

    if (cleanMobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 10-digit mobile number',
      });
    }

    // Check stored OTP
    const stored = otpStore.get(cleanMobile);
    const isValid = stored && stored.otp === cleanOtp && Date.now() <= stored.expiresAt;

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please check the notification or request a new code.',
      });
    }

    // OTP verified -> remove from store
    otpStore.delete(cleanMobile);

    // CASE A: Owner (4821) First-Time Setup
    if (isOwnerSetup || employeeId === '4821') {
      const { data: updatedOwner, error: updateErr } = await supabase
        .from('employees')
        .update({
          name: cleanName || 'Admin Owner',
          mobile_number: cleanMobile,
          phone: cleanMobile,
          updated_at: new Date().toISOString(),
        })
        .eq('employee_id', '4821')
        .select()
        .single();

      if (updateErr) {
        console.error('[verifyOtp Owner Setup Error]:', updateErr.message);
        return res.status(500).json({ success: false, message: updateErr.message });
      }

      console.log(`👑 [Admin 4821 Profile Initialized]: Name ${cleanName} | Mobile ${cleanMobile}`);
      return res.status(200).json({
        success: true,
        message: 'Owner profile initialized successfully',
        employee: formatEmployee(updatedOwner),
      });
    }

    // CASE B: Regular Employee Login / Registration
    // Check if employee with this mobile number already exists
    const { data: existingEmp, error: findErr } = await supabase
      .from('employees')
      .select('*')
      .or(`mobile_number.eq.${cleanMobile},phone.eq.${cleanMobile}`)
      .maybeSingle();

    if (findErr) {
      if (findErr.code === 'PGRST205') {
        return res.status(503).json({
          success: false,
          message: "Database tables not created yet in Supabase. Please run 'supabase_schema.sql' in your Supabase SQL Editor.",
        });
      }
    }

    if (existingEmp) {
      console.log(`✅ [Existing Employee Logged In via OTP]: ${existingEmp.name} (ID: ${existingEmp.employee_id})`);
      return res.status(200).json({
        success: true,
        isNew: false,
        message: 'Login Successful',
        employee: formatEmployee(existingEmp),
      });
    }

    // New Employee -> Generate 4-digit ID and insert into Supabase
    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: 'Full Name is required for new registration',
      });
    }

    const newEmployeeId = await generateUniqueEmployeeId();
    const { data: newEmployee, error: insertErr } = await supabase
      .from('employees')
      .insert({
        employee_id: newEmployeeId,
        name: cleanName,
        mobile_number: cleanMobile,
        phone: cleanMobile,
        email: '',
        role: 'employee',
        department: 'Production',
        is_available_for_job_sheet: true,
      })
      .select()
      .single();

    if (insertErr) {
      if (insertErr.code === 'PGRST205') {
        return res.status(503).json({
          success: false,
          message: "Database tables not created yet in Supabase. Please run 'supabase_schema.sql' in your Supabase SQL Editor.",
        });
      }
      console.error('[verifyOtp Insert Employee Error]:', insertErr.message);
      return res.status(500).json({ success: false, message: insertErr.message });
    }

    console.log(`🎉 [New Employee Registered via Mobile OTP]: ID ${newEmployeeId} | Name ${cleanName} | Mobile ${cleanMobile}`);
    return res.status(201).json({
      success: true,
      isNew: true,
      message: 'Registration Successful',
      employee: formatEmployee(newEmployee),
    });
  } catch (err) {
    console.error('[verifyOtp Error]:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * 4. Setup / Update Owner Profile (4821)
 * POST /api/auth/owner-setup
 * Body: { name: "Admin Name", mobileNumber: "9876543210" }
 */
async function setupOwnerProfile(req, res) {
  try {
    const { name, mobileNumber } = req.body;
    const cleanName = (name || '').toString().trim();
    const cleanMobile = (mobileNumber || '').toString().replace(/[^0-9]/g, '').slice(-10);

    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (cleanMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number is required' });
    }

    const { data: updatedOwner, error } = await supabase
      .from('employees')
      .update({
        name: cleanName,
        mobile_number: cleanMobile,
        phone: cleanMobile,
        updated_at: new Date().toISOString(),
      })
      .eq('employee_id', '4821')
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Owner profile updated successfully',
      employee: formatEmployee(updatedOwner),
    });
  } catch (err) {
    console.error('[setupOwnerProfile Error]:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}


/**
 * 6. Register New Employee & Generate 4-Digit ID
 * POST /api/auth/register
 * Body: { name: "Ramesh Kumar", mobileNumber: "9876543210" }
 */
async function register(req, res) {
  try {
    const { name, mobileNumber, email, password } = req.body;
    const cleanName = (name || '').toString().trim();
    const cleanMobile = (mobileNumber || '').toString().replace(/[^0-9]/g, '').slice(-10);
    const cleanEmail = (email || '').toString().trim().toLowerCase();
    const cleanPassword = (password || '').toString().trim();

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot be empty',
      });
    }

    if (cleanMobile && cleanMobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number must be 10 digits',
      });
    }

    // Check existing by mobile or email
    let existing = null;
    if (cleanMobile) {
      const { data } = await supabase
        .from('employees')
        .select('*')
        .or(`mobile_number.eq.${cleanMobile},phone.eq.${cleanMobile}`)
        .maybeSingle();
      existing = data;
    } else if (cleanEmail) {
      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();
      existing = data;
    }

    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Account already exists',
        employee: formatEmployee(existing),
      });
    }

    // Generate unique 4-digit ID and persist in Supabase
    const newEmployeeId = await generateUniqueEmployeeId();
    const { data: newEmployee, error } = await supabase
      .from('employees')
      .insert({
        employee_id: newEmployeeId,
        name: cleanName,
        mobile_number: cleanMobile,
        phone: cleanMobile,
        email: cleanEmail,
        password: cleanPassword,
        role: 'employee',
        department: 'Production',
        is_available_for_job_sheet: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase Register Error]:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }

    console.log(`🎉 New employee registered in Supabase: ID ${newEmployeeId} | Name ${cleanName} | Mobile ${cleanMobile}`);

    return res.status(201).json({
      success: true,
      message: 'Registration Successful',
      employee: formatEmployee(newEmployee),
    });
  } catch (err) {
    console.error('[register]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  loginByEmployeeId,
  sendOtp,
  verifyOtp,
  setupOwnerProfile,
  register,
};
