/* MATRIX */

const MARKET_RENDER_BATCH = 18;
let marketRenderToken = 0;

const QS_COLUMNS = {
    SAFE_TO_CITE: {
        col: 'ch-quote-safe',
        label: 'Ready',
        desc: 'Standard attribution is enough',
    },
    REVIEW_FIRST: {
        col: 'ch-quote-review',
        label: 'Review Recommended',
        desc: 'Secondary review advised',
    },
    DO_NOT_CITE_STANDALONE: {
        col: 'ch-quote-stop',
        label: 'Not Standalone',
        desc: 'Do not show by itself',
    },
};

const STATE_COLUMNS = ['Converged', 'Calibrating', 'Fragile'];
const QUOTE_COLUMNS = ['SAFE_TO_CITE', 'REVIEW_FIRST', 'DO_NOT_CITE_STANDALONE'];

function displayCitationGroup(status) {
    return status === 'CITE_WITH_CONTEXT' ? 'SAFE_TO_CITE' : status;
}

function pillarWidths(market) {
    // The public dashboard does not receive true backend pillar sub-scores yet.
    // Keep the 4-bar visual for a future premium surface, but derive it from
    // real public fields instead of randomness.
    const score = Number(market.nexus_score) || 0;
    const volume = Number(market.volume) || 0;
    const stableHours = Number(market.stable_hours) || 0;
    const flags = getFlags(market);
    const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
    const trackedPrice = market.current_price != null ? parseFloat(market.current_price) : null;

    const capitalDepth = Math.max(12, Math.min(98, Math.round((Math.log10(Math.max(volume, 1)) / 8) * 100)));
    const marketEfficiency = Math.max(12, Math.min(98, Math.round(score)));
    const independencePenalty = (flags.includes('Correlated') ? 18 : 0) + (flags.includes('Contested') ? 28 : 0);
    const infoIndependence = Math.max(12, Math.min(98, 92 - independencePenalty));

    let convergenceBase = score;
    if (stableHours > 0) convergenceBase = Math.min(98, convergenceBase + Math.min(stableHours / 3, 18));
    if (trackedPrice != null) convergenceBase -= Math.abs(0.5 - trackedPrice) * 18;
    if (outcomes.length > 2) convergenceBase -= Math.min((outcomes.length - 2) * 4, 12);
    const convergenceStability = Math.max(12, Math.min(98, Math.round(convergenceBase)));

    return [capitalDepth, marketEfficiency, infoIndependence, convergenceStability];
}

function buildRow(m) {
    const state = m.display_state || 'Fragile';
    const cfg = SC[state] || SC.Fragile;
    const score = m.nexus_score || 0;
    const flags = getFlags(m);
    const pw = pillarWidths(m);
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
            formatCitationStatus(displayCitationGroup(m.citation_status)),
            `nxs-unit ${citationStatusClass(displayCitationGroup(m.citation_status))}`
        );
    } else {
        appendElement(nxsBlock, 'span', 'Score', 'nxs-label');
        appendElement(nxsBlock, 'div', Math.round(score), 'nxs-num');
        appendElement(nxsBlock, 'span', '/ 100', 'nxs-unit');
    }

    if (!m.citation_status) {
        const pillars = appendElement(inner, 'div', null, 'mkt-pillars');
        pw.forEach(width => {
            const bar = appendElement(pillars, 'div', null, 'pillar-bar');
            const fill = appendElement(bar, 'div', null, 'pillar-fill');
            fill.style.width = `${width}%`;
        });
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
    if (m.citation_status) {
        appendElement(
            meta,
            'span',
            formatCitationStatus(displayCitationGroup(m.citation_status)),
            `quote-badge ${citationStatusClass(displayCitationGroup(m.citation_status))}`
        );
        if (m.citation_status === 'CITE_WITH_CONTEXT') {
            appendElement(meta, 'span', formatCitationStatus(m.citation_status), 'quote-badge quote-context');
        }
    }
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
    const mode = hasCitationSurface(markets) ? 'quote' : 'state';
    const matrix = eid('state-matrix');
    const health = eid('health');
    if (health) health.style.display = mode === 'quote' ? 'none' : 'block';
    const shown = eid('shown-count');
    if (shown) shown.textContent = markets.length;
    syncLockedCount();
    renderQuoteSafetySummary(markets);
    const blankText = emptyMessage || (mode === 'quote' ? 'No markets in this citation status' : 'No markets in this state');
    const grouped = mode === 'quote' ? groupMarketsByCitationStatus(markets) : groupMarketsByState(markets);
    const columns = mode === 'quote' ? QUOTE_COLUMNS : STATE_COLUMNS;
    const title = eid('matrix-title');
    if (title) {
        title.textContent = mode === 'quote'
            ? 'Reference Safety Board - highest-priority public markets by status'
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

    renderLockedRows();
}

function renderQuoteSafetySummary(markets) {
    const section = eid('quote-safety-summary');
    if (!section) return;
    const withCitation = markets.filter(market => market.citation_status);
    if (!withCitation.length) {
        section.style.display = 'none';
        return;
    }

    const counts = {
        SAFE_TO_CITE: 0,
        CITE_WITH_CONTEXT: 0,
        REVIEW_FIRST: 0,
        DO_NOT_CITE_STANDALONE: 0,
    };
    withCitation.forEach(market => {
        if (market.citation_status === 'CITE_WITH_CONTEXT') {
            counts.SAFE_TO_CITE += 1;
            counts.CITE_WITH_CONTEXT += 1;
            return;
        }
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

function renderLockedRows() {
    const wrap = eid('locked-rows-inner');
    if (!wrap) return;
    wrap.innerHTML = '';
    const ghosts = [
        {
            state: 'Converged',
            score: 87,
            vol: '$4.2M',
            cat: 'POLITICS',
            title: 'Will the Fed cut rates before Q3 2026?',
            pillars: [72, 85, 61, 78],
        },
        {
            state: 'Calibrating',
            score: 61,
            vol: '$1.8M',
            cat: 'CRYPTO',
            title: 'BTC above $120K before end of 2026?',
            pillars: [64, 58, 52, 66],
        },
        {
            state: 'Fragile',
            score: 28,
            vol: '$390K',
            cat: 'GEOPOLITICS',
            title: 'Ceasefire agreement reached by June 2026?',
            pillars: [34, 27, 49, 22],
        },
    ];

    ghosts.forEach(ghost => {
        const cfg = SC[ghost.state] || SC.Fragile;

        const row = document.createElement('div');
        row.className = `locked-row mkt-row ${cfg.row}`;

        const inner = appendElement(row, 'div', null, 'mkt-inner');

        const top = appendElement(inner, 'div', null, 'mkt-top');
        const titleWrap = appendElement(top, 'div');
        titleWrap.style.minWidth = '0';
        titleWrap.style.flex = '1';
        appendElement(titleWrap, 'div', ghost.cat, 'mkt-category');
        appendElement(titleWrap, 'div', ghost.title, 'mkt-title');

        const nxs = appendElement(top, 'div', null, 'nxs-block');
        appendElement(nxs, 'span', 'Score', 'nxs-label');
        appendElement(nxs, 'div', ghost.score, 'nxs-num');
        appendElement(nxs, 'span', '/ 100', 'nxs-unit');

        const pillars = appendElement(inner, 'div', null, 'mkt-pillars');
        ghost.pillars.forEach(width => {
            const bar = appendElement(pillars, 'div', null, 'pillar-bar');
            const fill = appendElement(bar, 'div', null, 'pillar-fill');
            fill.style.width = `${width}%`;
        });

        const bottom = appendElement(inner, 'div', null, 'mkt-bottom');
        const meta = appendElement(bottom, 'div');
        appendElement(meta, 'div', `vol. ${ghost.vol}`, 'mkt-vol');

        wrap.appendChild(row);
    });
}
