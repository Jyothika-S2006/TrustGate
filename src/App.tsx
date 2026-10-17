import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, CheckCircle2, ChevronRight, Clock3, FileText, Lock, Search, ShieldCheck, ShieldX, Sparkles, TrendingUp, Zap } from 'lucide-react';

type Metric = {
  label: string;
  value: string;
  delta: string;
  tone: 'violet' | 'cyan' | 'red' | 'green';
};

type EventRow = {
  id: number;
  timestamp: string;
  source: string;
  action: string;
  decision: 'allow' | 'deny' | 'review' | 'error';
  status: 'success' | 'warning' | 'error' | 'pending';
  detail: string;
  policy?: string;
  agent?: string;
  tool?: string;
  token_id?: string;
  trace_id?: string;
};

type ReceiptRow = {
  id: string;
  action: string;
  actor: string;
  requestedAt: string;
  decision: 'allow' | 'deny' | 'review' | 'error';
  status: string;
  policy: string;
  evidence: string[];
  tool: string;
  outcome: string;
  agent?: string;
  tokenId?: string;
  traceId?: string;
  rawResult?: Record<string, unknown>;
  reason?: string;
};

type PolicyRow = {
  category: string;
  permission: string;
  scope: string;
  status: 'allow' | 'deny' | 'review';
  description: string;
};

type AuditRow = {
  id: number;
  timestamp: string;
  action: string;
  decision: string;
  status: string;
  detail: string;
  source: string;
};

const navItems = ['Overview', 'Agent Exchange', 'Policies', 'Audit Trail', 'Trust Receipt'];
const defaultDemoMessage = 'Run a workflow to see live ArmorIQ SDK decisions. No tool request has been made yet.';

const statusStyles: Record<string, string> = {
  allow: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30',
  deny: 'bg-rose-500/10 text-rose-300 border border-rose-500/30',
  review: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
  success: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
  error: 'bg-rose-500/10 text-rose-300 border border-rose-500/30',
  pending: 'bg-slate-500/10 text-slate-200 border border-slate-500/30',
};

const decisionIcon = (decision: string) => {
  switch (decision) {
    case 'allow':
      return <ShieldCheck className="h-4 w-4" />;
    case 'deny':
      return <ShieldX className="h-4 w-4" />;
    default:
      return <Clock3 className="h-4 w-4" />;
  }
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function App() {
  const [activePage, setActivePage] = useState('Overview');
  const [search, setSearch] = useState('');
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [deniedActions, setDeniedActions] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoMessage, setDemoMessage] = useState(defaultDemoMessage);
  const [lastQuote, setLastQuote] = useState<{ part: string; quantity: number; unit_price?: number; total: number | null } | null>(null);
  const [lastPurchaseOrder, setLastPurchaseOrder] = useState<{ status: string; po_id: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overview, policyData, receiptData, auditData] = await Promise.all([
        fetchJson<{ metrics: Metric[]; events: EventRow[] }>('/api/overview'),
        fetchJson<{ policy_matrix: PolicyRow[]; denied_actions: string[] }>('/api/policies'),
        fetchJson<{ receipts: ReceiptRow[] }>('/api/receipts'),
        fetchJson<{ entries: AuditRow[] }>('/api/audit'),
      ]);

      setMetrics(overview.metrics);
      setEvents(overview.events);
      setSelectedEvent(overview.events[0] ?? null);
      setPolicies(policyData.policy_matrix);
      setDeniedActions(policyData.denied_actions);
      setReceipts(receiptData.receipts);
      setSelectedReceipt(receiptData.receipts[0] ?? null);
      setAudit(auditData.entries);
    } catch (error) {
      console.error(error);
      setDemoMessage(`Unable to load live TrustGate data: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredAudit = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return audit;
    return audit.filter((entry) =>
      [entry.action, entry.detail, entry.source, entry.decision, entry.status].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  }, [audit, search]);

  const handleAction = async (kind: 'quote' | 'po' | 'deny') => {
    setLoading(true);
    try {
      if (kind === 'quote') {
        const result = await fetchJson<{ quote: { total: number | null; part: string; quantity: number }; calls: ReceiptRow[]; receipt: ReceiptRow }>('/api/quote', {
          method: 'POST',
          body: JSON.stringify({ part: '12-ALPHA', quantity: 400 }),
        });
        setLastQuote(result.quote);
        const quoteCall = result.calls[0];
        setDemoMessage(
          quoteCall?.decision === 'allow' && result.quote
            ? `ArmorIQ allowed ${quoteCall.agent} → ${quoteCall.tool}; token ${quoteCall.tokenId ?? 'not returned'}. Quote ${result.quote.part} x ${result.quote.quantity}: ${result.quote.total === null ? 'amount unavailable' : `$${result.quote.total.toFixed(2)}`}.`
            : `ArmorIQ ${quoteCall?.decision ?? 'error'} for ${quoteCall?.tool ?? 'get_quote'}: ${quoteCall?.reason ?? quoteCall?.status ?? 'no decision returned'}.`,
        );
      }

      if (kind === 'po') {
        const result = await fetchJson<{ po: { status: string; po_id: string } | null; receipt: ReceiptRow }>('/api/purchase-order', {
          method: 'POST',
          body: JSON.stringify({ vendor: 'Northstar Components', item: '12-ALPHA', qty: 400, amount: 19600 }),
        });
        setLastPurchaseOrder(result.po);
        setDemoMessage(
          result.receipt.decision === 'allow'
            ? `ArmorIQ allowed ${result.receipt.agent} → ${result.receipt.tool}; draft ${result.po?.po_id ?? 'created'}. Token ${result.receipt.tokenId ?? 'not returned'}.`
            : `ArmorIQ ${result.receipt.decision} for ${result.receipt.tool}: ${result.receipt.reason ?? result.receipt.outcome}.`,
        );
      }

      if (kind === 'deny') {
        const result = await fetchJson<{ calls: ReceiptRow[]; attack: ReceiptRow | null }>('/api/attack', {
          method: 'POST',
        });
        const attack = result.attack;
        setDemoMessage(
          attack?.decision === 'deny'
            ? `ArmorIQ blocked ${attack.agent} → ${attack.tool}: ${attack.reason}. Tool executed: no. Token ${attack.tokenId ?? 'not returned'}${attack.traceId ? ` · Trace ${attack.traceId}` : ''}.`
            : attack
              ? `ArmorIQ returned ${attack.decision} for ${attack.tool}: ${attack.reason ?? attack.status}.`
              : `Attack attempt did not reach submit_order. ${result.calls[result.calls.length - 1]?.reason ?? 'See returned ArmorIQ call details.'}`,
        );
      }

      await loadData();
      setActivePage('Trust Receipt');
    } catch (error) {
      console.error(error);
      setDemoMessage(`ArmorIQ action failed: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case 'Overview':
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {demoMessage}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-glow backdrop-blur-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">{metric.label}</span>
                    <div className={`rounded-full px-2 py-1 text-[10px] ${metric.tone === 'violet' ? 'bg-violet-500/10 text-violet-300' : metric.tone === 'cyan' ? 'bg-cyan-500/10 text-cyan-300' : metric.tone === 'red' ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                      {metric.delta}
                    </div>
                  </div>
                  <div className="mt-5 flex items-end justify-between">
                    <span className="text-3xl font-semibold text-white">{metric.value}</span>
                    <TrendingUp className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-glow backdrop-blur-lg">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Recent security events</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">Agent trust summary</h3>
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-700" onClick={() => setActivePage('Audit Trail')}>
                    View all <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {events.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">No events available yet.</div>
                  ) : (
                    events.map((event) => (
                      <button
                        type="button"
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left transition ${selectedEvent?.id === event.id ? 'border-violet-500/50 bg-violet-500/5' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{event.source}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${statusStyles[event.decision]}`}>
                              {decisionIcon(event.decision)}
                              {event.decision}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-300">{event.action}</p>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          <div>{event.timestamp}</div>
                          <div className="mt-2 inline-flex rounded-full border border-slate-700 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-slate-300">
                            {event.status}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-glow backdrop-blur-lg">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">ArmorIQ activity</p>
                <div className="mt-5 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-300"><Activity className="h-4 w-4" /></div>
                    <div>
                      <div className="text-sm font-medium text-white">SDK invocation history</div>
                      <div className="text-xs text-slate-400">Live decisions returned by ArmorIQ</div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-emerald-300">{metrics[0]?.value ?? '0'}</span>
                </div>
                <div className="mt-6 space-y-4">
                  {events.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                      No ArmorIQ tool calls recorded yet.
                    </div>
                  ) : events.slice(0, 4).map((event, index) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs ${event.decision === 'allow' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : event.decision === 'deny' ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                          {index + 1}
                        </div>
                        {index < Math.min(events.length, 4) - 1 && <div className="mt-2 h-9 w-px bg-slate-700" />}
                      </div>
                      <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-white">{event.tool || event.action}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${statusStyles[event.decision]}`}>{event.decision}</span>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">{event.agent || event.source}</p>
                        <p className="mt-1 text-sm text-slate-300">{event.detail}</p>
                        {event.token_id && <p className="mt-2 break-all font-mono text-[10px] text-slate-500">Token: {event.token_id}</p>}
                        {event.trace_id && <p className="break-all font-mono text-[10px] text-slate-500">Trace: {event.trace_id}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'Agent Exchange':
        return (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-glow backdrop-blur-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Buyer</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">Procurement Agent</h3>
                  </div>
                  <div className="rounded-full bg-violet-500/10 p-2 text-violet-300"><Sparkles className="h-5 w-5" /></div>
                </div>
                <div className="mt-5 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                  <p className="text-sm text-slate-300">Buyer requests a quote through ArmorIQ for synthetic inventory.</p>
                  <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
                    <span className="text-slate-400">Latest quote</span>
                    <span className="text-white">{lastQuote ? `${lastQuote.part} × ${lastQuote.quantity}` : 'Not requested'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-glow backdrop-blur-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Vendor</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">Supplier Agent</h3>
                  </div>
                  <div className="rounded-full bg-cyan-500/10 p-2 text-cyan-300"><Zap className="h-5 w-5" /></div>
                </div>
                <div className="mt-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <p className="text-sm text-slate-300">Quote and inventory are returned by the registered synthetic MCP server via ArmorIQ.</p>
                  <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
                    <span className="text-slate-400">{lastPurchaseOrder ? `Draft ${lastPurchaseOrder.status}` : 'Latest quote total'}</span>
                    <span className="text-white">{lastPurchaseOrder?.po_id ?? (lastQuote?.total === null || !lastQuote ? 'No result yet' : `$${lastQuote.total.toFixed(2)}`)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-glow backdrop-blur-lg">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Workflow</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Quote to purchase order</h3>
                </div>
                <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-300">Demo flow</div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                {[
                  { title: 'Quote requested', tool: 'get_quote' },
                  { title: 'Inventory checked', tool: 'read_inventory' },
                  { title: 'Draft PO', tool: 'create_draft_po' },
                  { title: 'Unauthorized action', tool: 'submit_order' },
                ].map((item, index) => {
                  const call = events.find((event) => event.tool === item.tool);
                  const state = call?.decision === 'allow' ? 'allowed' : call?.decision === 'deny' ? 'blocked' : call?.decision === 'error' ? 'error' : 'not run';
                  return (
                  <div key={item.title} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Step {index + 1}</span>
                      <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${state === 'allowed' ? statusStyles.allow : state === 'blocked' ? statusStyles.deny : state === 'error' ? statusStyles.error : statusStyles.pending}`}>
                        {state}
                      </span>
                    </div>
                    <h4 className="mt-3 text-base font-medium text-white">{item.title}</h4>
                    <p className="mt-2 text-sm text-slate-300">{call?.detail ?? `No ArmorIQ invocation recorded for ${item.tool}.`}</p>
                  </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => void handleAction('quote')} className="rounded-xl bg-violet-500/90 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400">Request quote</button>
                <button type="button" onClick={() => void handleAction('po')} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-600">Create draft PO</button>
                <button type="button" onClick={() => void handleAction('deny')} className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15">Attempt unauthorized action</button>
              </div>
            </div>
          </div>
        );
      case 'Policies':
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-glow backdrop-blur-lg">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Security policy</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Configured permissions</h3>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-slate-300"><Lock className="h-3.5 w-3.5" /> ArmorIQ policy</div>
              </div>

              <div className="space-y-3">
                {policies.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">No policy data available.</div>
                ) : (
                  policies.map((policy) => (
                    <div key={policy.permission} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-white">{policy.permission}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${statusStyles[policy.status]}`}>{policy.status}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-300">{policy.description}</p>
                        </div>
                        <div className="text-sm text-slate-400"><span className="font-medium text-slate-200">Scope:</span> {policy.scope}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-glow backdrop-blur-lg">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Denied actions</p>
              <div className="mt-5 space-y-3">
                {deniedActions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">No denied actions configured.</div>
                ) : (
                  deniedActions.map((action) => (
                    <div key={action} className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                      <div className="flex items-center gap-3">
                        <ShieldX className="h-4 w-4 text-rose-300" />
                        <span className="text-sm text-slate-200">{action}</span>
                      </div>
                      <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-rose-300">Denied</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      case 'Audit Trail':
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-glow backdrop-blur-lg">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Audit trail</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Searchable reasoning history</h3>
                </div>
                <label className="relative block w-full max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search events" className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500/50" />
                </label>
              </div>

              <div className="table-scroll overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="px-4 py-3 font-medium">Timestamp</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                      <th className="px-4 py-3 font-medium">Decision</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAudit.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">No audit rows match the current search.</td>
                      </tr>
                    ) : (
                      filteredAudit.map((entry) => (
                        <tr key={entry.id} className="border-b border-slate-800/80 text-slate-200 hover:bg-slate-950/50">
                          <td className="px-4 py-3 whitespace-nowrap">{entry.timestamp}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{entry.action}</td>
                          <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${statusStyles[entry.decision === 'allowed' ? 'allow' : entry.decision === 'denied' ? 'deny' : 'review']}`}>{entry.decision}</span></td>
                          <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${statusStyles[entry.status]}`}>{entry.status}</span></td>
                          <td className="px-4 py-3"><button type="button" onClick={() => setSelectedEvent(events.find((item) => item.action === entry.action) ?? events[0] ?? null)} className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 transition hover:border-violet-500/50">View detail <ArrowRight className="h-3.5 w-3.5" /></button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'Trust Receipt':
        return (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-glow backdrop-blur-lg">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Trust receipts</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">Evidence of policy decisions</h3>
                  </div>
                  <div className="rounded-full bg-violet-500/10 p-2 text-violet-300"><FileText className="h-5 w-5" /></div>
                </div>

                <div className="space-y-3">
                  {receipts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">No trust receipts yet.</div>
                  ) : (
                    receipts.map((receipt) => (
                      <button key={receipt.id} type="button" onClick={() => setSelectedReceipt(receipt)} className={`w-full rounded-xl border p-4 text-left transition ${selectedReceipt?.id === receipt.id ? 'border-violet-500/50 bg-violet-500/5' : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-white">{receipt.action}</div>
                            <div className="mt-1 text-xs text-slate-400">{receipt.id}</div>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${statusStyles[receipt.decision]}`}>{decisionIcon(receipt.decision)}{receipt.decision}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-glow backdrop-blur-lg">
                {selectedReceipt ? (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Receipt detail</p>
                        <h3 className="mt-2 text-xl font-semibold text-white">{selectedReceipt.id}</h3>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${statusStyles[selectedReceipt.decision]}`}>{decisionIcon(selectedReceipt.decision)}{selectedReceipt.decision}</span>
                    </div>

                    <div className="space-y-4 text-sm">
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-400">Agent</div><div className="mt-1 text-white">{selectedReceipt.agent ?? selectedReceipt.actor}</div></div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-400">Action</div><div className="mt-1 text-white">{selectedReceipt.action}</div></div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-400">Tool</div><div className="mt-1 text-white">{selectedReceipt.tool}</div></div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-400">ArmorIQ reason</div><div className="mt-1 text-white">{selectedReceipt.policy || selectedReceipt.outcome || 'No reason returned.'}</div></div>
                      {selectedReceipt.tokenId && <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-400">Intent token ID</div><div className="mt-1 break-all font-mono text-xs text-white">{selectedReceipt.tokenId}</div></div>}
                      {selectedReceipt.traceId && <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-400">Trace ID</div><div className="mt-1 break-all font-mono text-xs text-white">{selectedReceipt.traceId}</div></div>}
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-400">Evidence</div><ul className="mt-2 space-y-2 text-slate-200">{selectedReceipt.evidence.map((item) => (<li key={item} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" /><span>{item}</span></li>))}</ul></div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-400">Outcome</div><div className="mt-1 text-white">{selectedReceipt.outcome}</div></div>
                      {selectedReceipt.rawResult && <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-400">Raw ArmorIQ result</div><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-300">{JSON.stringify(selectedReceipt.rawResult, null, 2)}</pre></div>}
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">No trust receipt selected</div>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] text-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <header className="mb-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-glow backdrop-blur-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-slate-950 shadow-lg shadow-violet-500/20"><ShieldCheck className="h-5 w-5" /></div>
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-slate-400">TrustGate</div>
                <div className="text-xl font-semibold text-white">AI agent trust dashboard</div>
              </div>
            </div>

            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <button key={item} type="button" onClick={() => setActivePage(item)} className={`rounded-full px-3 py-2 text-sm transition ${activePage === item ? 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                  {item}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="space-y-6">{loading ? <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-300">Loading TrustGate demo state…</div> : renderPage()}</main>
      </div>
    </div>
  );
}

export default App;
