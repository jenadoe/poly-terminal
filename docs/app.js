/* ============================================================
   POLY-NEXUS ? app.js
   State Matrix ? Amber/Slate ? Terminal UI
   ============================================================ */

/* ?? CONFIG ?? */
const _cfg = window.POLY_NEXUS_CONFIG || {};
const WORKER_URL = (_cfg.workerUrl || _cfg.apiBaseUrl || '').replace(/\/$/, '');
const DASHBOARD_ENDPOINT = _cfg.dashboardEndpoint || (WORKER_URL ? `${WORKER_URL}/dashboard` : '');
const MARKET_DETAIL_ENDPOINT = _cfg.marketDetailEndpoint || (WORKER_URL ? `${WORKER_URL}/market` : '');
let DASHBOARD_CACHE = null;
const MARKET_DETAIL_CACHE = new Map();
let ACTIVE_PANEL_EVENT_ID = null;

/* ?? STATE CONFIG ?? */
const SC = {
    Converged:   { col: 'ch-converged',   row: 'r-converged',   badge: 'ssb-c', label: 'Converged',   desc: 'Structural consensus locked' },
    Calibrating: { col: 'ch-calibrating', row: 'r-calibrating', badge: 'ssb-a', label: 'Calibrating', desc: 'Price discovery in progress' },
    Fragile:     { col: 'ch-fragile',     row: 'r-fragile',     badge: 'ssb-f', label: 'Fragile',     desc: 'Structural weakness detected' },
};

/* ?? MOCK DATA ?? */
const MOCK_MARKETS = [
    { event_id:'1', title:'Will Finland win Eurovision 2026?', category:'Culture', display_state:'Converged', nexus_score:92.6, flags:[], current_price:0.376, volume:28353653, time_to_close_days:null, market_slug:'eurovision-2026', top_outcome_name:'Finland', stable_hours:51,
      outcomes:[{name:'Finland',price:0.376,is_tracked:true},{name:'Denmark',price:0.128,is_tracked:false},{name:'France',price:0.125,is_tracked:false},{name:'Greece',price:0.0715,is_tracked:false},{name:'Australia',price:0.051,is_tracked:false}]},
    { event_id:'2', title:'Will Chong Won-oh win the 2026 Seoul Mayoral Election?', category:'Politics', display_state:'Converged', nexus_score:92.5, flags:[], current_price:0.805, volume:6729339, time_to_close_days:null, market_slug:'seoul-election', top_outcome_name:'Chong Won-oh', stable_hours:362,
      outcomes:[{name:'Chong Won-oh',price:0.805,is_tracked:true},{name:'Oh Se-hoon',price:0.125,is_tracked:false},{name:'Park Ju-min',price:0.066,is_tracked:false},{name:'Jeon Hyun-heui',price:0.002,is_tracked:false}]},
    { event_id:'3', title:'Will Luiz In?cio Lula da Silva win the 2026 Brazilian presidential election?', category:'World', display_state:'Converged', nexus_score:91.1, flags:[], current_price:0.415, volume:28220794, time_to_close_days:null, market_slug:'brazil-election', top_outcome_name:'Lula da Silva', stable_hours:51,
      outcomes:[{name:'Lula da Silva',price:0.415,is_tracked:true},{name:'Bolsonaro',price:0.21,is_tracked:false},{name:'Other',price:0.12,is_tracked:false}]},
    { event_id:'4', title:'Will the US confirm that aliens exist before 2027?', category:'Culture', display_state:'Calibrating', nexus_score:94.8, flags:[], current_price:0.165, volume:19493974, time_to_close_days:null, market_slug:'aliens-2027', top_outcome_name:null, stable_hours:null, outcomes:[] },
    { event_id:'5', title:'Will Jordan Bardella win the 2027 French presidential election?', category:'Elections', display_state:'Calibrating', nexus_score:93.3, flags:[], current_price:0.255, volume:17283026, time_to_close_days:null, market_slug:'france-bardella', top_outcome_name:'Jordan Bardella', stable_hours:null,
      outcomes:[{name:'Jordan Bardella',price:0.255,is_tracked:true},{name:'Marine Le Pen',price:0.18,is_tracked:false},{name:'Emmanuel Macron',price:0.12,is_tracked:false}]},
    { event_id:'6', title:'Will Jesus Christ return before 2027?', category:'Culture', display_state:'Calibrating', nexus_score:93.1, flags:[], current_price:0.038, volume:48150520, time_to_close_days:null, market_slug:'jesus-return', top_outcome_name:null, stable_hours:null, outcomes:[] },
    { event_id:'7', title:'Will Bayern Munich win the 2025?26 Bundesliga?', category:'Sports', display_state:'Fragile', nexus_score:59.9, flags:[], current_price:0.986, volume:1438859, time_to_close_days:null, market_slug:'bundesliga-2026', top_outcome_name:'Bayern Munich', stable_hours:null,
      outcomes:[{name:'Bayern Munich',price:0.986,is_tracked:true},{name:'Other',price:0.008,is_tracked:false}]},
    { event_id:'8', title:'Will the US officially declare war on Iran by December 31, 2026?', category:'World', display_state:'Fragile', nexus_score:58.9, flags:[], current_price:0.085, volume:3625028, time_to_close_days:null, market_slug:'iran-war-2026', top_outcome_name:null, stable_hours:null, outcomes:[] },
    { event_id:'9', title:'Kharg Island no longer under Iranian control by April 30?', category:'Politics', display_state:'Fragile', nexus_score:58.4, flags:[], current_price:0.370, volume:3755636, time_to_close_days:null, market_slug:'kharg-island', top_outcome_name:null, stable_hours:null, outcomes:[] },
];
const MOCK_KPIS = { total_markets:149, converged_count:29, calibrating_count:83, fragile_count:34, contested_count:8, correlated_count:12 };

/* ?? UTILS ?? */
function fmtVol(n) {
    if (n >= 1e9) return '$' + (n/1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n/1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n/1e3).toFixed(0) + 'K';
    return '$' + Math.round(n);
}
function fmtStableHours(h) {
    if (!h || h <= 0) return null;
    if (h < 24) return Math.round(h) + 'h';
    const days = Math.floor(h / 24);
    const rem  = Math.round(h % 24);
    return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}
function fmtOutcomePct(p) {
    if (p == null || p === 0) return '<1%';
    const pct = p * 100;
    if (pct < 1)   return '<1%';
    if (pct >= 99) return '>99%';
    if (pct >= 10) return Math.round(pct) + '%';
    return pct.toFixed(1) + '%';
}
function fmtCents(p) {
    if (p == null) return '?';
    const c = Math.round(p * 100);
    if (c >= 99) return '>99?';
    if (c < 1)   return '<1?';
    return c + '?';
}
function animCount(el, target, ms) {
    if (!el) return;
    ms = ms || 700;
    const s = performance.now();
    const run = now => {
        const p = Math.min((now - s) / ms, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * e);
        if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
}
function getFlags(d) { return Array.isArray(d.flags) ? d.flags : []; }
function eid(id) { return document.getElementById(id); }
function mapState(raw) {
    if (raw === 'Converged') return 'Converged';
    if (raw === 'Fragile' || raw === 'Low Confidence') return 'Fragile';
    return 'Calibrating';
}
function mapRemoteMarket(m) {
    const sparkline = Array.isArray(m.sparkline)
        ? m.sparkline.map(pt => pt && typeof pt.p === 'number' ? pt.p : null).filter(v => v != null)
        : [];
    return {
        event_id: String(m.id || m.event_id || ''),
        title: m.question || m.title || 'Untitled market',
        category: m.category || 'Uncategorized',
        display_state: mapState(m.market_state || m.display_state),
        nexus_score: typeof m.nexus_score === 'number' ? m.nexus_score : 0,
        flags: Array.isArray(m.flags) ? m.flags : [],
        current_price: typeof m.current_price === 'number' ? m.current_price : null,
        volume: typeof m.volume === 'number' ? m.volume : 0,
        time_to_close_days: typeof m.time_to_close_days === 'number' ? m.time_to_close_days : null,
        market_slug: m.slug || m.market_slug || '',
        top_outcome_name: m.top_outcome_name || null,
        stable_hours: typeof m.stable_hours === 'number' ? m.stable_hours : null,
        outcomes: Array.isArray(m.outcomes) ? m.outcomes : [],
        sparkline,
    };
}
function normalizeDashboardPayload(payload) {
    const rawMarkets = Array.isArray(payload?.markets)
        ? payload.markets
        : Array.isArray(payload)
            ? payload
            : [];
    const markets = rawMarkets.map(mapRemoteMarket);
    return {
        markets,
        kpis: payload?.kpis && typeof payload.kpis === 'object' ? payload.kpis : deriveKPIs(markets),
    };
}
async function loadDashboardData() {
    if (DASHBOARD_CACHE) return DASHBOARD_CACHE;
    if (!DASHBOARD_ENDPOINT) throw new Error('dashboard endpoint missing');
    const res = await fetch(DASHBOARD_ENDPOINT, { cache: 'no-store' });
    if (!res.ok) throw new Error('dashboard fetch failed');
    DASHBOARD_CACHE = normalizeDashboardPayload(await res.json());
    return DASHBOARD_CACHE;
}
function deriveKPIs(markets) {
    return {
        total_markets: markets.length,
        converged_count: markets.filter(m => m.display_state === 'Converged').length,
        calibrating_count: markets.filter(m => m.display_state === 'Calibrating').length,
        fragile_count: markets.filter(m => m.display_state === 'Fragile').length,
        contested_count: markets.filter(m => getFlags(m).includes('Contested')).length,
        correlated_count: markets.filter(m => getFlags(m).includes('Correlated')).length,
    };
}
async function loadMarketDetail(eventId) {
    const key = String(eventId || '').trim();
    if (!key || !MARKET_DETAIL_ENDPOINT) return null;
    if (MARKET_DETAIL_CACHE.has(key)) return MARKET_DETAIL_CACHE.get(key);
    const res = await fetch(`${MARKET_DETAIL_ENDPOINT}/${encodeURIComponent(key)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('market detail fetch failed');
    const payload = await res.json();
    const market = mapRemoteMarket(payload?.market || payload || {});
    MARKET_DETAIL_CACHE.set(key, market);
    return market;
}

/* ?? CLOCK ?? */
function tickClock() {
    const d = new Date();
    const timeStr = d.toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
    const short = new Intl.DateTimeFormat('en', { timeZoneName: 'short' })
        .formatToParts(d).find(p => p.type === 'timeZoneName')?.value || '';
    const display = `${timeStr} ${short}`;
    const c = eid('live-clock'), f = eid('footer-clock');
    if (c) c.textContent = display;
    if (f) f.textContent = display;
}
setInterval(tickClock, 1000);
tickClock();

/* ?? PILLAR WIDTHS (simulated, proportional to score) ?? */
function pillarWidths(score) {
    const base = score / 100;
    return [
        Math.round(Math.min(base * 1.05 + Math.random() * 0.08, 1) * 100),
        Math.round(Math.min(base * 0.98 + Math.random() * 0.06, 1) * 100),
        Math.round(Math.min(base * 1.02 + Math.random() * 0.07, 1) * 100),
        Math.round(Math.min(base * 0.95 + Math.random() * 0.09, 1) * 100),
    ].map(v => Math.max(10, Math.min(v, 98)));
}

/* ?? RENDER KPIs ?? */
function renderKPIs(k) {
    animCount(eid('kpi-total'),      k.total_markets     || 0);
    animCount(eid('kpi-converged'),  k.converged_count   || 0);
    animCount(eid('kpi-calibrating'),k.calibrating_count || 0);
    animCount(eid('kpi-fragile'),    k.fragile_count     || 0);
    animCount(eid('hero-active'),    k.total_markets     || 149);
    animCount(eid('hero-converged'), k.converged_count   || 29);

    const tot = k.total_markets || 1;
    const cv  = k.converged_count || 0;
    const ca  = k.calibrating_count || 0;
    const fr  = k.fragile_count || 0;

    const interp = eid('health-interp');
    if (interp) {
        interp.innerHTML =
            `<strong>${Math.round(cv/tot*100)}%</strong> of markets show structural lock ? ` +
            `<strong>${ca}</strong> in price discovery ? ` +
            `<strong>${fr}</strong> below reliability threshold`;
    }

    const lu = eid('last-update');
    if (lu) {
        const now = new Date();
        const short = new Intl.DateTimeFormat('en', { timeZoneName: 'short' })
            .formatToParts(now).find(p => p.type === 'timeZoneName')?.value || '';
        lu.textContent = now.toLocaleString('en-GB', {
            month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
            hour12: false
        }) + ' ' + short;
    }

    const lk = eid('locked-count'), tt = eid('total-tracked');
    if (lk) lk.textContent = Math.max(0, tot - 9);
    if (tt) tt.textContent = tot;
}

/* ?? BUILD MARKET ROW ?? */
function buildRow(m) {
    const state = m.display_state || 'Fragile';
    const cfg   = SC[state] || SC.Fragile;
    const score = parseFloat(m.nexus_score) || 0;
    const flags = getFlags(m);
    const pw    = pillarWidths(score);

    const row = document.createElement('div');
    row.className = `mkt-row ${cfg.row}`;

    const flagsHTML = flags.map(f => {
        const cls = f === 'Contested' ? 'mf-contested' : 'mf-correlated';
        return `<span class="mkt-flag ${cls}">${f}</span>`;
    }).join('');

    const stableLabel = (state === 'Converged' && m.stable_hours)
        ? `<span class="stable-badge">? STABLE ${fmtStableHours(m.stable_hours)}</span>`
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

/* ?? RENDER MARKETS ?? */
function renderMarkets(markets) {
    const shown = eid('shown-count');
    if (shown) shown.textContent = markets.length;

    ['Converged', 'Calibrating', 'Fragile'].forEach(state => {
        const col = eid(`col-${state}`);
        if (!col) return;
        col.innerHTML = '';
        const group = markets.filter(m => m.display_state === state);
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
            empty.textContent = 'No markets in this state';
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

/* ?? CONTEXT ?? */
function buildContext(m) {
    const s = m.display_state, score = parseFloat(m.nexus_score) || 0, vol = m.volume || 0;
    if (s === 'Converged')
        return `NXS <strong>${score.toFixed(1)}</strong> ? structural consensus verified. ` +
               (vol > 10e6 ? `Deep market ($${(vol/1e6).toFixed(0)}M) supports reliable signal.` : `Price reflects genuine crowd consensus.`);
    if (s === 'Calibrating') {
        const gap = (80 - score).toFixed(1);
        return `NXS <strong>${score.toFixed(1)}</strong> ? price discovery in progress. ` +
               (parseFloat(gap) < 10 ? `${gap} pts from Converged threshold.` : `Consensus has not yet stabilized.`);
    }
    return `NXS <strong>${score.toFixed(1)}</strong> ? structural weakness detected. ` +
           (vol < 100000 ? `Very thin liquidity.` : `Depth or efficiency below threshold.`) +
           ` Treat price signal with caution.`;
}

/* ?? SPARKLINE ?? */
function drawSparkline(canvas, vals) {
    if (!canvas || !vals || vals.length < 2) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 0.01;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(200,151,58,0.6)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    vals.forEach((v, i) => {
        const x = (i / (vals.length - 1)) * W;
        const y = H - ((v - mn) / rng) * (H - 6) - 3;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
}
function renderPanelOutcomes(outcomes) {
    const outWrap = eid('sp-outcomes');
    const outSection = eid('sp-outcomes-section');
    if (!outWrap || !outSection) return;
    if (!Array.isArray(outcomes) || outcomes.length === 0) {
        outSection.style.display = 'none';
        outWrap.innerHTML = '';
        return;
    }
    outSection.style.display = 'block';
    const sorted = [...outcomes].sort((a, b) => (b.price || 0) - (a.price || 0));
    const LIMIT = 10;
    let expanded = false;
    function renderOutcomes(all) {
        const visible = expanded ? all : all.slice(0, LIMIT);
        const remaining = all.length - LIMIT;
        outWrap.innerHTML = visible.map(o => {
            const pct = fmtOutcomePct(o.price);
            const barW = Math.min(Math.max((o.price || 0) * 100, 0.5), 100).toFixed(1);
            const isTracked = o.is_tracked === true;
            return `
                <div class="sp-outcome-row ${isTracked ? 'sp-outcome-tracked' : ''}">
                    <div class="sp-outcome-name">
                        ${isTracked ? '<span class="sp-tracked-dot"></span>' : ''}
                        ${o.name || '?'}
                        ${isTracked ? '<span class="sp-tracked-label">tracked</span>' : ''}
                    </div>
                    <div class="sp-outcome-bar-wrap">
                        <div class="sp-outcome-bar-bg">
                            <div class="sp-outcome-bar-fill ${isTracked ? 'bar-tracked' : 'bar-other'}" style="width:${barW}%"></div>
                        </div>
                    </div>
                    <div class="sp-outcome-pct ${isTracked ? 'pct-tracked' : ''}">${pct}</div>
                </div>
            `;
        }).join('');
        if (all.length > LIMIT) {
            const toggle = document.createElement('div');
            toggle.className = 'outcomes-toggle';
            toggle.textContent = expanded ? 'show less' : `+${remaining} more`;
            toggle.addEventListener('click', () => {
                expanded = !expanded;
                renderOutcomes(all);
            });
            outWrap.appendChild(toggle);
        }
    }
    renderOutcomes(sorted);
}
function renderPanelSparkline(m) {
    const sp = eid('sp-canvas'), tr = eid('sp-trend-range');
    if (sp) {
        sp.width = sp.offsetWidth || 380;
        sp.getContext('2d').clearRect(0,0,sp.width,sp.height);
    }
    if (Array.isArray(m.sparkline) && m.sparkline.length >= 2) {
        if (tr) tr.textContent = `${m.sparkline.length} points`;
        if (sp) drawSparkline(sp, m.sparkline);
    } else if (tr) {
        tr.textContent = 'sample only';
    }
}

/* ?? PANEL ?? */
async function openPanel(m) {
    ACTIVE_PANEL_EVENT_ID = String(m.event_id || '');
    const score = parseFloat(m.nexus_score) || 0;
    const state = m.display_state || 'Fragile';
    const cfg   = SC[state] || SC.Fragile;
    const flags = getFlags(m);

    eid('sp-score').textContent = Math.round(score);
    eid('sp-score2').textContent = score.toFixed(1);
    eid('sp-price').textContent  = fmtCents(m.current_price);
    eid('sp-vol').textContent    = fmtVol(m.volume || 0);
    eid('sp-close').textContent  = m.time_to_close_days != null ? m.time_to_close_days + 'd' : '?';

    const badge = eid('sp-badge');
    badge.textContent = state;
    badge.className = `sp-state-badge ${cfg.badge}`;

    const catEl = eid('sp-cat');
    if (catEl) catEl.textContent = m.category || '';
    eid('sp-title').textContent = m.title || '?';

    eid('sp-flags').innerHTML = flags.map(f =>
        `<span class="sp-flag ${f === 'Contested' ? 'spf-c' : 'spf-r'}">${f}</span>`
    ).join('');

    eid('sp-context').innerHTML = buildContext(m);
    renderPanelOutcomes(m.outcomes || []);
    const link = eid('sp-link');
    link.href = m.market_slug ? `https://polymarket.com/event/${m.market_slug}` : 'https://polymarket.com';
    renderPanelSparkline(m);

    eid('overlay').classList.add('open');
    eid('side-panel').classList.add('open');
    document.body.style.overflow = 'hidden';

    if (!MARKET_DETAIL_ENDPOINT || !ACTIVE_PANEL_EVENT_ID) return;
    try {
        const detail = await loadMarketDetail(ACTIVE_PANEL_EVENT_ID);
        if (!detail || ACTIVE_PANEL_EVENT_ID !== String(detail.event_id || '')) return;
        const merged = { ...m, ...detail };
        eid('sp-score2').textContent = (parseFloat(merged.nexus_score) || 0).toFixed(1);
        eid('sp-price').textContent  = fmtCents(merged.current_price);
        eid('sp-vol').textContent    = fmtVol(merged.volume || 0);
        eid('sp-close').textContent  = merged.time_to_close_days != null ? merged.time_to_close_days + 'd' : '?';
        if (catEl) catEl.textContent = merged.category || '';
        eid('sp-title').textContent  = merged.title || '?';
        eid('sp-context').innerHTML  = buildContext(merged);
        renderPanelOutcomes(merged.outcomes || []);
        link.href = merged.market_slug ? `https://polymarket.com/event/${merged.market_slug}` : 'https://polymarket.com';
        renderPanelSparkline(merged);
    } catch (_) {
        const tr = eid('sp-trend-range');
        if (tr && (!Array.isArray(m.sparkline) || m.sparkline.length < 2)) tr.textContent = 'detail unavailable';
    }
}
function closePanel() {
    ACTIVE_PANEL_EVENT_ID = null;
    eid('overlay').classList.remove('open');
    eid('side-panel').classList.remove('open');
    document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

/* ?? DATA ?? */
async function loadKPIs() {
    try {
        const payload = await loadDashboardData();
        return payload.kpis;
    } catch (_) {
        return MOCK_KPIS;
    }
}
async function loadMarkets() {
    try {
        const payload = await loadDashboardData();
        return payload.markets.length ? payload.markets : MOCK_MARKETS;
    } catch (_) {
        return MOCK_MARKETS;
    }
}
async function init() {
    DASHBOARD_CACHE = null;
    const [kpis, markets] = await Promise.all([loadKPIs(), loadMarkets()]);
    renderKPIs(kpis);
    renderMarkets(markets);
}

init();
setInterval(init, 5 * 60 * 1000);
