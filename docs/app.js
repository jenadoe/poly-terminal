/* ============================================================
   POLY-NEXUS — app.js
   Worker API: /api/markets, /api/kpis, /api/sparkline/:id
   ============================================================ */

const API_BASE = (window.POLY_NEXUS_API || '').replace(/\/$/, '');
const HAS_API  = !!API_BASE;

const SC = {
    Converged:   { col: 'ch-converged',   row: 'r-converged',   badge: 'ssb-c', label: 'Converged',   desc: 'Structural consensus locked' },
    Calibrating: { col: 'ch-calibrating', row: 'r-calibrating', badge: 'ssb-a', label: 'Calibrating', desc: 'Price discovery in progress' },
    Fragile:     { col: 'ch-fragile',     row: 'r-fragile',     badge: 'ssb-f', label: 'Fragile',     desc: 'Structural weakness detected' },
};

const MOCK_MARKETS = [
    { event_id:'1', title:'Will Finland win Eurovision 2026?', category:'Culture', display_state:'Converged', nexus_score:92.6, flags:[], current_price:0.376, volume:28353653, close_time:null, time_to_close_days:null, market_slug:'eurovision-2026', top_outcome_name:'Finland', stable_hours:51,
      outcomes:[{name:'Finland',price:0.376,is_tracked:true},{name:'Denmark',price:0.128,is_tracked:false},{name:'France',price:0.125,is_tracked:false}]},
    { event_id:'2', title:'Will Chong Won-oh win the 2026 Seoul Mayoral Election?', category:'Politics', display_state:'Converged', nexus_score:92.5, flags:[], current_price:0.805, volume:6729339, close_time:null, time_to_close_days:null, market_slug:'seoul-election', top_outcome_name:'Chong Won-oh', stable_hours:362,
      outcomes:[{name:'Chong Won-oh',price:0.805,is_tracked:true},{name:'Oh Se-hoon',price:0.125,is_tracked:false}]},
    { event_id:'3', title:'Will Lula da Silva win the 2026 Brazilian presidential election?', category:'World', display_state:'Converged', nexus_score:91.1, flags:[], current_price:0.415, volume:28220794, close_time:null, time_to_close_days:null, market_slug:'brazil-election', top_outcome_name:'Lula', stable_hours:51,
      outcomes:[{name:'Lula da Silva',price:0.415,is_tracked:true},{name:'Bolsonaro',price:0.21,is_tracked:false}]},
    { event_id:'4', title:'Will the US confirm that aliens exist before 2027?', category:'Culture', display_state:'Calibrating', nexus_score:94.8, flags:[], current_price:0.165, volume:19493974, close_time:null, time_to_close_days:null, market_slug:'aliens-2027',
      outcomes:[{name:'Yes',price:0.165,is_tracked:true},{name:'No',price:0.835,is_tracked:false}]},
    { event_id:'5', title:'Will Jordan Bardella win the 2027 French presidential election?', category:'Elections', display_state:'Calibrating', nexus_score:93.3, flags:[], current_price:0.255, volume:17283026, close_time:null, time_to_close_days:null, market_slug:'france-bardella',
      outcomes:[{name:'Jordan Bardella',price:0.255,is_tracked:true},{name:'Marine Le Pen',price:0.18,is_tracked:false}]},
    { event_id:'6', title:'Will Jesus Christ return before 2027?', category:'Culture', display_state:'Calibrating', nexus_score:93.1, flags:[], current_price:0.038, volume:48150520, close_time:null, time_to_close_days:null, market_slug:'jesus-return',
      outcomes:[{name:'Yes',price:0.038,is_tracked:true},{name:'No',price:0.962,is_tracked:false}]},
    { event_id:'7', title:'Will Bayern Munich win the 2025-26 Bundesliga?', category:'Sports', display_state:'Fragile', nexus_score:59.9, flags:[], current_price:0.986, volume:1438859, close_time:null, time_to_close_days:null, market_slug:'bundesliga-2026',
      outcomes:[{name:'Bayern Munich',price:0.986,is_tracked:true},{name:'Bayer Leverkusen',price:0.008,is_tracked:false}]},
    { event_id:'8', title:'Will the US officially declare war on Iran by Dec 31, 2026?', category:'World', display_state:'Fragile', nexus_score:58.9, flags:[], current_price:0.085, volume:3625028, close_time:null, time_to_close_days:null, market_slug:'iran-war-2026',
      outcomes:[{name:'Yes',price:0.085,is_tracked:true},{name:'No',price:0.915,is_tracked:false}]},
    { event_id:'9', title:'Kharg Island no longer under Iranian control by April 30?', category:'Politics', display_state:'Fragile', nexus_score:58.4, flags:[], current_price:0.370, volume:3755636, close_time:null, time_to_close_days:null, market_slug:'kharg-island',
      outcomes:[{name:'Yes',price:0.370,is_tracked:true},{name:'No',price:0.630,is_tracked:false}]},
];
const MOCK_KPIS = {
    total_markets:149, converged_count:29, calibrating_count:83, fragile_count:34,
    contested_count:8, correlated_count:12, data_points:0, judgments:0,
};

/* ── UTILS ── */
function fmtVol(n) {
    n = Number(n) || 0;
    if (n >= 1e9) return '$' + (n/1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n/1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n/1e3).toFixed(0) + 'K';
    return '$' + Math.round(n);
}

function fmtNum(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
    if (n >= 1e3) return Math.round(n/1e3) + 'K';
    return String(n);
}

function fmtStableHours(h) {
    h = parseFloat(h);
    if (!h || h <= 0) return null;
    if (h < 24) return Math.round(h) + 'h';
    const days = Math.floor(h / 24);
    const rem  = Math.round(h % 24);
    return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

function fmtOutcomePct(p) {
    if (p == null) return '--';
    const pct = parseFloat(p) * 100;
    if (pct <= 0)  return '<1%';
    if (pct < 1)   return '<1%';
    if (pct >= 99) return '>99%';
    if (pct >= 10) return Math.round(pct) + '%';
    return pct.toFixed(1) + '%';
}

// [FIX] ¢ 기호 사용
function fmtCents(p) {
    if (p == null) return '--';
    const c = Math.round(parseFloat(p) * 100);
    if (c >= 99) return '>99\u00A2';
    if (c < 1)   return '<1\u00A2';
    return c + '\u00A2';
}

function calcClosesIn(closeTime, daysToClose) {
    if (closeTime) {
        const diff = new Date(closeTime) - Date.now();
        if (diff <= 0) return 'Closed';
        const totalHours = Math.floor(diff / 3600000);
        const days  = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        if (days === 0 && hours === 0) return '<1h';
        if (days === 0) return hours + 'h';
        if (days < 7)  return days + 'd ' + hours + 'h';
        return days + 'd';
    }
    if (daysToClose != null) return parseFloat(daysToClose) + 'd';
    return '--';
}

function animCount(el, target, ms) {
    if (!el) return;
    // 숫자가 아닌 포맷(예: "51.2K")은 애니 없이 바로 표시
    if (typeof target === 'string') { el.textContent = target; return; }
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

/* RPC 응답 정규화 — nexus_score, stable_hours는 numeric → JSON string으로 직렬화됨 */
function normalizeMarket(m) {
    return {
        event_id:           String(m.event_id || ''),
        title:              m.title || '--',
        category:           m.category || '',
        display_state:      m.display_state || m.market_state || 'Calibrating',
        nexus_score:        parseFloat(m.nexus_score) || 0,
        flags:              Array.isArray(m.flags) ? m.flags : [],
        current_price:      m.current_price != null ? parseFloat(m.current_price) : null,
        volume:             Number(m.volume) || 0,
        close_time:         m.close_time || null,
        time_to_close_days: m.time_to_close_days != null ? parseFloat(m.time_to_close_days) : null,
        market_slug:        m.market_slug || m.slug || '',
        top_outcome_name:   m.top_outcome_name || null,
        stable_hours:       m.stable_hours != null ? parseFloat(m.stable_hours) : null,
        outcomes:           Array.isArray(m.outcomes) ? m.outcomes : [],
    };
}

/* ── CLOCK ── */
function tickClock() {
    const d = new Date();
    const timeStr = d.toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
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

/* ── PILLAR WIDTHS ── */
function pillarWidths(score) {
    const base = score / 100;
    return [
        Math.round(Math.min(base * 1.05 + Math.random() * 0.08, 1) * 100),
        Math.round(Math.min(base * 0.98 + Math.random() * 0.06, 1) * 100),
        Math.round(Math.min(base * 1.02 + Math.random() * 0.07, 1) * 100),
        Math.round(Math.min(base * 0.95 + Math.random() * 0.09, 1) * 100),
    ].map(v => Math.max(10, Math.min(v, 98)));
}

/* ── RENDER KPIs ── */
function renderKPIs(k) {
    // Health bar
    animCount(eid('kpi-total'),       k.total_markets     || 0);
    animCount(eid('kpi-converged'),   k.converged_count   || 0);
    animCount(eid('kpi-calibrating'), k.calibrating_count || 0);
    animCount(eid('kpi-fragile'),     k.fragile_count     || 0);

    // Hero panel — live data
    animCount(eid('hero-active'),     k.total_markets    || 0);
    animCount(eid('hero-converged'),  k.converged_count  || 0);

    // Hero panel — data_points, judgments (fmtNum으로 포맷)
    const dpEl = eid('hero-datapoints');
    if (dpEl) dpEl.textContent = k.data_points ? fmtNum(k.data_points) : '--';

    const jEl = eid('hero-judgments');
    if (jEl) jEl.textContent = k.judgments != null ? k.judgments : '--';

    // 헬스 설명
    const tot = k.total_markets || 1;
    const cv  = k.converged_count || 0;
    const ca  = k.calibrating_count || 0;
    const fr  = k.fragile_count || 0;
    const interp = eid('health-interp');
    if (interp) {
        interp.innerHTML =
            `<strong>${Math.round(cv/tot*100)}%</strong> of markets show structural lock - ` +
            `<strong>${ca}</strong> in price discovery - ` +
            `<strong>${fr}</strong> below reliability threshold`;
    }

    // 업데이트 시간
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

    // locked count
    const lk = eid('locked-count'), tt = eid('total-tracked');
    if (lk) lk.textContent = Math.max(0, (k.total_markets || 0) - 9);
    if (tt) tt.textContent = k.total_markets || '--';
}

/* ── BUILD MARKET ROW ── */
function buildRow(m) {
    const state = m.display_state || 'Fragile';
    const cfg   = SC[state] || SC.Fragile;
    const score = m.nexus_score || 0;
    const flags = getFlags(m);
    const pw    = pillarWidths(score);

    const row = document.createElement('div');
    row.className = `mkt-row ${cfg.row}`;

    const flagsHTML = flags.map(f => {
        const cls = f === 'Contested' ? 'mf-contested' : 'mf-correlated';
        return `<span class="mkt-flag ${cls}">${f}</span>`;
    }).join('');

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

/* ── RENDER MARKETS ── */
function renderMarkets(markets) {
    const shown = eid('shown-count');
    if (shown) shown.textContent = markets.length;

    ['Converged', 'Calibrating', 'Fragile'].forEach(state => {
        const col = eid(`col-${state}`);
        if (!col) return;
        col.innerHTML = '';
        const group = markets.filter(m => (m.display_state || 'Calibrating') === state);
        const cfg   = SC[state];

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

/* ── CONTEXT ── */
function buildContext(m) {
    const s     = m.display_state;
    const score = m.nexus_score || 0;
    const vol   = m.volume || 0;
    if (s === 'Converged')
        return `NXS <strong>${score.toFixed(1)}</strong> - structural consensus verified. ` +
               (vol > 10e6 ? `Deep market ($${(vol/1e6).toFixed(0)}M) supports reliable signal.` : `Price reflects genuine crowd consensus.`);
    if (s === 'Calibrating') {
        const gap = (80 - score).toFixed(1);
        return `NXS <strong>${score.toFixed(1)}</strong> - price discovery in progress. ` +
               (parseFloat(gap) < 10 ? `${gap} pts from Converged threshold.` : `Consensus has not yet stabilized.`);
    }
    return `NXS <strong>${score.toFixed(1)}</strong> - structural weakness detected. ` +
           (vol < 100000 ? `Very thin liquidity.` : `Depth or efficiency below threshold.`) +
           ` Treat price signal with caution.`;
}

/* ── SPARKLINE ── */
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

/* ── OUTCOMES ── */
function renderOutcomesInPanel(outcomes, currentPrice) {
    const outWrap    = eid('sp-outcomes');
    const outSection = eid('sp-outcomes-section');
    if (!outWrap || !outSection) return;

    if (Array.isArray(outcomes) && outcomes.length > 0) {
        outSection.style.display = 'block';
        const sorted  = [...outcomes].sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
        const LIMIT   = 10;
        let expanded  = false;

        function render(all) {
            const visible   = expanded ? all : all.slice(0, LIMIT);
            const remaining = all.length - LIMIT;
            outWrap.innerHTML = visible.map(o => {
                const price = parseFloat(o.price) || 0;
                const barW  = Math.min(Math.max(price * 100, 0.5), 100).toFixed(1);
                const isT   = o.is_tracked === true;
                return `
                    <div class="sp-outcome-row ${isT ? 'sp-outcome-tracked' : ''}">
                        <div class="sp-outcome-name">
                            ${isT ? '<span class="sp-tracked-dot"></span>' : ''}
                            ${o.name || '--'}
                            ${isT ? '<span class="sp-tracked-label">tracked</span>' : ''}
                        </div>
                        <div class="sp-outcome-bar-bg">
                            <div class="sp-outcome-bar-fill ${isT ? 'bar-tracked' : 'bar-other'}"
                                 style="width:${barW}%"></div>
                        </div>
                        <div class="sp-outcome-pct ${isT ? 'pct-tracked' : ''}">${fmtOutcomePct(price)}</div>
                    </div>
                `;
            }).join('');

            if (all.length > LIMIT) {
                const toggle = document.createElement('div');
                toggle.className = 'outcomes-toggle';
                toggle.textContent = expanded ? 'show less' : `+${remaining} more`;
                toggle.addEventListener('click', () => { expanded = !expanded; render(all); });
                outWrap.appendChild(toggle);
            }
        }
        render(sorted);
        return;
    }

    // outcomes 없으면 current_price로 Yes/No 폴백
    if (currentPrice != null) {
        outSection.style.display = 'block';
        const yesP = parseFloat(currentPrice);
        const noP  = Math.max(0, 1 - yesP);
        const yesW = Math.min(Math.max(yesP * 100, 0.5), 100).toFixed(1);
        const noW  = Math.min(Math.max(noP * 100, 0.5), 100).toFixed(1);
        outWrap.innerHTML = `
            <div class="sp-outcome-row sp-outcome-tracked">
                <div class="sp-outcome-name">
                    <span class="sp-tracked-dot"></span>Yes
                    <span class="sp-tracked-label">tracked</span>
                </div>
                <div class="sp-outcome-bar-bg">
                    <div class="sp-outcome-bar-fill bar-tracked" style="width:${yesW}%"></div>
                </div>
                <div class="sp-outcome-pct pct-tracked">${fmtOutcomePct(yesP)}</div>
            </div>
            <div class="sp-outcome-row">
                <div class="sp-outcome-name">No</div>
                <div class="sp-outcome-bar-bg">
                    <div class="sp-outcome-bar-fill bar-other" style="width:${noW}%"></div>
                </div>
                <div class="sp-outcome-pct">${fmtOutcomePct(noP)}</div>
            </div>
        `;
        return;
    }

    outSection.style.display = 'none';
}

/* ── PANEL ── */
function openPanel(m) {
    const score = m.nexus_score || 0;
    const state = m.display_state || 'Fragile';
    const cfg   = SC[state] || SC.Fragile;
    const flags = getFlags(m);

    eid('sp-score').textContent  = Math.round(score);
    eid('sp-score2').textContent = parseFloat(score).toFixed(1);
    eid('sp-price').textContent  = fmtCents(m.current_price);
    eid('sp-vol').textContent    = fmtVol(m.volume || 0);
    eid('sp-close').textContent  = calcClosesIn(m.close_time, m.time_to_close_days);

    const badge = eid('sp-badge');
    badge.textContent = state;
    badge.className   = `sp-state-badge ${cfg.badge}`;

    const catEl = eid('sp-cat');
    if (catEl) catEl.textContent = m.category || '';
    eid('sp-title').textContent = m.title || '--';

    eid('sp-flags').innerHTML = flags.map(f =>
        `<span class="sp-flag ${f === 'Contested' ? 'spf-c' : 'spf-r'}">${f}</span>`
    ).join('');

    eid('sp-context').innerHTML = buildContext(m);
    renderOutcomesInPanel(m.outcomes, m.current_price);

    const link = eid('sp-link');
    link.href = m.market_slug
        ? `https://polymarket.com/event/${m.market_slug}`
        : 'https://polymarket.com';

    // Sparkline
    const sp = eid('sp-canvas');
    const tr = eid('sp-trend-range');
    if (sp) {
        sp.width = sp.offsetWidth || 380;
        sp.getContext('2d').clearRect(0, 0, sp.width, sp.height);
    }
    if (tr) tr.textContent = 'loading...';

    if (HAS_API && m.event_id) {
        fetch(`${API_BASE}/api/sparkline/${encodeURIComponent(String(m.event_id))}`)
            .then(r => r.ok ? r.json() : [])
            .then(data => {
                const vals = Array.isArray(data)
                    ? data.map(row => parseFloat(row.current_price ?? row.p) || 0).filter(v => v > 0)
                    : [];
                if (vals.length < 2) { if (tr) tr.textContent = 'insufficient history'; return; }
                if (tr) tr.textContent = `${vals.length} snapshots`;
                if (sp) drawSparkline(sp, vals);
            })
            .catch(() => { if (tr) tr.textContent = '--'; });
    } else {
        if (tr) tr.textContent = '--';
    }

    eid('overlay').classList.add('open');
    eid('side-panel').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closePanel() {
    eid('overlay').classList.remove('open');
    eid('side-panel').classList.remove('open');
    document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

/* ── DATA FETCHING ── */
async function loadKPIs() {
    if (!HAS_API) return MOCK_KPIS;
    try {
        const res = await fetch(`${API_BASE}/api/kpis`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data || data.error) return MOCK_KPIS;
        return data;
    } catch (e) {
        console.warn('[Poly-Nexus] KPIs fetch failed:', e.message);
        return MOCK_KPIS;
    }
}

async function loadMarkets() {
    if (!HAS_API) return MOCK_MARKETS;
    try {
        const res = await fetch(`${API_BASE}/api/markets`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return MOCK_MARKETS;
        return data.map(normalizeMarket);
    } catch (e) {
        console.warn('[Poly-Nexus] Markets fetch failed:', e.message);
        return MOCK_MARKETS;
    }
}

/* ── INIT ── */
async function init() {
    const [kpis, markets] = await Promise.all([loadKPIs(), loadMarkets()]);
    renderKPIs(kpis);
    renderMarkets(markets);
}

init();
setInterval(init, 5 * 60 * 1000);