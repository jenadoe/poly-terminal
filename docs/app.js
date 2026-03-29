/* MAIN */

function renderKPIs(k) {
    animCount(eid('kpi-total'), k.total_markets || 0);
    animCount(eid('kpi-converged'), k.converged_count || 0);
    animCount(eid('kpi-calibrating'), k.calibrating_count || 0);
    animCount(eid('kpi-fragile'), k.fragile_count || 0);

    animCount(eid('hero-active'), k.total_markets || 0);
    animCount(eid('hero-converged'), k.converged_count || 0);

    const dpEl = eid('hero-datapoints');
    if (dpEl) dpEl.textContent = k.data_points ? fmtNum(k.data_points) : '--';

    const jEl = eid('hero-judgments');
    if (jEl) jEl.textContent = k.judgments != null ? k.judgments : '--';

    const total = k.total_markets || 1;
    const converged = k.converged_count || 0;
    const calibrating = k.calibrating_count || 0;
    const fragile = k.fragile_count || 0;
    const interp = eid('health-interp');
    if (interp) {
        interp.innerHTML =
            `<strong>${Math.round((converged / total) * 100)}%</strong> of markets show structural lock - ` +
            `<strong>${calibrating}</strong> in price discovery - ` +
            `<strong>${fragile}</strong> below reliability threshold`;
    }

    const lu = eid('last-update');
    if (lu) {
        const now = new Date();
        const short = new Intl.DateTimeFormat('en', { timeZoneName: 'short' })
            .formatToParts(now)
            .find(p => p.type === 'timeZoneName')?.value || '';
        lu.textContent = now.toLocaleString('en-GB', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }) + ' ' + short;
    }

    const locked = eid('locked-count');
    const tracked = eid('total-tracked');
    if (locked) locked.textContent = Math.max(0, (k.total_markets || 0) - 9);
    if (tracked) tracked.textContent = k.total_markets || '--';
}

function renderKPIUnavailable(message) {
    [
        'kpi-total',
        'kpi-converged',
        'kpi-calibrating',
        'kpi-fragile',
        'hero-active',
        'hero-converged',
        'hero-datapoints',
        'hero-judgments',
        'last-update',
        'locked-count',
        'total-tracked',
    ].forEach(id => {
        const el = eid(id);
        if (el) el.textContent = '--';
    });

    const interp = eid('health-interp');
    if (interp) interp.innerHTML = `<strong>Live data unavailable.</strong> ${message}`;
}

async function init() {
    setRuntimeStatus('loading', 'Connecting to live worker...');

    const [kpisResult, marketsResult] = await Promise.allSettled([loadKPIs(), loadMarkets()]);

    if (kpisResult.status === 'fulfilled') {
        renderKPIs(kpisResult.value);
    } else {
        console.warn('[Poly-Nexus] KPIs fetch failed:', kpisResult.reason?.message || kpisResult.reason);
        renderKPIUnavailable('The dashboard could not refresh KPI data from the worker.');
    }

    if (marketsResult.status === 'fulfilled') {
        renderMarkets(marketsResult.value);
    } else {
        console.warn('[Poly-Nexus] Markets fetch failed:', marketsResult.reason?.message || marketsResult.reason);
        renderMarkets([], 'Live market data unavailable');
    }

    if (kpisResult.status === 'fulfilled' && marketsResult.status === 'fulfilled') {
        setRuntimeStatus('live', `Worker connected - ${marketsResult.value.length} public markets loaded`);
        return;
    }

    setRuntimeStatus('error', 'Worker unreachable or response invalid. No mock data is being shown.');
}

init();
setInterval(init, 5 * 60 * 1000);
