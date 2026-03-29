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

async function loadKPIs() {
    if (!HAS_API) throw new Error('Worker URL is not configured');
    const res = await fetch(`${API_BASE}/api/kpis`);
    if (!res.ok) throw new Error(`KPIs HTTP ${res.status}`);
    const data = await res.json();
    if (!data || data.error) throw new Error('KPIs payload invalid');
    return data;
}

async function loadMarkets() {
    if (!HAS_API) throw new Error('Worker URL is not configured');
    const res = await fetch(`${API_BASE}/api/markets`);
    if (!res.ok) throw new Error(`Markets HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Markets payload invalid');
    return data.map(normalizeMarket);
}
