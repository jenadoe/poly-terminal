/* ============================================================
   POLY-NEXUS state.js
   Shared dashboard constants and runtime state.
   ============================================================ */

const API_BASE = (window.POLY_NEXUS_API || '').replace(/\/$/, '');
const HAS_API = !!API_BASE;
let sparklineRequestToken = 0;

const SC = {
    Converged: {
        col: 'ch-converged',
        row: 'r-converged',
        badge: 'ssb-c',
        label: 'Converged',
        desc: 'Structural consensus locked',
    },
    Calibrating: {
        col: 'ch-calibrating',
        row: 'r-calibrating',
        badge: 'ssb-a',
        label: 'Calibrating',
        desc: 'Price discovery in progress',
    },
    Fragile: {
        col: 'ch-fragile',
        row: 'r-fragile',
        badge: 'ssb-f',
        label: 'Fragile',
        desc: 'Structural weakness detected',
    },
};
