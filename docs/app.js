/* ============================================================
   POLY-NEXUS — app.js
   State Matrix UI · Amber/Slate · Terminal aesthetic
   ============================================================ */

/* ── CONFIG ── */
const _cfg = window.POLY_NEXUS_CONFIG || {};
const USE_SB = !!(_cfg.supabaseUrl && _cfg.supabaseAnonKey);
let sb = null;

if (USE_SB) {
    sb = supabase.createClient(_cfg.supabaseUrl, _cfg.supabaseAnonKey);
} else {
    console.error("[SYSTEM ERROR] config.js 로드 실패 또는 Supabase 설정 누락. Mock 데이터를 사용합니다.");
}

/* ── STATE CONFIG ── */
const SC = {
    Converged:   { col: 'ch-converged',   row: 'r-converged',   badge: 'ssb-c', label: 'Converged',   desc: 'Structural consensus locked' },
    Calibrating: { col: 'ch-calibrating', row: 'r-calibrating', badge: 'ssb-a', label: 'Calibrating', desc: 'Price discovery in progress' },
    Fragile:     { col: 'ch-fragile',     row: 'r-fragile',     badge: 'ssb-f', label: 'Fragile',     desc: 'Structural weakness detected' },
};

/* ── MOCK DATA (Supabase 미연결 시 fallback) ── */
const MOCK_MARKETS =[
    { 
      event_id:'1', title:'Will Finland win Eurovision 2026? (TEST: 12 Outcomes)', category:'Culture', display_state:'Converged', nexus_score:92.6, flags:[], current_price:0.376, volume:28353653, time_to_close_days:52, close_time:null, market_slug:'eurovision-winner-2026', top_outcome_name:'Finland', stable_hours:51,
      outcomes:[
          {name:'Finland',price:0.376,is_tracked:true},
          {name:'Denmark',price:0.128,is_tracked:false},
          {name:'France',price:0.125,is_tracked:false},
          {name:'Greece',price:0.0715,is_tracked:false},
          {name:'Australia',price:0.051,is_tracked:false},
          {name:'Sweden',price:0.045,is_tracked:false},
          {name:'Norway',price:0.040,is_tracked:false},
          {name:'Italy',price:0.035,is_tracked:false},
          {name:'Spain',price:0.030,is_tracked:false},
          {name:'UK',price:0.025,is_tracked:false},
          {name:'Germany',price:0.020,is_tracked:false},
          {name:'Ukraine',price:0.015,is_tracked:false}
      ]
    },
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
function escapeHtml(str) {
    if (str == null) return '—';
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}

function fmtVol(n) {
    const val = parseFloat(n) || 0;
    if (val >= 1e9) return '$' + (val/1e9).toFixed(2) + 'B';
    if (val >= 1e6) return '$' + (val/1e6).toFixed(1) + 'M';
    if (val >= 1e3) return '$' + (val/1e3).toFixed(0) + 'K';
    return '$' + Math.round(val);
}

function fmtStableHours(h) {
    const val = parseFloat(h) || 0;
    if (val <= 0) return null;
    if (val < 24) return Math.round(val) + 'h';
    const days = Math.floor(val / 24);
    const rem  = Math.round(val % 24);
    return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

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
    if (fallbackDays != null) return `~${parseFloat(fallbackDays) || 0}d`;
    return null;
}

function fmtOutcomePct(p) {
    const val = parseFloat(p) || 0;
    if (val === 0) return '<1%';
    const pct = val * 100;
    if (pct < 1)   return '<1%';
    if (pct >= 99) return '>99%';
    if (pct >= 10) return Math.round(pct) + '%';
    return pct.toFixed(1) + '%';
}

function fmtCents(p) {
    const val = parseFloat(p);
    if (isNaN(val)) return '—';
    const c = Math.round(val * 100);
    if (c >= 99) return '>99¢';
    if (c < 1)   return '<1¢';
    return c + '¢';
}

function animCount(el, target, ms) {
    if (!el) return;
    ms = ms || 700;
    const s = performance.now();
    const targetVal = parseFloat(target) || 0;
    const run = now => {
        const p = Math.min((now - s) / ms, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(targetVal * e);
        if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
}

function getFlags(d) { return Array.isArray(d.flags) ? d.flags :[]; }
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
    const base = (parseFloat(score) || 0) / 100;
    return[
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

    const tot = parseFloat(k.total_markets) || 1;
    const cv  = parseFloat(k.converged_count) || 0;
    const ca  = parseFloat(k.calibrating_count) || 0;
    const fr  = parseFloat(k.fragile_count) || 0;

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

    const closeStr = closesIn(m.close_time, m.time_to_close_days);

    const stableLabel = (state === 'Converged' && m.stable_hours)
        ? `<span class="stable-badge">✓ STABLE ${fmtStableHours(m.stable_hours)}</span>`
        : '';

    const flagsHTML = flags.map(f => {
        const cls = f === 'Contested' ? 'mf-contested' : 'mf-correlated';
        return `<span class="mkt-flag ${cls}">${escapeHtml(f)}</span>`;
    }).join('');

    const row = document.createElement('div');
    row.className = `mkt-row ${cfg.row}`;
    row.innerHTML = `
        <div class="mkt-inner">
            <div class="mkt-top">
                <div style="min-width:0;flex:1;">
                    <div class="mkt-category">${escapeHtml(m.category)}</div>
                    <div class="mkt-title">${escapeHtml(m.title)}</div>
                </div>
                <div class="nxs-block">
                    <span cla