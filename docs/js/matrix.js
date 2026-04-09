/* MATRIX */

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

    const row = document.createElement('div');
    row.className = `mkt-row ${cfg.row}`;
    const inner = appendElement(row, 'div', null, 'mkt-inner');
    const top = appendElement(inner, 'div', null, 'mkt-top');
    const titleWrap = appendElement(top, 'div');
    titleWrap.style.minWidth = '0';
    titleWrap.style.flex = '1';
    appendElement(titleWrap, 'div', m.category || '', 'mkt-category');
    appendElement(titleWrap, 'div', m.title || '?', 'mkt-title');

    const nxsBlock = appendElement(top, 'div', null, 'nxs-block');
    appendElement(nxsBlock, 'span', 'Score', 'nxs-label');
    appendElement(nxsBlock, 'div', Math.round(score), 'nxs-num');
    appendElement(nxsBlock, 'span', '/ 100', 'nxs-unit');

    const pillars = appendElement(inner, 'div', null, 'mkt-pillars');
    pw.forEach(width => {
        const bar = appendElement(pillars, 'div', null, 'pillar-bar');
        const fill = appendElement(bar, 'div', null, 'pillar-fill');
        fill.style.width = `${width}%`;
    });

    const bottom = appendElement(inner, 'div', null, 'mkt-bottom');
    const meta = appendElement(bottom, 'div');
    meta.style.display = 'flex';
    meta.style.alignItems = 'center';
    meta.style.gap = '8px';
    meta.style.flexWrap = 'wrap';

    if (state === 'Converged' && m.stable_hours) {
        appendElement(meta, 'span', `✓ STABLE ${fmtStableHours(m.stable_hours)}`, 'stable-badge');
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

function renderMarkets(markets, emptyMessage) {
    const shown = eid('shown-count');
    if (shown) shown.textContent = markets.length;
    const totalTracked = Number(eid('total-tracked')?.textContent || 0);
    const locked = eid('locked-count');
    if (locked) locked.textContent = totalTracked > 0 ? Math.max(0, totalTracked - markets.length) : '--';
    const blankText = emptyMessage || 'No markets in this state';

    ['Converged', 'Calibrating', 'Fragile'].forEach(state => {
        const col = eid(`col-${state}`);
        if (!col) return;
        col.innerHTML = '';

        const group = markets.filter(m => (m.display_state || 'Calibrating') === state);
        const cfg = SC[state];

        const head = document.createElement('div');
        head.className = `col-head ${cfg.col}`;
        head.innerHTML = `
            <span class="col-count">${group.length} shown</span>
            <div class="col-state cs-${state.toLowerCase()}">${state}</div>
            <div class="col-desc">${cfg.desc}</div>
        `;
        col.appendChild(head);

        if (group.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'col-empty';
            empty.textContent = blankText;
            col.appendChild(empty);
        } else {
            group.forEach(m => col.appendChild(buildRow(m)));
        }
    });

    renderLockedRows();
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
