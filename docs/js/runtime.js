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
        if (stableHours >= 24) return `Stable for ${fmtStableHours(stableHours)} with public market support.`;
        if (volume >= 1e7) return 'High participation and steady pricing support this reference read.';
        return 'No active warning flags are visible in the current public read.';
    }

    if (state === 'Calibrating') {
        if (flags.includes('Contested')) return 'Consensus is still forming under active disagreement.';
        if (score >= 70) return 'The public read is close to settled, but still forming.';
        return 'Price discovery is still active; reference posture may change.';
    }

    if (flags.includes('Contested')) return 'Contested market conditions can make the headline price easy to over-read.';
    if (volume < 1e5) return 'Thin liquidity makes this price easy to over-read.';
    if (score < 40) return 'Current public structure does not support standalone use.';
    return 'This market still needs caution before the price is referenced at face value.';
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
