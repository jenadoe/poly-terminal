/**
 * hero.js — Poly-Nexus Hero + About section dynamic data
 *
 * 호출 위치:
 *   (A) renderKPIsFromRPC(kpis, visibleCount) 함수 끝에: heroPanel.updateFromKPIs(kpis)
 *   (B) renderKPIs(data) 함수 끝에: heroPanel.updateFromLocal(data)
 *   (C) init() 함수 끝에: heroPanel.loadResolved()
 */

const heroPanel = (() => {
    // 요소 캐싱
    const el = (id) => document.getElementById(id);

    /**
     * Supabase RPC(get_dashboard_kpis) 결과로 Hero 수치 갱신
     * renderKPIsFromRPC() 끝에 호출
     */
    function updateFromKPIs(kpis) {
        const active    = el('hero-active');
        const converged = el('hero-converged');
        if (active)    active.textContent    = (+kpis.total_markets   || 149).toLocaleString();
        if (converged) converged.textContent = (+kpis.converged_count || 29).toLocaleString();
    }

    /**
     * Supabase 미사용 시 로컬 데이터로 fallback 갱신
     * renderKPIs(data) 끝에 호출
     */
    function updateFromLocal(data) {
        const active    = el('hero-active');
        const converged = el('hero-converged');
        if (active)    active.textContent    = (data.length || 149).toLocaleString();
        if (converged) converged.textContent = (
            data.filter(d => d.market_state === 'Converged').length || 29
        ).toLocaleString();
    }

    /**
     * track_record resolved count 갱신 → About 섹션 n=X/30 표시
     * init() 끝에 호출 (sbClient, USE_SUPABASE는 index.html 전역 변수)
     */
    function loadResolved() {
        if (typeof USE_SUPABASE === 'undefined' || !USE_SUPABASE) return;
        if (typeof sbClient === 'undefined' || !sbClient) return;

        sbClient
            .from('track_record')
            .select('id', { count: 'exact', head: true })
            .then(({ count }) => {
                const resolvedEl = el('about-resolved');
                if (resolvedEl && count != null) resolvedEl.textContent = count;
            })
            .catch(() => {}); // 실패 시 기본값(12) 유지
    }

    /**
     * "View Live Markets" 버튼 smooth scroll
     * Hero CTA → .container (첫 번째 마켓 섹션)으로 이동
     * index.html에 id="markets-section"이 없으므로
     * .kpi-grid의 실제 첫 번째 부모 .container로 스크롤
     */
    function initCTAScroll() {
        const btn = document.getElementById('hero-cta-markets');
        if (!btn) return;

        btn.addEventListener('click', (e) => {
            e.preventDefault();

            // KPI 그리드 또는 첫 번째 마켓 카드 컨테이너를 찾아 스크롤
            const target =
                document.querySelector('.kpi-grid') ||
                document.querySelector('.event-grid') ||
                document.querySelector('.container');

            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    // DOM 로드 후 CTA 스크롤 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCTAScroll);
    } else {
        initCTAScroll();
    }

    return { updateFromKPIs, updateFromLocal, loadResolved };
})();