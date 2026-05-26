const API_URL = '/api/markets';
const ACCESS_STORAGE_KEY = 'strata_reference_preview_access_v1';
const ACCESS_PARAM = 'access';
const ALLOWED_ACCESS_HASHES = new Set([
    '10d480a8004917707cc1ce31e791e670f926f2307f4e15ea6f253a17cdd78585',
    'b188b5e84422a326da511edcf9d3735344a3581790deb4611ff56ee2644462bb',
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
        limit: 25,
    },
    {
        status: 'CONTEXT_REQUIRED',
        title: 'Context Required',
        note: 'Markets whose price should appear only with the stated context.',
        limit: 10,
    },
    {
        status: 'REVIEW_RECOMMENDED',
        title: 'Review Recommended',
        note: 'Markets that need extra scrutiny before being used as standalone references.',
        limit: 10,
    },
    {
        status: 'NOT_STANDALONE',
        title: 'Not Standalone',
        note: 'Markets that should not appear as isolated price references.',
        limit: 6,
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

function cleanAccessParam() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(ACCESS_PARAM)) return;
    url.searchParams.delete(ACCESS_PARAM);
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

async function initAccessGate() {
    document.body.classList.add('sample-locked');
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get(ACCESS_PARAM);
    const storedCode = window.localStorage.getItem(ACCESS_STORAGE_KEY);
    const initialCode = urlCode || storedCode;

    if (await isAllowedCode(initialCode)) {
        if (urlCode) window.localStorage.setItem(ACCESS_STORAGE_KEY, urlCode.trim());
        cleanAccessParam();
        unlockSample();
        loadSample();
        return;
    }

    cleanAccessParam();
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
    meta.innerHTML = `<span>${market.category || 'Market'}</span><span>vol. ${fmtVol(market.volume || 0)}</span>`;
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

    const body = document.createElement('div');
    body.className = 'card-body';
    card.appendChild(body);

    const reasonsWrap = document.createElement('div');
    reasonsWrap.innerHTML = '<div class="card-section-label">Reason</div>';
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
        empty.textContent = 'No public reference-safety sample is available right now.';
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

function renderApiExample(markets) {
    const el = sampleEid('api-example');
    if (!el || !markets.length) return;
    const market = markets.find(item => item.reference_status === 'REVIEW_RECOMMENDED') || markets[0];
    el.textContent = JSON.stringify({
        event_id: market.event_id,
        reference_status: market.reference_status,
        reference_label: market.reference_label,
        reference_action: market.reference_action,
        reference_reasons: market.reference_reasons,
        disclaimer: 'Reference status reflects context risk, not predictive accuracy or market quality.',
    }, null, 2);
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
        renderApiExample(markets);
        setSampleStatus('LIVE');
    } catch (err) {
        setSampleStatus('UNAVAILABLE');
        const grid = sampleEid('cards-grid');
        if (grid) {
            grid.innerHTML = '<div class="loading-card">Reference sample unavailable. Try again shortly.</div>';
        }
    }
}

setInterval(tickSampleClock, 1000);
tickSampleClock();
initAccessGate();
