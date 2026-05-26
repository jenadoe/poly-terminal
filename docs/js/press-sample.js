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
const GROUPS = [
    {
        status: 'READY',
        title: 'Ready for Reference',
        note: 'Standard source attribution is enough. Ready does not mean the probability is correct or predictive.',
        limit: 50,
        compact: true,
    },
    {
        status: 'CONTEXT_REQUIRED',
        title: 'Context Required',
        note: 'Markets whose price should appear only with the stated context.',
        limit: 50,
    },
    {
        status: 'REVIEW_RECOMMENDED',
        title: 'Review Recommended',
        note: 'Markets that need extra scrutiny before being used as standalone references.',
        limit: 50,
    },
    {
        status: 'NOT_STANDALONE',
        title: 'Not Standalone',
        note: 'Markets that should not appear as isolated price references.',
        limit: 50,
    },
];

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

function reasonText(market) {
    const reasons = Array.isArray(market.reference_reasons)
        ? market.reference_reasons.filter(Boolean)
        : [];
    if (reasons.length) return reasons;
    if (market.reference_action) return [market.reference_action];
    return ['Reference-safety status is available for this market.'];
}

function shortEventId(id) {
    if (!id) return '--';
    const value = String(id);
    return value.length > 10 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

function closeText(market) {
    if (typeof calcClosesIn === 'function') {
        return calcClosesIn(market.close_time);
    }
    if (!market.close_time) return '--';
    const close = new Date(market.close_time);
    if (Number.isNaN(close.getTime())) return '--';
    return close.toISOString().slice(0, 10);
}

function statusAction(market) {
    if (market.reference_action) return market.reference_action;
    if (market.reference_status === 'READY') return 'Standard source attribution is enough.';
    if (market.reference_status === 'CONTEXT_REQUIRED') return 'Keep the stated context with the price.';
    if (market.reference_status === 'REVIEW_RECOMMENDED') return 'Review before using as a standalone reference.';
    if (market.reference_status === 'NOT_STANDALONE') return 'Do not present this price by itself.';
    return 'Review the reference posture before use.';
}

function displayPrice(market) {
    return fmtOutcomePct(market.current_price);
}

function suggestedReference(market) {
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
        return `Polymarket currently prices "${title}" at ${price}. Strata marks this market ${label}. Treat the price as requiring additional review before it is used as a standalone reference. Reason: ${reasons}`;
    }

    if (market.reference_status === 'NOT_STANDALONE') {
        return `Polymarket currently prices "${title}" at ${price}. Strata marks this market ${label}. Do not present this price by itself; it needs substantial surrounding context. Reason: ${reasons}`;
    }

    return `Polymarket currently prices "${title}" at ${price}. Strata reference status: ${label}.`;
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
        note.textContent = counts.CONTEXT_REQUIRED
            ? 'Sorted by status and market visibility.'
            : 'No Context Required markets are present in the current top-volume briefing.';
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

    const stats = document.createElement('div');
    stats.className = 'ready-stats';
    stats.innerHTML = `
        <div><span>Price</span><strong>${displayPrice(market)}</strong></div>
        <div><span>Volume</span><strong>${fmtVol(market.volume || 0)}</strong></div>
        <div><span>Close</span><strong>${closeText(market)}</strong></div>
        <div><span>Status</span><strong>${referenceLabel(market)}</strong></div>
    `;
    row.appendChild(stats);

    const note = document.createElement('div');
    note.className = 'ready-note';
    const reasons = reasonText(market).join(' ');
    note.innerHTML = `
        <span>${market.reference_status === 'NOT_STANDALONE' ? 'Handling note' : 'Guidance'}</span>
        <strong>${statusAction(market)}</strong>
        <em>${reasons}</em>
    `;
    row.appendChild(note);

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

    const toggle = event => {
        if (event.target.closest('button, a')) return;
        row.classList.toggle('is-open');
    };
    row.addEventListener('click', toggle);
    row.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        row.classList.toggle('is-open');
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
                <h3>${group.title}</h3>
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
        const res = await fetch(API_URL);
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
