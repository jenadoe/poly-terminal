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

    const flagsHTML = flags.map(f => {
        const cls = f === 'Contested' ? 'mf-contested' : 'mf-correlated';
        return `<span class="mkt-flag ${cls}">${f}</span>`;
    }).join('');
    const reason = summarizeMarketReason(m);

    const stableLabel = (state === 'Converged' && m.stable_hours)
        ? `<span class="stable-badge">&#10003; STABLE ${fmtStableHours(m.stable_hours)}</span>`
        : '';

    row.innerHTML = `
        <div class="mkt-inner">
            <div class="mkt-top">
                <div style="min-width:0;flex:1;">
                    <div class="mkt-category">${m.category || ''}</div>
                    <div class="mkt-title">${m.title || '?'}</div>
                </div>
                <div class="nxs-block">
                    <span class="nxs-label">NXS</span>
                    <div class="nxs-num">${Math.round(score)}</div>
                    <span class="nxs-unit">/ 100</span>
                </div>
            </div>
            <div class="mkt-pillars">
                <div class="pillar-bar"><div class="pillar-fill" style="width:${pw[0]}%"></div></div>
                <div class="pillar-bar"><div class="pillar-fill" style="width:${pw[1]}%"></div></div>
                <div class="pillar-bar"><div class="pillar-fill" style="width:${pw[2]}%"></div></div>
                <div class="pillar-bar"><div class="pillar-fill" style="width:${pw[3]}%"></div></div>
            </div>
            <div class="mkt-reason">${reason}</div>
            <div class="mkt-bottom">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    ${stableLabel}
                    <div class="mkt-vol">vol. ${fmtVol(m.volume || 0)}</div>
                </div>
                ${flagsHTML}
            </div>
        </div>
    `;

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
    for (let i = 0; i < 3; i++) {
        const r = document.createElement('div');
        r.className = 'locked-row';
        wrap.appendChild(r);
    }
}
