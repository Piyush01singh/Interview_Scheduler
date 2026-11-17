-- Migration 002: Dedicated Attendance Separation, Multi-Admin Roles, and Calling Workflows

-- 1. Create Attendance Status Enum
DO $$ BEGIN
  CREATE TYPE attendance_status_enum AS ENUM (
    'not_checked_in',
    'present',
    'late',
    'absent',
    'excused'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create Expanded Admin Role Enum
DO $$ BEGIN
  CREATE TYPE admin_role_v2_enum AS ENUM (
    'owner',
    'admin',
    'panel_manager',
    'attendance_operator'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Enhance Candidates Table with Separated Attendance and Calling Fields
ALTER TABLE candidates 
  ADD COLUMN IF NOT EXISTS attendance_status attendance_status_enum NOT NULL DEFAULT 'not_checked_in',
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attendance_marked_by TEXT,
  ADD COLUMN IF NOT EXISTS attendance_correction_reason TEXT,
  ADD COLUMN IF NOT EXISTS readiness_status TEXT NOT NULL DEFAULT 'not_ready' CHECK (readiness_status IN ('not_ready', 'arrived', 'ready', 'needs_assistance')),
  ADD COLUMN IF NOT EXISTS called_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_panel_id UUID REFERENCES interview_panels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS call_count INTEGER NOT NULL DEFAULT 0;

-- 4. Create Individual Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role admin_role_v2_enum NOT NULL DEFAULT 'admin',
  assigned_panel_id UUID REFERENCES interview_panels(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Indexes for 10k Scalability
CREATE INDEX IF NOT EXISTS idx_candidates_attendance_filter 
  ON candidates(event_id, attendance_status, session_id);

CREATE INDEX IF NOT EXISTS idx_candidates_readiness 
  ON candidates(panel_id, readiness_status);

CREATE INDEX IF NOT EXISTS idx_candidates_called 
  ON candidates(called_at) WHERE called_at IS NOT NULL;

-- 6. RPC: Mark Candidate Attendance with Reason & Attribution
CREATE OR REPLACE FUNCTION mark_candidate_attendance(
  p_candidate_id UUID,
  p_status attendance_status_enum,
  p_reason TEXT,
  p_actor_id UUID,
  p_actor_label TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_cand candidates%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_check_in TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_cand FROM candidates WHERE id = p_candidate_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;

  v_check_in := v_cand.check_in_at;
  IF (p_status = 'present' OR p_status = 'late') AND v_check_in IS NULL THEN
    v_check_in := v_now;
  END IF;

  UPDATE candidates SET
    attendance_status = p_status,
    check_in_at = v_check_in,
    attendance_marked_by = p_actor_label,
    attendance_correction_reason = COALESCE(p_reason, attendance_correction_reason),
    updated_at = v_now
  WHERE id = p_candidate_id;

  -- Record in immutable audit log
  INSERT INTO audit_logs (
    event_id, actor_id, actor_label, action, target_type, target_id, metadata
  ) VALUES (
    v_cand.event_id, p_actor_id, p_actor_label, 'ATTENDANCE_MARKED', 'candidate', p_candidate_id,
    jsonb_build_object(
      'previous_status', v_cand.attendance_status,
      'new_status', p_status,
      'reason', p_reason,
      'student_name', v_cand.student_name,
      'registration_number', v_cand.registration_number
    )
  );

  RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: Call Candidate to Panel
CREATE OR REPLACE FUNCTION call_candidate_interview(
  p_candidate_id UUID,
  p_panel_id UUID,
  p_actor_id UUID,
  p_actor_label TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_cand candidates%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_cand FROM candidates WHERE id = p_candidate_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;

  UPDATE candidates SET
    called_at = v_now,
    call_panel_id = p_panel_id,
    call_count = call_count + 1,
    updated_at = v_now
  WHERE id = p_candidate_id;

  INSERT INTO audit_logs (
    event_id, actor_id, actor_label, action, target_type, target_id, metadata
  ) VALUES (
    v_cand.event_id, p_actor_id, p_actor_label, 'CANDIDATE_CALLED', 'candidate', p_candidate_id,
    jsonb_build_object(
      'panel_id', p_panel_id,
      'call_count', v_cand.call_count + 1,
      'student_name', v_cand.student_name
    )
  );

  RETURN jsonb_build_object('success', true, 'called_at', v_now);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
