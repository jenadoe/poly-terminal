const API_URL = '/api/markets';
const ACCESS_STORAGE_KEY = 'strata_reference_preview_access_v1';
const ALLOWED_ACCESS_HASHES = new Set([
    '74ccad3c203721244abc930593e9652060fc0438355d712bf5dad7396718c51e',
]);
const STATUS_CLASS = {
    READY: 'status-ready',
    CONTEXT_REQUIRED: 'status-context',
    REVIEW_RECOMMENDED: 'status-review',
    NOT_STANDALONE: 'status-stop',
};
const STATUS_ACTION_COPY = {
    READY: {
        subtitle: 'Cite with source',
        row: 'Ready to cite',
        panel: 'Cite directly with a Polymarket link. Add a timestamp if the price appears in a report or briefing.',
    },
    CONTEXT_REQUIRED: {
        subtitle: 'Attach context',
        row: 'Add context',
        panel: 'Attach the specific option, wording, timing, or resolution detail before quoting this price.',
    },
    REVIEW_RECOMMENDED: {
        subtitle: 'Check rules first',
        row: 'Review first',
        panel: 'Review market rules, resolution criteria, timing, or sensitivity before reusing this price.',
    },
    NOT_STANDALONE: {
        subtitle: 'Do not quote alone',
        row: 'Avoid standalone',
        panel: 'Do not quote the price alone. Use only with full market wording or broader explanation.',
    },
};
const GROUPS = [
    {
        status: 'READY',
        title: 'Ready',
        action: STATUS_ACTION_COPY.READY.subtitle,
        note: 'Use directly as a market-sentiment reference with Polymarket as the source.',
        limit: 50,
        compact: true,
    },
    {
        status: 'CONTEXT_REQUIRED',
        title: 'Context Required',
        action: STATUS_ACTION_COPY.CONTEXT_REQUIRED.subtitle,
        note: 'Still usable when the option, wording, timing, or resolution context stays attached.',
        limit: 50,
    },
    {
        status: 'REVIEW_RECOMMENDED',
        title: 'Review Recommended',
        action: STATUS_ACTION_COPY.REVIEW_RECOMMENDED.subtitle,
        note: 'Check structure, wording, resolution source, timing, or sensitivity before reuse.',
        limit: 50,
    },
    {
        status: 'NOT_STANDALONE',
        title: 'Not Standalone',
        action: STATUS_ACTION_COPY.NOT_STANDALONE.subtitle,
        note: 'Do not use the price as an isolated market-sentiment reference.',
        limit: 50,
    },
];

const REASON_CHIP_COPY = {
    long_horizon: {
        label: 'long horizon',
        title: 'The event resolves far enough out that timing should travel with the reference.',
    },
    election_market: {
        label: 'election market',
        title: 'Election markets should be framed as market sentiment, not polling or an official forecast.',
    },
    resolution_review: {
        label: 'resolution source',
        title: 'The resolving source or criteria should be checked before the reference is reused.',
    },
    disclosure_oracle_review: {
        label: 'oracle review',
        title: 'Check disclosure timing, public reporting, on-chain evidence, or oracle/review state before reuse.',
    },
    wording_context: {
        label: 'wording context',
        title: 'The market wording may lose important conditions when the price is quoted alone.',
    },
    option_context: {
        label: 'option context',
        title: 'The specific candidate, team, bucket, or outcome should stay attached to this price.',
    },
    near_term: {
        label: 'near term',
        title: 'The market resolves soon, so timestamp and late information may matter.',
    },
    geopolitical_interpretation: {
        label: 'geopolitical context',
        title: 'Political or geopolitical context can materially change how the price reads.',
    },
    public_health_reporting: {
        label: 'public health source',
        title: 'Public-health reporting source, case definitions, or data timing should be checked.',
    },
    threshold_definition: {
        label: 'threshold definition',
        title: 'The threshold or boundary condition should stay visible with the price.',
    },
    secondary_review: {
        label: 'secondary review',
        title: 'This market has public characteristics that warrant an extra check before standalone use.',
    },
    standard_reference: {
        label: 'standard reference',
        title: 'Ordinary source attribution is enough for this market-sentiment reference.',
    },
    event_definition: {
        label: 'event definition',
        title: 'The event definition or source interpretation should travel with the price.',
    },
    option_set_context: {
        label: 'option set',
        title: 'The option set or location/meeting context should stay visible with the price.',
    },
    extreme_price: {
        label: 'extreme price',
        title: 'Near-0% or near-100% prices should not be presented as odds validation.',
    },
    thin_volume: {
        label: 'thin volume',
        title: 'Lower public volume should not be framed as broad market consensus.',
    },
};

function sampleEid(id) {
    return document.getElementById(id);
}

function setSampleStatus(text) {
    const el = sampleEid('sample-status');
    if (el) el.textContent = text;
}

async function sha256Hex(input) {
    const bytes = new TextEncoder().encode(String(input || '').trim());
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

async function isAllowedCode(code) {
    if (!code) return false;
    return ALLOWED_ACCESS_HASHES.has(await sha256Hex(code));
}

function unlockSample() {
    document.body.classList.remove('sample-locked');
    const gate = sampleEid('access-gate');
    if (gate) gate.classList.add('is-unlocked');
}

async function initAccessGate() {
    document.body.classList.add('sample-locked');
    const storedCode = window.localStorage.getItem(ACCESS_STORAGE_KEY);

    if (await isAllowedCode(storedCode)) {
        unlockSample();
        loadSample();
        return;
    }

    const form = sampleEid('access-form');
    const input = sampleEid('access-code');
    const error = sampleEid('access-error');
    if (form && input) {
        form.addEventListener('submit', async event => {
            event.preventDefault();
            const code = input.value.trim();
            if (await isAllowedCode(code)) {
                window.localStorage.setItem(ACCESS_STORAGE_KEY, code);
                if (error) error.textContent = '';
                unlockSample();
                loadSample();
                return;
            }
            if (error) error.textContent = 'Access code not recognized.';
        });
    }
}

function tickSampleClock() {
    const el = sampleEid('sample-clock');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}

function referenceLabel(market) {
    return market.reference_label || {
        READY: 'Ready',
        CONTEXT_REQUIRED: 'Context Required',
        REVIEW_RECOMMENDED: 'Review Recommended',
        NOT_STANDALONE: 'Not Standalone',
    }[market.reference_status] || 'Reference Status';
}

function statusActionCopy(status) {
    return STATUS_ACTION_COPY[status] || {
        subtitle: 'Review handling',
        row: 'Review handling',
        panel: 'Review the reference posture before use.',
    };
}

function statusActionSubtitle(market) {
    return statusActionCopy(market.reference_status).subtitle;
}

function rowActionPhrase(market) {
    return statusActionCopy(market.reference_status).row;
}

function reasonText(market) {
    const reasons = Array.isArray(market.reference_reasons)
        ? market.reference_reasons.filter(Boolean)
        : [];
    if (reasons.length) return reasons;
    if (market.reference_action) return [market.reference_action];
    return ['Reference-usability status is available for this market.'];
}

function reasonChipForMarket(market) {
    const codes = Array.isArray(market.reference_reason_codes)
        ? market.reference_reason_codes.filter(Boolean)
        : [];
    const preferred = codes.find(code => REASON_CHIP_COPY[code]);
    if (preferred) return REASON_CHIP_COPY[preferred];
    if (market.reference_status === 'READY') {
        return {
            label: 'standard reference',
            title: 'Ordinary source attribution is enough for this market-sentiment reference.',
        };
    }
    if (market.reference_status === 'CONTEXT_REQUIRED') {
        return {
            label: 'context needed',
            title: 'Reuse this price only with the stated context attached.',
        };
    }
    if (market.reference_status === 'REVIEW_RECOMMENDED') {
        return {
            label: 'check before use',
            title: 'Review wording, resolution source, or timing before reusing the reference.',
        };
    }
    if (market.reference_status === 'NOT_STANDALONE') {
        return {
            label: 'not standalone',
            title: 'Do not use this price as an isolated reference.',
        };
    }
    return {
        label: 'reference status',
        title: 'Reference-usability status is available for this market.',
    };
}

function shortEventId(id) {
    if (!id) return '--';
    const value = String(id);
    return value.length > 10 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

function closeText(market) {
    if (!market.close_time) return '--';
    const close = new Date(market.close_time);
    if (Number.isNaN(close.getTime())) return '--';
    const diff = close.getTime() - Date.now();
    if (diff <= 0) return 'Closed';
    const days = Math.floor(diff / 86400000);
    const isEndOfYear = close.getUTCMonth() === 11 && close.getUTCDate() === 31;
    if (isEndOfYear && days >= 90) return `End ${close.getUTCFullYear()}`;
    if (days >= 180) {
        return close.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
        });
    }
    if (typeof calcClosesIn === 'function') {
        return calcClosesIn(market.close_time);
    }
    return close.toISOString().slice(0, 10);
}

function statusAction(market) {
    const lead = statusActionCopy(market.reference_status).panel;
    const detail = String(market.reference_action || '').trim();
    if (!detail || detail === lead) return lead;
    return `${lead} ${detail}`;
}

function checklistItemsForMarket(market) {
    const status = market.reference_status;
    const codes = Array.isArray(market.reference_reason_codes)
        ? market.reference_reason_codes.filter(Boolean)
        : [];
    const items = [];
    const add = item => {
        if (item && !items.includes(item)) items.push(item);
    };

    if (status === 'READY') {
        add('Cite Polymarket as the source');
        add('Include timestamp when used in a report');
        return items;
    }

    if (status === 'CONTEXT_REQUIRED') {
        add('Keep the selected option or threshold visible');
        if (codes.includes('long_horizon') || codes.includes('near_term')) add('Include close timing or timestamp');
        if (codes.includes('resolution_review') || codes.includes('event_definition')) add('Carry the key resolution detail');
        add('Use the suggested reference framing');
        return items;
    }

    if (status === 'REVIEW_RECOMMENDED') {
        add('Inspect market wording and selected option');
        if (codes.includes('resolution_review') || codes.includes('disclosure_oracle_review')) add('Check resolution criteria and source');
        if (codes.includes('public_health_reporting')) add('Check official reporting source and case definition');
        if (codes.includes('threshold_definition') || codes.includes('event_definition')) add('Verify threshold or event definition');
        if (codes.includes('long_horizon') || codes.includes('near_term')) add('Confirm close timing and timestamp');
        if (codes.includes('election_market') || codes.includes('geopolitical_interpretation')) add('Frame as market pricing, not polling or outcome validation');
        return items;
    }

    if (status === 'NOT_STANDALONE') {
        add('Do not quote the price alone');
        add('Include full market wording and selected option');
        add('Use broader explanation or primary market context');
        return items;
    }

    add('Review the reference posture before reuse');
    return items;
}

function displayPrice(market) {
    return fmtOutcomePct(market.current_price);
}

function suggestedReference(market) {
    if (market.reference_line) return market.reference_line;

    const title = market.title || 'this Polymarket market';
    const price = displayPrice(market);
    const label = referenceLabel(market);
    const reasons = reasonText(market).join(' ');

    if (market.reference_status === 'READY') {
        return `Polymarket currently prices "${title}" at ${price}.`;
    }

    if (market.reference_status === 'CONTEXT_REQUIRED') {
        return `Polymarket currently prices "${title}" at ${price}. Strata marks this market ${label}. If this price appears in downstream output, include the context near the price: ${reasons}`;
    }

    if (market.reference_status === 'REVIEW_RECOMMENDED') {
        return `Polymarket currently prices "${title}" at ${price}. Strata marks this market ${label}. Treat the price as requiring additional review before it is used as a standalone market-sentiment reference. Reason: ${reasons}`;
    }

    if (market.reference_status === 'NOT_STANDALONE') {
        return `Polymarket currently prices "${title}" at ${price}. Strata marks this market ${label}. Do not use this price as an isolated market-sentiment reference; it needs substantial surrounding context. Reason: ${reasons}`;
    }

    return `Polymarket currently prices "${title}" at ${price}. Strata reference status: ${label}.`;
}

function panelReferenceOutput(market, handling) {
    if (market.reference_status === 'NOT_STANDALONE') {
        return 'No standalone reference line generated for this status. Use only inside a broader explanation.';
    }
    return suggestedReference(market);
}

function panelCopyText(market, handling, output) {
    if (market.reference_status === 'NOT_STANDALONE') {
        return handling || output;
    }
    return output;
}

function copyText(text, button) {
    const done = () => {
        if (!button) return;
        const original = button.textContent;
        button.textContent = 'Copied';
        window.setTimeout(() => {
            button.textContent = original;
        }, 1200);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => {});
        return;
    }

    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', 'readonly');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    try {
        document.execCommand('copy');
        done();
    } catch (_) {
        // no-op
    }
    document.body.removeChild(area);
}

function closeBetaPanel() {
    const panel = sampleEid('beta-panel');
    const overlay = sampleEid('beta-overlay');
    if (panel) {
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
    }
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
}

function openBetaPanel(market) {
    const panel = sampleEid('beta-panel');
    const overlay = sampleEid('beta-overlay');
    if (!panel || !overlay) return;

    const reasons = reasonText(market);
    const handling = statusAction(market);
    const output = panelReferenceOutput(market, handling);
    const copy = panelCopyText(market, handling, output);
    const statusClass = STATUS_CLASS[market.reference_status] || '';
    const status = sampleEid('bp-status');

    sampleEid('bp-category').textContent = `${market.category || 'Market'} / ${shortEventId(market.event_id)}`;
    sampleEid('bp-title').textContent = market.title || '--';
    sampleEid('bp-price').textContent = displayPrice(market);
    if (status) {
        status.textContent = referenceLabel(market);
        status.className = statusClass;
    }
    sampleEid('bp-volume').textContent = fmtVol(market.volume || 0);
    sampleEid('bp-close-time').textContent = closeText(market);
    sampleEid('bp-event').textContent = shortEventId(market.event_id);
    sampleEid('bp-guidance').textContent = handling;
    sampleEid('bp-copy-label').textContent = market.reference_status === 'NOT_STANDALONE'
        ? 'Reference output'
        : 'Suggested reference framing';
    sampleEid('bp-copy-text').textContent = output;

    const outputSection = sampleEid('bp-output-section');
    if (outputSection) {
        outputSection.classList.toggle('beta-panel-output-locked', market.reference_status === 'NOT_STANDALONE');
    }

    const reasonsWrap = sampleEid('bp-reasons');
    if (reasonsWrap) {
        reasonsWrap.innerHTML = '';
        reasons.forEach(reason => {
            const item = document.createElement('div');
            item.textContent = reason;
            reasonsWrap.appendChild(item);
        });
    }

    const checklistWrap = sampleEid('bp-checklist');
    if (checklistWrap) {
        checklistWrap.innerHTML = '';
        checklistItemsForMarket(market).forEach(item => {
            const node = document.createElement('li');
            node.textContent = item;
            checklistWrap.appendChild(node);
        });
    }

    const copyBtn = sampleEid('bp-copy');
    if (copyBtn) {
        copyBtn.textContent = market.reference_status === 'NOT_STANDALONE' ? 'Copy handling note' : 'Copy reference';
        copyBtn.onclick = () => copyText(copy, copyBtn);
    }

    const link = sampleEid('bp-link');
    if (link) link.href = marketUrl(market);

    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function renderMetrics(markets) {
    const counts = markets.reduce((acc, market) => {
        acc[market.reference_status] = (acc[market.reference_status] || 0) + 1;
        return acc;
    }, {});
    const fields = [
        ['metric-markets', markets.length],
        ['metric-ready', counts.READY || 0],
        ['metric-context', counts.CONTEXT_REQUIRED || 0],
        ['metric-review', counts.REVIEW_RECOMMENDED || 0],
        ['metric-stop', counts.NOT_STANDALONE || 0],
    ];
    fields.forEach(([id, value]) => {
        const el = sampleEid(id);
        if (el) el.textContent = value;
    });
    const note = sampleEid('briefing-note');
    if (note) {
        note.textContent = counts.READY <= 3
            ? 'Follow the row action: cite with source, attach context, review first, or avoid standalone reuse.'
            : 'Sorted by status and market visibility with row-level handling actions.';
    }
}

function marketUrl(market) {
    return market.market_slug
        ? `https://polymarket.com/event/${encodeURIComponent(market.market_slug)}`
        : 'https://polymarket.com';
}

function buildReadyRow(market) {
    const row = document.createElement('article');
    row.className = `ready-row ${STATUS_CLASS[market.reference_status] || ''}`;
    row.tabIndex = 0;

    const title = document.createElement('div');
    title.className = 'ready-main';
    title.innerHTML = `
        <div class="ready-meta">
            <span>${market.category || 'Market'}</span>
            <span>${shortEventId(market.event_id)}</span>
        </div>
        <div class="ready-title">${market.title || '--'}</div>
    `;
    row.appendChild(title);

    const reasonChip = reasonChipForMarket(market);
    const chip = document.createElement('span');
    chip.className = 'reason-chip';
    chip.textContent = reasonChip.label;
    chip.title = reasonChip.title;
    title.appendChild(chip);

    const actionLine = document.createElement('div');
    actionLine.className = 'ready-action-line';
    actionLine.textContent = `${rowActionPhrase(market)}: ${statusActionSubtitle(market)}`;
    title.appendChild(actionLine);

    const stats = document.createElement('div');
    stats.className = 'ready-stats';
    stats.innerHTML = `
        <div><span>Price</span><strong>${displayPrice(market)}</strong></div>
        <div><span>Volume</span><strong>${fmtVol(market.volume || 0)}</strong></div>
        <div><span>Close</span><strong>${closeText(market)}</strong></div>
        <div><span>Status</span><strong>${referenceLabel(market)}</strong></div>
    `;
    row.appendChild(stats);

    const actions = document.createElement('div');
    actions.className = 'ready-actions';
    row.appendChild(actions);

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'sample-btn sample-btn-primary';
    copyBtn.textContent = market.reference_status === 'NOT_STANDALONE' ? 'Copy note' : 'Copy line';
    copyBtn.addEventListener('click', () => copyText(
        suggestedReference(market),
        copyBtn
    ));
    actions.appendChild(copyBtn);

    const link = document.createElement('a');
    link.className = 'sample-btn sample-btn-ghost';
    link.href = marketUrl(market);
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Polymarket';
    actions.appendChild(link);

    const open = event => {
        if (event.target.closest('button, a')) return;
        openBetaPanel(market);
    };
    row.addEventListener('click', open);
    row.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openBetaPanel(market);
    });

    return row;
}

function renderCards(markets) {
    const grid = sampleEid('cards-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!markets.length) {
        const empty = document.createElement('div');
        empty.className = 'loading-card';
        empty.textContent = 'No reference briefing is available right now.';
        grid.appendChild(empty);
        return;
    }

    const byStatus = markets.reduce((acc, market) => {
        if (!acc[market.reference_status]) acc[market.reference_status] = [];
        acc[market.reference_status].push(market);
        return acc;
    }, {});

    GROUPS.forEach(group => {
        const groupMarkets = (byStatus[group.status] || [])
            .slice()
            .sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0))
            .slice(0, group.limit);
        if (!groupMarkets.length) return;

        const wrap = document.createElement('section');
        wrap.className = `status-group ${STATUS_CLASS[group.status] || ''}`;

        const head = document.createElement('div');
        head.className = 'status-group-head';
        head.innerHTML = `
            <div>
                <h3>${group.title}<small>${group.action}</small></h3>
                <p>${group.note}</p>
            </div>
            <span>${groupMarkets.length} shown</span>
        `;
        wrap.appendChild(head);

        const cards = document.createElement('div');
        cards.className = 'ready-list';
        groupMarkets.forEach(market => {
            cards.appendChild(buildReadyRow(market));
        });
        wrap.appendChild(cards);
        grid.appendChild(wrap);
    });
}

async function loadSample() {
    try {
        const accessCode = window.localStorage.getItem(ACCESS_STORAGE_KEY) || '';
        const res = await fetch(API_URL, {
            headers: {
                'x-strata-beta-code': accessCode,
            },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const markets = Array.isArray(data)
            ? data.filter(market => market && market.reference_status)
            : [];
        renderMetrics(markets);
        renderCards(markets);
        setSampleStatus('LIVE');
    } catch (err) {
        setSampleStatus('UNAVAILABLE');
        const grid = sampleEid('cards-grid');
        if (grid) {
            grid.innerHTML = '<div class="loading-card">Reference briefing unavailable. Try again shortly.</div>';
        }
    }
}

setInterval(tickSampleClock, 1000);
tickSampleClock();
initAccessGate();

const betaOverlay = sampleEid('beta-overlay');
if (betaOverlay) betaOverlay.addEventListener('click', closeBetaPanel);
const betaClose = sampleEid('bp-close');
if (betaClose) betaClose.addEventListener('click', closeBetaPanel);
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeBetaPanel();
});
