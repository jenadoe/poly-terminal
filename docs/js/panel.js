/* PANEL */

function buildContext(m) {
    const fragments = [];
    const state = m.display_state;
    const score = m.nexus_score || 0;
    const reason = summarizeMarketReason(m);
    const flags = getFlags(m);

    fragments.push({ tag: 'strong', text: 'Current read:' });
    fragments.push({ text: ` ${reason} Score ` });
    fragments.push({ tag: 'strong', text: score.toFixed(1) });

    if (state === 'Converged') {
        fragments.push({ text: '.' });
        if (m.stable_hours) {
            fragments.push({ text: ' Stable for ' });
            fragments.push({ tag: 'strong', text: fmtStableHours(m.stable_hours) });
            fragments.push({ text: '.' });
        }
    } else if (state === 'Calibrating') {
        fragments.push({ text: ' signals an active interpretation state.' });
    } else {
        fragments.push({ text: ' indicates structural caution.' });
    }

    if (flags.length) {
        fragments.push({ text: ' Flags: ' });
        fragments.push({ tag: 'strong', text: flags.join(', ') });
        fragments.push({ text: '.' });
    }

    return fragments;
}

function renderContext(container, fragments) {
    if (!container) return;
    clearChildren(container);
    fragments.forEach(fragment => {
        if (fragment.tag) {
            appendElement(container, fragment.tag, fragment.text);
            return;
        }
        appendText(container, fragment.text);
    });
}

function appendOutcomeRow(container, outcome) {
    const row = appendElement(
        container,
        'div',
        null,
        `sp-outcome-row${outcome.tracked ? ' sp-outcome-tracked' : ''}`
    );
    const name = appendElement(row, 'div', null, 'sp-outcome-name');
    if (outcome.tracked) appendElement(name, 'span', null, 'sp-tracked-dot');
    appendText(name, outcome.name || '--');
    if (outcome.tracked) appendElement(name, 'span', 'tracked', 'sp-tracked-label');

    const barBg = appendElement(row, 'div', null, 'sp-outcome-bar-bg');
    const fill = appendElement(
        barBg,
        'div',
        null,
        `sp-outcome-bar-fill ${outcome.tracked ? 'bar-tracked' : 'bar-other'}`
    );
    fill.style.width = outcome.barWidth;

    appendElement(
        row,
        'div',
        fmtOutcomePct(outcome.price),
        `sp-outcome-pct${outcome.tracked ? ' pct-tracked' : ''}`
    );
}

function drawSparkline(canvas, vals) {
    if (!canvas || !vals || vals.length < 2) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    const rng = mx - mn || 0.01;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(200,151,58,0.6)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    vals.forEach((v, i) => {
        const x = (i / (vals.length - 1)) * width;
        const y = height - ((v - mn) / rng) * (height - 6) - 3;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.stroke();
}

function renderOutcomesInPanel(outcomes, currentPrice) {
    const outWrap = eid('sp-outcomes');
    const outSection = eid('sp-outcomes-section');
    if (!outWrap || !outSection) return;

    if (Array.isArray(outcomes) && outcomes.length > 0) {
        outSection.style.display = 'block';
        const sorted = [...outcomes].sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
        const limit = 10;
        let expanded = false;

        function render(all) {
            const visible = expanded ? all : all.slice(0, limit);
            const remaining = all.length - limit;
            clearChildren(outWrap);
            visible.forEach(o => {
                const price = parseFloat(o.price) || 0;
                appendOutcomeRow(outWrap, {
                    name: o.name || '--',
                    price,
                    tracked: o.is_tracked === true,
                    barWidth: `${Math.min(Math.max(price * 100, 0.5), 100).toFixed(1)}%`,
                });
            });

            if (all.length > limit) {
                const toggle = document.createElement('div');
                toggle.className = 'outcomes-toggle';
                toggle.textContent = expanded ? 'show less' : `+${remaining} more`;
                toggle.addEventListener('click', () => {
                    expanded = !expanded;
                    render(all);
                });
                outWrap.appendChild(toggle);
            }
        }

        render(sorted);
        return;
    }

    if (currentPrice != null) {
        outSection.style.display = 'block';
        const yesP = parseFloat(currentPrice);
        const noP = Math.max(0, 1 - yesP);
        clearChildren(outWrap);
        appendOutcomeRow(outWrap, {
            name: 'Yes',
            price: yesP,
            tracked: true,
            barWidth: `${Math.min(Math.max(yesP * 100, 0.5), 100).toFixed(1)}%`,
        });
        appendOutcomeRow(outWrap, {
            name: 'No',
            price: noP,
            tracked: false,
            barWidth: `${Math.min(Math.max(noP * 100, 0.5), 100).toFixed(1)}%`,
        });
        return;
    }

    outSection.style.display = 'none';
}

function openPanel(m) {
    const requestToken = ++sparklineRequestToken;
    const score = m.nexus_score || 0;
    const state = m.display_state || 'Fragile';
    const cfg = SC[state] || SC.Fragile;
    const flags = getFlags(m);

    eid('sp-score').textContent = Math.round(score);
    eid('sp-score2').textContent = parseFloat(score).toFixed(1);
    eid('sp-price').textContent = fmtCents(m.current_price);
    eid('sp-vol').textContent = fmtVol(m.volume || 0);
    eid('sp-closes-in').textContent = calcClosesIn(m.close_time, m.time_to_close_days);

    const badge = eid('sp-badge');
    badge.textContent = state;
    badge.className = `sp-state-badge ${cfg.badge}`;

    const catEl = eid('sp-cat');
    if (catEl) catEl.textContent = m.category || '';
    eid('sp-title').textContent = m.title || '--';

    const flagsWrap = eid('sp-flags');
    clearChildren(flagsWrap);
    flags.forEach(flag => {
        appendElement(
            flagsWrap,
            'span',
            flag,
            `sp-flag ${flag === 'Contested' ? 'spf-c' : 'spf-r'}`
        );
    });

    renderContext(eid('sp-context'), buildContext(m));
    renderOutcomesInPanel(m.outcomes, m.current_price);

    const link = eid('sp-link');
    link.href = m.market_slug ? `https://polymarket.com/event/${m.market_slug}` : 'https://polymarket.com';

    const sp = eid('sp-canvas');
    const tr = eid('sp-trend-range');
    if (sp) {
        sp.width = sp.offsetWidth || 380;
        sp.getContext('2d').clearRect(0, 0, sp.width, sp.height);
    }
    if (tr) tr.textContent = 'loading...';

    if (HAS_API && m.event_id) {
        fetch(`${API_BASE}/sparkline/${encodeURIComponent(String(m.event_id))}`)
            .then(r => (r.ok ? r.json() : []))
            .then(data => {
                if (requestToken !== sparklineRequestToken) return;
                const vals = Array.isArray(data)
                    ? data.map(row => parseFloat(row.current_price ?? row.p) || 0).filter(v => v > 0)
                    : [];
                if (vals.length < 2) {
                    if (tr) tr.textContent = 'insufficient history';
                    return;
                }
                if (tr) tr.textContent = `${vals.length} snapshots`;
                if (sp) drawSparkline(sp, vals);
            })
            .catch(() => {
                if (requestToken !== sparklineRequestToken) return;
                if (tr) tr.textContent = 'history unavailable';
            });
    } else if (tr) {
        tr.textContent = 'history unavailable';
    }

    eid('overlay').classList.add('open');
    eid('side-panel').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closePanel() {
    sparklineRequestToken += 1;
    eid('overlay').classList.remove('open');
    eid('side-panel').classList.remove('open');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePanel();
});

if (typeof document !== 'undefined') {
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.addEventListener('click', closePanel);

    const closeBtn = document.getElementById('sp-panel-close');
    if (closeBtn) closeBtn.addEventListener('click', closePanel);
}
