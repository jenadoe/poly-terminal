# How Poly-Nexus Works

**Last Updated: January 2026**

## Overview

Poly-Nexus is a **risk analysis and market structure research tool** that quantifies the structural integrity of prediction markets. Unlike traditional interfaces that only show current probabilities, Poly-Nexus reveals the underlying market structure—liquidity depth, order book resilience, and correlation with macro assets.

## Core Philosophy

**"Prices lie. Structure speaks."**

Most prediction market interfaces only display the *current probability*. They fail to reveal the underlying **market structure**—liquidity depth, order book resilience, and correlation with macro assets.

Poly-Nexus decomposes prediction market movements into two components:
1. **Information-Driven Moves:** Genuine shifts in public belief.
2. **Liquidity-Driven Moves:** Artificial volatility caused by crypto-market contagion.

We separate the **Signal** from the **Noise**.

## Nexus Score™

### What It Is

The **Nexus Score** is a structural integrity metric designed to evaluate the quality of the consensus forming within a prediction market. It is **NOT** a price prediction tool.

### What It Represents

The score answers a single critical question:
> *"Is the current market probability backed by genuine belief and deep liquidity, or is it a fragile number distorted by external shocks?"*

**Score Interpretation:**
- **High Score (>80):** **Solid.** The market is driven by distributed consensus, organic price discovery, and deep liquidity.
- **Medium Score (50-79):** **Good.** Stable market structure with reasonable liquidity.
- **Warning Score (35-49):** **Caution.** Market structure may be vulnerable to manipulation.
- **Low Score (<35):** **Fragile.** The price is vulnerable to manipulation, liquidity crunches, or mechanical correlation with crypto assets.

### How It Works (Conceptual)

The Nexus Score is derived from multiple structural signals:

- **Continuity:** How smoothly price changes accumulate over time.
- **Impact Analysis:** Whether moves are driven by consistent flow or isolated "whale" jumps.
- **Decoupling:** Whether the market is trading on its own fundamentals or just mirroring Bitcoin.
- **Time-Weighting:** How consistently activity has been sustained over the last window.

**Note:** The exact calculation methodology is **proprietary and confidential**. The algorithm is not disclosed to prevent reverse engineering and competitive replication.

### What It Is NOT

To be clear, the Nexus Score:
- Does **NOT** predict the outcome of an event.
- Does **NOT** recommend buying or selling.
- Does **NOT** indicate the direction of future price movements.

It measures **Structure**, not **Direction**.

## Beta (β) - Crypto Correlation

### What It Measures

Beta measures the **sensitivity** of a specific prediction market to Bitcoin (BTC) price action.

**Interpretation:**
- **High Beta (>0.6):** **Coupled.** Moves in sync with the crypto market. Price changes may be driven by crypto market movements rather than event-specific information.
- **Low Beta (<0.6):** **Solid.** Moves independently based on real-world events. Price discovery is driven by market-specific information.

**Calculation Method:**
Beta is calculated using log returns and covariance analysis between the prediction market price and Bitcoin price over a rolling window.

**Note:** The exact calculation parameters are proprietary.

## Market Regimes

Markets are classified into structural states:

- **Solid:** Stable structure with deep liquidity and independent price discovery.
- **Coupled:** High correlation with crypto markets (Beta > 0.6).
- **Fragile:** Low Nexus Score (<35), vulnerable to manipulation or liquidity shocks.
- **Static:** Minimal price movement, indicating low activity.
- **Dormant:** Low trading volume (<50,000 USDC).

Markets can transition between regimes, and these transitions are logged in real-time.

## Data Architecture

### Proprietary Database

Poly-Nexus maintains a **proprietary time-series database** that captures:
- High-frequency market snapshots (5-minute intervals)
- Synchronized timestamps with BTC, ETH, and SP500 prices
- Order book depth and liquidity metrics
- Historical regime classifications

**Important:** This database is **not publicly accessible**. Only processed results are displayed.

### Data Protection

To protect proprietary data and algorithms:
- **Sparkline Data:** Only sampled points are exposed (not full history)
- **Historical Data:** Not available for export without explicit permission
- **Raw Calculations:** Intermediate calculation steps are confidential
- **Algorithm Details:** Calculation methodologies are proprietary

## Technical Architecture

### Black Box Design

Poly-Nexus operates on a **"Black Box" Architecture**:

1. **Ingestion:** The engine autonomously captures high-fidelity snapshots of the order book universe.
2. **Processing:** Raw data is processed through our proprietary **Quant Engine** to calculate covariance matrices and resilience scores.
3. **Distribution:** Only the finalized signals and sanitized visualizations are pushed to the public terminal.

### Zero-Cost Infrastructure

- **Private Repository:** Core algorithms and raw data (not publicly accessible)
- **Public Repository:** Processed results and visualization interface
- **GitHub Actions:** Automated data collection and processing
- **GitHub Pages:** Static website hosting (zero cost)

## Usage Guidelines

### Intended Users

This tool is designed for:
- **Researchers:** Tracking belief dynamics in real-time.
- **Risk Managers:** Identifying liquidity risks in political/economic derivatives.
- **Analysts:** Distinguishing between macro-beta flows and idiosyncratic alpha.

### Legal Compliance

Poly-Nexus complies with regulations regarding gambling promotion:
- **Does NOT** facilitate betting or gambling
- **Does NOT** provide trading signals or recommendations
- **Does NOT** encourage gambling activities
- Provides **risk analysis** metrics for research purposes only

## Limitations

- **No Historical Export:** Historical data is proprietary and not available for download.
- **No Algorithm Disclosure:** Calculation methods are confidential.
- **No Trading Advice:** Metrics are for research purposes only.
- **No Guarantees:** Accuracy and availability are not guaranteed.

## Frequently Asked Questions

### Q: Can I export historical data?

**A:** No. Historical data is proprietary and part of our core intellectual property. Only current snapshot data is displayed.

### Q: How is Nexus Score calculated?

**A:** The calculation methodology is proprietary. We disclose that it considers volatility, spread, volume, and correlation factors, but the exact formula is confidential.

### Q: Can I use this data for trading?

**A:** Poly-Nexus is a research tool, not a trading platform. The metrics are for informational purposes only and do not constitute financial advice.

### Q: Is the algorithm open source?

**A:** No. The core algorithms are proprietary and confidential. Only the visualization interface is publicly accessible.

### Q: How often is data updated?

**A:** Data is collected every 10 minutes via automated GitHub Actions workflows.

## Contact

For questions about how Poly-Nexus works, please refer to the [Terms of Use](./TERMS.md) or contact Poly-Nexus Research.

---

**Disclaimer:** This documentation describes the conceptual operation of Poly-Nexus. Technical implementation details, algorithms, and proprietary data structures are confidential and not disclosed.
