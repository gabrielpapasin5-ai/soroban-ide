import http from 'k6/http';
import { sleep, check } from 'k6';

// ─── Configuration ───────────────────────────────────────────────
// Set these to your deployed URLs
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = __ENV.BACKEND_URL || 'http://localhost:8080';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Step 1: Ramp up to 20 users
    { duration: '1m', target: 55 },  // Step 2: Ramp up to 55 users
    { duration: '2m', target: 55 },  // Step 3: Stay at 55 users
    { duration: '30s', target: 0 },  // Step 4: Ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'], // Error rate should be less than 5%
    http_req_duration: ['p(95)<5000'], // 95% of requests should be below 5s (Backend builds can be slow)
  },
};

// ─── Sample Contract Payload ───────────────────────────────────
const payload = JSON.stringify({
  command: "stellar contract build",
  files: {
    "Cargo.toml": `[package]\nname = "hello-world"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib"]\n\n[dependencies]\nsoroban-sdk = "20.0.0"`,
    "src/lib.rs": `#![no_std]\nuse soroban_sdk::{contract, contractimpl, symbol_short, Symbol};\n\n#[contract]\npub struct HelloContract;\n\n#[contractimpl]\nimpl HelloContract {\n    pub fn hello(n: Symbol) -> Symbol {\n        n\n    }\n}`
  }
});

const params = {
  headers: {
    'Content-Type': 'application/json',
  },
};

export default function () {
  // 1. Test Frontend Access (GET)
  let frontendRes = http.get(FRONTEND_URL);
  check(frontendRes, {
    'frontend status is 200': (r) => r.status === 200,
  });

  // Small delay to simulate user thinking time
  sleep(1);

  // 2. Test Compilation API (POST)
  // Note: We randomise slightly to simulate different users
  let backendRes = http.post(`${BACKEND_URL}/run`, payload, params);
  
  check(backendRes, {
    'compile request accepted': (r) => r.status === 202 || r.status === 200,
  });

  // If compilation was accepted, it means it's in the queue
  // In a real scenario, the user would be waiting for WebSocket output.
  
  sleep(2);
}
