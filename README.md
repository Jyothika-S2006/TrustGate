# TrustGate

TrustGate is a polished demo dashboard for a cross-company AI agent trust workflow. It presents a secure, dark cybersecurity-style SaaS interface for managing buyer/vendor exchanges, policy enforcement, audit visibility, and trust receipts.

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

   The SDK reads `ARMORIQ_API_KEY` from the process environment or uses credentials saved by `armoriq login`.

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
