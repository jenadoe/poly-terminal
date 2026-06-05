/* MATRIX */

const MARKET_RENDER_BATCH = 18;
let marketRenderToken = 0;

const QS_COLUMNS = {
    SAFE_TO_CITE: {
        col: 'ch-quote-safe',
        label: 'Ready',
        action: 'Cite with source',
        desc: 'Use as a Polymarket reference with source and as-of date',
    },
    CITE_WITH_CONTEXT: {
        col: 'ch-quote-context',
        label: 'Context Required',
        action: 'Attach context',
        desc: 'Keep option, wording, timing, or rule details attached',
    },
    REVIEW_FIRST: {
        col: 'ch-quote-review',
        label: 'Review Recommended',
        action: 'Check belief read',
        desc: 'Inspect wording, confirmation timing, resolution criteria, or sensitivity',
    },
    DO_NOT_CITE_STANDALONE: {
        col: 'ch-quote-stop',
        label: 'Not Standalone',
        action: 'Do not quote alone',
        desc: 'Use only with broader explanation or full market context',
    },
};

const STATE_COLUMNS = ['Converged', 'Calibrating', 'Fragile'];
const QUOTE_COLUMNS = ['SAFE_TO_CITE', 'CITE_WITH_CONTEXT', 'REVIEW_FIRST', 'DO_NOT_CITE_STANDALONE'];

function displayCitationGroup(status) {
    return status || 'UNKNOWN';
}

function citationAction(status) {
    return QS_COLUMNS[displayCitationGroup(status)]?.action || 'Review handling';
}

function buildRow(m) {
    const state = m.display_state || 'Fragile';
    const cfg = SC[state] || SC.Fragile;
    const score = m.nexus_score || 0;
    const flags = getFlags(m);
    const rowClass = m.citation_status
        ? `r-${citationStatusClass(displayCitationGroup(m.citation_status))}`
        : cfg.row;

    const row = document.createElement('div');
    row.className = `mkt-row ${rowClass}`;
    const inner = appendElement(row, 'div', null, 'mkt-inner');
    const top = appendElement(inner, 'div', null, 'mkt-top');
    const titleWrap = appendElement(top, 'div');
    titleWrap.style.minWidth = '0';
    titleWrap.style.flex = '1';
    appendElement(titleWrap, 'div', m.category || '', 'mkt-category');
    appendElement(titleWrap, 'div', m.title || '?', 'mkt-title');

    const nxsBlock = appendElement(top, 'div', null, 'nxs-block');
    if (m.citation_status) {
        appendElement(nxsBlock, 'span', 'Odds', 'nxs-label');
        appendElement(nxsBlock, 'div', fmtCents(m.current_price), 'nxs-num quote-odds');
        appendElement(
            nxsBlock,
            'span',
            formatCitationStatus(m.citation_status),
            `nxs-unit ${citationStatusClass(m.citation_status)}`
        );
    } else {
        appendElement(nxsBlock, 'span', 'Score', 'nxs-label');
        appendElement(nxsBlock, 'div', Math.round(score), 'nxs-num');
        appendElement(nxsBlock, 'span', '/ 100', 'nxs-unit');
    }

    const bottom = appendElement(inner, 'div', null, 'mkt-bottom');
    const meta = appendElement(bottom, 'div');
    meta.style.display = 'flex';
    meta.style.alignItems = 'center';
    meta.style.gap = '8px';
    meta.style.flexWrap = 'wrap';

    if (state === 'Converged' && m.stable_hours) {
        appendElement(meta, 'span', `✓ STABLE ${fmtStableHours(m.stable_hours)}`, 'stable-badge');
    }
    if (m.citation_status) meta.classList.add('quote-meta-compact');
    appendElement(meta, 'div', `vol. ${fmtVol(m.volume || 0)}`, 'mkt-vol');

    const flagsWrap = appendElement(bottom, 'div');
    flags.forEach(flag => {
        const cls = flag === 'Contested' ? 'mf-contested' : 'mf-correlated';
        appendElement(flagsWrap, 'span', flag, `mkt-flag ${cls}`);
    });

    row.addEventListener('click', () => openPanel(m));
    return row;
}

function groupMarketsByState(markets) {
    const grouped = Object.fromEntries(STATE_COLUMNS.map(state => [state, []]));

    markets.forEach(market => {
        const state = market.display_state || 'Calibrating';
        if (!grouped[state]) return;
        grouped[state].push(market);
    });

    return grouped;
}

function groupMarketsByCitationStatus(markets) {
    const grouped = Object.fromEntries(QUOTE_COLUMNS.map(status => [status, []]));

    markets.forEach(market => {
        const group = displayCitationGroup(market.citation_status);
        if (!grouped[group]) return;
        grouped[group].push(market);
    });

    return grouped;
}

function hasCitationSurface(markets) {
    return markets.some(market => market.citation_status);
}

function columnConfig(mode, key) {
    if (mode === 'quote') return QS_COLUMNS[key];
    return SC[key];
}

function columnLabel(mode, key) {
    if (mode === 'quote') return QS_COLUMNS[key].label;
    return key;
}

function buildColumnHead(mode, key, count) {
    const cfg = columnConfig(mode, key);
    const head = document.createElement('div');
    head.className = `col-head ${cfg.col}`;
    appendElement(head, 'span', `${count} shown`, 'col-count');
    appendElement(head, 'div', columnLabel(mode, key), `col-state ${mode === 'quote' ? citationStatusClass(key) : `cs-${key.toLowerCase()}`}`);
    if (mode === 'quote' && cfg.action) {
        appendElement(head, 'div', cfg.action, `col-action ${citationStatusClass(key)}`);
    }
    appendElement(head, 'div', cfg.desc, 'col-desc');
    return head;
}

function appendMarketBatch(col, group, startIndex, token) {
    if (!col || token !== marketRenderToken) return;

    const endIndex = Math.min(startIndex + MARKET_RENDER_BATCH, group.length);
    const frag = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i += 1) {
        frag.appendChild(buildRow(group[i]));
    }
    col.appendChild(frag);

    if (endIndex < group.length) {
        requestAnimationFrame(() => appendMarketBatch(col, group, endIndex, token));
    }
}

function renderMarkets(markets, emptyMessage) {
    const token = ++marketRenderToken;
    const mode = markets.length > 0 && !hasCitationSurface(markets) ? 'state' : 'quote';
    const matrix = eid('state-matrix');
    const health = eid('health');
    if (health) health.style.display = mode === 'quote' ? 'none' : 'block';
    const shown = eid('shown-count');
    if (shown) shown.textContent = markets.length;
    syncLockedCount();
    renderQuoteSafetySummary(markets, mode);
    const blankText = emptyMessage || (mode === 'quote' ? 'No markets in this citation status' : 'No markets in this state');
    const grouped = mode === 'quote' ? groupMarketsByCitationStatus(markets) : groupMarketsByState(markets);
    const columns = mode === 'quote' ? QUOTE_COLUMNS : STATE_COLUMNS;
    const title = eid('matrix-title');
    if (title) {
        title.textContent = mode === 'quote'
            ? 'Reference Safety Board - highest-priority public markets by status action'
            : 'Integrity State Matrix - highest-priority public markets by structural state';
    }
    if (!matrix) return;
    matrix.innerHTML = '';
    matrix.className = `state-matrix ${mode === 'quote' ? 'quote-matrix' : 'state-mode'}`;

    columns.forEach(key => {
        const col = document.createElement('div');
        col.className = 'state-col';
        matrix.appendChild(col);
        const group = grouped[key];
        const frag = document.createDocumentFragment();
        frag.appendChild(buildColumnHead(mode, key, group.length));

        if (group.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'col-empty';
            empty.textContent = blankText;
            frag.appendChild(empty);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'col-loading';
            placeholder.textContent = 'Loading markets...';
            frag.appendChild(placeholder);
        }

        col.appendChild(frag);

        if (group.length > 0) {
            const placeholder = col.querySelector('.col-loading');
            requestAnimationFrame(() => {
                if (token !== marketRenderToken || !col.isConnected) return;
                if (placeholder && placeholder.parentNode === col) {
                    col.removeChild(placeholder);
                }
                appendMarketBatch(col, group, 0, token);
            });
        }
    });

    renderLockedRows(mode);
}

function renderQuoteSafetySummary(markets, mode = 'quote') {
    const section = eid('quote-safety-summary');
    if (!section) return;
    if (mode !== 'quote') {
        section.style.display = 'none';
        return;
    }
    const withCitation = markets.filter(market => market.citation_status);

    const counts = {
        SAFE_TO_CITE: 0,
        CITE_WITH_CONTEXT: 0,
        REVIEW_FIRST: 0,
        DO_NOT_CITE_STANDALONE: 0,
    };
    withCitation.forEach(market => {
        if (counts[market.citation_status] != null) counts[market.citation_status] += 1;
    });

    section.style.display = 'block';
    const fields = [
        ['qs-safe', counts.SAFE_TO_CITE],
        ['qs-context', counts.CITE_WITH_CONTEXT],
        ['qs-review', counts.REVIEW_FIRST],
        ['qs-stop', counts.DO_NOT_CITE_STANDALONE],
    ];
    fields.forEach(([id, count]) => {
        const el = eid(id);
        if (el) el.textContent = count;
    });
}

function syncLockedCount() {
    const shownRaw = eid('shown-count')?.textContent || '';
    const totalTrackedRaw = eid('total-tracked')?.textContent || '';
    const shownCount = /^\d+$/.test(String(shownRaw)) ? Number(shownRaw) : null;
    const totalTracked = /^\d+$/.test(String(totalTrackedRaw)) ? Number(totalTrackedRaw) : null;
    const locked = eid('locked-count');
    if (!locked) return;
    locked.textContent =
        totalTracked != null && shownCount != null
            ? Math.max(0, totalTracked - shownCount)
            : '--';
}

function renderLockedRows(mode = 'state') {
    const wrap = eid('locked-rows-inner');
    if (!wrap) return;
    wrap.innerHTML = '';
    const quoteMode = mode === 'quote';
    const ghosts = quoteMode ? [
        {
            citation_status: 'SAFE_TO_CITE',
            price: 0.42,
            vol: '$8.7M',
            cat: 'MARKET',
            title: 'Additional reference-ready market',
        },
        {
            citation_status: 'CITE_WITH_CONTEXT',
            price: 0.58,
            vol: '$3.1M',
            cat: 'POLICY',
            title: 'Additional context-required market',
        },
        {
            citation_status: 'REVIEW_FIRST',
            price: 0.61,
            vol: '$2.4M',
            cat: 'POLITICS',
            title: 'Additional review-recommended market',
        },
        {
            citation_status: 'DO_NOT_CITE_STANDALONE',
            price: 0.74,
            vol: '$940K',
            cat: 'WORLD',
            title: 'Additional not-standalone market',
        },
    ] : [
        {
            state: 'Converged',
            score: 87,
            vol: '$4.2M',
            cat: 'POLITICS',
            title: 'Will the Fed cut rates before Q3 2026?',
        },
        {
            state: 'Calibrating',
            score: 61,
            vol: '$1.8M',
            cat: 'CRYPTO',
            title: 'BTC above $120K before end of 2026?',
        },
        {
            state: 'Fragile',
            score: 28,
            vol: '$390K',
            cat: 'GEOPOLITICS',
            title: 'Ceasefire agreement reached by June 2026?',
        },
    ];

    ghosts.forEach(ghost => {
        const cfg = SC[ghost.state] || SC.Fragile;
        const statusClass = ghost.citation_status ? citationStatusClass(ghost.citation_status) : null;

        const row = document.createElement('div');
        row.className = `locked-row mkt-row ${statusClass ? `r-${statusClass}` : cfg.row}`;

        const inner = appendElement(row, 'div', null, 'mkt-inner');

        const top = appendElement(inner, 'div', null, 'mkt-top');
        const titleWrap = appendElement(top, 'div');
        titleWrap.style.minWidth = '0';
        titleWrap.style.flex = '1';
        appendElement(titleWrap, 'div', ghost.cat, 'mkt-category');
        appendElement(titleWrap, 'div', ghost.title, 'mkt-title');

        const nxs = appendElement(top, 'div', null, 'nxs-block');
        if (ghost.citation_status) {
            appendElement(nxs, 'span', 'Odds', 'nxs-label');
            appendElement(nxs, 'div', fmtCents(ghost.price), 'nxs-num quote-odds');
            appendElement(nxs, 'span', formatCitationStatus(ghost.citation_status), `nxs-unit ${statusClass}`);
        } else {
            appendElement(nxs, 'span', 'Score', 'nxs-label');
            appendElement(nxs, 'div', ghost.score, 'nxs-num');
            appendElement(nxs, 'span', '/ 100', 'nxs-unit');
        }

        const bottom = appendElement(inner, 'div', null, 'mkt-bottom');
        const meta = appendElement(bottom, 'div');
        if (ghost.citation_status) meta.classList.add('quote-meta-compact');
        appendElement(meta, 'div', `vol. ${ghost.vol}`, 'mkt-vol');

        wrap.appendChild(row);
    });
}
