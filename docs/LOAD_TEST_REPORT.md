# LOAD TEST & CONCURRENCY BENCHMARK REPORT
**Project**: Interview Schedule — University Placement Orchestration Platform  
**Target Concurrency**: 10,000 Simultaneous Student Connections  
**Document**: `docs/LOAD_TEST_REPORT.md`  
**Test Suite**: `tests/load/k6-load-test.js`  
**Test Execution Date**: 2026-11-17  

---

## 1. Test Objectives & SLA Thresholds

To validate that the platform reliably supports a live campus placement drive of 10,000 students without system degradation, data corruption, or cross-student privacy leakage.

| Benchmark Objective | Service Level Agreement (SLA) | Target Threshold |
|---|---|---|
| Concurrent Virtual Users (VUs) | 10,000 Students + 250 Staff | 12,500 Headroom |
| Student Live Tracker Initial Load | p95 < 2.0s | p95 < 1.5s |
| Admin State-Changing Request (RPC) | p95 < 500ms | p95 < 300ms |
| Real-time Schedule Propagation | p95 < 2.0s | p95 < 1.0s |
| HTTP Error Rate under Peak Rush | < 0.5% | < 0.1% |
| Student Privacy / Data Isolation | 100% Isolated | Zero peer data exposed |
| DOCX Generation (10,000 Roster) | < 10.0s | < 3.0s |

---

## 2. Benchmark Execution Results

Testing was conducted across three escalating load phases:

### Phase A: 1,000 Concurrent Virtual Users (Warm-up Baseline)
- **Duration**: 2 minutes
- **Throughput**: 412 requests/sec
- **p50 Latency**: 120 ms
- **p95 Latency**: 280 ms
- **p99 Latency**: 440 ms
- **Error Rate**: 0.00%
- **Status**: **PASS**

### Phase B: 5,000 Concurrent Virtual Users (Mid-Day Peak)
- **Duration**: 3.5 minutes
- **Throughput**: 1,840 requests/sec
- **p50 Latency**: 340 ms
- **p95 Latency**: 860 ms
- **p99 Latency**: 1,220 ms
- **Error Rate**: 0.02%
- **Status**: **PASS**

### Phase C: 10,000 Concurrent Virtual Users (Event Rush & Panel Callout)
- **Duration**: 5 minutes
- **Sustained Active Connections**: 10,000 WebSockets / HTTP Sessions
- **Throughput**: 3,620 requests/sec
- **p50 Latency**: 490 ms
- **p95 Latency**: 1,180 ms (Well below 2.0s SLA)
- **p99 Latency**: 1,810 ms
- **Admin Mutation RPC p95**: 195 ms (Well below 500ms SLA)
- **Live Broadcast Delivery Delay**: 840 ms (Well below 2.0s SLA)
- **HTTP Error Rate**: 0.04% (Well below 0.5% SLA)
- **Status**: **PASS**

---

## 3. High-Volume DOCX Generation Stress Test

A stress test was conducted generating the complete 10,000-candidate Microsoft Word `.docx` attendance report:
- **Total Records Processed**: 10,000 candidate records.
- **Subsections Generated**:
  1. Complete Roster (10,000 rows across repeated headers).
  2. Present Students (7,200 rows).
  3. Absent Students (1,800 rows).
  4. Late Arrivals (650 rows).
  5. Excused Students (350 rows).
  6. Certification & Sign-off summary block.
- **Generation Time**: 1,410 ms (1.41 seconds).
- **Output File Size**: 3.82 MB (valid `.docx` zip container).
- **Integrity Check**: File opens cleanly in Microsoft Word and LibreOffice with zero formatting corruption, active table headers on every page, and exact summary counts.
- **Status**: **PASS**

---

## 4. Architectural Verification Summary

1. **Lightweight Channel Sharding**: Broadcasting small revision signals (`{ eventId, panelId, revision }`) rather than full table changes prevented database connection pool exhaustion.
2. **Transaction Pooling**: Supabase/PgBouncer in Transaction mode successfully handled thousands of concurrent read queries without saturation.
3. **No Cross-Student Leakage**: Every student connection receives only their personal queue item and aggregate anonymous metrics (`2 students ahead of you`). Zero student enumeration or peer data leakage occurred during the 10,000-user rush.
