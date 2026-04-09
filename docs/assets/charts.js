/**
 * Poly-Nexus Chart Visualization Library
 * 
 * Note: This library only visualizes processed results.
 * Historical data is NOT stored on the server - charts are generated
 * client-side from current snapshot data only.
 */

// Chart.js configuration for dark theme
const chartConfig = {
    type: 'line',
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#c9d1d9',
                    font: {
                        family: 'Consolas, Monaco, monospace',
                        size: 11
                    }
                }
            },
            tooltip: {
                backgroundColor: '#2d333b',
                titleColor: '#c9d1d9',
                bodyColor: '#8b949e',
                borderColor: '#30363d',
                borderWidth: 1,
                padding: 10,
                titleFont: {
                    family: 'Consolas, Monaco, monospace',
                    size: 12
                },
                bodyFont: {
                    family: 'Consolas, Monaco, monospace',
                    size: 11
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: '#8b949e',
                    font: {
                        family: 'Consolas, Monaco, monospace',
                        size: 10
                    }
                },
                grid: {
                    color: '#30363d'
                }
            },
            y: {
                ticks: {
                    color: '#8b949e',
                    font: {
                        family: 'Consolas, Monaco, monospace',
                        size: 10
                    }
                },
                grid: {
                    color: '#30363d'
                }
            }
        }
    }
};

/**
 * Create Nexus Score gauge chart (current value only)
 * Note: Historical data is NOT stored - this shows current snapshot
 */
function createNexusGauge(score, containerId) {
    const canvas = document.getElementById(containerId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    
    // Determine color based on score
    let color = '#6e7681'; // neutral
    if (score >= 80) color = '#238636'; // solid
    else if (score >= 50) color = '#3fb950'; // good
    else if (score >= 35) color = '#d29922'; // warning
    else color = '#da3633'; // fragile

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [score, 100 - score],
                backgroundColor: [color, '#21262d'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw: (chart) => {
                const ctx = chart.ctx;
                const centerX = chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
                const centerY = chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2;
                
                ctx.save();
                ctx.fillStyle = color;
                ctx.font = 'bold 24px Consolas, Monaco, monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(score || '-', centerX, centerY - 10);
                
                ctx.fillStyle = '#8b949e';
                ctx.font = '11px Consolas, Monaco, monospace';
                ctx.fillText('Nexus', centerX, centerY + 10);
                ctx.restore();
            }
        }]
    });
}

/**
 * Create Beta correlation indicator
 */
function createBetaIndicator(beta, containerId) {
    const canvas = document.getElementById(containerId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    
    // Normalize beta to -1 to 1 range for visualization
    const normalizedBeta = Math.max(-1, Math.min(1, beta));
    const color = Math.abs(normalizedBeta) > 0.6 ? '#d29922' : '#238636';

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Beta'],
            datasets: [{
                label: 'BTC Correlation',
                data: [normalizedBeta],
                backgroundColor: color,
                borderColor: color,
                borderWidth: 1
            }]
        },
        options: {
            ...chartConfig.options,
            indexAxis: 'y',
            scales: {
                x: {
                    ...chartConfig.options.scales.x,
                    min: -1,
                    max: 1,
                    ticks: {
                        ...chartConfig.options.scales.x.ticks,
                        stepSize: 0.5
                    }
                },
                y: {
                    ...chartConfig.options.scales.y,
                    display: false
                }
            },
            plugins: {
                ...chartConfig.options.plugins,
                legend: { display: false }
            }
        }
    });
}

/**
 * Create market health overview chart
 * Shows distribution of Nexus Scores across all markets
 */
function createHealthDistribution(markets, containerId) {
    const canvas = document.getElementById(containerId);
    if (!canvas || !markets || markets.length === 0) return null;

    const ctx = canvas.getContext('2d');
    
    // Categorize markets by Nexus Score
    const categories = {
        'Solid (80+)': markets.filter(m => m.nexus_score >= 80).length,
        'Good (50-79)': markets.filter(m => m.nexus_score >= 50 && m.nexus_score < 80).length,
        'Warning (35-49)': markets.filter(m => m.nexus_score >= 35 && m.nexus_score < 50).length,
        'Fragile (<35)': markets.filter(m => m.nexus_score < 35).length
    };

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                label: 'Markets',
                data: Object.values(categories),
                backgroundColor: [
                    '#238636', // Solid
                    '#3fb950', // Good
                    '#d29922', // Warning
                    '#da3633'  // Fragile
                ],
                borderColor: '#30363d',
                borderWidth: 1
            }]
        },
        options: {
            ...chartConfig.options,
            plugins: {
                ...chartConfig.options.plugins,
                legend: { display: false }
            },
            scales: {
                ...chartConfig.options.scales,
                y: {
                    ...chartConfig.options.scales.y,
                    beginAtZero: true,
                    ticks: {
                        ...chartConfig.options.scales.y.ticks,
                        stepSize: 1
                    }
                }
            }
        }
    });
}

/**
 * Calculate average Nexus Score across all markets
 */
function calculateAverageNexusScore(markets) {
    if (!markets || markets.length === 0) return 0;
    const validScores = markets
        .map(m => typeof m.nexus_score === 'number' ? m.nexus_score : null)
        .filter(score => score !== null);
    if (validScores.length === 0) return 0;
    return validScores.reduce((a, b) => a + b, 0) / validScores.length;
}

/**
 * Get high beta markets (Beta > 0.6)
 */
function getHighBetaMarkets(markets) {
    if (!markets) return [];
    return markets.filter(m => Math.abs(m.beta || 0) > 0.6);
}
