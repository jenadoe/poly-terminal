/* MAIN */

function formatAsOf(ts) {
    if (!ts) return '--';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '--';
    const short = new Intl.DateTimeFormat('en', { timeZoneName: 'short' })
        .formatToParts(d)
        .find(p => p.type === 'timeZoneName')?.value || '';
    return d.toLocaleString('en-GB', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }) + ' ' + short;
}

function renderMetric(el, value, formatter) {
    if (!el) return;
    if (value == null || Number.isNaN(value)) {
        el.textContent = 'ERR';
        el.classList.add('is-error');
        return;
    }
    el.classList.remove('is-error');
    if (formatter) {
        el.textContent = formatter(value);
        return;
    }
    animCount(el, value);
}

function getFreshnessStatus(k) {
    return k && k.freshness && k.freshness.status ? k.freshness.status : 'unknown';
}

function getHeroPanelKind(k) {
    if (k.tracked_snapshots == null || k.avg_history_depth == null) return 'partial';
    return getFreshnessStatus(k) === 'stale' ? 'stale' : 'live';
}

function getRuntimeStatusDecision(kpisResult, marketsResult) {
    const kpisOk = kpisResult.status === 'fulfilled';
    const marketsOk = marketsResult.status === 'fulfilled';

    if (kpisOk && marketsOk) {
        return getFreshnessStatus(kpisResult.value) === 'fresh' ? 'live' : 'degraded';
    }
    if (kpisOk || marketsOk) return 'degraded';
    return 'error';
}

function setHeroPanelStatus(kind) {
    const el = eid('hero-panel-status');
    if (!el) return;
    el.className = 'panel-status';
    if (kind === 'partial') {
        el.textContent = 'KPI PARTIAL';
        el.classList.add('is-error');
        return;
    }
    if (kind === 'down') {
        el.textContent = 'KPI DOWN';
        el.classList.add('is-error');
        return;
    }
    if (kind === 'stale') {
        el.textContent = 'KPI STALE';
        el.classList.add('is-error');
        return;
    }
    el.textContent = 'LIVE';
    el.classList.add('is-live');
}

function renderHealthInterpretation(total, converged, calibrating, fragile) {
    const interp = eid('health-interp');
    if (!interp) return;
    clearChildren(interp);
    appendElement(interp, 'strong', `${Math.round((converged / total) * 100)}%`);
    appendText(interp, ' of markets show structural lock - ');
    appendElement(interp, 'strong', calibrating);
    appendText(interp, ' in price discovery - ');
    appendElement(interp, 'strong', fragile);
    appendText(interp, ' below reliability threshold');
}

function renderKPIs(k) {
    animCount(eid('kpi-total'), k.total_markets || 0);
    animCount(eid('kpi-converged'), k.converged_count || 0);
    animCount(eid('kpi-calibrating'), k.calibrating_count || 0);
    animCount(eid('kpi-fragile'), k.fragile_count || 0);
    animCount(eid('hero-total-markets'), k.total_markets || 0);
    renderMetric(eid('hero-tracked-snapshots'), k.tracked_snapshots, value => fmtNum(value).toUpperCase());
    renderMetric(eid('hero-history-depth'), k.avg_history_depth);
    animCount(eid('hero-judgments'), k.judgments_v6 || 0);

    const total = k.total_markets || 1;
    const converged = k.converged_count || 0;
    const calibrating = k.calibrating_count || 0;
    const fragile = k.fragile_count || 0;
    renderHealthInterpretation(total, converged, calibrating, fragile);

    const lu = eid('last-update');
    if (lu) lu.textContent = formatAsOf(k.as_of);

    const tracked = eid('total-tracked');
    if (tracked) tracked.textContent = k.total_markets || '--';
    if (typeof syncLockedCount === 'function') syncLockedCount();

    setHeroPanelStatus(getHeroPanelKind(k));
}

function renderKPIUnavailable(message) {
    [
        'kpi-total',
        'kpi-converged',
        'kpi-calibrating',
        'kpi-fragile',
        'hero-total-markets',
        'hero-tracked-snapshots',
        'hero-history-depth',
        'hero-judgments',
        'last-update',
        'locked-count',
        'total-tracked',
    ].forEach(id => {
        const el = eid(id);
        if (el) el.textContent = '--';
    });

    const interp = eid('health-interp');
    if (interp) {
        clearChildren(interp);
        appendElement(interp, 'strong', 'Live data unavailable.');
        appendText(interp, ` ${message}`);
    }

    setHeroPanelStatus('down');
}

async function init() {
    setRuntimeStatus('loading', 'Connecting to live worker...');

    const settle = promise =>
        promise.then(
            value => ({ status: 'fulfilled', value }),
            reason => ({ status: 'rejected', reason })
        );

    const kpisResultPromise = settle(loadKPIs()).then(result => {
        if (result.status === 'fulfilled') {
            renderKPIs(result.value);
        } else {
            console.warn('[Poly-Nexus] KPIs fetch failed:', result.reason?.message || result.reason);
            renderKPIUnavailable('The dashboard could not refresh KPI data from the worker.');
        }
        return result;
    });

    const marketsResultPromise = settle(loadMarkets()).then(result => {
        if (result.status === 'fulfilled') {
            renderMarkets(result.value);
        } else {
            console.warn('[Poly-Nexus] Markets fetch failed:', result.reason?.message || result.reason);
            renderMarkets([], 'Live market data unavailable');
        }
        return result;
    });

    const [kpisResult, marketsResult] = await Promise.all([kpisResultPromise, marketsResultPromise]);

    const runtimeKind = getRuntimeStatusDecision(kpisResult, marketsResult);
    if (runtimeKind === 'live') {
        setRuntimeStatus('live', `Worker connected - ${marketsResult.value.length} public markets loaded`);
        return;
    }

    if (runtimeKind === 'degraded') {
        const freshness = kpisResult.status === 'fulfilled'
            ? getFreshnessStatus(kpisResult.value)
            : 'unknown';
        const staleMinutes = kpisResult.status === 'fulfilled'
            ? kpisResult.value.freshness?.stale_since_minutes
            : null;
        const message = freshness === 'stale'
            ? `Public worker reachable, but KPI data is stale${staleMinutes != null ? ` (${staleMinutes} minutes old)` : ''}.`
            : 'Public worker reachable, but part of the dashboard is delayed or unavailable.';
        setRuntimeStatus('degraded', message);
        return;
    }

    setRuntimeStatus('error', 'Worker unreachable or response invalid. No mock data is being shown.');
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    init();
    setInterval(init, 5 * 60 * 1000);
}
