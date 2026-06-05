#!/usr/bin/env node

const DEFAULT_URL = 'https://poly-terminal.bokjujuju.workers.dev/api/markets';
const STATUS_ORDER = {
  READY: 0,
  CONTEXT_REQUIRED: 1,
  REVIEW_RECOMMENDED: 2,
  NOT_STANDALONE: 3,
};
const SENSITIVE_CODES = new Set([
  'geopolitical_interpretation',
  'public_health_reporting',
  'disclosure_oracle_review',
  'not_standalone',
]);
const REQUIRED_FIXTURE_EXPECTATIONS = [
  {
    event_id: '23784',
    name: 'GTA Taiwan selected outcome must not be Ready',
    min_status: 'REVIEW_RECOMMENDED',
    required_codes: ['geopolitical_interpretation'],
  },
  {
    event_id: '108634',
    name: 'Iran regime row must not be standalone',
    exact_status: 'NOT_STANDALONE',
    required_codes: ['geopolitical_interpretation'],
  },
  {
    event_id: '57711',
    name: 'NVIDIA largest-company row must expose hard-block reason',
    exact_status: 'NOT_STANDALONE',
    required_codes: ['not_standalone'],
  },
  {
    event_id: '32228',
    name: 'Balance of Power combo row must expose hard-block reason',
    exact_status: 'NOT_STANDALONE',
    required_codes: ['not_standalone'],
  },
  {
    event_id: '139020',
    name: 'Near-term Ready row must still expose standard reference handling',
    exact_status: 'READY',
    required_codes: ['standard_reference'],
  },
  {
    event_id: '91942',
    name: 'Public-health threshold row must route to review',
    min_status: 'REVIEW_RECOMMENDED',
    required_codes: ['public_health_reporting', 'threshold_definition'],
  },
  {
    event_id: '16167',
    name: 'Disclosure/oracle-review row must route to review',
    min_status: 'REVIEW_RECOMMENDED',
    required_codes: ['disclosure_oracle_review'],
  },
  {
    event_id: '89502',
    name: 'Bitcoin threshold row must keep threshold context attached',
    min_status: 'CONTEXT_REQUIRED',
    required_codes: ['threshold_definition'],
  },
  {
    event_id: '246219',
    name: 'Fed Chair extreme-price row must route to review',
    min_status: 'REVIEW_RECOMMENDED',
    required_codes: ['extreme_price'],
  },
];

function argValue(name) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find(arg => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : '';
}

function rowStatus(row) {
  return String(row.reference_status || row.public_reference_status || '').trim();
}

function rowTitle(row) {
  return String(row.selected_outcome_question || row.title || '').trim();
}

function rowCodes(row) {
  return Array.isArray(row.reference_reason_codes) ? row.reference_reason_codes.map(String) : [];
}

function severity(status) {
  return STATUS_ORDER[status] ?? -1;
}

function addIssue(list, code, row, detail) {
  list.push({
    code,
    event_id: row?.event_id ? String(row.event_id) : null,
    status: row ? rowStatus(row) : null,
    title: row ? rowTitle(row) : null,
    detail,
  });
}

async function fetchRows(url, betaCode) {
  const headers = betaCode ? { 'x-strata-beta-code': betaCode } : {};
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`fetch failed: ${response.status} ${response.statusText}`);
  }
  const body = await response.json();
  if (!Array.isArray(body)) {
    throw new Error('expected API response to be a JSON array');
  }
  return {
    rows: body,
    revision: response.headers.get('x-strata-worker-revision') || '',
  };
}

function auditRows(rows) {
  const errors = [];
  const warnings = [];
  const byId = new Map(rows.map(row => [String(row.event_id), row]));

  for (const row of rows) {
    const status = rowStatus(row);
    const codes = rowCodes(row);
    const title = rowTitle(row);
    const text = `${title} ${row.category || ''}`.toLowerCase();

    if (!Object.prototype.hasOwnProperty.call(STATUS_ORDER, status)) {
      addIssue(errors, 'unknown_status', row, `Unknown reference status: ${status}`);
    }
    if (!title) {
      addIssue(errors, 'missing_selected_question_or_title', row, 'No reusable title context');
    }
    if (!codes.length) {
      addIssue(errors, 'missing_reason_codes', row, 'No public reason codes');
    }

    if (status === 'READY') {
      if (!codes.includes('standard_reference')) {
        addIssue(errors, 'ready_missing_standard_reference', row, 'Ready row lacks standard_reference');
      }
      const line = String(row.reference_line || '').toLowerCase();
      if (!line.includes('polymarket')) {
        addIssue(errors, 'ready_line_missing_polymarket', row, 'Ready reference line lacks Polymarket source');
      }
    }

    if (status === 'NOT_STANDALONE') {
      const hasHardReason = codes.some(code => SENSITIVE_CODES.has(code));
      if (!hasHardReason) {
        addIssue(errors, 'not_standalone_missing_hard_reason', row, `Codes: ${codes.join(', ')}`);
      }
    }

    const looksGeopolitical = /(iran|taiwan|russia|hamas|israel|regime|invasion|invades|military|war|geopolitic)/i.test(text);
    if (looksGeopolitical && severity(status) < severity('REVIEW_RECOMMENDED')) {
      addIssue(errors, 'geopolitical_ready_or_context_only', row, 'Geopolitical row should route to review or stronger');
    }

    if (codes.includes('threshold_definition') && status === 'READY') {
      addIssue(warnings, 'threshold_definition_ready', row, 'Threshold rows usually need context attached');
    }
  }

  for (const expectation of REQUIRED_FIXTURE_EXPECTATIONS) {
    const row = byId.get(expectation.event_id);
    if (!row) {
      addIssue(warnings, 'fixture_not_present', null, `${expectation.event_id}: ${expectation.name}`);
      continue;
    }
    const status = rowStatus(row);
    const codes = rowCodes(row);
    if (expectation.exact_status && status !== expectation.exact_status) {
      addIssue(errors, 'fixture_status_mismatch', row, `${expectation.name}: expected ${expectation.exact_status}`);
    }
    if (expectation.min_status && severity(status) < severity(expectation.min_status)) {
      addIssue(errors, 'fixture_too_permissive', row, `${expectation.name}: expected at least ${expectation.min_status}`);
    }
    const missingCodes = (expectation.required_codes || []).filter(code => !codes.includes(code));
    if (missingCodes.length) {
      addIssue(errors, 'fixture_missing_required_codes', row, `${expectation.name}: missing ${missingCodes.join(', ')}`);
    }
  }

  return { errors, warnings };
}

function countsByStatus(rows) {
  const counts = {};
  for (const row of rows) {
    const status = rowStatus(row) || 'UNKNOWN';
    counts[status] = (counts[status] || 0) + 1;
  }
  return counts;
}

const url = argValue('url') || DEFAULT_URL;
const betaCode = argValue('beta-code') || process.env.STRATA_BETA_CODE || '';
const outJson = argValue('out-json');
const outMd = argValue('out-md');

const { rows, revision } = await fetchRows(url, betaCode);
const { errors, warnings } = auditRows(rows);
const payload = {
  schema_version: 'reference_routing_expectation_audit_v1',
  generated_at: new Date().toISOString(),
  url,
  worker_revision: revision,
  rows: rows.length,
  status_counts: countsByStatus(rows),
  error_count: errors.length,
  warning_count: warnings.length,
  errors,
  warnings,
  locks: {
    public_validation: false,
    odds_validation: false,
    trading_utility: false,
    safe_to_act: false,
    v7_promotion: false,
  },
};

if (outJson) {
  const fs = await import('node:fs/promises');
  await fs.mkdir(outJson.split(/[\\/]/).slice(0, -1).join('/') || '.', { recursive: true });
  await fs.writeFile(outJson, `${JSON.stringify(payload, null, 2)}\n`);
}
if (outMd) {
  const fs = await import('node:fs/promises');
  const lines = [
    '# Reference Routing Expectation Audit v1',
    '',
    `Generated: \`${payload.generated_at}\``,
    '',
    'Internal routing regression check only. This is not odds validation, public validation, trading utility, v7 promotion, or safe_to_act evidence.',
    '',
    '## Summary',
    '',
    `- rows: \`${payload.rows}\``,
    `- worker_revision: \`${payload.worker_revision}\``,
    `- status_counts: \`${JSON.stringify(payload.status_counts)}\``,
    `- errors: \`${payload.error_count}\``,
    `- warnings: \`${payload.warning_count}\``,
    '',
  ];
  if (errors.length) {
    lines.push('## Errors', '');
    for (const issue of errors) lines.push(`- ${issue.code}: ${issue.event_id || 'n/a'} ${issue.detail}`);
    lines.push('');
  }
  if (warnings.length) {
    lines.push('## Warnings', '');
    for (const issue of warnings) lines.push(`- ${issue.code}: ${issue.event_id || 'n/a'} ${issue.detail}`);
    lines.push('');
  }
  await fs.mkdir(outMd.split(/[\\/]/).slice(0, -1).join('/') || '.', { recursive: true });
  await fs.writeFile(outMd, `${lines.join('\n')}\n`);
}

console.log(JSON.stringify(payload, null, 2));
process.exitCode = errors.length ? 1 : 0;
