export const policyMatrix = [
  { category: 'Buyer access', permission: 'inventory.read', scope: 'internal-team', status: 'allow', description: 'Buyer agent may read synthetic inventory quotes and current demand.' },
  { category: 'Vendor access', permission: 'quote.emit', scope: 'vendor-partner', status: 'allow', description: 'Vendor agent may issue quotes for approved SKUs and QTY ranges.' },
  { category: 'PO creation', permission: 'po.draft.create', scope: 'procurement-review', status: 'review', description: 'Draft PO creation requires approval before final execution.' },
  { category: 'Export controls', permission: 'inventory.export', scope: 'restricted', status: 'deny', description: 'Protected export tool denied outside approved release workflow.' },
  { category: 'Admin actions', permission: 'pricing.override', scope: 'finance-admin', status: 'deny', description: 'System is configured to prevent non-admin override requests.' },
];

export const deniedActions = [
  'inventory.export --all-contracts',
  'pricing.override --force-quote',
  'vendor:privileged-sync --writeback',
];
