/* FORMATTERS */

function fmtVol(n) {
    n = Number(n) || 0;
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + Math.round(n);
}

function fmtNum(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return Math.round(n / 1e3) + 'K';
    return String(n);
}

function fmtStableHours(h) {
    h = parseFloat(h);
    if (!h || h <= 0) return null;
    if (h < 24) return Math.round(h) + 'h';
    const days = Math.floor(h / 24);
    const rem = Math.round(h % 24);
    return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

function fmtOutcomePct(p) {
    if (p == null) return '--';
    const pct = parseFloat(p) * 100;
    if (pct <= 0) return '<1%';
    if (pct < 1) return '<1%';
    if (pct >= 99) return '>99%';
    if (pct >= 10) return Math.round(pct) + '%';
    return pct.toFixed(1) + '%';
}

function fmtCents(p) {
    if (p == null) return '--';
    const c = Math.round(parseFloat(p) * 100);
    if (c >= 99) return '>99\u00A2';
    if (c < 1) return '<1\u00A2';
    return c + '\u00A2';
}

function calcClosesIn(closeTime, daysToClose) {
    if (closeTime) {
        const diff = new Date(closeTime) - Date.now();
        if (diff <= 0) return 'Closed';
        const totalHours = Math.floor(diff / 3600000);
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        if (days === 0 && hours === 0) return '<1h';
        if (days === 0) return hours + 'h';
        if (days < 7) return days + 'd ' + hours + 'h';
        return days + 'd';
    }
    if (daysToClose != null) return parseFloat(daysToClose) + 'd';
    return '--';
}

function animCount(el, target, ms) {
    if (!el) return;
    if (typeof target === 'string') {
        el.textContent = target;
        return;
    }

    ms = ms || 700;
    const start = performance.now();
    const run = now => {
        const p = Math.min((now - start) / ms, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
}
