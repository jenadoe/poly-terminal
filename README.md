⚡ Poly-Nexus Terminal
Advanced Market Intelligence Dashboard for Prediction Markets.
Real-time tracking, Trend Analysis, and High-Frequency Data Aggregation.

🔗 Launch Terminal
📊 Overview
Poly-Nexus is a specialized analytics terminal designed to track and visualize data from Polymarket in real-time. Unlike standard interfaces, Poly-Nexus focuses on Market Structure and Trend Continuity.
This dashboard aggregates fragmented market data into a single, cohesive view, allowing researchers and analysts to monitor price action, volume liquidity, and volatility trends at a glance.
🚀 Key Capabilities
1. High-Fidelity Data Stream
The terminal eliminates noise by filtering out low-liquidity and dead markets ($0 volume). It focuses strictly on active, high-volume contracts to provide actionable intelligence.
2. Micro-Trend Visualization (Sparklines)
Instead of static numbers, Poly-Nexus renders 4-Hour Price Action Sparklines for every market.
<span style="color: #3fb950">Green Trend:</span> Bullish momentum / Probability increase.
<span style="color: #f85149">Red Trend:</span> Bearish momentum / Probability decrease.
3. Automated Signal Processing
Our engine processes raw probability data to generate status signals:
🔥 Volatile: Detecting significant price shifts or acceleration.
Stable: Low volatility, consolidated markets.
Collecting: Initializing data points for new markets.
4. Macro-Context Awareness
The system is built to cross-reference prediction market data with external financial indicators, ensuring that the displayed probabilities reflect true market sentiment rather than isolated noise.
🛠️ Architecture
Poly-Nexus operates as a Serverless Data Pipeline:
Ingestion: Python-based engines fetch raw data from Gamma & CLOB APIs.
Processing: Data is normalized, cleaned, and enriched with volume metrics.
Visualization: The frontend renders a lightweight, high-performance dashboard using vanilla JavaScript (ES6+) for maximum speed and minimal latency.
code
Mermaid
graph LR
    A[Market APIs] -->|Raw Data| B(Analytics Engine)
    B -->|Processed JSON| C{Poly-Nexus Terminal}
    C -->|Visualized| D[End User]
💻 Tech Stack
Data Engine: Python 3.10 (Pandas, Requests)
Frontend: HTML5, CSS3, Vanilla JS
Automation: GitHub Actions (Cron Scheduling)
Hosting: GitHub Pages
📉 Usage
This project is hosted live. You can access the terminal directly via the link below:
👉 Enter Terminal
To run it locally for development:
Clone the repository.
Open docs/index.html in your browser.
Note: Local version will fetch data from the live repository to ensure data consistency.
⚠️ Disclaimer
This project is for informational and research purposes only.
The data displayed on Poly-Nexus is derived from public APIs and statistical analysis. It does not constitute financial advice. Prediction markets involve significant risk.
<p align="center">
&copy; 2024-2026 <b>Poly-Nexus Team</b>. All rights reserved.
</p>

