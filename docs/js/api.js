/* API */

function normalizeMarket(m) {
    return {
        event_id: String(m.event_id || ''),
        title: m.title || '--',
        category: m.category || '',
        display_state: m.display_state || m.market_state || 'Calibrating',
        nexus_score: parseFloat(m.nexus_score) || 0,
        flags: Array.isArray(m.flags) ? m.flags : [],
        current_price: m.current_price != null ? parseFloat(m.current_price) : null,
        volume: Number(m.volume) || 0,
        close_time: m.close_time || null,
        time_to_close_days: m.time_to_close_days != null ? parseFloat(m.time_to_close_days) : null,
        market_slug: m.market_slug || m.slug || '',
        top_outcome_name: m.top_outcome_name || null,
        stable_hours: m.stable_hours != null ? parseFloat(m.stable_hours) : null,
        outcomes: Array.isArray(m.outcomes) ? m.outcomes : [],
    };
}

function normalizeKPIs(k) {
    const freshness =
        k && k.freshness && typeof k.freshness === 'object'
            ? {
                status: k.freshness.status || 'unknown',
                stale_since_minutes:
                    k.freshness.stale_since_minutes != null
                        ? Number(k.freshness.stale_since_minutes)
                        : null,
            }
            : null;

    return {
        total_markets: Number(k.total_markets) || 0,
        converged_count: Number(k.converged_count) || 0,
        calibrating_count: Number(k.calibrating_count) || 0,
        fragile_count: Number(k.fragile_count) || 0,
        judgments_v6:
            k.judgments_v6 != null
                ? Number(k.judgments_v6)
                : null,
        tracked_snapshots:
            k.tracked_snapshots != null
                ? Number(k.tracked_snapshots)
                : null,
        avg_history_depth:
            k.avg_history_depth != null
                ? Number(k.avg_history_depth)
                : null,
        as_of: k.as_of || k.pipeline_completed_at || null,
        schema_version: k.schema_version || null,
        freshness,
    };
}

async function loadKPIs() {
    if (!HAS_API) throw new Error('Worker URL is not configured');
    const res = await fetch(`${API_BASE}/kpis`);
    if (!res.ok) throw new Error(`KPIs HTTP ${res.status}`);
    const data = await res.json();
    if (!data || data.error) throw new Error('KPIs payload invalid');
    return normalizeKPIs(data);
}

async function loadMarkets() {
    if (!HAS_API) throw new Error('Worker URL is not configured');
    const res = await fetch(`${API_BASE}/markets`);
    if (!res.ok) throw new Error(`Markets HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Markets payload invalid');
    return data.map(normalizeMarket);
}
