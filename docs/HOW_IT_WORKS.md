# How Strata Works

Strata is a reference-safety layer for Polymarket prices. It helps decide how a
market price should be handled before it is reused in a report, dashboard,
generated answer, or public summary.

Strata does not predict outcomes, validate odds, provide a trading signal, or
approve a market as true.

## Public Statuses

- Ready: cite the Polymarket price with source and as-of context.
- Context Required: keep the specific option, wording, timing, threshold, or
  resolution detail attached to the price.
- Review Recommended: inspect wording, confirmation timing, resolution source,
  oracle mechanics, sensitivity, or belief-contamination risk before reuse.
- Not Standalone: do not quote the price alone; use only with full market
  wording or broader explanation.

## What Strata Checks

The public surface focuses on whether important context survives downstream
reuse. Current checks include selected-option preservation, market wording,
thresholds, timing, resolution-source details, disclosure or oracle review
states, public-health reporting context, geopolitical sensitivity, and
belief-contamination risk.

These are reference-routing inputs only. They are not market-quality validation
or proof that the displayed probability is correct.

## How To Read The Routing

Ready is the narrow case: the reusable line carries enough public context for
ordinary source-and-as-of citation.

Context Required means the missing piece should travel beside the price. Common
examples are the selected option, threshold, timing, wording, or resolution
detail.

Review Recommended means the apparent public-belief read may be shaped by
confirmation timing, rule interpretation, oracle review, sensitivity, or event
semantics. The price may still be useful, but it should be checked before reuse.

Not Standalone means the number should not be reused as an isolated reference.
It can still be discussed with full market wording or broader explanation.
