/* PANEL */

function buildContext(m) {
    const state = m.display_state;
    const score = m.nexus_score || 0;
    const vol = m.volume || 0;

    if (state === 'Converged') {
        return `NXS <strong>${score.toFixed(1)}</strong> - structural consensus verified. ` +
            (vol > 10e6
                ? `Deep market ($${(vol / 1e6).toFixed(0)}M) supports reliable signal.`
                : 'Price reflects genuine crowd consensus.');
    }

    if (state === 'Calibrating') {
        const gap = (80 - score).toFixed(1);
        return `NXS <strong>${score.toFixed(1)}</strong> - price discovery in progress. ` +
            (parseFloat(gap) < 10 ? `${gap} pts from Converged threshold.` : 'Consensus has not yet stabilized.');
    }

    return `NXS <strong>${score.toFixed(1)}</strong> - structural weakness detected. ` +
        (vol < 100000 ? 'Very thin liquidity.' : 'Depth or efficiency below threshold.') +
        ' Treat price signal with caution.';
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

            outWrap.innerHTML = visible.map(o => {
                const price = parseFloat(o.price) || 0;
                const barW = Math.min(Math.max(price * 100, 0.5), 100).toFixed(1);
                const tracked = o.is_tracked === true;
                return `
                    <div class="sp-outcome-row ${tracked ? 'sp-outcome-tracked' : ''}">
                        <div class="sp-outcome-name">
                            ${tracked ? '<span class="sp-tracked-dot"></span>' : ''}
                            ${o.name || '--'}
                            ${tracked ? '<span class="sp-tracked-label">tracked</span>' : ''}
                        </div>
                        <div class="sp-outcome-bar-bg">
                            <div class="sp-outcome-bar-fill ${tracked ? 'bar-tracked' : 'bar-other'}" style="width:${barW}%"></div>
                        </div>
                        <div class="sp-outcome-pct ${tracked ? 'pct-tracked' : ''}">${fmtOutcomePct(price)}</div>
                    </div>
                `;
            }).join('');

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
        const yesW = Math.min(Math.max(yesP * 100, 0.5), 100).toFixed(1);
        const noW = Math.min(Math.max(noP * 100, 0.5), 100).toFixed(1);

        outWrap.innerHTML = `
            <div class="sp-outcome-row sp-outcome-tracked">
                <div class="sp-outcome-name">
                    <span class="sp-tracked-dot"></span>Yes
                    <span class="sp-tracked-label">tracked</span>
                </div>
                <div class="sp-outcome-bar-bg">
                    <div class="sp-outcome-bar-fill bar-tracked" style="width:${yesW}%"></div>
                </div>
                <div class="sp-outcome-pct pct-tracked">${fmtOutcomePct(yesP)}</div>
            </div>
            <div class="sp-outcome-row">
                <div class="sp-outcome-name">No</div>
                <div class="sp-outcome-bar-bg">
                    <div class="sp-outcome-bar-fill bar-other" style="width:${noW}%"></div>
                </div>
                <div class="sp-outcome-pct">${fmtOutcomePct(noP)}</div>
            </div>
        `;
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
    eid('sp-close').textContent = calcClosesIn(m.close_time, m.time_to_close_days);

    const badge = eid('sp-badge');
    badge.textContent = state;
    badge.className = `sp-state-badge ${cfg.badge}`;

    const catEl = eid('sp-cat');
    if (catEl) catEl.textContent = m.category || '';
    eid('sp-title').textContent = m.title || '--';

    eid('sp-flags').innerHTML = flags.map(f =>
        `<span class="sp-flag ${f === 'Contested' ? 'spf-c' : 'spf-r'}">${f}</span>`
    ).join('');

    eid('sp-context').innerHTML = buildContext(m);
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
        fetch(`${API_BASE}/api/sparkline/${encodeURIComponent(String(m.event_id))}`)
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
