# TrustGate

TrustGate is a polished demo dashboard for a cross-company AI agent trust workflow. It presents a secure, dark cybersecurity-style SaaS interface for managing buyer/vendor exchanges, policy enforcement, audit visibility, and trust receipts.

## Stack

- React + Vite + TypeScript + Tailwind CSS
- Python FastAPI backend
- SQLite local demo history
- Synthetic buyer, vendor, and inventory data only
- The dashboard's current enforcement route is a clearly labelled local mock and is not real ArmorIQ enforcement
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

4. In a second terminal, start the frontend:
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173

## Demo flow

- Buyer requests a quote for synthetic inventory.
- Vendor returns a quote from a local tool.
- Buyer creates a draft purchase order.
- An unauthorized export action is attempted.
- The backend simulates the enforcement path, showing that the protected tool is not executed and the denial is recorded.

## ArmorIQ note

The current dashboard backend enforcement route is still a local mock; it does not call the ArmorIQ SDK and must not be presented as real ArmorIQ enforcement. The separate MCP service is a real MCP server intended to be registered in ArmorIQ and invoked through the SDK proxy once the project has configured its API key, MCP registration, and policies.

See [`trustgate-mcp/README.md`](./trustgate-mcp/README.md) for local and Render setup. Never commit an API key or ArmorIQ credentials file.

## Production note

- No real payments, credentials, or external business systems are used.
- All data is synthetic and local only.
- Backend credentials are not committed to the repository.
