from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import sqlite3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


DB_PATH = Path(__file__).resolve().parent / 'trustgate.db'


def get_db_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


class QuoteRequest(BaseModel):
    part: str = Field(default='12-ALPHA')
    quantity: int = Field(default=400)


class ActionRequest(BaseModel):
    action: str
    tool: str
    reason: str


app = FastAPI(title='TrustGate API', version='0.1.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('backend.app:app', host='127.0.0.1', port=8000, reload=False)


@app.on_event('startup')
def initialize_database() -> None:
    with get_db_connection() as connection:
        connection.execute(
            '''
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                source TEXT NOT NULL,
                action TEXT NOT NULL,
                decision TEXT NOT NULL,
                status TEXT NOT NULL,
                detail TEXT NOT NULL,
                policy TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            '''
        )
        connection.execute(
            '''
            CREATE TABLE IF NOT EXISTS receipts (
                id TEXT PRIMARY KEY,
                action TEXT NOT NULL,
                actor TEXT NOT NULL,
                requested_at TEXT NOT NULL,
                decision TEXT NOT NULL,
                policy TEXT NOT NULL,
                evidence TEXT NOT NULL,
                tool TEXT NOT NULL,
                outcome TEXT NOT NULL
            )
            '''
        )

        if connection.execute('SELECT COUNT(*) FROM events').fetchone()[0] == 0:
            seed_events = [
                (
                    '2026-10-16T12:42:18Z',
                    'buyer-agent',
                    'Request quote for synthetic inventory',
                    'allow',
                    'success',
                    'Intent verified for buyer lookup request.',
                    'inventory.read:buyer',
                ),
                (
                    '2026-10-16T12:43:52Z',
                    'buyer-agent',
                    'Draft purchase order',
                    'review',
                    'warning',
                    'Draft creation pending final approval.',
                    'po.draft:create',
                ),
                (
                    '2026-10-16T12:44:10Z',
                    'policy-proxy',
                    'Attempt unauthorized inventory export',
                    'deny',
                    'error',
                    'Protected tool execution blocked before invocation.',
                    'inventory.export:deny',
                ),
            ]
            connection.executemany(
                'INSERT INTO events (timestamp, source, action, decision, status, detail, policy) VALUES (?, ?, ?, ?, ?, ?, ?)',
                seed_events,
            )

        if connection.execute('SELECT COUNT(*) FROM receipts').fetchone()[0] == 0:
            connection.execute(
                'INSERT INTO receipts (id, action, actor, requested_at, decision, policy, evidence, tool, outcome) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                (
                    'TR-2001',
                    'Quote request',
                    'buyer-agent',
                    '2026-10-16T12:42:18Z',
                    'allow',
                    'inventory.read:buyer',
                    json.dumps(['Intent verified', 'Buyer scope matches request', 'Proxy check passed']),
                    'inventory.lookup',
                    'The tool executed successfully and returned pricing data.',
                ),
            )
            connection.execute(
                'INSERT INTO receipts (id, action, actor, requested_at, decision, policy, evidence, tool, outcome) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                (
                    'TR-2002',
                    'Unauthorized export attempt',
                    'buyer-agent',
                    '2026-10-16T12:44:10Z',
                    'deny',
                    'inventory.export:deny',
                    json.dumps(['Missing permission scope', 'Protected route matched deny rule', 'No tool invocation executed']),
                    'inventory.export',
                    'Tool call blocked before execution by ArmorIQ enforcement path.',
                ),
            )


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


@app.get('/api/health')
def health() -> dict[str, Any]:
    return {'status': 'ok', 'service': 'TrustGate API', 'timestamp': _now_iso()}


@app.get('/api/overview')
def overview() -> dict[str, Any]:
    with get_db_connection() as connection:
        rows = connection.execute('SELECT * FROM events ORDER BY id DESC LIMIT 5').fetchall()
        return {
            'metrics': [
                {'label': 'Verified agents', 'value': '18', 'delta': '+3 this week', 'tone': 'violet'},
                {'label': 'Protected tools', 'value': '96', 'delta': '12 unreviewed', 'tone': 'cyan'},
                {'label': 'Policy denies', 'value': '7', 'delta': '2 blocked today', 'tone': 'red'},
                {'label': 'Exchange health', 'value': '99.3%', 'delta': 'Online', 'tone': 'green'},
            ],
            'events': [
                {
                    'id': row['id'],
                    'timestamp': row['timestamp'],
                    'source': row['source'],
                    'action': row['action'],
                    'decision': row['decision'],
                    'status': row['status'],
                    'detail': row['detail'],
                    'policy': row['policy'],
                }
                for row in rows
            ],
        }


@app.get('/api/receipts')
def receipts() -> dict[str, Any]:
    with get_db_connection() as connection:
        rows = connection.execute('SELECT * FROM receipts ORDER BY requested_at DESC').fetchall()
        return {
            'receipts': [
                {
                    'id': row['id'],
                    'action': row['action'],
                    'actor': row['actor'],
                    'requestedAt': row['requested_at'],
                    'decision': row['decision'],
                    'policy': row['policy'],
                    'evidence': json.loads(row['evidence']),
                    'tool': row['tool'],
                    'outcome': row['outcome'],
                }
                for row in rows
            ]
        }


@app.get('/api/audit')
def audit() -> dict[str, Any]:
    with get_db_connection() as connection:
        rows = connection.execute('SELECT * FROM events ORDER BY id DESC').fetchall()
        return {
            'entries': [
                {
                    'id': row['id'],
                    'timestamp': row['timestamp'],
                    'action': row['action'],
                    'decision': row['decision'],
                    'status': row['status'],
                    'detail': row['detail'],
                    'source': row['source'],
                }
                for row in rows
            ]
        }


@app.post('/api/quote')
def create_quote(payload: QuoteRequest) -> dict[str, Any]:
    item_cost = 49.0
    quote_total = item_cost * payload.quantity
    receipt = {
        'id': 'TR-2001',
        'action': 'Quote request',
        'actor': 'buyer-agent',
        'requestedAt': _now_iso(),
        'decision': 'allow',
        'policy': 'inventory.read:buyer',
        'evidence': ['intent verified', 'buyer scope matches request', 'proxy check passed'],
        'tool': 'inventory.lookup',
        'outcome': f'Quote for {payload.part} (qty {payload.quantity}) returned at ${quote_total:.2f}.',
    }
    with get_db_connection() as connection:
        connection.execute(
            'INSERT INTO events (timestamp, source, action, decision, status, detail, policy) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (
                _now_iso(),
                'buyer-agent',
                'Request quote for synthetic inventory',
                'allow',
                'success',
                'Inventory quote generated for the synthetic procurement workflow.',
                'inventory.read:buyer',
            ),
        )
        connection.execute(
            'INSERT OR REPLACE INTO receipts (id, action, actor, requested_at, decision, policy, evidence, tool, outcome) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                receipt['id'],
                receipt['action'],
                receipt['actor'],
                receipt['requestedAt'],
                receipt['decision'],
                receipt['policy'],
                json.dumps(receipt['evidence']),
                receipt['tool'],
                receipt['outcome'],
            ),
        )
    return {'quote': {'part': payload.part, 'quantity': payload.quantity, 'unit_price': item_cost, 'total': quote_total}, 'receipt': receipt}


@app.post('/api/purchase-order')
def create_purchase_order() -> dict[str, Any]:
    receipt = {
        'id': 'TR-2003',
        'action': 'Draft purchase order',
        'actor': 'buyer-agent',
        'requestedAt': _now_iso(),
        'decision': 'review',
        'policy': 'po.draft:create',
        'evidence': ['Buyer has draft-create permissions', 'Final commit requires human review', 'Policy engine set to review status'],
        'tool': 'po.draft',
        'outcome': 'Purchase order drafted successfully and queued for review.',
    }
    with get_db_connection() as connection:
        connection.execute(
            'INSERT INTO events (timestamp, source, action, decision, status, detail, policy) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (
                _now_iso(),
                'buyer-agent',
                'Draft purchase order',
                'review',
                'warning',
                'Draft purchase order created and waiting for review.',
                'po.draft:create',
            ),
        )
        connection.execute(
            'INSERT OR REPLACE INTO receipts (id, action, actor, requested_at, decision, policy, evidence, tool, outcome) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                receipt['id'],
                receipt['action'],
                receipt['actor'],
                receipt['requestedAt'],
                receipt['decision'],
                receipt['policy'],
                json.dumps(receipt['evidence']),
                receipt['tool'],
                receipt['outcome'],
            ),
        )
    return {'po': {'status': 'draft', 'reference': 'PO-48231'}, 'receipt': receipt}


@app.post('/api/enforce')
def enforce_action(payload: ActionRequest) -> dict[str, Any]:
    protected_tools = {
        'inventory.export': {
            'decision': 'deny',
            'policy': 'inventory.export:deny',
            'reason': 'Missing permission scope for protected export task',
            'status': 'error',
            'evidence': ['Protected route matched deny rule', 'No tool invocation executed', 'ArmorIQ enforcement path rejected request'],
        },
        'pricing.override': {
            'decision': 'deny',
            'policy': 'pricing.override:blocked',
            'reason': 'Critical pricing override requires privileged admin approval',
            'status': 'error',
            'evidence': ['Admin override scope absent', 'Request failed policy pre-check', 'Protected tool not invoked'],
        },
    }

    if payload.tool not in protected_tools:
        return {
            'decision': 'allow',
            'policy': 'demo.mock:pass-through',
            'reason': 'Non-protected action accepted by local mock route',
            'status': 'success',
            'evidence': ['Mock route only'],
            'executed': True,
            'requested_at': _now_iso(),
            'tool': payload.tool,
        }

    decision = protected_tools[payload.tool]
    receipt_id = f"TR-{len(list(range(1000))) + 1}"
    receipt = {
        'id': receipt_id,
        'action': payload.action,
        'actor': 'buyer-agent',
        'requestedAt': _now_iso(),
        'decision': decision['decision'],
        'policy': decision['policy'],
        'evidence': decision['evidence'],
        'tool': payload.tool,
        'outcome': 'Protected tool was not called because the policy engine denied the action before execution.',
    }

    with get_db_connection() as connection:
        connection.execute(
            'INSERT INTO events (timestamp, source, action, decision, status, detail, policy) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (
                _now_iso(),
                'policy-proxy',
                payload.action,
                decision['decision'],
                decision['status'],
                decision['reason'],
                decision['policy'],
            ),
        )
        connection.execute(
            'INSERT OR REPLACE INTO receipts (id, action, actor, requested_at, decision, policy, evidence, tool, outcome) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                receipt['id'],
                receipt['action'],
                receipt['actor'],
                receipt['requestedAt'],
                receipt['decision'],
                receipt['policy'],
                json.dumps(receipt['evidence']),
                receipt['tool'],
                receipt['outcome'],
            ),
        )

    return {
        'decision': decision['decision'],
        'policy': decision['policy'],
        'reason': decision['reason'],
        'status': decision['status'],
        'evidence': decision['evidence'],
        'executed': False,
        'requested_at': _now_iso(),
        'tool': payload.tool,
        'receipt': receipt,
    }


@app.get('/api/policies')
def policies() -> dict[str, Any]:
    return {
        'policy_matrix': [
            {
                'category': 'Buyer access',
                'permission': 'inventory.read',
                'scope': 'internal-team',
                'status': 'allow',
                'description': 'Buyer agent may read synthetic inventory quotes and current demand.',
            },
            {
                'category': 'Vendor access',
                'permission': 'quote.emit',
                'scope': 'vendor-partner',
                'status': 'allow',
                'description': 'Vendor agent may issue quotes for approved SKUs and QTY ranges.',
            },
            {
                'category': 'PO creation',
                'permission': 'po.draft.create',
                'scope': 'procurement-review',
                'status': 'review',
                'description': 'Draft PO creation requires approval before final execution.',
            },
            {
                'category': 'Export controls',
                'permission': 'inventory.export',
                'scope': 'restricted',
                'status': 'deny',
                'description': 'Protected export tool denied outside approved release workflow.',
            },
            {
                'category': 'Admin actions',
                'permission': 'pricing.override',
                'scope': 'finance-admin',
                'status': 'deny',
                'description': 'System is configured to prevent non-admin override requests.',
            },
        ],
        'denied_actions': [
            'inventory.export --all-contracts',
            'pricing.override --force-quote',
            'vendor:privileged-sync --writeback',
        ],
    }
