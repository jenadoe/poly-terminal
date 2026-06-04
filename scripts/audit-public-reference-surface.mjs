#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_URL = 'https://poly-terminal.bokjujuju.workers.dev/api/public-sample';
const STATUS_ORDER = ['READY', 'CONTEXT_REQUIRED', 'REVIEW_RECOMMENDED', 'NOT_STANDALONE'];
const SENSITIVE_CODES = new Set([
  'geopolitical_interpretation',
  'public_health_reporting',
  'disclosure_oracle_review',
  'election_market',
  'threshold_definition',
]);
const PRIVATE_LEAKAGE_TERMS = [
  'core_gate_policy',
  'proposition_audit',
  'r2_archive_object',
  'wallet',
  'transaction',
  'maker',
  'taker',
  'profile',
  'private artifact',
  'safe_to_act',
  'trading signal',
];
const STATIC_FORBIDDEN_PHRASES = [
  'Cite directly',
  'Ready is strict',
  'Ready is strictly scoped',
  'high-visibility',
  'safe to cite',
  'validated probability',
  'validated forecast',
  'safe_to_act',
];

function argValue(name) {
  const prefix = `--${name}=`;
  const item = process.argv.slice(2).find(arg => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : null;
}

function normalizeCodes(row) {
  return Array.isArray(row.reference_reason_codes)
    ? row.reference_reason_codes.filter(Boolean).map(String)
    : [];
}

function codeKey(row) {
  const codes = normalizeCodes(row).slice().sort();
  return codes.length ? codes.join('|') : '(none)';
}

function pct(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return '--';
  if (n > 0 && n < 0.01) return '<1%';
  if (n > 0.99 && n < 1) return '>99%';
  return `${Math.round(n * 100)}%`;
}

function addIssue(list, severity, code, row, detail) {
  list.push({
    severity,
    code,
    event_id: row?.event_id ? String(row.event_id) : null,
    status: row?.reference_status || null,
    title: row?.title || null,
    detail,
  });
}

async function loadRows() {
  const file = argValue('file');
  if (file) {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error(`Expected array in ${file}`);
    return data;
  }

  const url = argValue('url') || process.env.STRATA_REFERENCE_AUDIT_URL || DEFAULT_URL;
  const betaCode = argValue('beta-code') || process.env.STRATA_BETA_CODE || '';
  const headers = betaCode ? { 'x-strata-beta-code': betaCode } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText} ${url}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(`Expected array from ${url}`);
  return data;
}

function auditRows(rows) {
  const issues = [];
  const warnings = [];
  const statusCounts = Object.fromEntries(STATUS_ORDER.map(status => [status, 0]));
  const byCodeKey = new Map();

  for (const row of rows) {
    const status = row.reference_status;
    if (!STATUS_ORDER.includes(status)) {
      addIssue(issues, 'error', 'unknown_reference_status', row, `Unknown status ${status}`);
      continue;
    }
    statusCounts[status] += 1;

    const codes = normalizeCodes(row);
    if (!row.selected_outcome_question) {
      addIssue(issues, 'error', 'missing_selected_outcome_question', row, 'Missing selected outcome question');
    }
    if (!codes.length) {
      addIssue(issues, 'error', 'missing_reason_codes', row, 'Missing public reason codes');
    }
    if (!row.reference_action) {
      addIssue(issues, 'error', 'missing_reference_action', row, 'Missing reference action');
    }
    if (!row.reference_line) {
      addIssue(issues, 'error', 'missing_reference_line', row, 'Missing reference line');
    }

    const publicText = JSON.stringify(row).toLowerCase();
    for (const term of PRIVATE_LEAKAGE_TERMS) {
      if (publicText.includes(term.toLowerCase())) {
        addIssue(issues, 'error', 'private_or_forbidden_term_leakage', row, `Matched "${term}"`);
      }
    }

    if (status === 'READY') {
      const line = String(row.reference_line || '').toLowerCase();
      if (!line.includes('polymarket')) {
        addIssue(issues, 'error', 'ready_line_missing_polymarket_source', row, 'Ready reference line does not cite Polymarket');
      }
      const nonStandard = codes.filter(code => code !== 'standard_reference');
      if (nonStandard.length) {
        addIssue(warnings, 'warning', 'ready_nonstandard_reason_codes', row, `Ready row has non-standard codes: ${nonStandard.join(', ')}`);
      }
    }

    if (status === 'REVIEW_RECOMMENDED' && codes.includes('election_market')) {
      const line = String(row.reference_line || '').toLowerCase();
      if (!/polling|official forecast|market pricing|election|resolution/.test(line)) {
        addIssue(warnings, 'warning', 'review_election_line_lacks_election_framing', row, 'Review election row line does not explain election-market framing');
      }
    }

    if (status === 'NOT_STANDALONE') {
      const hasSensitive = codes.some(code => SENSITIVE_CODES.has(code));
      if (!hasSensitive) {
        addIssue(warnings, 'warning', 'not_standalone_without_sensitive_code', row, `Codes are ${codes.join(', ') || '(none)'}`);
      }
    }

    const key = codeKey(row);
    if (!byCodeKey.has(key)) byCodeKey.set(key, []);
    byCodeKey.get(key).push(row);
  }

  for (const [key, group] of byCodeKey.entries()) {
    const statuses = [...new Set(group.map(row => row.reference_status))];
    if (statuses.length <= 1 || key === '(none)') continue;
    addIssue(warnings, 'warning', 'same_reason_codes_multiple_statuses', null, `${key} -> ${statuses.join(', ')} (${group.map(row => `${row.event_id}:${pct(row.current_price)}`).join(', ')})`);
  }

  return { issues, warnings, statusCounts };
}

function auditStaticCopy() {
  const root = argValue('root') || process.cwd();
  const targets = [
    'docs/index.html',
    'docs/docs.html',
    'docs/beta/index.html',
    'docs/js/panel.js',
    'docs/js/matrix.js',
    'docs/js/press-sample.js',
  ];
  const issues = [];
  for (const rel of targets) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const phrase of STATIC_FORBIDDEN_PHRASES) {
      if (text.includes(phrase)) {
        issues.push({ severity: 'error', code: 'static_forbidden_phrase', file: rel, detail: `Matched "${phrase}"` });
      }
    }
  }
  return issues;
}

function printReport(rows, result, staticIssues) {
  const output = {
    schema_version: 'public_reference_surface_audit_v1',
    rows: rows.length,
    status_counts: result.statusCounts,
    error_count: result.issues.length + staticIssues.length,
    warning_count: result.warnings.length,
    errors: [...result.issues, ...staticIssues],
    warnings: result.warnings,
  };

  console.log(JSON.stringify(output, null, 2));
  if (output.error_count > 0) process.exitCode = 1;
}

try {
  const rows = await loadRows();
  const result = auditRows(rows);
  const staticIssues = auditStaticCopy();
  printReport(rows, result, staticIssues);
} catch (error) {
  console.error(JSON.stringify({
    schema_version: 'public_reference_surface_audit_v1',
    error: error.message,
  }, null, 2));
  process.exitCode = 1;
}
