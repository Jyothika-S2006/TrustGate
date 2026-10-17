import type { SecurityEvent, TrustReceipt, WorkflowStep } from '../types';

export const overviewMetrics = [
  { label: 'Verified agents', value: '18', delta: '+3 this week', tone: 'violet' },
  { label: 'Protected tools', value: '96', delta: '12 unreviewed', tone: 'cyan' },
  { label: 'Policy denies', value: '7', delta: '2 blocked today', tone: 'red' },
  { label: 'Exchange health', value: '99.3%', delta: 'Online', tone: 'green' },
];

export const recentSecurityEvents: SecurityEvent[] = [
  {
    id: 1,
    timestamp: '12:42:18 UTC',
    source: 'Buyer Agent',
    action: 'Request quote for synthetic inventory',
    decision: 'allow',
    status: 'success',
    detail: 'Inventory lookup satisfied policy checks and returned quote context.',
    policy: 'inventory.read:buyer',
  },
  {
    id: 2,
    timestamp: '12:43:01 UTC',
    source: 'Vendor Agent',
    action: 'Return quote from local inventory tool',
    decision: 'allow',
    status: 'success',
    detail: 'Tool call executed under approved vendor policy scope.',
    policy: 'quote.emit:vending',
  },
  {
    id: 3,
    timestamp: '12:43:52 UTC',
    source: 'Buyer Agent',
    action: 'Draft purchase order',
    decision: 'review',
    status: 'warning',
    detail: 'Draft creation requires buyer approval before final execution.',
    policy: 'po.draft:create',
  },
  {
    id: 4,
    timestamp: '12:44:10 UTC',
    source: 'Policy Proxy',
    action: 'Attempt unauthorized inventory export',
    decision: 'deny',
    status: 'error',
    detail: 'Unauthorized action blocked before protected tool execution.',
    policy: 'inventory.export:deny',
  },
];

export const workflowSteps: WorkflowStep[] = [
  {
    id: 1,
    title: 'Request quote',
    owner: 'Buyer Agent',
    status: 'completed',
    detail: 'Buyer asks for a synthetic part quote from inventory.',
  },
  {
    id: 2,
    title: 'Vendor quote returned',
    owner: 'Vendor Agent',
    status: 'completed',
    detail: 'Quote tool returned pricing for 400 units of model 12-ALPHA.',
  },
  {
    id: 3,
    title: 'Draft PO created',
    owner: 'Buyer Agent',
    status: 'active',
    detail: 'Draft created and awaiting approval before commit.',
  },
  {
    id: 4,
    title: 'Policy check',
    owner: 'ArmorIQ Proxy',
    status: 'pending',
    detail: 'Review unauthorized export attempt before tool call.',
  },
];

export const trustReceipts: TrustReceipt[] = [
  {
    id: 'TR-2001',
    action: 'Quote request',
    actor: 'buyer-agent',
    requestedAt: '2026-10-16T12:42:18Z',
    decision: 'allow',
    policy: 'inventory.read:buyer',
    evidence: ['Intent verified', 'Buyer scope matches request', 'Proxy check passed'],
    tool: 'inventory.lookup',
    outcome: 'The tool executed successfully and returned pricing data.',
  },
  {
    id: 'TR-2002',
    action: 'Unauthorized export attempt',
    actor: 'buyer-agent',
    requestedAt: '2026-10-16T12:44:10Z',
    decision: 'deny',
    policy: 'inventory.export:deny',
    evidence: ['Missing permission scope', 'Protected route matched deny rule', 'No tool invocation executed'],
    tool: 'inventory.export',
    outcome: 'Tool call blocked before execution by ArmorIQ enforcement path.',
  },
];
