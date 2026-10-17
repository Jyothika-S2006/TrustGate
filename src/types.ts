export type SecurityDecision = 'allow' | 'deny' | 'review';

export type EventStatus = 'success' | 'warning' | 'error' | 'pending';

export type SecurityEvent = {
  id: number;
  timestamp: string;
  source: string;
  action: string;
  decision: SecurityDecision;
  status: EventStatus;
  detail: string;
  policy?: string;
};

export type WorkflowStep = {
  id: number;
  title: string;
  owner: string;
  status: 'completed' | 'active' | 'pending';
  detail: string;
};

export type TrustReceipt = {
  id: string;
  action: string;
  actor: string;
  requestedAt: string;
  decision: SecurityDecision;
  policy: string;
  evidence: string[];
  tool: string;
  outcome: string;
};
