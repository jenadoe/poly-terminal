/* ============================================================
   POLY-NEXUS — app.js
   State Matrix · Amber/Slate · Terminal UI
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

/* ── MOCK DATA ── */
const MOCK_MARKETS = [
    { event_id:'1', title:'Will Finland win Eurovision 2026?',                                           category:'Culture',  display_state:'Converged',   nexus_score:92.6, flags:[], current_price:0.376, volume:28353653, time_to_close_days:null, market_slug:'eurovision-2026',   top_outcome_name:'Finland' },
    { event_id:'2', title:'Will Chong Won-oh win the 2026 Seoul Mayoral Election?',                      category:'Politics', display_state:'Converged',   nexus_score:92.5, flags:[], current_price:0.805, volume:6729339,  time_to_close_days:null, market_slug:'seoul-election',    top_outcome_name:'Chong Won-oh' },
    { event_id:'3', title:'Will Luiz Inácio Lula da Silva win the 2026 Brazilian presidential election?',category:'World',    display_state:'Converged',   nexus_score:91.1, flags:[], current_price:0.415, volume:28220794, time_to_close_days:null, market_slug:'brazil-election',   top_outcome_name:'Lula da Silva' },
    { event_id:'4', title:'Will the US confirm that aliens exist before 2027?',                          category:'Culture',  display_state:'Calibrating', nexus_score:94.8, flags:[], current_price:0.165, volume:19493974, time_to_close_days:null, market_slug:'aliens-2027',       top_outcome_name:null },
    { event_id:'5', title:'Will Jordan Bardella win the 2027 French presidential election?',             category:'Elections',display_state:'Calibrating', nexus_score:93.3, flags:[], current_price:0.255, volume:17283026, time_to_close_days:null, market_slug:'france-bardella',   top_outcome_name:'Jordan Bardella' },
    { event_id:'6', title:'Will Jesus Christ return before 2027?',                                       category:'Culture',  display_state:'Calibrating', nexus_score:93.1, flags:[], current_price:0.038, volume:48150520, time_to_close_days:null, market_slug:'jesus-return',      top_outcome_name:null },
    { event_id:'7', title:'Will Bayern Munich win the 2025–26 Bundesliga?',                              category:'Sports',   display_state:'Fragile',     nexus_score:59.9, flags:[], current_price:0.986, volume:1438859,  time_to_close_days:null, market_slug:'bundesliga-2026',   top_outcome_name:'Bayern Munich' },
    { event_id:'8', title:'Will the US officially declare war on Iran by December 31, 2026?',            category:'World',    display_state:'Fragile',     nexus_score:58.9, flags:[], current_price:0.085, volume:3625028,  time_to_close_days:null, market_slug:'iran-war-2026',     top_outcome_name:null },
    { event_id:'9', title:'Kharg Island no longer under Iranian control by April 30?',                   category:'Politics', display_state:'Fragile',     nexus_score:58.4, flags:[], current_price:0.370, volume:3755636,  time_to_close_days:null, market_slug:'kharg-island',      top_outcome_name:null },
];
const MOCK_KPIS = { total_markets:149, converged_count:29, calibrating_count:83, fragile_count:34, contested_count:8, correlated_count:12 };

/* ── UTILS ── */
function fmtVol(n) {
    if (n >= 1e9) return '$' + (n/1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n/1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n/1e3).toFixed(0) + 'K';
    return '$' + Math.round(n);
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
    const t = [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
        .map(v => String(v).padStart(2,'0')).join(':') + ' UTC';
    const c = eid('live-clock'), f = eid('footer-clock');
    if (c) c.textContent = t;
    if (f) f.textContent = t;
}
setInterval(tickClock, 1000);
tickClock();

/* ── PILLAR WIDTHS (simulated, proportional to score) ── */
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
            `<strong>${Math.round(cv/tot*100)}%</strong> of markets show structural lock · ` +
            `<strong>${ca}</strong> in price discovery · ` +
            `<strong>${fr}</strong> below reliability threshold`;
    }

    const lu = eid('last-update');
    if (lu) lu.textContent = new Date().toISOString().replace('T',' ').slice(0,16) + ' UTC';

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
    const outName = m.top_outcome_name;

    const row = document.createElement('div');
    row.className = `mkt-row ${cfg.row}`;

    const flagsHTML = flags.map(f => {
        const cls = f === 'Contested' ? 'mf-contested' : 'mf-correlated';
        return `<span class="mkt-flag ${cls}">${f}</span>`;
    }).join('');

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
                <div>
                    <div class="mkt-price">${fmtCents(m.current_price)}${outName ? `<span style="font-size:10px;color:var(--text-dim);font-weight:400;margin-left:6px;">${outName}</span>` : ''}</div>
                    <div class="mkt-vol">${fmtVol(m.volume || 0)}</div>
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
        const group = markets.filter(m => m.display_state === state);
        const cfg = SC[state];

        // Column header
        const head = document.createElement('div');
        head.className = `col-head ${cfg.col}`;
        head.innerHTML = `
            <span class="col-count">${group.length} shown</span>
            <div class="col-state cs-${state.toLowerCase()}">${state}</div>
            <div class="col-desc">${cfg.desc}</div>
        `;
        col.appendChild(head);

        // Market rows
        group.forEach(m => col.appendChild(buildRow(m)));
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
               (vol > 10e6 ? `Deep market ($${(vol/1e6).toFixed(0)}M) supports reliable signal.` : `Price reflects genuine crowd consensus.`);
    if (s === 'Calibrating') {
        const gap = (80 - score).toFixed(1);
        return `NXS <strong>${score.toFixed(1)}</strong> — price discovery in progress. ` +
               (parseFloat(gap) < 10 ? `${gap} pts from Converged threshold.` : `Consensus has not yet stabilized.`);
    }
    return `NXS <strong>${score.toFixed(1)}</strong> — structural weakness detected. ` +
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

/* ── PANEL ── */
function openPanel(m) {
    const score = parseFloat(m.nexus_score) || 0;
    const state = m.display_state || 'Fragile';
    const cfg   = SC[state] || SC.Fragile;
    const flags = getFlags(m);

    eid('sp-score').textContent = Math.round(score);
    eid('sp-score2').textContent = score.toFixed(1);
    eid('sp-price').textContent  = fmtCents(m.current_price);
    eid('sp-vol').textContent    = fmtVol(m.volume || 0);
    eid('sp-close').textContent  = m.time_to_close_days != null ? m.time_to_close_days + 'd' : '—';

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

    const link = eid('sp-link');
    link.href = m.market_slug ? `https://polymarket.com/event/${m.market_slug}` : 'https://polymarket.com';

    // Sparkline
    const sp = eid('sp-canvas'), tr = eid('sp-trend-range');
    if (sp) { sp.width = sp.offsetWidth || 380; sp.getContext('2d').clearRect(0,0,sp.width,sp.height); }
    if (tr) tr.textContent = 'loading...';

    if (USE_SB && sb) {
        sb.from('event_log')
            .select('current_price,snapshot_at')
            .eq('event_id', String(m.event_id))
            .not('current_price','is',null)
            .order('snapshot_at',{ascending:true})
            .limit(30)
            .then(({data}) => {
                if (!data || data.length < 2) { if (tr) tr.textContent = 'insufficient history'; return; }
                if (tr) tr.textContent = `${data.length} snapshots`;
                if (sp) drawSparkline(sp, data.map(r => r.current_price));
            })
            .catch(() => { if (tr) tr.textContent = '—'; });
    } else {
        if (tr) tr.textContent = '—';
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
        .on('postgres_changes', { event:'*', schema:'public', table:'markets_registry' }, () => init())
        .subscribe();
}