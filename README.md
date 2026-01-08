# ⚡ Poly-Nexus Terminal

> **Institutional-Grade Market Intelligence for Prediction Markets.**
>
> *Quantifying Consensus Stability, Liquidity Resilience, and Crypto-Beta.*

![Status](https://img.shields.io/badge/status-operational-green.svg) ![Data](https://img.shields.io/badge/data-proprietary-blueviolet.svg) ![License](https://img.shields.io/badge/license-MIT-grey.svg)

### 🔗 [Launch Terminal](https://jenadoe.github.io/poly-terminal/)

<br>

## 🏛️ Philosophy

**Prices lie. Structure speaks.**

Most prediction market interfaces only display the *current probability*. They fail to reveal the underlying **market structure**—liquidity depth, order book resilience, and correlation with macro assets.

**Poly-Nexus** is a quantitative analysis engine designed to decompose prediction market movements into two components:
1.  **Information-Driven Moves:** Genuine shifts in public belief.
2.  **Liquidity-Driven Moves:** Artificial volatility caused by crypto-market contagion.

We separate the **Signal** from the **Noise**.

<br>

## 📘 Understanding the Nexus Score™

The **Nexus Score** is not a price prediction tool. It is a structural integrity metric designed to evaluate the quality of the consensus forming within a prediction market.

### 🎯 What It Represents
The score answers a single critical question:
> *"Is the current market probability backed by genuine belief and deep liquidity, or is it a fragile number distorted by external shocks?"*

*   **High Score (>80):** **Solid.** The market is driven by distributed consensus, organic price discovery, and deep liquidity.
*   **Low Score (<30):** **Fragile.** The price is vulnerable to manipulation, liquidity crunches, or mechanical correlation with crypto assets.

### ⚙️ How It Works (Conceptual)
The Nexus Score is **non-deterministic**. It is not calculated via a single static formula but is derived from the interaction of multiple structural signals:

*   **Continuity:** How smoothly price changes accumulate over time.
*   **Impact Analysis:** Whether moves are driven by consistent flow or isolated "whale" jumps.
*   **Decoupling:** Whether the market is trading on its own fundamentals or just mirroring Bitcoin.
*   **Time-Weighting:** How consistently activity has been sustained over the last window.

### 🚫 What It Is Not
To be clear, the Nexus Score:
*   Does **NOT** predict the outcome of an event.
*   Does **NOT** recommend buying or selling.
*   Does **NOT** indicate the direction of future price movements.

It measures **Structure**, not **Direction**.

<br>

## 🔍 Other Key Metrics

We process high-frequency market snapshots to visualize the following indicators:

### 1. BTC Beta ($\beta$)
Measures the **sensitivity** of a specific prediction market to Bitcoin (BTC) price action.
*   **Coupled:** Moves in sync with the crypto market (High Beta).
*   **Solid:** Moves independently based on real-world events (Low Beta).

### 2. Trend Continuity (Sparklines)
Unlike standard charts that smooth out data, our **Micro-Sparklines** visualize raw tick-level volatility over the last 4 hours, exposing sudden liquidity gaps or "jump" diffusions.

<br>

## 🛠️ Architecture

Poly-Nexus operates on a **"Black Box" Architecture** to ensure data integrity and prevent alpha decay.

1.  **Ingestion:** The engine autonomously captures high-fidelity snapshots of the order book universe.
2.  **Processing:** Raw data is processed through our **Quant Engine** to calculate covariance matrices and resilience scores.
3.  **Distribution:** Only the finalized signals and sanitized visualizations are pushed to the public terminal.

> *Note: We do not rely on standard historical APIs. All historical data displayed is organically accumulated and stored in our proprietary time-series database.*

<br>

## 📉 Usage

This tool is designed for:
*   **Researchers:** Tracking belief dynamics in real-time.
*   **Risk Managers:** Identifying liquidity risks in political/economic derivatives.
*   **Analysts:** Distinguishing between macro-beta flows and idiosyncratic alpha.

<br>

## ⚠️ Disclaimer

**This project is for informational and research purposes only.**

The "Nexus Score" and "Signals" are derived from statistical analysis and **do not constitute financial advice or betting recommendations.** Prediction markets involve significant risk. Use this data at your own discretion.

<br>

<p align="center">
  &copy; 2026 <b>Poly-Nexus Research</b>. All rights reserved.
</p>