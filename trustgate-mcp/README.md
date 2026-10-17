# TrustGate MCP server

Small FastMCP service exposing synthetic procurement tools over the MCP Streamable HTTP transport. The MCP endpoint is `/mcp`; the health endpoint is `/health`.

## Local run

From the repository root:

```powershell
python -m venv .venv-mcp
.\.venv-mcp\Scripts\Activate.ps1
python -m pip install -r trustgate-mcp\requirements.txt
$env:PORT = "8001"
python trustgate-mcp\server.py
```

Check readiness at `http://127.0.0.1:8001/health`. MCP clients should connect to `http://127.0.0.1:8001/mcp`.

On macOS/Linux, activate the environment with `source .venv-mcp/bin/activate` and run `PORT=8001 python trustgate-mcp/server.py`.

## Render deployment

1. Push this repository to GitHub.
2. In Render, choose **New + → Web Service**, connect the GitHub repository, and set **Root Directory** to `trustgate-mcp`.
3. Choose **Python** as the runtime. Set the build command to:
   ```sh
   pip install -r requirements.txt
   ```
4. Set the start command to:
   ```sh
   python server.py
   ```
5. Choose the **Free** instance plan and deploy. Render supplies `PORT`; the server binds to `0.0.0.0` and uses that value.
6. Verify `https://<your-render-service>.onrender.com/health` returns `{"status":"ok","service":"trustgate-mcp"}`. Register `https://<your-render-service>.onrender.com` as the MCP server URL in ArmorIQ; the MCP Streamable HTTP endpoint is `/mcp`.

ArmorIQ's **MCP Servers → Add Server** wizard accepts a base URL, server name, environment, port, protocol version, auth method, and capabilities. Enable **Tools**. Select HTTP/Streamable HTTP if the console asks for transport or endpoint path.

## Tools and demo safety

- `get_quote(vendor, item)` and `read_inventory(item)` return fixture data only.
- `get_quote("poisoned-vendor", "12-ALPHA")` includes an explicitly untrusted vendor note that attempts to redirect an agent to `submit_order`.
- `create_draft_po(vendor, item, qty, amount)` stores a draft in process memory; it does not submit anything.
- `submit_order(po_id)` is exposed for enforcement testing, but the demo flow must never call it. If it ever executes, it logs a `CRITICAL` safety-violation message. It does not contact an external ordering system.

Render free services may sleep when idle; the first request after a sleep can take longer. Drafts are intentionally in-memory synthetic demo data and reset when the service restarts.

## Official documentation

- [ArmorIQ: Add MCP Server](https://docs.armoriq.ai/platform/mcp-servers/add-server)
- [Model Context Protocol Python SDK](https://github.com/modelcontextprotocol/python-sdk)
