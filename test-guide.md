# Soroban Studio Stress Test Guide

This guide explains how to use the `stress-test.js` script to verify if your deployment can handle 55+ concurrent users.

## 1. Prerequisites (k6)

You need to install **k6**, an open-source load testing tool.

- **macOS**: `brew install k6`
- **Linux (Ubuntu/Debian)**: 
  ```bash
  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
  sudo apt-get update
  sudo apt-get install k6
  ```
- **Docker**: `docker pull grafana/k6`

## 2. Running the Test

Run the following command, replacing the URLs with your actual production URLs:

```bash
k6 run \
  -e FRONTEND_URL=https://your-frontend-vercel-url.com \
  -e BACKEND_URL=https://your-backend-server-url.com \
  stress-test.js
```

## 3. What this Test Does

The script performs a "Stress Test" with the following lifestyle:
1.  **Ramp up**: Slowly increases users from 0 to 20 over 30 seconds.
2.  **Climb**: Increases to 55 users over 1 minute.
3.  **Stress**: Holds at 55 concurrent users for 2 full minutes.
4.  **Ramp down**: Safely decreases users.

Each simulated user will:
-   Fetch the frontend homepage.
-   Wait 1 second.
-   Send a complete "Hello World" contract to the backend `/run` API to trigger a build.
-   Wait 2 seconds.

## 4. Analyzing Result

Look for these metrics in the console output:

-   **`http_req_failed`**: Should be **0.00%**. If this is high, your server is rejecting connections or crashing.
-   **`http_req_duration`**: Average time for the API to respond. For the `/run` API, anything under 2s is excellent.
-   **`iteration_duration`**: Total time for one user cycle.

> [!IMPORTANT]
> **Backend CPU/RAM**: Monitor your server's `htop` or `docker stats` during the test. If CPU hits 100% and stays there, you might need to increase your server specs or keep `MAX_WORKERS` low to protect stability.

> [!TIP]
> **Queue Performance**: Since `MAX_WORKERS` is set to 3, most requests in this test will be "Accepted" immediately (status 202) but will wait in the backend queue. This tests if your **Queue Management** can handle the backlog without leaking memory.
