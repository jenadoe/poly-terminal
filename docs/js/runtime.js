/* RUNTIME */

function getFlags(d) {
    return Array.isArray(d.flags) ? d.flags : [];
}

function eid(id) {
    return document.getElementById(id);
}

function summarizeMarketReason(market) {
    const state = market.display_state || 'Fragile';
    const score = Number(market.nexus_score) || 0;
    const volume = Number(market.volume) || 0;
    const stableHours = Number(market.stable_hours) || 0;
    const flags = getFlags(market);

    if (state === 'Converged') {
        if (stableHours >= 24) return `Stable for ${fmtStableHours(stableHours)} with price support.`;
        if (volume >= 1e7) return 'High participation and steady pricing support this read.';
        return 'Price signal looks stable with no active warning flags.';
    }

    if (state === 'Calibrating') {
        if (flags.includes('Contested')) return 'Consensus is still forming under active disagreement.';
        if (score >= 70) return 'Price looks close to stable, but not yet fully locked.';
        return 'Price discovery is still active and confidence is still forming.';
    }

    if (flags.includes('Contested')) return 'Contested signal, confidence can diverge from the headline price.';
    if (volume < 1e5) return 'Thin liquidity makes this price easy to over-read.';
    if (score < 40) return 'Structural weakness remains high relative to the current price.';
    return 'This market still needs caution before being read at face value.';
}

function setRuntimeStatus(kind, message) {
    const banner = eid('runtime-banner');
    const pill = eid('runtime-pill');
    const msg = eid('runtime-message');
    if (!banner || !pill || !msg) return;

    banner.hidden = false;
    banner.className = `runtime-banner rs-${kind}`;
    pill.textContent =
        kind === 'live' ? 'LIVE DATA'
      : kind === 'degraded' ? 'DEGRADED'
      : kind === 'loading' ? 'CONNECTING'
      : 'LIVE DATA UNAVAILABLE';
    msg.textContent = message;
}

function tickClock() {
    const d = new Date();
    const timeStr = d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    const short = new Intl.DateTimeFormat('en', { timeZoneName: 'short' })
        .formatToParts(d)
        .find(p => p.type === 'timeZoneName')?.value || '';
    const display = `${timeStr} ${short}`;
    const c = eid('live-clock');
    const f = eid('footer-clock');
    if (c) c.textContent = display;
    if (f) f.textContent = display;
}

setInterval(tickClock, 1000);
tickClock();
