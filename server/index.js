require('dotenv').config();
const express = require('express');
const cors = require('cors');
const supabase = require('./supabase');
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const jobSheetRoutes = require('./routes/jobSheetRoutes');
const taskRoutes = require('./routes/taskRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 5001;
const SUPABASE_URL = process.env.SUPABASE_URL || '';

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Seed default Owner account (4821) if not already present
async function seedDefaultAccounts() {
  try {
    const ownerAccount = {
      employee_id: '4821',
      name: 'John Doe',
      role: 'owner',
      department: 'Management',
      email: 'owner@jobsheetflow.com',
      is_active: true,
    };

    const { data: existing, error: findError } = await supabase
      .from('employees')
      .select('id, employee_id')
      .eq('employee_id', ownerAccount.employee_id)
      .maybeSingle();

    if (!findError && !existing) {
      const { error: insertError } = await supabase.from('employees').insert(ownerAccount);
      if (!insertError) {
        console.log(`Seeded Owner account: ID ${ownerAccount.employee_id} - ${ownerAccount.name} (${ownerAccount.role})`);
      } else {
        console.warn(' Seeding note:', insertError.message);
      }
    } else if (existing) {
      console.log(`Default Owner account ID ${ownerAccount.employee_id} already exists.`);
    }
  } catch (err) {
    console.error('Error verifying/seeding default owner account:', err.message);
  }
}

// Connect to Supabase
async function initSupabase() {
  try {
    console.log(`⚡ Initializing Supabase at ${SUPABASE_URL}`);
    const { data, error } = await supabase.from('employees').select('count', { count: 'exact', head: true });
    if (error) {
      if (error.code === '42P01') {
        console.log(`Supabase tables not yet created. Run 'supabase_schema.sql' in your Supabase SQL Editor.`);
      } else {
        console.log(`Supabase status check: ${error.message}`);
      }
    } else {
      console.log(`🌿 Connected to Supabase PostgreSQL database successfully!`);
    }
    await seedDefaultAccounts();
  } catch (err) {
    console.error(' Supabase initialization error:', err.message);
  }
}

initSupabase();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/jobsheets', jobSheetRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/notifications', notificationRoutes);

// Health & Root Status Check
app.get('/', (req, res) => {
  res.json({
    service: 'JobSheetFlow Employee Management API',
    status: 'Running',
    database: 'Supabase (PostgreSQL)',
    supabaseUrl: SUPABASE_URL,
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'supabase',
    supabaseUrl: SUPABASE_URL,
    timestamp: new Date().toISOString(),
  });
});

// 404 Route Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} does not exist`,
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server – bind to 0.0.0.0 so cloud platforms (Render, etc.) can route traffic
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 JobSheetFlow Server running on port ${PORT}`);
});
