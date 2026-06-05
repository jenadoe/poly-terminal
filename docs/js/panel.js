/* PANEL */

function buildContext(m) {
    const fragments = [];
    const state = m.display_state;
    const score = m.nexus_score || 0;
    const reason = summarizeMarketReason(m);
    const flags = getFlags(m);

    if (m.citation_status) {
        const rawReasons = Array.isArray(m.citation_overlay_reasons)
            ? m.citation_overlay_reasons
            : Array.isArray(m.quote_reasons)
                ? m.quote_reasons
                : [];
        const reasons = rawReasons.map(formatCitationReason).filter(Boolean);
        fragments.push({ tag: 'strong', text: 'Reference guidance:' });
        fragments.push({ text: ` ${citationStatusCopy(m.citation_status)}` });
        if (reasons.length) {
            fragments.push({ text: ' ' });
            fragments.push({ tag: 'strong', text: reasons.slice(0, 2).join(' / ') });
            fragments.push({ text: '.' });
        }
        return fragments;
    }

    fragments.push({ tag: 'strong', text: 'Current read:' });
    fragments.push({ text: ` ${reason} Diagnostic ` });
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

function citationStatusCopy(status) {
    const copy = {
        SAFE_TO_CITE: 'Cite as a Polymarket reference with source link and as-of date. Do not present Ready as odds approval.',
        CITE_WITH_CONTEXT: 'Attach the specific option, wording, timing, or resolution detail before quoting this price.',
        REVIEW_FIRST: 'Review market rules, resolution criteria, timing, or sensitivity before reusing this price.',
        DO_NOT_CITE_STANDALONE: 'Do not quote the price alone. Use only with full market wording or broader explanation.',
    };
    return copy[status] || '';
}

function referenceStatusFromCitation(status) {
    const statuses = {
        SAFE_TO_CITE: 'READY',
        CITE_WITH_CONTEXT: 'CONTEXT_REQUIRED',
        REVIEW_FIRST: 'REVIEW_RECOMMENDED',
        DO_NOT_CITE_STANDALONE: 'NOT_STANDALONE',
    };
    return statuses[status] || '';
}

function panelCodes(market) {
    return Array.isArray(market.reference_reason_codes)
        ? market.reference_reason_codes.filter(Boolean)
        : [];
}

function panelTopic(market) {
    return market.selected_outcome_question || market.title || 'this Polymarket market';
}

function panelContextSummary(market) {
    const codes = panelCodes(market);
    if (codes.includes('threshold_definition')) return 'the exact threshold, boundary, and deadline';
    if (codes.includes('option_context') || codes.includes('option_set_context')) return 'the specific option or option set';
    if (codes.includes('public_health_reporting')) return 'the reporting source, case definition, and timing';
    if (codes.includes('disclosure_oracle_review')) return 'the confirmation timing, rule-interpretation, and review-state context';
    if (codes.includes('resolution_review') || codes.includes('event_definition')) return 'the resolution source and event definition';
    if (codes.includes('geopolitical_interpretation')) return 'the geopolitical wording and settlement context';
    if (codes.includes('election_market')) return 'the election-market framing';
    if (codes.includes('long_horizon') || codes.includes('near_term')) return 'the close date and as-of date';
    return 'the exact market question and Polymarket source';
}

function panelNextAction(market) {
    const status = market.reference_status || referenceStatusFromCitation(market.citation_status);
    const summary = panelContextSummary(market);
    if (market.reference_action) return market.reference_action;
    if (status === 'READY') return 'Cite as a Polymarket reference with the source and an as-of date. Do not present Ready as odds approval.';
    if (status === 'CONTEXT_REQUIRED') return `Use the price only with ${summary} attached.`;
    if (status === 'REVIEW_RECOMMENDED') return `Check ${summary} before citing. Treat the price as market pricing, not polling, forecast, or validation.`;
    if (status === 'NOT_STANDALONE') return `Do not use the price as an isolated percentage. If discussed, keep the full question visible and explain ${summary}.`;
    return citationStatusCopy(market.citation_status);
}

function panelReasonItems(market) {
    const explicit = Array.isArray(market.reference_reasons)
        ? market.reference_reasons.filter(Boolean)
        : [];
    if (explicit.length) return explicit.slice(0, 4);

    const rawReasons = Array.isArray(market.citation_overlay_reasons)
        ? market.citation_overlay_reasons
        : Array.isArray(market.quote_reasons)
            ? market.quote_reasons
            : [];
    const formatted = rawReasons.map(formatCitationReason).filter(Boolean);
    if (formatted.length) return formatted.slice(0, 4);

    return [`Review how "${panelTopic(market)}" would read if the price were separated from the full Polymarket question.`];
}

function panelChecklistItems(market) {
    const status = market.reference_status || referenceStatusFromCitation(market.citation_status);
    const codes = panelCodes(market);
    const items = [];
    const add = item => {
        if (item && !items.includes(item)) items.push(item);
    };

    if (status === 'READY') {
        add('Cite Polymarket as the source');
        add('Include an as-of date');
        add('Avoid forecast, accuracy, or validation language');
        return items;
    }

    if (status === 'CONTEXT_REQUIRED') {
        add('Keep the exact selected option, threshold, wording, or condition visible');
        if (codes.includes('long_horizon') || codes.includes('near_term')) add('Include close date and as-of date');
        if (codes.includes('resolution_review') || codes.includes('event_definition')) add('Carry the key resolution detail');
        add('Use a sentence that already includes the missing context');
        return items;
    }

    if (status === 'REVIEW_RECOMMENDED') {
        add('Inspect market wording and selected option');
        if (codes.includes('disclosure_oracle_review')) add('Check confirmation timing, rule interpretation, or oracle mechanics');
        if (codes.includes('resolution_review')) add('Check resolution criteria and source');
        if (codes.includes('threshold_definition') || codes.includes('event_definition')) add('Verify threshold or event definition');
        if (codes.includes('election_market') || codes.includes('geopolitical_interpretation')) add('Frame as market pricing, not polling or outcome validation');
        return items;
    }

    if (status === 'NOT_STANDALONE') {
        add('Do not quote the price alone');
        add('Include full market wording and selected option');
        add('Use broader explanation or primary market context');
        return items;
    }

    add('Review the reference posture before reuse');
    return items;
}

function panelSuggestedReference(market) {
    if (market.reference_line) return market.reference_line;
    const topic = panelTopic(market);
    const price = fmtOutcomePct(market.current_price);
    const volume = Number(market.volume || 0) > 0 ? ` with ${fmtVol(market.volume)} in public volume` : '';
    const status = market.reference_status || referenceStatusFromCitation(market.citation_status);
    if (status === 'NOT_STANDALONE') {
        return `No standalone citation generated for "${topic}"; use full market wording and surrounding context.`;
    }
    return `Polymarket prices "${topic}" at ${price}${volume ? ` (${volume.trim()})` : ''}.`;
}

function renderCitationSurface(m) {
    const section = eid('sp-citation-section');
    const card = eid('sp-citation-card');
    const statusEl = eid('sp-citation-status');
    const copyEl = eid('sp-citation-copy');
    const reasonsEl = eid('sp-citation-reasons');
    const referenceLineEl = eid('sp-reference-line');
    const checklistEl = eid('sp-checklist');
    if (!section || !card || !statusEl || !copyEl || !reasonsEl) return;

    if (!m.citation_status) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    card.className = `sp-citation-card ${citationStatusClass(m.citation_status)}`;
    statusEl.textContent = formatCitationStatus(m.citation_status);
    copyEl.textContent = panelNextAction(m);
    clearChildren(reasonsEl);

    panelReasonItems(m).forEach(reason => {
        appendElement(reasonsEl, 'div', reason, 'sp-citation-reason');
    });

    if (referenceLineEl) referenceLineEl.textContent = panelSuggestedReference(m);
    if (checklistEl) {
        clearChildren(checklistEl);
        panelChecklistItems(m).forEach(item => {
            appendElement(checklistEl, 'div', item, 'sp-checklist-item');
        });
    }
}

function openPanel(m) {
    const requestToken = ++sparklineRequestToken;
    const score = m.nexus_score || 0;
    const state = m.display_state || 'Fragile';
    const cfg = SC[state] || SC.Fragile;
    const flags = getFlags(m);
    const quoteMode = Boolean(m.citation_status);

    eid('sp-score').textContent = quoteMode ? fmtCents(m.current_price) : Math.round(score);
    const scoreUnit = eid('sp-score-unit');
    if (scoreUnit) scoreUnit.textContent = quoteMode ? 'Market price' : 'Diagnostic read';
    const score2Label = eid('sp-score2-label');
    if (score2Label) score2Label.textContent = quoteMode ? 'Diagnostics' : 'Diagnostic';
    eid('sp-score2').textContent = quoteMode ? '--' : parseFloat(score).toFixed(1);
    eid('sp-price').textContent = fmtCents(m.current_price);
    eid('sp-vol').textContent = fmtVol(m.volume || 0);
    eid('sp-closes-in').textContent = calcClosesIn(m.close_time, m.time_to_close_days);

    const badge = eid('sp-badge');
    badge.textContent = quoteMode ? formatCitationStatus(m.citation_status) : state;
    badge.className = quoteMode
        ? `sp-state-badge ${citationStatusClass(m.citation_status)}`
        : `sp-state-badge ${cfg.badge}`;

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
    renderCitationSurface(m);

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
