# TrustGate

TrustGate is a polished demo dashboard for a cross-company AI agent trust workflow. It presents a secure, dark cybersecurity-style SaaS interface for managing buyer/vendor exchanges, policy enforcement, audit visibility, and trust receipts.

## Live demo

Try the deployed TrustGate dashboard: [trust-gate-ten.vercel.app](https://trust-gate-ten.vercel.app/).

## Stack

- React + Vite + TypeScript + Tailwind CSS
- Python FastAPI backend
- ArmorIQ Python SDK (`armoriq-sdk==0.6.10`)
- SQLite local demo history
- Synthetic buyer, vendor, and inventory data only
- Dashboard tool calls are routed through ArmorIQ's SDK proxy
- A standalone FastMCP Streamable HTTP server is available in [`trustgate-mcp/`](./trustgate-mcp/README.md)

## Local setup

1. Install the frontend dependencies:
   ```bash
   npm install
   ```

2. Install the backend dependencies:
   ```bash
   python -m pip install -r requirements.txt
   ```

3. Start the FastAPI backend:
   ```bash
   python backend/app.py
   ```

   Copy `.env.example` to `.env` and add your own `ARMORIQ_API_KEY`, or use credentials saved by `armoriq login`. `.env` is ignored by Git.

4. In a second terminal, start the frontend:
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173

To check the live ArmorIQ allow/block behavior directly:

```bash
python backend/test_armoriq_calls.py
```

## Demo flow

- Buyer requests a vendor quote and reads synthetic inventory using ArmorIQ `invoke()`.
- Buyer creates a draft purchase order using ArmorIQ `invoke()`.
- The attack endpoint fetches a poisoned synthetic vendor quote and attempts `submit_order` through `invoke()`.
- Each call captures a plan and gets an intent token before invoking the registered MCP.
- Successful tool responses and ArmorIQ policy exceptions are stored in SQLite; prior mock seed data is excluded from live audit views.

## How we use ArmorIQ

The FastAPI backend uses `armoriq-sdk==0.6.10` and the documented SDK sequence:

1. `ArmorIQClient()` loads the `ARMORIQ_API_KEY` environment variable or the SDK's saved local credentials.
2. `capture_plan(llm=..., prompt=..., plan=...)` records the specific planned tool/action/params.
3. `get_intent_token(plan_capture, validity_seconds=300)` requests a signed intent token.
4. `invoke(mcp="trustgate-mcp", action=..., intent_token=..., params=...)` routes each MCP call through ArmorIQ.

The configured ArmorIQ policy reported for this demo allows `get_quote`, `read_inventory`, and `create_draft_po`, and blocks `submit_order`. The backend labels its calls `BuyerAgent`, `ResearchAgent`, and `OrderAgent`; those labels are demo caller roles, while the active ArmorIQ server policy is the enforcement authority. The UI displays actual SDK results, policy-block reasons, token IDs, trace IDs when returned, and raw invocation results. It does not convert connectivity or SDK errors into denials.

The installed SDK exposes `delegate()`, but its live call returned HTTP 400 with `{"message":"parentToken is required","error":"Bad Request","statusCode":400}`. The demo therefore does not claim delegated agent tokens; it relies on the already-active ArmorIQ MCP policy for tool allow/block enforcement.

The attack endpoint obtains the poisoned-vendor quote through ArmorIQ, recognizes the untrusted instruction in its returned fixture text, then represents the ResearchAgent's attempted `submit_order` with a separate plan/token/invoke. This is a deterministic demo harness, not a live LLM agent. The MCP `submit_order` tool only logs and returns synthetic local data if it unexpectedly executes; no external order is placed.

No local mock enforcement fallback is enabled. If ArmorIQ is unavailable, its error is surfaced to the caller. For local use, export `ARMORIQ_API_KEY` or configure credentials using the ArmorIQ CLI. On a deployed backend host, set `ARMORIQ_API_KEY` in the host's secret environment settings. Never commit an API key or ArmorIQ credentials file.

See [`trustgate-mcp/README.md`](./trustgate-mcp/README.md) for local and Render MCP setup.

## Production note

- No real payments, credentials, or external business systems are used.
- All data is synthetic and local only.
- Backend credentials are not committed to the repository.

## Deploy frontend and backend

The frontend belongs to the repository root; the API is a separate Render service.

### Render API

1. In Render, create a **Blueprint** from this GitHub repository and accept the `trustgate-api` web service defined in [`render.yaml`](./render.yaml). It pins the service to Python 3.13.4, which is supported by `armoriq-sdk==0.6.10`. Alternatively create a Python web service manually with root directory `.`, Python version `3.13.4`, build command `pip install -r requirements.txt`, start command `uvicorn backend.app:app --host 0.0.0.0 --port $PORT`, and health path `/api/health`.
2. In the API service's Environment settings, set `ARMORIQ_API_KEY` to your secret and `FRONTEND_URL` to the Vercel site origin (for example `https://your-project.vercel.app`). Do not add the key to GitHub, Vercel, or frontend `VITE_` variables.
3. Deploy and confirm `https://<render-api-host>/api/health` reports `status: ok`.

### Vercel frontend

1. Import this repository into Vercel and keep **Root Directory** set to `.` (repository root).
2. Use build command `npm run build` and output directory `dist` (also present in [`vercel.json`](./vercel.json)).
3. Add `VITE_API_BASE_URL` with the Render API base URL, such as `https://trustgate-api.onrender.com`, then deploy or redeploy.
4. Copy the resulting Vercel origin into Render's `FRONTEND_URL` if it changed, and redeploy the API if needed.

The existing MCP remains its own Render service under [`trustgate-mcp/`](./trustgate-mcp/README.md). The API's SQLite database is local demo history and may reset when a free service restarts or redeploys.
