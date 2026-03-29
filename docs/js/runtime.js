/* RUNTIME */

function getFlags(d) {
    return Array.isArray(d.flags) ? d.flags : [];
}

function eid(id) {
    return document.getElementById(id);
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
