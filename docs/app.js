/* ============================================================
   POLY-NEXUS — app.js
   State Matrix UI · Amber/Slate · Terminal aesthetic
   ============================================================ */

/* ── CONFIG ── */
const _cfg = window.POLY_NEXUS_CONFIG || {};
const USE_SB = !!(_cfg.supabaseUrl && _cfg.supabaseAnonKey);
let sb = null;
if (USE_SB) sb = supabase.createClient(_cfg.supabaseUrl, _cfg.supabaseAnonKey);

/* ── STATE CONFIG ── */
const SC = {
    Converged:   { col: 'ch-converged',   row: 'r-converged',   badge: 'ssb-c', label: 'Converged',   desc: 'Structural consensus locked' },
    Calibrating: { col: 'ch-calibrating', row: 'r-calibrating', badge: 'ssb-a', label: 'Calibrating', desc: 'Price discovery in progress' },
    Fragile:     { col: 'ch-fragile',     row: 'r-fragile',     badge: 'ssb-f', label: 'Fragile',     desc: 'Structural weakness detected' },
};

/* ── MOCK DATA (Supabase 미연결 시 fallback) ── */
const MOCK_MARKETS = [
    { event_id:'1', title:'Will Finland win Eurovision 2026?', category:'Culture', display_state:'Converged', nexus_score:92.6, flags:[], current_price:0.376, volume:28353653, time_to_close_days:52, close_time:null, market_slug:'eurovision-winner-2026', top_outcome_name:'Finland', stable_hours:51,
      outcomes:[{name:'Finland',price:0.376,is_tracked:true},{name:'Denmark',price:0.128,is_tracked:false},{name:'France',price:0.125,is_tracked:false},{name:'Greece',price:0.0715,is_tracked:false},{name:'Australia',price:0.051,is_tracked:false}]},
    { event_id:'2', title:'Will Chong Won-oh win the 2026 Seoul Mayoral Election?', category:'Politics', display_state:'Converged', nexus_score:92.5, flags:[], current_price:0.805, volume:6729339, time_to_close_days:null, close_time:null, market_slug:'seoul-election', top_outcome_name:'Chong Won-oh', stable_hours:362,
      outcomes:[{name:'Chong Won-oh',price:0.805,is_tracked:true},{name:'Oh Se-hoon',price:0.125,is_tracked:false},{name:'Park Ju-min',price:0.066,is_tracked:false}]},
    { event_id:'3', title:'Will Luiz Inácio Lula da Silva win the 2026 Brazilian presidential election?', category:'World', display_state:'Converged', nexus_score:91.1, flags:[], current_price:0.415, volume:28220794, time_to_close_days:193, close_time:null, market_slug:'brazil-presidential-election', top_outcome_name:'Lula da Silva', stable_hours:51,
      outcomes:[{name:'Lula da Silva',price:0.415,is_tracked:true},{name:'Flávio Bolsonaro',price:0.21,is_tracked:false},{name:'Renan Santos',price:0.12,is_tracked:false}]},
    { event_id:'4', title:'Will the US confirm that aliens exist before 2027?', category:'Culture', display_state:'Calibrating', nexus_score:94.8, flags:[], current_price:0.165, volume:19493974, time_to_close_days:281, close_time:null, market_slug:'will-the-us-confirm-that-aliens-exist-before-2027',
      outcomes:[{name:'Yes',price:0.165,is_tracked:true},{name:'No',price:0.835,is_tracked:false}]},
    { event_id:'5', title:'Will Jordan Bardella win the 2027 French presidential election?', category:'Elections', display_state:'Calibrating', nexus_score:93.3, flags:[], current_price:0.255, volume:17283026, time_to_close_days:401, close_time:null, market_slug:'next-french-presidential-election',
      outcomes:[{name:'Jordan Bardella',price:0.255,is_tracked:true},{name:'Marine Le Pen',price:0.18,is_tracked:false},{name:'Emmanuel Macron',price:0.12,is_tracked:false}]},
    { event_id:'6', title:'Will Jesus Christ return before 2027?', category:'Culture', display_state:'Calibrating', nexus_score:93.1, flags:[], current_price:0.038, volume:48150520, time_to_close_days:281, close_time:null, market_slug:'will-jesus-christ-return-before-2027',
      outcomes:[{name:'Yes',price:0.038,is_tracked:true},{name:'No',price:0.962,is_tracked:false}]},
    { event_id:'7', title:'Will Bayern Munich win the 2025\u201326 Bundesliga?', category:'Sports', display_state:'Fragile', nexus_score:59.9, flags:[], current_price:0.986, volume:1438859, time_to_close_days:64, close_time:null, market_slug:'bundesliga-2026',
      outcomes:[{name:'Bayern Munich',price:0.986,is_tracked:true},{name:'Dortmund',price:0.006,is_tracked:false},{name:'RB Leipzig',price:0.0035,is_tracked:false},{name:'Hoffenheim',price:0.003,is_tracked:false},{name:'Stuttgart',price:0.001,is_tracked:false}]},
    { event_id:'8', title:'Will the US officially declare war on Iran by December 31, 2026?', category:'World', display_state:'Fragile', nexus_score:58.9, flags:[], current_price:0.085, volume:3625028, time_to_close_days:281, close_time:null, market_slug:'iran-war-2026',
      outcomes:[{name:'Yes',price:0.085,is_tracked:true},{name:'No',price:0.915,is_tracked:false}]},
    { event_id:'9', title:'Kharg Island no longer under Iranian control by April 30?', category:'Politics', display_state:'Fragile', nexus_score:58.4, flags:[], current_price:0.370, volume:3755636, time_to_close_days:36, close_time:null, market_slug:'kharg-island',
      outcomes:[{name:'Yes',price:0.370,is_tracked:true},{name:'No',price:0.630,is_tracked:false}]},
];
const MOCK_KPIS = { total_markets:149, converged_count:29, calibrating_count:83, fragile_count:34, contested_count:8, correlated_count:12 };

/* ── UTILS ── */
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

/* [FIX A] close_time ISO 파싱 → "Xd Yh" 실시간 계산 */
function closesIn(closeTimeISO, fallbackDays) {
    if (closeTimeISO) {
        try {
            const diff = new Date(closeTimeISO) - Date.now();
            if (diff <= 0) return 'Expired';
            const totalH = Math.floor(diff / 36e5);
            const d = Math.floor(totalH / 24);
            const h = totalH % 24;
            if (d >= 1) return h > 0 ? `${d}d ${h}h` : `${d}d`;
            return `${totalH}h`;
        } catch (_) {}
    }
    if (fallbackDays != null) return `~${fallbackDays}d`;
    return null;
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
    if (p == null) return '—';
    const c = Math.round(p * 100);
    if (c >= 99) return '>99¢';
    if (c < 1)   return '<1¢';
    return c + '¢';
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
    animCount(eid('kpi-total'),       k.total_markets     || 0);
    animCount(eid('kpi-converged'),   k.converged_count   || 0);
    animCount(eid('kpi-calibrating'), k.calibrating_count || 0);
    animCount(eid('kpi-fragile'),     k.fragile_count     || 0);
    animCount(eid('hero-active'),     k.total_markets     || 149);
    animCount(eid('hero-converged'),  k.converged_count   || 29);

    const tot = k.total_markets || 1;
    const cv  = k.converged_count || 0;
    const ca  = k.calibrating_count || 0;
    const fr  = k.fragile_count || 0;

    const interp = eid('health-interp');
    if (interp) {
        interp.innerHTML =
            `<strong>${Math.round(cv/tot*100)}%</strong> of markets show structural lock · ` +
            `<strong>${ca}</strong> in price discovery · ` +
            `<strong>${fr}</strong> below reliability threshold`;
    }

    const lu = eid('last-update');
    if (lu) {
        const now = new Date();
        const short = new Intl.DateTimeFormat('en', { timeZoneName: 'short' })
            .formatToParts(now).find(p => p.type === 'timeZoneName')?.value || '';
        lu.textContent = now.toLocaleString('en-GB', {
            month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
        }) + ' ' + short;
    }

    const lk = eid('locked-count'), tt = eid('total-tracked');
    if (lk) lk.textContent = Math.max(0, tot - 9);
    if (tt) tt.textContent = tot;
}

/* ── BUILD MARKET ROW ── */
function buildRow(m) {
    const state = m.display_state || 'Fragile';
    const cfg   = SC[state] || SC.Fragile;
    const score = parseFloat(m.nexus_score) || 0;
    const flags = getFlags(m);
    const pw    = pillarWidths(score);

    /* [FIX A] Closes in 실시간 계산 */
    const closeStr = closesIn(m.close_time, m.time_to_close_days);

    const stableLabel = (state === 'Converged' && m.stable_hours)
        ? `<span class="stable-badge">✓ STABLE ${fmtStableHours(m.stable_hours)}</span>`
        : '';

    const flagsHTML = flags.map(f => {
        const cls = f === 'Contested' ? 'mf-contested' : 'mf-correlated';
        return `<span class="mkt-flag ${cls}">${f}</span>`;
    }).join('');

    const row = document.createElement('div');
    row.className = `mkt-row ${cfg.row}`;
    row.innerHTML = `
        <div class="mkt-inner">
            <div class="mkt-top">
                <div style="min-width:0;flex:1;">
                    <div class="mkt-category">${m.category || ''}</div>
                    <div class="mkt-title">${m.title || '—'}</div>
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
                    ${flagsHTML}
                    ${closeStr ? `<div class="mkt-vol">Closes in <strong>${closeStr}</strong></div>` : ''}
                </div>
                <div class="mkt-vol">vol. ${fmtVol(m.volume || 0)}</div>
            </div>
        </div>`;

    row.addEventListener('click', () => openPanel(m));
    return row;
}

/* ── RENDER MARKETS ── */
function renderMarkets(markets) {
    const shown = eid('shown-count');
    if (shown) shown.textContent = Math.min(markets.length, 9);

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
            <div class="col-desc">${cfg.desc}</div>`;
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
    const s = m.display_state, score = parseFloat(m.nexus_score) || 0, vol = m.volume || 0;
    if (s === 'Converged')
        return `NXS <strong>${score.toFixed(1)}</strong> — structural consensus verified. ` +
               (vol > 10e6 ? `Deep market (${fmtVol(vol)}) supports reliable signal.` : `Price reflects genuine crowd consensus.`);
    if (s === 'Calibrating') {
        const gap = (80 - score).toFixed(1);
        return `NXS <strong>${score.toFixed(1)}</strong> — price discovery in progress. ` +
               (parseFloat(gap) < 10 ? `${gap}pts from Converged threshold.` : `Consensus has not yet stabilized.`);
    }
    return `NXS <strong>${score.toFixed(1)}</strong> — structural weakness detected. ` +
           (vol < 100000 ? `Very thin liquidity.` : `Depth or efficiency below threshold.`) +
           ` Treat price signal with caution.`;
}

/* ── SPARKLINE ── */
function drawSparkline(canvas, vals) {
    if (!canvas || !vals || vals.length < 2) return;

    /* [FIX C] canvas 픽셀 해상도를 실제 렌더 크기에 맞게 설정 */
    const W = canvas.offsetWidth  || 380;
    const H = canvas.offsetHeight || 52;
    canvas.width  = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 0.01;

    /* fill */
    ctx.beginPath();
    vals.forEach((v, i) => {
        const x = (i / (vals.length - 1)) * W;
        const y = H - ((v - mn) / rng) * (H - 8) - 4;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fillStyle = 'rgba(200,151,58,0.07)';
    ctx.fill();

    /* line */
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(200,151,58,0.7)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    vals.forEach((v, i) => {
        const x = (i / (vals.length - 1)) * W;
        const y = H - ((v - mn) / rng) * (H - 8) - 4;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
}

/* ── PANEL ── */
function openPanel(m) {
    const score = parseFloat(m.nexus_score) || 0;
    const state = m.display_state || 'Fragile';
    const cfg   = SC[state] || SC.Fragile;
    const flags = getFlags(m);

    /* [FIX A] Closes in 실시간 계산 */
    const closeStr = closesIn(m.close_time, m.time_to_close_days);

    eid('sp-score').textContent  = Math.round(score);
    eid('sp-score2').textContent = score.toFixed(1);
    eid('sp-price').textContent  = fmtCents(m.current_price);
    eid('sp-vol').textContent    = fmtVol(m.volume || 0);
    eid('sp-close').textContent  = closeStr || '—';

    const badge = eid('sp-badge');
    badge.textContent = state;
    badge.className = `sp-state-badge ${cfg.badge}`;

    const catEl = eid('sp-cat');
    if (catEl) catEl.textContent = m.category || '';
    eid('sp-title').textContent = m.title || '—';

    eid('sp-flags').innerHTML = flags.map(f =>
        `<span class="sp-flag ${f === 'Contested' ? 'spf-c' : 'spf-r'}">${f}</span>`
    ).join('');

    eid('sp-context').innerHTML = buildContext(m);

    /* [FIX D + E] Outcomes */
    renderPanelOutcomes(m);

    const link = eid('sp-link');
    link.href = m.market_slug ? `https://polymarket.com/event/${m.market_slug}` : 'https://polymarket.com';

    /* [FIX C] Sparkline */
    const sp = eid('sp-canvas'), tr = eid('sp-trend-range');
    if (sp) {
        sp.width  = sp.offsetWidth  || 380;
        sp.height = sp.offsetHeight || 52;
        sp.getContext('2d').clearRect(0, 0, sp.width, sp.height);
    }
    if (tr) tr.textContent = 'loading...';

    if (USE_SB && sb) {
        sb.from('event_log')
            .select('current_price,snapshot_at')
            .eq('event_id', String(m.event_id))
            .not('current_price', 'is', null)
            .order('snapshot_at', { ascending: true })
            .limit(48)
            .then(({ data }) => {
                if (!data || data.length < 2) {
                    if (tr) tr.textContent = 'insufficient history';
                    return;
                }
                const first = new Date(data[0].snapshot_at);
                const last  = new Date(data[data.length - 1].snapshot_at);
                const fmt   = d => d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
                if (tr) tr.textContent = `${fmt(first)} – ${fmt(last)}`;
                /* [FIX C] 패널이 열린 후 레이아웃 확정 시점에 그리기 */
                requestAnimationFrame(() => {
                    if (sp) drawSparkline(sp, data.map(r => r.current_price));
                });
            })
            .catch(() => { if (tr) tr.textContent = '—'; });
    } else {
        /* fallback: sparkline 배열 */
        if (m.sparkline && m.sparkline.length >= 2) {
            requestAnimationFrame(() => {
                if (sp) drawSparkline(sp, m.sparkline.map(p => p.p));
            });
            if (tr) tr.textContent = `${m.sparkline.length} snapshots`;
        } else {
            if (tr) tr.textContent = '—';
        }
    }

    eid('overlay').classList.add('open');
    eid('side-panel').classList.add('open');
    document.body.style.overflow = 'hidden';
}

/* ── [FIX D + E] Outcomes 렌더 ── */
function renderPanelOutcomes(m) {
    const outWrap    = eid('sp-outcomes');
    const outSection = eid('sp-outcomes-section');
    if (!outWrap || !outSection) return;

    let outcomes = Array.isArray(m.outcomes) ? [...m.outcomes] : [];

    /* [FIX D] outcome이 1개(YES만 있는 바이너리 마켓): NO 자동 생성 */
    if (outcomes.length === 1 && outcomes[0].is_tracked) {
        const yesP = outcomes[0].price || 0;
        outcomes.push({ name: 'No', price: Math.max(0, 1 - yesP), is_tracked: false });
    }

    /* [FIX D] outcomes 자체가 없으면 current_price로 Yes/No 추정 */
    if (outcomes.length === 0 && m.current_price != null) {
        outcomes = [
            { name: 'Yes', price: m.current_price,                  is_tracked: true  },
            { name: 'No',  price: Math.max(0, 1 - m.current_price), is_tracked: false },
        ];
    }

    if (outcomes.length === 0) {
        outSection.style.display = 'none';
        return;
    }

    outSection.style.display = '';

    /* [FIX E] 가격 내림차순 정렬 */
    const sorted = outcomes.sort((a, b) => (b.price || 0) - (a.price || 0));
    const LIMIT  = 10;
    let expanded = false;

    function renderOutcomes(all) {
        const visible   = expanded ? all : all.slice(0, LIMIT);
        const remaining = all.length - LIMIT;

        outWrap.innerHTML = visible.map(o => {
            const pct     = fmtOutcomePct(o.price);
            const barW    = Math.min(Math.max((o.price || 0) * 100, 0.5), 100).toFixed(1);
            const tracked = o.is_tracked === true;
            return `
                <div class="sp-outcome-row ${tracked ? 'sp-outcome-tracked' : ''}">
                    <div class="sp-outcome-name">
                        ${tracked ? '<span class="sp-tracked-dot"></span>' : ''}
                        ${o.name || '—'}
                        ${tracked ? '<span class="sp-tracked-label">tracked</span>' : ''}
                    </div>
                    <div class="sp-outcome-bar-wrap">
                        <div class="sp-outcome-bar-bg">
                            <div class="sp-outcome-bar-fill ${tracked ? 'bar-tracked' : 'bar-other'}"
                                 style="width:${barW}%"></div>
                        </div>
                    </div>
                    <div class="sp-outcome-pct ${tracked ? 'pct-tracked' : ''}">${pct}</div>
                </div>`;
        }).join('');

        /* [FIX B] Expand/collapse — innerHTML 재작성 후 새로 append */
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

function closePanel() {
    eid('overlay').classList.remove('open');
    eid('side-panel').classList.remove('open');
    document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

/* ── DATA ── */
async function loadKPIs() {
    if (!USE_SB || !sb) return MOCK_KPIS;
    try {
        const { data, error } = await sb.rpc('get_dashboard_kpis');
        if (error || !data) return MOCK_KPIS;
        return data;
    } catch (_) { return MOCK_KPIS; }
}

async function loadMarkets() {
    if (!USE_SB || !sb) return MOCK_MARKETS;
    try {
        const { data, error } = await sb.rpc('get_public_markets');
        if (error || !data || !data.length) return MOCK_MARKETS;
        return data;
    } catch (_) { return MOCK_MARKETS; }
}

async function init() {
    const [kpis, markets] = await Promise.all([loadKPIs(), loadMarkets()]);
    renderKPIs(kpis);
    renderMarkets(markets);
}

init();
setInterval(init, 5 * 60 * 1000);

if (USE_SB && sb) {
    sb.channel('mkt_watch')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'markets_registry' }, () => init())
        .subscribe();
}