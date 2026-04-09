/* RUNTIME */

function getFlags(d) {
    return Array.isArray(d.flags) ? d.flags : [];
}

function eid(id) {
    return document.getElementById(id);
}

function clearChildren(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
}

function appendText(node, text) {
    if (!node) return;
    node.appendChild(document.createTextNode(String(text)));
}

function appendElement(node, tag, text, className) {
    if (!node) return null;
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = String(text);
    node.appendChild(el);
    return el;
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
    const dot = eid('topbar-status-dot');
    const text = eid('topbar-status-text');
    if (!dot || !text) return;

    dot.className =
        kind === 'live' ? 'pulse-dot is-live'
      : kind === 'degraded' ? 'pulse-dot is-degraded'
      : kind === 'loading' ? 'pulse-dot is-loading'
      : 'pulse-dot is-error';

    text.textContent =
        kind === 'live' ? 'SYSTEM ONLINE'
      : kind === 'degraded' ? 'DATA DELAYED'
      : kind === 'loading' ? 'CONNECTING'
      : 'SYSTEM DOWN';

    text.title = message || '';
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
    if (c) c.textContent = display;
}

setInterval(tickClock, 1000);
tickClock();
