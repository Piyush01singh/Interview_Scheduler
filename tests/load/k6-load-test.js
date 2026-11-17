import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics for University Placement Drive SLAs
const studentDashboardLatency = new Trend('student_dashboard_latency_ms');
const adminMutationLatency = new Trend('admin_mutation_latency_ms');
const errorRate = new Rate('http_error_rate');
const activeStudentSessions = new Counter('active_student_sessions');

export const options = {
  scenarios: {
    // Scenario 1: 1,000 Concurrent Students Baseline
    warmup_1k: {
      executor: 'ramping-vus',
      startVUs: 100,
      stages: [
        { duration: '30s', target: 1000 },
        { duration: '1m', target: 1000 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
    // Scenario 2: 5,000 Mid-Peak Concurrent Students
    peak_5k: {
      executor: 'ramping-vus',
      startTime: '2m10s',
      stages: [
        { duration: '45s', target: 5000 },
        { duration: '2m', target: 5000 },
        { duration: '45s', target: 0 },
      ],
      gracefulRampDown: '15s',
    },
    // Scenario 3: 10,000 Target Concurrency Event Rush
    target_10k: {
      executor: 'ramping-vus',
      startTime: '5m50s',
      stages: [
        { duration: '1m', target: 10000 },
        { duration: '3m', target: 10000 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // p95 under 2.0s
    'student_dashboard_latency_ms': ['p(95)<1500', 'p(99)<2500'],
    'admin_mutation_latency_ms': ['p(95)<500', 'p(99)<800'],
    'http_error_rate': ['rate<0.005'], // < 0.5% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function runLoadTest() {
  const isStudent = Math.random() > 0.05; // 95% students, 5% placement administrators

  if (isStudent) {
    // 1. Student Visits Landing & Logs In with Registration Number
    const regNum = `1220${1000 + Math.floor(Math.random() * 9000)}`;
    const studentLoginStart = Date.now();

    const studentRes = http.get(`${BASE_URL}/student?reg=${regNum}`);
    const studentDuration = Date.now() - studentLoginStart;

    studentDashboardLatency.add(studentDuration);
    activeStudentSessions.add(1);

    const checkSuccess = check(studentRes, {
      'student status 200': (r) => r.status === 200,
      'has station board': (r) => r.body && r.body.includes('Live Placement Tracker'),
    });

    errorRate.add(!checkSuccess);

    // Simulate student watching live ETA for 10-25 seconds with background polling
    sleep(Math.random() * 15 + 10);
  } else {
    // Admin Command Centre User: Mutation & Status Checks
    const adminStart = Date.now();
    const adminRes = http.get(`${BASE_URL}/admin`);
    const adminDuration = Date.now() - adminStart;

    adminMutationLatency.add(adminDuration);

    const checkAdmin = check(adminRes, {
      'admin status 200': (r) => r.status === 200,
      'has command console': (r) => r.body && r.body.includes('Placement Live Command Console'),
    });

    errorRate.add(!checkAdmin);

    sleep(3);
  }
}
