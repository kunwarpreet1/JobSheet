-- ==============================================================================
-- JobSheetFlow - Supabase PostgreSQL Schema
-- ==============================================================================
-- Paste and run this script in your Supabase Dashboard -> SQL Editor
-- URL: https://hwaaugzejgtayiqtptrg.supabase.co
-- ==============================================================================

-- 1. Employees Table
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    mobile_number VARCHAR(50) DEFAULT '',
    password VARCHAR(255) DEFAULT '',
    role VARCHAR(50) DEFAULT 'employee',
    department VARCHAR(100) DEFAULT 'Production',
    is_available_for_job_sheet BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Job Sheets Table
CREATE TABLE IF NOT EXISTS public.job_sheets (
    id VARCHAR(50) PRIMARY KEY,
    date VARCHAR(100) NOT NULL,
    party VARCHAR(255) NOT NULL,
    salesman VARCHAR(255) DEFAULT 'General Sales',
    fabric VARCHAR(255) DEFAULT 'Standard Fabric',
    overall_status VARCHAR(50) DEFAULT 'In Progress',
    manager VARCHAR(255) DEFAULT 'Unassigned',
    manager_employee_id VARCHAR(50) DEFAULT '',
    qc_box JSONB DEFAULT '{}'::jsonb,
    stages JSONB DEFAULT '[]'::jsonb,
    activity_logs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) DEFAULT 'ALL',
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    job_sheet_id VARCHAR(50),
    task_id VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Devices Table (Push Notification Device Tokens)
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    device_token TEXT UNIQUE NOT NULL,
    platform VARCHAR(50) DEFAULT 'android',
    device_model VARCHAR(100) DEFAULT 'Unknown Device',
    os_version VARCHAR(100) DEFAULT 'Unknown OS',
    app_version VARCHAR(50) DEFAULT '1.0.0',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tasks Table (Lifecycle & Individual Task Tracking)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id VARCHAR(50) NOT NULL,
    job_sheet_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    assigned_to VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Not Started',
    completed_by VARCHAR(255),
    completed_at VARCHAR(100),
    deadline VARCHAR(100),
    notes TEXT DEFAULT '',
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, job_sheet_id)
);

-- 6. Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON public.employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX IF NOT EXISTS idx_job_sheets_party ON public.job_sheets(party);
CREATE INDEX IF NOT EXISTS idx_job_sheets_overall_status ON public.job_sheets(overall_status);
CREATE INDEX IF NOT EXISTS idx_job_sheets_manager ON public.job_sheets(manager);
CREATE INDEX IF NOT EXISTS idx_job_sheets_manager_emp_id ON public.job_sheets(manager_employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_token ON public.devices(device_token);

-- 7. Seed Default Owner Account (4821 - John Doe)
INSERT INTO public.employees (employee_id, name, email, role, department, is_available_for_job_sheet)
VALUES ('4821', 'John Doe', 'owner@jobsheetflow.com', 'owner', 'Management', TRUE)
ON CONFLICT (employee_id) DO NOTHING;

-- 8. Row Level Security (RLS) & Access Policies
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Allow full access for anon & service_role
DROP POLICY IF EXISTS "Allow all for employees" ON public.employees;
CREATE POLICY "Allow all for employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for job_sheets" ON public.job_sheets;
CREATE POLICY "Allow all for job_sheets" ON public.job_sheets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for notifications" ON public.notifications;
CREATE POLICY "Allow all for notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for devices" ON public.devices;
CREATE POLICY "Allow all for devices" ON public.devices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for tasks" ON public.tasks;
CREATE POLICY "Allow all for tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
