# SCALABILITY & REAL-TIME ARCHITECTURE PLAN
**Platform**: University Interview Scheduling Platform  
**Target Concurrency**: 10,000 Simultaneous Connected Students + Administrative Staff  
**Headroom Target**: 12,500 – 15,000 Connections  
**Document**: `docs/SCALABILITY_PLAN.md`  

---

## 1. System Bottleneck Analysis at 10,000 Concurrent Users

During a university campus placement drive, up to 10,000 students may log in, open their live tracker, and stay connected simultaneously. 

### Why Naive Architectures Fail at 10k Users
1. **Direct Database Listeners (Postgres Change Data Capture)**: If 10,000 clients subscribe directly to `postgres_changes` on the `candidates` table, every single candidate status change or queue shift causes PostgreSQL to evaluate WAL logs and serialize 10,000 websocket messages. Database CPU spikes to 100% within seconds.
2. **Mass Refresh on Notification**: If 10,000 clients query the database whenever an interview finishes, the database faces a 10,000-request thundering herd, exhausting connection pools.
3. **Broadcasting Full Rosters**: Sending the full 10,000-student roster over websockets consumes hundreds of megabytes of bandwidth per broadcast and breaches student privacy.

---

## 2. High-Throughput Real-Time Architecture

```
                  ┌────────────────────────────────────────────────────────┐
                  │              Admin Command Centre                      │
                  └──────────────────────────┬─────────────────────────────┘
                                             │ Mutations via RPC
                                             ▼
                  ┌────────────────────────────────────────────────────────┐
                  │         Supabase / PostgreSQL Authority                │
                  │   - Atomic Transactions (FOR UPDATE)                   │
                  │   - Deterministic Schedule Calculation Engine          │
                  │   - Revision Counter Increment (schedule_revision++)   │
                  └──────────────────────────┬─────────────────────────────┘
                                             │ Broadcast (Payload < 200 bytes)
                                             ▼
                  ┌────────────────────────────────────────────────────────┐
                  │            Supabase Realtime Broadcast Mesh            │
                  │          Channel: `event:{eventId}:panel:{panelId}`    │
                  │          Payload: { revision, panelId, timestamp }     │
                  └─────────────┬────────────────────────────┬─────────────┘
                                │                            │
                 Scoped to      │              Scoped to     │
                 Panel 1 Cohort │              Panel 2 Cohort│
                                ▼                            ▼
                  ┌──────────────────────────┐ ┌──────────────────────────┐
                  │ Students on Panel 1 (1k) │ │ Students on Panel 2 (1k) │
                  │  (Only fetch own snapshot│ │  (Only fetch own snapshot│
                  │   when panel revision    │ │   when panel revision    │
                  │   changes)               │ │   changes)               │
                  └──────────────────────────┘ └──────────────────────────┘
```

### Key Architectural Pillars:
1. **Sharded Realtime Channels**: Instead of one event-wide firehose, broadcast channels are sharded by `(event_id, session_id, panel_id)`. Only students assigned to Panel 1 receive Panel 1 updates.
2. **Lightweight Revision Signals**: Broadcast payloads do NOT contain candidate records. They contain a tiny signal:
   ```json
   {
     "event": "SCHEDULE_UPDATED",
     "panel_id": "panel-1",
     "revision": 42,
     "timestamp": "2026-11-17T13:45:00Z"
   }
   ```
3. **Personalized Snapshot Retrieval**: When a student receives a revision bump for their panel, they execute a single lightweight RPC `get_student_schedule_snapshot(candidate_id)` or read from their local client cache if revision matches.
4. **Student Privacy Protection**: Students never subscribe to peers' candidate records. Student-specific notifications ("You are called to Panel 2") are dispatched to private student channels: `student:{candidate_id}`.
5. **Reconnection & Stale Data Recovery**: Clients track `last_seen_revision`. If a mobile device reconnects after signal drop, it queries the current revision; if higher, it fetches a fresh snapshot.

---

## 3. Database Performance & Query Optimization

### 3.1 Composite Indexes
To ensure sub-10ms queries across 10,000+ candidates:
```sql
-- Fast queue slicing per session and panel
CREATE INDEX idx_candidates_panel_queue 
  ON candidates(panel_id, session_id, queue_position)
  INCLUDE (id, student_name, registration_number, interview_status, attendance_status);

-- Student credential lookup during login burst
CREATE INDEX idx_candidate_access_lookup 
  ON candidate_access(event_id, registration_number);

-- Attendance operator filtering
CREATE INDEX idx_candidates_attendance_filter 
  ON candidates(event_id, attendance_status, session_id);
```

### 3.2 Connection Pooling & Resource Limits
- **PgBouncer / Supabase Transaction Pooler**: Set to **Transaction Mode** on port 6543.
- Max database connections allocated: 60 pooler connections serving thousands of serverless requests.
- Queries structured as single-roundtrip statements with zero open-ended client transactions.

---

## 4. Capacity Specifications & Targets

| Metric | Target for 10k Students | Headroom Target (12.5k) | SLA / Threshold |
|---|---|---|---|
| Concurrent WebSocket Connections | 10,000 | 15,000 | Zero connection dropouts |
| Student Dashboard Load (p95) | < 1.2s | < 1.8s | < 2.0s |
| Admin Mutation RPC Latency (p95) | < 250ms | < 450ms | < 500ms |
| Schedule Fan-out Propagation (p95) | < 1.0s | < 1.5s | < 2.0s |
| Error Rate under Peak Load | < 0.05% | < 0.1% | < 0.5% |

---

## 5. Load Testing Plan (k6)
We implement comprehensive k6 test scripts in `tests/load/`:
1. `student-login-burst.js`: 1,000 to 10,000 virtual users logging in within 60 seconds.
2. `student-realtime-hold.js`: 10,000 virtual users maintaining active websocket subscriptions.
3. `admin-queue-mutation.js`: Admins continuously completing interviews, triggering schedule recalculations.
4. `report-generation-load.js`: Generating 10,000-candidate DOCX documents under concurrent load.
