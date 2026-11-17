# Interview Schedule — Real-Time Placement & Interview Management Platform

A production-grade, real-time interview scheduling and live queue management platform designed for university placement cells and recruitment drives.

## 1. Architecture Overview
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript (strict), Tailwind CSS, Lucide Icons, `@dnd-kit` for drag-and-drop queue reordering, and `xlsx` (SheetJS) for client/server `.xls`, `.xlsx`, and `.csv` parsing.
- **Core Scheduling Engine (`src/lib/scheduling/engine.ts`)**: Pure, deterministic, timezone-aware ETA propagation engine. Separates original assigned slots from live predicted start/end times, handles early finishes, overruns, custom durations, absent/skipped candidates, multi-session isolation (e.g., 9:00 AM vs 2:00 PM), multi-panel queues, and pause/resume states.
- **Database & Realtime (`supabase/migrations/001_initial_schema.sql`)**: PostgreSQL schema with Row Level Security (RLS), atomic PostgreSQL RPC functions (`start_candidate_interview`, `complete_candidate_interview`, `reorder_panel_queue`) with row-level locking (`FOR UPDATE`) to prevent race conditions, hashed student PINs (`bcryptjs`), audit logs, and Supabase Realtime subscriptions.
- **Dual-Mode Execution**: Works out-of-the-box in **Interactive Local Sandbox Mode** (`NEXT_PUBLIC_DEMO_MODE=true`) so you can test the full Admin Command Centre, Conzura-style Excel Import Wizard, and Student Mobile Portal immediately without configuring cloud credentials, and seamlessly switches to **Supabase Production Mode** once `.env.local` is populated.

## 2. Quick Start (Local Development)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env.local
   ```

3. **Run unit tests (Scheduling Engine & Excel Parser)**:
   ```bash
   npm test
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to access:
   - **Admin Command Centre** (`/admin`)
   - **Excel/CSV Import Wizard** (`/admin/import`)
   - **Student Mobile Portal** (`/student`)

## 3. Supabase Production Setup
1. Create a new project on [Supabase](https://supabase.com).
2. Run the SQL migration in `supabase/migrations/001_initial_schema.sql` via the Supabase SQL Editor.
3. Enable Realtime on the `events`, `sessions`, `interview_panels`, `candidates`, and `interview_records` tables.
4. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `STUDENT_SESSION_SECRET` in `.env.local` and set `NEXT_PUBLIC_DEMO_MODE=false`.
5. Deploy to **Vercel** by importing the repository and adding the same environment variables.
