-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE event_status_enum AS ENUM ('draft', 'published', 'paused', 'completed');
CREATE TYPE session_status_enum AS ENUM ('scheduled', 'active', 'paused', 'completed');
CREATE TYPE panel_status_enum AS ENUM ('idle', 'active', 'paused', 'offline');
CREATE TYPE interview_status_enum AS ENUM (
  'waiting',
  'present',
  'late',
  'in_progress',
  'completed',
  'absent',
  'skipped'
);
CREATE TYPE admin_role_enum AS ENUM ('owner', 'panel_staff');

-- Admin Profiles (linked to auth.users)
CREATE TABLE admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role admin_role_enum NOT NULL DEFAULT 'panel_staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  interview_date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  event_status event_status_enum NOT NULL DEFAULT 'draft',
  default_duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (default_duration_minutes > 0),
  schedule_revision BIGINT NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions (e.g., 9:00 AM Cohort, 2:00 PM Cohort)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  session_start_at TIMESTAMPTZ NOT NULL,
  default_interview_duration INTEGER NOT NULL DEFAULT 30 CHECK (default_interview_duration > 0),
  session_status session_status_enum NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Interview Panels
CREATE TABLE interview_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  panel_name TEXT NOT NULL,
  room_name TEXT,
  interviewer_name TEXT,
  assigned_staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  panel_status panel_status_enum NOT NULL DEFAULT 'idle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Candidates
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  panel_id UUID NOT NULL REFERENCES interview_panels(id) ON DELETE RESTRICT,
  registration_number TEXT NOT NULL,
  student_name TEXT NOT NULL,
  program_name TEXT,
  profile TEXT,
  original_sequence INTEGER NOT NULL,
  queue_position INTEGER NOT NULL,
  priority_level INTEGER NOT NULL DEFAULT 0,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (estimated_duration_minutes > 0),
  interview_status interview_status_enum NOT NULL DEFAULT 'waiting',
  original_slot_start_at TIMESTAMPTZ,
  original_slot_end_at TIMESTAMPTZ,
  expected_start_at TIMESTAMPTZ,
  expected_end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_reg_per_event UNIQUE (event_id, registration_number)
);

-- Candidate Access (Hashed PINs only; never readable from browser)
CREATE TABLE candidate_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL UNIQUE REFERENCES candidates(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_number TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_access_reg_per_event UNIQUE (event_id, registration_number)
);

-- Interview Records
CREATE TABLE interview_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  panel_id UUID NOT NULL REFERENCES interview_panels(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  planned_duration_minutes INTEGER NOT NULL,
  actual_duration_minutes INTEGER,
  expected_end_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_label TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for high-throughput queries
CREATE INDEX idx_sessions_event_id ON sessions(event_id);
CREATE INDEX idx_panels_event_id ON interview_panels(event_id);
CREATE INDEX idx_candidates_event_session_panel ON candidates(event_id, session_id, panel_id, queue_position);
CREATE INDEX idx_candidates_reg_number ON candidates(registration_number);
CREATE INDEX idx_interview_records_candidate ON interview_records(candidate_id);
CREATE INDEX idx_audit_logs_event_created ON audit_logs(event_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION is_admin_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_any_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_profiles WHERE id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS Policies
CREATE POLICY "Admins can view profiles" ON admin_profiles
  FOR SELECT USING (is_any_admin());

CREATE POLICY "Admins can view events" ON events
  FOR SELECT USING (is_any_admin());

CREATE POLICY "Owners can manage events" ON events
  FOR ALL USING (is_admin_owner());

CREATE POLICY "Admins can view sessions" ON sessions
  FOR SELECT USING (is_any_admin());

CREATE POLICY "Owners can manage sessions" ON sessions
  FOR ALL USING (is_admin_owner());

CREATE POLICY "Admins can view panels" ON interview_panels
  FOR SELECT USING (is_any_admin());

CREATE POLICY "Owners or assigned staff can update panels" ON interview_panels
  FOR UPDATE USING (is_admin_owner() OR assigned_staff_id = auth.uid());

CREATE POLICY "Owners can insert/delete panels" ON interview_panels
  FOR ALL USING (is_admin_owner());

CREATE POLICY "Admins can view candidates" ON candidates
  FOR SELECT USING (is_any_admin());

CREATE POLICY "Owners or panel staff can update assigned candidates" ON candidates
  FOR UPDATE USING (
    is_admin_owner() OR EXISTS (
      SELECT 1 FROM interview_panels p
      WHERE p.id = candidates.panel_id AND p.assigned_staff_id = auth.uid()
    )
  );

CREATE POLICY "Owners can insert/delete candidates" ON candidates
  FOR ALL USING (is_admin_owner());

-- Candidate access has NO public/client policies; only service_role via server routes
CREATE POLICY "No direct client access to candidate_access" ON candidate_access
  FOR ALL USING (FALSE);

CREATE POLICY "Admins can view interview records" ON interview_records
  FOR SELECT USING (is_any_admin());

CREATE POLICY "Admins can insert/update interview records" ON interview_records
  FOR ALL USING (is_any_admin());

CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (is_any_admin());

CREATE POLICY "Admins can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (is_any_admin());

-- Atomic RPC: Start Candidate Interview (prevents concurrent double-start)
CREATE OR REPLACE FUNCTION start_candidate_interview(
  p_candidate_id UUID,
  p_actor_id UUID,
  p_actor_label TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_candidate candidates%ROWTYPE;
  v_active_count INTEGER;
  v_now TIMESTAMPTZ := NOW();
  v_expected_end TIMESTAMPTZ;
  v_record_id UUID;
BEGIN
  SELECT * INTO v_candidate FROM candidates WHERE id = p_candidate_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;

  IF v_candidate.interview_status NOT IN ('waiting', 'present', 'late') THEN
    RAISE EXCEPTION 'Candidate cannot be started from status %', v_candidate.interview_status;
  END IF;

  SELECT COUNT(*) INTO v_active_count
  FROM candidates
  WHERE panel_id = v_candidate.panel_id
    AND session_id = v_candidate.session_id
    AND interview_status = 'in_progress';

  IF v_active_count > 0 THEN
    RAISE EXCEPTION 'Another interview is already in progress on this panel';
  END IF;

  v_expected_end := v_now + (v_candidate.estimated_duration_minutes || ' minutes')::INTERVAL;

  UPDATE candidates
  SET interview_status = 'in_progress',
      expected_start_at = v_now,
      expected_end_at = v_expected_end,
      updated_at = v_now
  WHERE id = p_candidate_id;

  INSERT INTO interview_records (
    candidate_id, panel_id, started_at, planned_duration_minutes, expected_end_at
  ) VALUES (
    p_candidate_id, v_candidate.panel_id, v_now, v_candidate.estimated_duration_minutes, v_expected_end
  ) RETURNING id INTO v_record_id;

  UPDATE events
  SET schedule_revision = schedule_revision + 1, updated_at = v_now
  WHERE id = v_candidate.event_id;

  INSERT INTO audit_logs (event_id, actor_id, actor_label, action, target_type, target_id, metadata)
  VALUES (
    v_candidate.event_id,
    p_actor_id,
    p_actor_label,
    'interview_started',
    'candidate',
    p_candidate_id,
    jsonb_build_object('record_id', v_record_id, 'expected_end_at', v_expected_end)
  );

  RETURN jsonb_build_object('record_id', v_record_id, 'started_at', v_now, 'expected_end_at', v_expected_end);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic RPC: Complete Candidate Interview
CREATE OR REPLACE FUNCTION complete_candidate_interview(
  p_candidate_id UUID,
  p_actor_id UUID,
  p_actor_label TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_candidate candidates%ROWTYPE;
  v_record interview_records%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_actual_mins INTEGER;
BEGIN
  SELECT * INTO v_candidate FROM candidates WHERE id = p_candidate_id FOR UPDATE;
  IF NOT FOUND OR v_candidate.interview_status <> 'in_progress' THEN
    RAISE EXCEPTION 'Candidate is not currently in progress';
  END IF;

  SELECT * INTO v_record
  FROM interview_records
  WHERE candidate_id = p_candidate_id AND completed_at IS NULL
  ORDER BY started_at DESC LIMIT 1
  FOR UPDATE;

  v_actual_mins := GREATEST(1, ROUND(EXTRACT(EPOCH FROM (v_now - v_record.started_at)) / 60.0)::INTEGER);

  UPDATE interview_records
  SET completed_at = v_now,
      actual_duration_minutes = v_actual_mins,
      notes = COALESCE(p_notes, notes)
  WHERE id = v_record.id;

  UPDATE candidates
  SET interview_status = 'completed',
      expected_end_at = v_now,
      updated_at = v_now
  WHERE id = p_candidate_id;

  UPDATE events
  SET schedule_revision = schedule_revision + 1, updated_at = v_now
  WHERE id = v_candidate.event_id;

  INSERT INTO audit_logs (event_id, actor_id, actor_label, action, target_type, target_id, metadata)
  VALUES (
    v_candidate.event_id,
    p_actor_id,
    p_actor_label,
    'interview_completed',
    'candidate',
    p_candidate_id,
    jsonb_build_object('actual_duration_minutes', v_actual_mins)
  );

  RETURN jsonb_build_object('completed_at', v_now, 'actual_duration_minutes', v_actual_mins);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
