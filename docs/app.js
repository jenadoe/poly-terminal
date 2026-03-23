/* ============================================================
   POLY-NEXUS — app.js
   Config → Utils → Data → Render → Panel → Init
   ============================================================ */

/* ── CONFIG ── */
const _cfg = window.POLY_NEXUS_CONFIG || {};
const SUPABASE_URL      = _cfg.supabaseUrl      || '';
const SUPABASE_ANON_KEY = _cfg.supabaseAnonKey  || '';
const USE_SB = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
let sb = null;
if (USE_SB) sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STATE = {
    Converged:   { cardCls: 's-converged',   scoreSC: 'sc-converged',   dotCls: 'sd-c', tagCls: 'tag-converged',   panelCls: 'psb-c' },
    Calibrating: { cardCls: 's-calibrating', scoreSC: 'sc-calibrating', dotCls: 'sd-a', tagCls: 'tag-calibrating', panelCls: 'psb-a' },
    Fragile:     { cardCls: 's-fragile',     scoreSC: 'sc-fragile',     dotCls: 'sd-f', tagCls: 'tag-fragile',     panelCls: 'psb-f' },
};

/* ── MOCK FALLBACK ── */
const MOCK_MARKETS = [
    { event_id:'1', title:'Will Chong Won-oh win the 2026 Seoul Mayoral Election?', category:'Politics', display_state:'Converged',   nexus_score:92.8, flags:[], current_price:0.805, volume:6702545,  time_to_close_days:null, market_slug:'seoul-election', top_outcome_name:'Chong Won-oh' },
    { event_id:'2', title:'Will Finland win Eurovision 2026?',                       category:'Culture',  display_state:'Converged',   nexus_score:92.8, flags:[], current_price:0.376, volume:28141675, time_to_close_days:null, market_slug:'eurovision-2026', top_outcome_name:'Finland' },
    { event_id:'3', title:'Will Luiz Inácio Lula da Silva win the 2026 Brazilian presidential election?', category:'World', display_state:'Converged', nexus_score:91.0, flags:[], current_price:0.415, volume:28188058, time_to_close_days:null, market_slug:'brazil-election', top_outcome_name:'Lula da Silva' },
    { event_id:'4', title:'Will the US confirm that aliens exist before 2027?',      category:'Culture',  display_state:'Calibrating', nexus_score:94.5, flags:[], current_price:0.165, volume:19475964, time_to_close_days:null, market_slug:'aliens-2027',      top_outcome_name:null },
    { event_id:'5', title:'Will Jordan Bardella win the 2027 French presidential election?', category:'Elections', display_state:'Calibrating', nexus_score:93.2, flags:[], current_price:0.255, volume:17165761, time_to_close_days:null, market_slug:'france-bardella', top_outcome_name:'Jordan Bardella' },
    { event_id:'6', title:'Will Jesus Christ return before 2027?',                   category:'Culture',  display_state:'Calibrating', nexus_score:92.6, flags:[], current_price:0.038, volume:47896050, time_to_close_days:null, market_slug:'jesus-return',     top_outcome_name:null },
    { event_id:'7', title:'Will Scottie Scheffler win the 2026 Masters tournament?', category:'Sports',   display_state:'Fragile',     nexus_score:59.1, flags:[], current_price:0.175, volume:52715587, time_to_close_days:null, market_slug:'masters-2026',     top_outcome_name:'Scottie Scheffler' },
    { event_id:'8', title:'Will the US officially declare war on Iran by December 31, 2026?', category:'World', display_state:'Fragile', nexus_score:59.0, flags:[], current_price:0.085, volume:3624161, time_to_close_days:null, market_slug:'iran-war-2026', top_outcome_name:null },
    { event_id:'9', title:'Will Bayern Munich win the 2025–26 Bundesliga?',          category:'Sports',   display_state:'Fragile',     nexus_score:58.9, flags:[], current_price:0.986, volume:1433520,  time_to_close_days:null, market_slug:'bundesliga-2026',  top_outcome_name:'Bayern Munich' },
];
const MOCK_KPIS = { total_markets:149, converged_count:29, calibrating_count:83, fragile_count:34, initializing_count:3, contested_count:8, correlated_count:12, avg_nexus_score:71.5 };

let chartInst = null;

/* ── UTILS ── */
function fmtVol(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + Math.round(n);
}
function fmtCents(p) {
    if (p == null) return '—';
    const c = Math.round(p * 100);
    if (c >= 99) return '>99¢';
    if (c < 1)   return '<1¢';
    return c + '¢';
}
function animCount(el, target, dec, ms) {
    if (!el) return;
    dec = dec || 0; ms = ms || 700;
    const start = performance.now();
    const run = now => {
        const p = Math.min((now - start) / ms, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * e).toFixed(dec);
        if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
}
function getFlags(d) { return Array.isArray(d.flags) ? d.flags : []; }
function el(id) { return document.getElementById(id); }

/* ── CLOCK ── */
function tickClock() {
    const d = new Date();
    const t = [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
        .map(v => String(v).padStart(2, '0')).join(':') + ' UTC';
    const c = el('live-clock'), f = el('footer-clock');
    if (c) c.textContent = t;
    if (f) f.textContent = t;
}
setInterval(tickClock, 1000);
tickClock();

/* ── CHART ── */
function renderChart(cv, ca, fr) {
    const ctx = el('stateChart');
    if (!ctx) return;
    if (chartInst) chartInst.destroy();
    chartInst = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Converged', 'Calibrating', 'Fragile'],
            datasets: [{
                data: [cv, ca, fr],
                backgroundColor: ['rgba(29,158,117,0.65)', 'rgba(55,138,221,0.55)', 'rgba(186,117,23,0.5)'],
                borderColor:     ['rgba(29,158,117,0.4)',  'rgba(55,138,221,0.4)',  'rgba(186,117,23,0.35)'],
                borderWidth: 1, hoverOffset: 4,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '68%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#151f2e', borderColor: '#253d60', borderWidth: 1,
                    titleColor: '#dde6f0', bodyColor: '#6a8aaa',
                    titleFont: { family: "'JetBrains Mono',monospace", size: 11 },
                    bodyFont:  { family: "'JetBrains Mono',monospace", size: 11 },
                    callbacks: { label: c => `  ${c.label}: ${c.raw}` }
                }
            }
        }
    });
}

/* ── RENDER KPIs ── */
function renderKPIs(k) {
    animCount(el('kpi-total'),      k.total_markets      || 0);
    animCount(el('kpi-converged'),  k.converged_count    || 0);
    animCount(el('kpi-calibrating'),k.calibrating_count  || 0);
    animCount(el('kpi-fragile'),    k.fragile_count      || 0);
    animCount(el('kpi-contested'),  k.contested_count    || 0);
    animCount(el('kpi-correlated'), k.correlated_count   || 0);
    animCount(el('hero-active'),    k.total_markets      || 149);
    animCount(el('hero-converged'), k.converged_count    || 29);

    const tot = k.total_markets || 1;
    const cv  = k.converged_count || 0;
    const ca  = k.calibrating_count || 0;
    const fr  = k.fragile_count || 0;
    const pct = n => Math.round(n / tot * 100);

    const interp = el('health-interp');
    if (interp) {
        interp.innerHTML =
            `<strong>${pct(cv)}% of active markets (${cv}) show structural consensus lock.</strong> ` +
            `${pct(ca)}% (${ca}) are in active price discovery. ` +
            `${fr} markets are below the structural reliability threshold.`;
    }

    const lu = el('last-update');
    if (lu) lu.textContent = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

    const lk = el('locked-count'), tt = el('total-tracked');
    if (lk) lk.textContent = Math.max(0, tot - 9);
    if (tt) tt.textContent = tot;

    renderChart(cv, ca, fr);
}

/* ── RENDER MARKETS ── */
function renderMarkets(markets) {
    const container = el('state-groups');
    if (!container) return;
    container.innerHTML = '';

    const sc = el('shown-count');
    if (sc) sc.textContent = markets.length;

    ['Converged', 'Calibrating', 'Fragile'].forEach(state => {
        const group = markets.filter(m => m.display_state === state);
        if (!group.length) return;
        const cfg = STATE[state];

        const wrap = document.createElement('div');
        wrap.className = 'state-group';

        const head = document.createElement('div');
        head.className = 'state-group-head';
        head.innerHTML = `
            <span class="state-group-label">${state}</span>
            <span class="state-count-tag ${cfg.tagCls}">${group.length} shown</span>
        `;
        wrap.appendChild(head);

        group.forEach(m => {
            const score = parseFloat(m.nexus_score) || 0;
            const flags = getFlags(m);
            const outName = m.top_outcome_name;

            const card = document.createElement('div');
            card.className = `mkt-card ${cfg.cardCls}`;

            card.innerHTML = `
                <span class="card-arrow">↗</span>
                <div class="score-block">
                    <div class="score-integrity-label">Integrity</div>
                    <div class="score-num">${Math.round(score)}</div>
                    <div class="score-state ${cfg.scoreSC}">
                        <span class="state-dot ${cfg.dotCls}"></span>
                        ${state}
                    </div>
                </div>
                <div class="card-body">
                    <div class="card-category">${m.category || ''}</div>
                    <div class="card-title">${m.title || '—'}</div>
                    <div class="card-vol">${fmtVol(m.volume || 0)} volume</div>
                    ${flags.length ? `<div class="card-flag-row">${flags.map(f =>
                        `<span class="flag-chip fc-${f.toLowerCase()}">${f}</span>`
                    ).join('')}</div>` : ''}
                </div>
                <div class="card-price-block">
                    <div class="card-price">${fmtCents(m.current_price)}</div>
                    <div class="card-price-label">${outName ? outName : 'Market price'}</div>
                </div>
            `;

            card.addEventListener('click', () => openPanel(m));
            wrap.appendChild(card);
        });

        container.appendChild(wrap);
    });

    renderLockedRows(5);
}

function renderLockedRows(n) {
    const grid = el('locked-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < n; i++) {
        const row = document.createElement('div');
        row.className = 'locked-row';
        row.innerHTML = `
            <div class="locked-bar" style="width:60px;height:36px;flex-shrink:0;"></div>
            <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
                <div class="locked-bar" style="width:70%;"></div>
                <div class="locked-bar" style="width:45%;"></div>
            </div>
            <div class="locked-bar" style="width:50px;"></div>
        `;
        grid.appendChild(row);
    }
}

/* ── CONTEXT BUILDER ── */
function buildContext(m) {
    const s = m.display_state;
    const score = parseFloat(m.nexus_score) || 0;
    const vol = m.volume || 0;
    if (s === 'Converged') {
        return `Score <strong>${score.toFixed(1)}</strong> — structural consensus verified. ` +
               (vol > 10e6
                   ? `Deep market ($${(vol / 1e6).toFixed(0)}M volume) provides robust price discovery.`
                   : `Price reflects genuine crowd consensus.`);
    }
    if (s === 'Calibrating') {
        const gap = (80 - score).toFixed(1);
        return `Score <strong>${score.toFixed(1)}</strong> — price discovery in progress. ` +
               (parseFloat(gap) < 10
                   ? `${gap} pts from Converged threshold. Consensus is forming.`
                   : `Market is functional but has not yet reached consensus lock.`);
    }
    return `Score <strong>${score.toFixed(1)}</strong> — structural weakness detected. ` +
           (vol < 100000
               ? `Very thin liquidity — price signal is not yet meaningful.`
               : `Market depth or efficiency is below the reliability threshold.`) +
           ` Treat the current price with caution.`;
}

/* ── SPARKLINE ── */
function drawSparkline(canvas, vals) {
    if (!canvas || !vals || vals.length < 2) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 0.01;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(55,138,221,0.65)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    vals.forEach((v, i) => {
        const x = (i / (vals.length - 1)) * W;
        const y = H - ((v - mn) / rng) * (H - 8) - 4;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
}

/* ── DETAIL PANEL ── */
function openPanel(m) {
    const score = parseFloat(m.nexus_score) || 0;
    const state = m.display_state || 'Fragile';
    const cfg = STATE[state] || STATE.Fragile;
    const flags = getFlags(m);

    el('p-score').textContent  = Math.round(score);
    el('p-score2').textContent = score.toFixed(1);
    el('p-price').textContent  = fmtCents(m.current_price);
    el('p-vol').textContent    = fmtVol(m.volume || 0);
    el('p-close').textContent  = m.time_to_close_days != null ? m.time_to_close_days + 'd' : '—';

    const badge = el('p-badge');
    badge.textContent = state;
    badge.className = `panel-state-badge ${cfg.panelCls}`;

    const catEl = el('p-cat');
    if (catEl) catEl.textContent = m.category || '';

    el('p-title').textContent = m.title || '—';

    const flagsEl = el('p-flags');
    flagsEl.innerHTML = flags.map(f =>
        `<span class="pflag pf-${f.toLowerCase()}">${f}</span>`
    ).join('');

    el('p-context').innerHTML = buildContext(m);

    const pmLink = el('p-link');
    pmLink.href = m.market_slug
        ? `https://polymarket.com/event/${m.market_slug}`
        : 'https://polymarket.com';

    // Sparkline
    const sp = el('p-sparkline');
    const tr = el('p-trend-range');
    if (sp) {
        sp.width = sp.offsetWidth || 400;
        sp.getContext('2d').clearRect(0, 0, sp.width, sp.height);
    }
    if (tr) tr.textContent = 'loading...';

    if (USE_SB && sb) {
        sb.from('event_log')
            .select('current_price, snapshot_at')
            .eq('event_id', String(m.event_id))
            .not('current_price', 'is', null)
            .order('snapshot_at', { ascending: true })
            .limit(30)
            .then(({ data }) => {
                if (!data || data.length < 2) {
                    if (tr) tr.textContent = 'insufficient history';
                    return;
                }
                if (tr) tr.textContent = `${data.length} snapshots`;
                if (sp) drawSparkline(sp, data.map(r => r.current_price));
            })
            .catch(() => { if (tr) tr.textContent = '—'; });
    } else {
        if (tr) tr.textContent = '—';
    }

    el('overlay').classList.add('open');
    el('side-panel').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closePanel() {
    el('overlay').classList.remove('open');
    el('side-panel').classList.remove('open');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

/* ── DATA LOADING ── */
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

/* ── INIT ── */
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