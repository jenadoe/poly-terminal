const API_URL = '/api/markets';
const ACCESS_STORAGE_KEY = 'strata_reference_preview_access_v1';
const ALLOWED_ACCESS_HASHES = new Set([
    '74ccad3c203721244abc930593e9652060fc0438355d712bf5dad7396718c51e',
]);
let allMarkets = [];
let activeMarketSearch = '';
const STATUS_CLASS = {
    READY: 'status-ready',
    CONTEXT_REQUIRED: 'status-context',
    REVIEW_RECOMMENDED: 'status-review',
    NOT_STANDALONE: 'status-stop',
};
const STATUS_ACTION_COPY = {
    READY: {
        subtitle: 'Cite with source',
        row: 'Ready to cite',
        panel: 'Cite as a Polymarket reference with source and as-of date. This is not odds approval.',
    },
    CONTEXT_REQUIRED: {
        subtitle: 'Attach exact context',
        row: 'Add context',
        panel: 'Use the price only with the option, wording, threshold, timing, or rule detail that changes how it reads.',
    },
    REVIEW_RECOMMENDED: {
        subtitle: 'Check belief contamination',
        row: 'Review first',
        panel: 'Check whether the price is a clean public-belief reference or is shaped by wording, confirmation timing, resolution source, or sensitivity.',
    },
    NOT_STANDALONE: {
        subtitle: 'Use full explanation',
        row: 'Avoid standalone',
        panel: 'Do not quote the price as an isolated number. Use full wording plus resolution context or broader explanation.',
    },
};
const GROUPS = [
    {
        status: 'READY',
        title: 'Ready',
        action: STATUS_ACTION_COPY.READY.subtitle,
        note: 'Use as a Polymarket reference with source and as-of date. This is not odds approval.',
        limit: 50,
        compact: true,
    },
    {
        status: 'CONTEXT_REQUIRED',
        title: 'Context Required',
        action: STATUS_ACTION_COPY.CONTEXT_REQUIRED.subtitle,
        note: 'Usable when the exact option, wording, timing, threshold, or rule context stays attached.',
        limit: 50,
    },
    {
        status: 'REVIEW_RECOMMENDED',
        title: 'Review Recommended',
        action: STATUS_ACTION_COPY.REVIEW_RECOMMENDED.subtitle,
        note: 'Check wording, selected option, resolution source, timing, or sensitivity before reuse.',
        limit: 50,
    },
    {
        status: 'NOT_STANDALONE',
        title: 'Not Standalone',
        action: STATUS_ACTION_COPY.NOT_STANDALONE.subtitle,
        note: 'Do not use the price as an isolated reference. Keep full wording and explanation attached.',
        limit: 50,
    },
];

const REASON_CHIP_COPY = {
    long_horizon: {
        label: 'long horizon',
        title: 'The event resolves far enough out that timing should travel with the reference.',
    },
    election_market: {
        label: 'election market',
        title: 'Election markets should be framed as Polymarket pricing, not polling or an official forecast.',
    },
    resolution_review: {
        label: 'resolution source',
        title: 'The resolving source or criteria should be checked before the reference is reused.',
    },
    disclosure_oracle_review: {
        label: 'belief contamination',
        title: 'Check whether confirmation timing, rule interpretation, on-chain evidence, or oracle review is contaminating the public-belief read.',
    },
    wording_context: {
        label: 'wording context',
        title: 'The market wording may lose important conditions when the price is quoted alone.',
    },
    option_context: {
        label: 'option context',
        title: 'The specific candidate, team, bucket, or outcome should stay attached to this price.',
    },
    near_term: {
        label: 'near term',
        title: 'The market resolves soon, so timestamp and late information may matter.',
    },
    geopolitical_interpretation: {
        label: 'geopolitical context',
        title: 'Political or geopolitical context can materially change how the price reads.',
    },
    public_health_reporting: {
        label: 'public health source',
        title: 'Public-health reporting source, case definitions, or data timing should be checked.',
    },
    threshold_definition: {
        label: 'threshold definition',
        title: 'The threshold or boundary condition should stay visible with the price.',
    },
    secondary_review: {
        label: 'secondary review',
        title: 'This market has public characteristics that warrant an extra check before standalone use.',
    },
    standard_reference: {
        label: 'standard reference',
        title: 'Ordinary source attribution is enough for this Polymarket reference.',
    },
    event_definition: {
        label: 'event definition',
        title: 'The event definition or source interpretation should travel with the price.',
    },
    option_set_context: {
        label: 'option set',
        title: 'The option set or location/meeting context should stay visible with the price.',
    },
    extreme_price: {
        label: 'extreme price',
        title: 'Near-0% or near-100% prices should not be presented as odds validation.',
    },
    thin_volume: {
        label: 'thin volume',
        title: 'Lower public volume should not be framed as broad market consensus.',
    },
};

function sampleEid(id) {
    return document.getElementById(id);
}

function setSampleStatus(text) {
    const el = sampleEid('sample-status');
    if (el) el.textContent = text;
}

async function sha256Hex(input) {
    const bytes = new TextEncoder().encode(String(input || '').trim());
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

async function isAllowedCode(code) {
    if (!code) return false;
    return ALLOWED_ACCESS_HASHES.has(await sha256Hex(code));
}

function unlockSample() {
    document.body.classList.remove('sample-locked');
    const gate = sampleEid('access-gate');
    if (gate) gate.classList.add('is-unlocked');
}

async function initAccessGate() {
    document.body.classList.add('sample-locked');
    const storedCode = window.localStorage.getItem(ACCESS_STORAGE_KEY);

    if (await isAllowedCode(storedCode)) {
        unlockSample();
        loadSample();
        return;
    }

    const form = sampleEid('access-form');
    const input = sampleEid('access-code');
    const error = sampleEid('access-error');
    if (form && input) {
        form.addEventListener('submit', async event => {
            event.preventDefault();
            const code = input.value.trim();
            if (await isAllowedCode(code)) {
                window.localStorage.setItem(ACCESS_STORAGE_KEY, code);
                if (error) error.textContent = '';
                unlockSample();
                loadSample();
                return;
            }
            if (error) error.textContent = 'Access code not recognized.';
        });
    }
}

function tickSampleClock() {
    const el = sampleEid('sample-clock');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}

function referenceLabel(market) {
    return market.reference_label || {
        READY: 'Ready',
        CONTEXT_REQUIRED: 'Context Required',
        REVIEW_RECOMMENDED: 'Review Recommended',
        NOT_STANDALONE: 'Not Standalone',
    }[market.reference_status] || 'Reference Status';
}

function statusActionCopy(status) {
    return STATUS_ACTION_COPY[status] || {
        subtitle: 'Review handling',
        row: 'Review handling',
        panel: 'Review the reference posture before use.',
    };
}

function statusActionSubtitle(market) {
    return statusActionCopy(market.reference_status).subtitle;
}

function rowActionPhrase(market) {
    return statusActionCopy(market.reference_status).row;
}

function reasonText(market) {
    const reasons = Array.isArray(market.reference_reasons)
        ? market.reference_reasons.filter(Boolean)
        : [];
    if (reasons.length) return reasons;
    if (market.reference_action) return [market.reference_action];
    return ['Reference-usability status is available for this market.'];
}

function reasonChipForMarket(market) {
    const codes = Array.isArray(market.reference_reason_codes)
        ? market.reference_reason_codes.filter(Boolean)
        : [];
    const preferred = codes.find(code => REASON_CHIP_COPY[code]);
    if (preferred) return REASON_CHIP_COPY[preferred];
    if (market.reference_status === 'READY') {
        return {
            label: 'standard reference',
            title: 'Ordinary source attribution is enough for this Polymarket reference.',
        };
    }
    if (market.reference_status === 'CONTEXT_REQUIRED') {
        return {
            label: 'context needed',
            title: 'Reuse this price only with the stated context attached.',
        };
    }
    if (market.reference_status === 'REVIEW_RECOMMENDED') {
        return {
            label: 'check before use',
            title: 'Review wording, resolution source, or timing before reusing the reference.',
        };
    }
    if (market.reference_status === 'NOT_STANDALONE') {
        return {
            label: 'not standalone',
            title: 'Do not use this price as an isolated reference.',
        };
    }
    return {
        label: 'reference status',
        title: 'Reference-usability status is available for this market.',
    };
}

function shortEventId(id) {
    if (!id) return '--';
    const value = String(id);
    return value.length > 10 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

function closeText(market) {
    if (!market.close_time) return '--';
    const close = new Date(market.close_time);
    if (Number.isNaN(close.getTime())) return '--';
    const diff = close.getTime() - Date.now();
    if (diff <= 0) return 'Closed';
    const days = Math.floor(diff / 86400000);
    const isEndOfYear = close.getUTCMonth() === 11 && close.getUTCDate() === 31;
    if (isEndOfYear && days >= 90) return `End ${close.getUTCFullYear()}`;
    if (days >= 180) {
        return close.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
        });
    }
    if (typeof calcClosesIn === 'function') {
        return calcClosesIn(market.close_time);
    }
    return close.toISOString().slice(0, 10);
}

function codesForMarket(market) {
    return Array.isArray(market.reference_reason_codes)
        ? market.reference_reason_codes.filter(Boolean)
        : [];
}

function topicForMarket(market) {
    return market.selected_outcome_question || market.title || 'this Polymarket market';
}

function asOfDateText() {
    return new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function absoluteDateText(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

function reportedVolumePhrase(market) {
    const volume = Number(market.volume || 0);
    return volume > 0 ? `, with ${fmtVol(volume)} in reported Polymarket volume` : '';
}

function addUnique(list, item) {
    if (item && !list.includes(item)) list.push(item);
}

function contextItemsForMarket(market) {
    const codes = codesForMarket(market);
    const items = [];
    const topic = topicForMarket(market);
    const selected = String(market.selected_outcome_label || '').trim();
    const parent = String(market.parent_title || '').trim();

    if (market.reference_status === 'READY') {
        return [
            'Polymarket source link',
            'As-of date',
            'Exact market question',
        ];
    }

    if (selected && !topic.toLowerCase().includes(selected.toLowerCase())) {
        addUnique(items, `Selected option: ${selected}`);
    }
    if (parent && parent !== topic && parent !== market.title) {
        addUnique(items, `Parent market: ${parent}`);
    }
    if (codes.includes('threshold_definition')) {
        addUnique(items, 'Exact threshold or boundary condition');
    }
    if (codes.includes('option_context') || codes.includes('option_set_context')) {
        addUnique(items, 'Specific candidate, team, option, bucket, or option set');
    }
    if (codes.includes('long_horizon') || codes.includes('near_term') || market.close_time) {
        addUnique(items, 'Deadline or close date plus as-of date');
    }
    if (codes.includes('resolution_review') || codes.includes('event_definition')) {
        addUnique(items, 'Resolution source, rule, or event definition');
    }
    if (codes.includes('disclosure_oracle_review')) {
        addUnique(items, 'Confirmation timing, rule interpretation, on-chain evidence, or oracle review state');
    }
    if (codes.includes('public_health_reporting')) {
        addUnique(items, 'Public-health reporting source, case definition, and data timing');
    }
    if (codes.includes('election_market')) {
        addUnique(items, 'Market-pricing framing, not polling or official forecast language');
    }
    if (codes.includes('geopolitical_interpretation')) {
        addUnique(items, 'Political or geopolitical wording and settlement context');
    }

    if (!items.length) {
        addUnique(items, 'Polymarket source link and as-of date');
        addUnique(items, 'Exact market question');
    }

    return items.slice(0, 6);
}

function contextSummaryForMarket(market) {
    const codes = codesForMarket(market);
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

function reasonItemsForMarket(market) {
    const codes = codesForMarket(market);
    const items = [];
    const add = item => addUnique(items, item);
    const topic = topicForMarket(market);

    if (codes.includes('standard_reference')) {
        add('The priced outcome is visible enough for ordinary Polymarket attribution.');
    }
    if (codes.includes('threshold_definition')) {
        add('The market depends on an exact threshold or boundary condition that should stay in the sentence.');
    }
    if (codes.includes('option_context')) {
        add('The specific priced option should stay attached to the percentage.');
    }
    if (codes.includes('option_set_context')) {
        add('The option set or surrounding market context can change how this price reads.');
    }
    if (codes.includes('wording_context')) {
        add('The headline can lose important conditions when shortened.');
    }
    if (codes.includes('resolution_review')) {
        add('The resolving source or criteria should be checked before treating the price as public consensus.');
    }
    if (codes.includes('event_definition')) {
        add('The event definition or official source may be narrower than a casual reading of the title.');
    }
    if (codes.includes('disclosure_oracle_review')) {
        add('Confirmation timing, rule interpretation, on-chain evidence, or oracle review state may mean the price is not a clean public-belief read.');
    }
    if (codes.includes('public_health_reporting')) {
        add('Public-health source, case definition, and reporting timing should remain visible.');
    }
    if (codes.includes('election_market')) {
        add('Election markets should be framed as Polymarket pricing, not polling or an official forecast.');
    }
    if (codes.includes('geopolitical_interpretation')) {
        add('Political or geopolitical wording can change how a standalone percentage is understood.');
    }
    if (codes.includes('long_horizon')) {
        add('The close date is far enough away that the time horizon should travel with the reference.');
    }
    if (codes.includes('near_term')) {
        add('The market resolves soon, so an as-of date and late information matter.');
    }
    if (codes.includes('extreme_price')) {
        add('Near-0% or near-100% prices should not be written as certainty or validation.');
    }
    if (codes.includes('thin_volume')) {
        add('Lower reported volume should not be framed as broad consensus.');
    }

    if (items.length) return items;

    const fallback = reasonText(market);
    if (fallback.length) return fallback;
    return [`Review how "${topic}" would read if the price were separated from the full Polymarket question.`];
}

function riskNoteForMarket(market) {
    const codes = codesForMarket(market);
    const topic = topicForMarket(market);
    const status = market.reference_status;

    if (status === 'READY') {
        return 'The main risk is turning a point-in-time Polymarket price into an accuracy claim or forecast. Keep the source and as-of date visible.';
    }
    if (status === 'NOT_STANDALONE' && codes.includes('geopolitical_interpretation')) {
        return 'A standalone percentage can read like a broad geopolitical signal even when settlement depends on narrower wording or rules.';
    }
    if (codes.includes('threshold_definition')) {
        return `Without the threshold, boundary, or deadline, readers may treat "${topic}" as a broader market view than the contract actually asks.`;
    }
    if (codes.includes('option_context') || codes.includes('option_set_context')) {
        return 'If the selected option or option set drops away, the percentage can attach to the wrong candidate, team, bucket, or event.';
    }
    if (codes.includes('public_health_reporting')) {
        return 'Without source and case-definition context, the price can read like a public-health conclusion rather than a market reference.';
    }
    if (codes.includes('disclosure_oracle_review')) {
        return 'The price may reflect confirmation timing, rule interpretation, on-chain evidence, or oracle mechanics rather than clean public belief.';
    }
    if (codes.includes('geopolitical_interpretation')) {
        return 'A standalone percentage can read like a broad geopolitical signal even when settlement depends on narrower wording or rules.';
    }
    if (codes.includes('election_market')) {
        return 'Readers may mistake market pricing for polling, official forecasting, or outcome validation unless the Polymarket framing stays visible.';
    }
    if (codes.includes('resolution_review') || codes.includes('event_definition')) {
        return 'The market may settle according to a rule or source that differs from a casual reading of the headline.';
    }
    if (codes.includes('extreme_price')) {
        return 'Near-0% or near-100% pricing can sound final if it is quoted without source, timing, and resolution context.';
    }
    return 'The number can lose meaning if the exact market wording, source, and timing are removed.';
}

function nextActionForMarket(market) {
    const status = market.reference_status;
    const summary = contextSummaryForMarket(market);
    if (status === 'READY') {
        return 'Cite as a Polymarket reference with the source and an as-of date. Do not present Ready as odds approval.';
    }
    if (status === 'CONTEXT_REQUIRED') {
        return `Use the price only with ${summary} attached. The sentence should carry that context, not add it as an afterthought.`;
    }
    if (status === 'REVIEW_RECOMMENDED') {
        return `Check ${summary} before citing. Treat the price as Polymarket market pricing, not polling, forecast, or validation.`;
    }
    if (status === 'NOT_STANDALONE') {
        return `Do not use the price as an isolated percentage. If discussed, keep the full question visible and explain ${summary}.`;
    }
    return statusActionCopy(status).panel;
}

function statusAction(market) {
    return nextActionForMarket(market);
}

function checklistItemsForMarket(market) {
    const status = market.reference_status;
    const codes = codesForMarket(market);
    const items = [];
    const add = item => addUnique(items, item);

    if (status === 'READY') {
        add('Cite Polymarket as the source');
        add('Include an as-of date in reports or briefings');
        add('Avoid forecast, accuracy, or validation language');
        return items;
    }

    if (status === 'CONTEXT_REQUIRED') {
        add('Keep the exact selected option, threshold, or condition visible');
        if (codes.includes('long_horizon') || codes.includes('near_term')) add('Include close date and as-of date');
        if (codes.includes('resolution_review') || codes.includes('event_definition')) add('Carry the key resolution detail');
        add('Use a sentence that already includes the missing context');
        return items;
    }

    if (status === 'REVIEW_RECOMMENDED') {
        add('Inspect market wording and selected option');
        if (codes.includes('disclosure_oracle_review')) add('Check whether confirmation timing or oracle mechanics contaminate the public-belief read');
        if (codes.includes('resolution_review')) add('Check resolution criteria and source');
        if (codes.includes('public_health_reporting')) add('Check official reporting source and case definition');
        if (codes.includes('threshold_definition') || codes.includes('event_definition')) add('Verify threshold or event definition');
        if (codes.includes('long_horizon') || codes.includes('near_term')) add('Confirm close date and as-of date');
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

function displayPrice(market) {
    return fmtOutcomePct(market.current_price);
}

function suggestedReference(market) {
    const title = topicForMarket(market);
    const price = displayPrice(market);
    const label = referenceLabel(market);
    const volume = reportedVolumePhrase(market);
    const base = `As of ${asOfDateText()}, Polymarket prices "${title}" at ${price}${volume}.`;

    if (market.reference_status === 'READY') {
        return `${base} Cite as a Polymarket reference; this is not odds validation.`;
    }

    if (market.reference_status === 'CONTEXT_REQUIRED') {
        return `${base} Keep ${contextSummaryForMarket(market)} with the price.`;
    }

    if (market.reference_status === 'REVIEW_RECOMMENDED') {
        return `${base} Review ${contextSummaryForMarket(market)} before citing as a standalone reference.`;
    }

    if (market.reference_status === 'NOT_STANDALONE') {
        return `No standalone reference sentence is recommended. If discussed, keep the full Polymarket question visible: ${base} Add resolution context rather than using the number alone.`;
    }

    return `Polymarket currently prices "${title}" at ${price}. Strata reference status: ${label}.`;
}

function panelReferenceOutput(market, handling) {
    if (market.reference_status === 'NOT_STANDALONE') {
        return suggestedReference(market);
    }
    return suggestedReference(market);
}

function panelCopyText(market, handling, output) {
    if (market.reference_status === 'NOT_STANDALONE') {
        return output || handling;
    }
    return output;
}

function copyText(text, button) {
    const done = () => {
        if (!button) return;
        const original = button.textContent;
        button.textContent = 'Copied';
        window.setTimeout(() => {
            button.textContent = original;
        }, 1200);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => {});
        return;
    }

    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', 'readonly');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    try {
        document.execCommand('copy');
        done();
    } catch (_) {
        // no-op
    }
    document.body.removeChild(area);
}

function closeBetaPanel() {
    const panel = sampleEid('beta-panel');
    const overlay = sampleEid('beta-overlay');
    if (panel) {
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
    }
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
}

function openBetaPanel(market) {
    const panel = sampleEid('beta-panel');
    const overlay = sampleEid('beta-overlay');
    if (!panel || !overlay) return;

    const reasons = reasonItemsForMarket(market);
    const handling = statusAction(market);
    const output = panelReferenceOutput(market, handling);
    const copy = panelCopyText(market, handling, output);
    const statusClass = STATUS_CLASS[market.reference_status] || '';
    const status = sampleEid('bp-status');

    sampleEid('bp-category').textContent = `${market.category || 'Market'} / ${shortEventId(market.event_id)}`;
    sampleEid('bp-title').textContent = market.title || '--';
    sampleEid('bp-price').textContent = displayPrice(market);
    if (status) {
        status.textContent = referenceLabel(market);
        status.className = statusClass;
    }
    sampleEid('bp-volume').textContent = fmtVol(market.volume || 0);
    sampleEid('bp-close-time').textContent = closeText(market);
    sampleEid('bp-event').textContent = shortEventId(market.event_id);
    sampleEid('bp-guidance').textContent = handling;
    sampleEid('bp-copy-label').textContent = market.reference_status === 'NOT_STANDALONE'
        ? 'Reference output'
        : 'Suggested reference sentence';
    sampleEid('bp-copy-text').textContent = output;

    const risk = sampleEid('bp-risk');
    if (risk) risk.textContent = riskNoteForMarket(market);

    const outputSection = sampleEid('bp-output-section');
    if (outputSection) {
        outputSection.classList.toggle('beta-panel-output-locked', market.reference_status === 'NOT_STANDALONE');
    }

    const contextWrap = sampleEid('bp-context');
    if (contextWrap) {
        contextWrap.innerHTML = '';
        contextItemsForMarket(market).forEach(item => {
            const node = document.createElement('li');
            node.textContent = item;
            contextWrap.appendChild(node);
        });
    }

    const reasonsWrap = sampleEid('bp-reasons');
    if (reasonsWrap) {
        reasonsWrap.innerHTML = '';
        reasons.forEach(reason => {
            const item = document.createElement('div');
            item.textContent = reason;
            reasonsWrap.appendChild(item);
        });
    }

    const checklistWrap = sampleEid('bp-checklist');
    if (checklistWrap) {
        checklistWrap.innerHTML = '';
        checklistItemsForMarket(market).forEach(item => {
            const node = document.createElement('li');
            node.textContent = item;
            checklistWrap.appendChild(node);
        });
    }

    const copyBtn = sampleEid('bp-copy');
    if (copyBtn) {
        copyBtn.textContent = market.reference_status === 'NOT_STANDALONE' ? 'Copy handling note' : 'Copy reference';
        copyBtn.onclick = () => copyText(copy, copyBtn);
    }

    const link = sampleEid('bp-link');
    if (link) link.href = marketUrl(market);

    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function renderMetrics(markets) {
    const counts = markets.reduce((acc, market) => {
        acc[market.reference_status] = (acc[market.reference_status] || 0) + 1;
        return acc;
    }, {});
    const fields = [
        ['metric-markets', markets.length],
        ['metric-ready', counts.READY || 0],
        ['metric-context', counts.CONTEXT_REQUIRED || 0],
        ['metric-review', counts.REVIEW_RECOMMENDED || 0],
        ['metric-stop', counts.NOT_STANDALONE || 0],
    ];
    fields.forEach(([id, value]) => {
        const el = sampleEid(id);
        if (el) el.textContent = value;
    });
    const marketsLabel = sampleEid('metric-markets-label');
    if (marketsLabel) {
        marketsLabel.textContent = normalizeSearchText(activeMarketSearch) ? 'matches' : 'markets';
    }
    updateBriefingNote(markets);
}

function normalizeSearchText(value) {
    return String(value || '').trim().toLowerCase();
}

function searchableMarketText(market) {
    return [
        market.event_id,
        market.title,
        market.parent_title,
        market.selected_outcome_label,
        market.selected_outcome_question,
        market.category,
        market.market_slug,
        market.reference_status,
        market.reference_label,
        market.reference_action,
        market.reference_line,
        ...(Array.isArray(market.reference_reason_codes) ? market.reference_reason_codes : []),
        ...(Array.isArray(market.reference_reasons) ? market.reference_reasons : []),
    ].filter(Boolean).join(' ').toLowerCase();
}

function filteredMarkets() {
    const query = normalizeSearchText(activeMarketSearch);
    if (!query) return allMarkets;
    return allMarkets.filter(market => searchableMarketText(market).includes(query));
}

function updateBriefingNote(markets) {
    const note = sampleEid('briefing-note');
    if (!note) return;
    const query = normalizeSearchText(activeMarketSearch);
    if (query) {
        const countText = markets.length === 1 ? '1 matching market' : `${markets.length} matching markets`;
        note.textContent = `${countText} across statuses for "${query}".`;
        return;
    }
    note.textContent = markets.filter(market => market.reference_status === 'READY').length <= 3
        ? 'Follow the row action: cite with source, attach context, review first, or avoid standalone reuse.'
        : 'Sorted by status and market visibility with row-level handling actions.';
}

function applyMarketSearch() {
    const markets = filteredMarkets();
    renderMetrics(markets);
    renderCards(markets);
}

function marketUrl(market) {
    return market.market_slug
        ? `https://polymarket.com/event/${encodeURIComponent(market.market_slug)}`
        : 'https://polymarket.com';
}

function buildReadyRow(market) {
    const row = document.createElement('article');
    row.className = `ready-row ${STATUS_CLASS[market.reference_status] || ''}`;
    row.tabIndex = 0;

    const title = document.createElement('div');
    title.className = 'ready-main';
    title.innerHTML = `
        <div class="ready-meta">
            <span>${market.category || 'Market'}</span>
            <span>${shortEventId(market.event_id)}</span>
        </div>
        <div class="ready-title">${market.title || '--'}</div>
    `;
    row.appendChild(title);

    const reasonChip = reasonChipForMarket(market);
    const chip = document.createElement('span');
    chip.className = 'reason-chip';
    chip.textContent = reasonChip.label;
    chip.title = reasonChip.title;
    title.appendChild(chip);

    const actionLine = document.createElement('div');
    actionLine.className = 'ready-action-line';
    actionLine.textContent = `${rowActionPhrase(market)}: ${statusActionSubtitle(market)}`;
    title.appendChild(actionLine);

    const stats = document.createElement('div');
    stats.className = 'ready-stats';
    stats.innerHTML = `
        <div><span>Price</span><strong>${displayPrice(market)}</strong></div>
        <div><span>Volume</span><strong>${fmtVol(market.volume || 0)}</strong></div>
        <div><span>Close</span><strong>${closeText(market)}</strong></div>
        <div><span>Status</span><strong>${referenceLabel(market)}</strong></div>
    `;
    row.appendChild(stats);

    const actions = document.createElement('div');
    actions.className = 'ready-actions';
    row.appendChild(actions);

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'sample-btn sample-btn-primary';
    copyBtn.textContent = market.reference_status === 'NOT_STANDALONE' ? 'Copy note' : 'Copy line';
    copyBtn.addEventListener('click', () => copyText(
        suggestedReference(market),
        copyBtn
    ));
    actions.appendChild(copyBtn);

    const link = document.createElement('a');
    link.className = 'sample-btn sample-btn-ghost';
    link.href = marketUrl(market);
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Polymarket';
    actions.appendChild(link);

    const open = event => {
        if (event.target.closest('button, a')) return;
        openBetaPanel(market);
    };
    row.addEventListener('click', open);
    row.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openBetaPanel(market);
    });

    return row;
}

function renderCards(markets) {
    const grid = sampleEid('cards-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!markets.length) {
        const empty = document.createElement('div');
        empty.className = 'loading-card';
        empty.textContent = normalizeSearchText(activeMarketSearch)
            ? 'No markets match this search.'
            : 'No reference briefing is available right now.';
        grid.appendChild(empty);
        return;
    }

    const byStatus = markets.reduce((acc, market) => {
        if (!acc[market.reference_status]) acc[market.reference_status] = [];
        acc[market.reference_status].push(market);
        return acc;
    }, {});

    GROUPS.forEach(group => {
        const groupMarkets = (byStatus[group.status] || [])
            .slice()
            .sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0))
            .slice(0, group.limit);
        if (!groupMarkets.length) return;

        const wrap = document.createElement('section');
        wrap.className = `status-group ${STATUS_CLASS[group.status] || ''}`;

        const head = document.createElement('div');
        head.className = 'status-group-head';
        head.innerHTML = `
            <div>
                <h3>${group.title}<small>${group.action}</small></h3>
                <p>${group.note}</p>
            </div>
            <span>${groupMarkets.length} shown</span>
        `;
        wrap.appendChild(head);

        const cards = document.createElement('div');
        cards.className = 'ready-list';
        groupMarkets.forEach(market => {
            cards.appendChild(buildReadyRow(market));
        });
        wrap.appendChild(cards);
        grid.appendChild(wrap);
    });
}

async function loadSample() {
    try {
        const accessCode = window.localStorage.getItem(ACCESS_STORAGE_KEY) || '';
        const res = await fetch(API_URL, {
            headers: {
                'x-strata-beta-code': accessCode,
            },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const markets = Array.isArray(data)
            ? data.filter(market => market && market.reference_status)
            : [];
        allMarkets = markets;
        applyMarketSearch();
        setSampleStatus('LIVE');
    } catch (err) {
        setSampleStatus('UNAVAILABLE');
        const grid = sampleEid('cards-grid');
        if (grid) {
            grid.innerHTML = '<div class="loading-card">Reference briefing unavailable. Try again shortly.</div>';
        }
    }
}

function initMarketSearch() {
    const form = sampleEid('market-search-form');
    const input = sampleEid('market-search');
    const clear = sampleEid('market-search-clear');
    if (form) {
        form.addEventListener('submit', event => event.preventDefault());
    }
    if (input) {
        input.addEventListener('input', () => {
            activeMarketSearch = input.value;
            applyMarketSearch();
        });
    }
    if (clear && input) {
        clear.addEventListener('click', () => {
            input.value = '';
            activeMarketSearch = '';
            input.focus();
            applyMarketSearch();
        });
    }
}

setInterval(tickSampleClock, 1000);
tickSampleClock();
initAccessGate();
initMarketSearch();

const betaOverlay = sampleEid('beta-overlay');
if (betaOverlay) betaOverlay.addEventListener('click', closeBetaPanel);
const betaClose = sampleEid('bp-close');
if (betaClose) betaClose.addEventListener('click', closeBetaPanel);
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeBetaPanel();
});
