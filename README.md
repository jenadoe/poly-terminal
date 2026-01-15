# Poly-Nexus Terminal

> **Market Intelligence for Prediction Markets.**
>
> *Quantifying Consensus Stability, Liquidity Resilience, and Crypto-Beta.*

![Status](https://img.shields.io/badge/status-operational-green.svg) ![Data](https://img.shields.io/badge/data-proprietary-blueviolet.svg) ![License](https://img.shields.io/badge/license-MIT-grey.svg)

### 🔗 [Launch Terminal](https://jenadoe.github.io/poly-terminal/)

## Overview

Poly-Nexus Terminal is a **risk analysis and market structure research tool** that provides quantitative insights into prediction market dynamics. Unlike traditional interfaces that only show current probabilities, Poly-Nexus reveals the underlying market structure—liquidity depth, order book resilience, and correlation with macro assets.

## Key Features

- **Nexus Score™**: Structural integrity metric (0-100) measuring market stability
- **Beta (β)**: Crypto correlation indicator showing sensitivity to Bitcoin price movements
- **Regime Detection**: Real-time classification of market structural states
- **Proprietary Database**: High-frequency time-series data not available elsewhere
- **Zero-Cost Infrastructure**: Fully automated via GitHub Actions

## Philosophy

**Prices lie. Structure speaks.**

Poly-Nexus decomposes prediction market movements into:
1. **Information-Driven Moves:** Genuine shifts in public belief.
2. **Liquidity-Driven Moves:** Artificial volatility caused by crypto-market contagion.

We separate the **Signal** from the **Noise**.

## Understanding Nexus Score

The Nexus Score is **NOT** a price prediction tool. It measures **market structure integrity**, answering:

> *"Is the current market probability backed by genuine belief and deep liquidity, or is it a fragile number distorted by external shocks?"*

- **High Score (>80):** Solid market structure
- **Low Score (<35):** Fragile, vulnerable to manipulation

See [How It Works](./docs/HOW_IT_WORKS.md) for detailed documentation.

## Architecture

### Black Box Design

1. **Ingestion:** Autonomous capture of high-fidelity market snapshots
2. **Processing:** Proprietary Quant Engine calculates structural metrics
3. **Distribution:** Only finalized signals are pushed to public terminal

### Data Protection

- **Core Algorithms:** Stored in private repository (not publicly accessible)
- **Raw Data:** Proprietary time-series database (confidential)
- **Public Output:** Only processed results and visualizations

## Legal & Compliance

- **Regulations:** Complies with gambling promotion restrictions
- **Research Tool:** Does NOT facilitate betting or provide trading advice
- **Risk Analysis:** Provides structural integrity metrics for research purposes

See [Terms of Use](./docs/TERMS.md) for complete legal information.

## Usage

This tool is designed for:
- **Researchers:** Tracking belief dynamics in real-time
- **Risk Managers:** Identifying liquidity risks in derivatives
- **Analysts:** Distinguishing macro-beta flows from idiosyncratic alpha

## Documentation

- [How It Works](./docs/HOW_IT_WORKS.md) - Detailed technical documentation
- [Terms of Use](./docs/TERMS.md) - Legal terms and restrictions
- [License](./LICENSE) - MIT License with proprietary restrictions

## Disclaimer

**This project is for informational and research purposes only.**

The "Nexus Score" and "Beta" metrics are derived from statistical analysis and **do not constitute financial advice or betting recommendations.** Prediction markets involve significant risk. Use this data at your own discretion.

---

<p align="center">
  &copy; 2026 <b>Poly-Nexus Research</b>. All rights reserved.
</p>