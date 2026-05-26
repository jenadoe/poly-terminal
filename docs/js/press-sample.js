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
        title: 'Reference Ready Watchlist',
        note: 'High-visibility markets where standard source attribution is enough.',
        limit: 50,
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

function suggestedReference(market) {
    const title = market.title || 'this Polymarket market';
    const price = fmtCents(market.current_price);
    const label = referenceLabel(market);
    const reasons = reasonText(market).join(' ');

    if (market.reference_status === 'READY') {
        return `Polymarket currently prices "${title}" at ${price}. Strata marks this market ${label}: standard source attribution is sufficient for ordinary reference use. This does not mean the odds are correct or predictive.`;
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
}

function marketUrl(market) {
    return market.market_slug
        ? `https://polymarket.com/event/${encodeURIComponent(market.market_slug)}`
        : 'https://polymarket.com';
}

function buildCard(market) {
    const card = document.createElement('article');
    card.className = `reference-card ${STATUS_CLASS[market.reference_status] || ''}`;

    const top = document.createElement('div');
    top.className = 'card-top';
    card.appendChild(top);

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.innerHTML = `<span>${market.category || 'Market'}</span><span>${shortEventId(market.event_id)}</span>`;
    top.appendChild(meta);

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = market.title || '--';
    top.appendChild(title);

    const priceRow = document.createElement('div');
    priceRow.className = 'card-price-row';
    top.appendChild(priceRow);

    const price = document.createElement('div');
    price.className = 'card-price';
    price.textContent = fmtCents(market.current_price);
    priceRow.appendChild(price);

    const status = document.createElement('div');
    status.className = 'status-pill';
    status.textContent = referenceLabel(market);
    priceRow.appendChild(status);

    const details = document.createElement('div');
    details.className = 'card-detail-grid';
    details.innerHTML = `
        <div><span>Volume</span><strong>${fmtVol(market.volume || 0)}</strong></div>
        <div><span>Close</span><strong>${closeText(market)}</strong></div>
        <div><span>Category</span><strong>${market.category || 'Market'}</strong></div>
    `;
    top.appendChild(details);

    const body = document.createElement('div');
    body.className = 'card-body';
    card.appendChild(body);

    const reasonsWrap = document.createElement('div');
    reasonsWrap.innerHTML = '<div class="card-section-label">Reference guidance</div>';
    const action = document.createElement('div');
    action.className = 'action-note';
    action.textContent = statusAction(market);
    reasonsWrap.appendChild(action);
    const reasonLabel = document.createElement('div');
    reasonLabel.className = 'card-section-label card-section-label-nested';
    reasonLabel.textContent = 'Reason';
    reasonsWrap.appendChild(reasonLabel);
    const list = document.createElement('div');
    list.className = 'reason-list';
    reasonText(market).forEach(reason => {
        const item = document.createElement('div');
        item.className = 'reason-item';
        item.textContent = reason;
        list.appendChild(item);
    });
    reasonsWrap.appendChild(list);
    body.appendChild(reasonsWrap);

    const copyWrap = document.createElement('div');
    copyWrap.innerHTML = '<div class="card-section-label">Suggested reference text</div>';
    const copy = document.createElement('div');
    copy.className = 'reference-copy';
    copy.textContent = suggestedReference(market);
    copyWrap.appendChild(copy);
    body.appendChild(copyWrap);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    body.appendChild(actions);

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'sample-btn sample-btn-primary';
    copyBtn.textContent = 'Copy text';
    copyBtn.addEventListener('click', () => copyText(copy.textContent, copyBtn));
    actions.appendChild(copyBtn);

    const link = document.createElement('a');
    link.className = 'sample-btn sample-btn-ghost';
    link.href = marketUrl(market);
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Polymarket';
    actions.appendChild(link);

    return card;
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
        cards.className = 'cards-grid';
        groupMarkets.forEach(market => {
            cards.appendChild(buildCard(market));
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
