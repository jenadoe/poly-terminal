/* DOCS */

const TABS = [
    { id: 'what-is-strata', label: 'What Is Strata', num: '01' },
    { id: 'reading-states', label: 'Reading States', num: '02' },
    { id: 'snapshot-panel', label: 'Snapshot Panel', num: '03' },
    { id: 'interpretation', label: 'Interpretation', num: '04' },
    { id: 'faq', label: 'FAQ', num: '05' },
];

function buildTabButton(tab) {
    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.dataset.id = tab.id;

    const num = document.createElement('span');
    num.className = 'nav-num';
    num.textContent = tab.num;
    btn.appendChild(num);
    btn.appendChild(document.createTextNode(tab.label));

    btn.addEventListener('click', () => go(tab.id));
    return btn;
}

function buildMobileTab(tab) {
    const btn = document.createElement('button');
    btn.className = 'mob-tab';
    btn.dataset.id = tab.id;
    btn.textContent = tab.label;
    btn.addEventListener('click', () => go(tab.id));
    return btn;
}

function go(id) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.toggle('active', page.dataset.page === id);
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.id === id);
    });
    document.querySelectorAll('.mob-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.id === id);
    });

    const currentTab = TABS.find(tab => tab.id === id);
    if (currentTab) {
        const current = document.getElementById('tb-current');
        if (current) current.textContent = currentTab.label;
    }

    const content = document.getElementById('content');
    if (content) content.scrollTop = 0;
    history.replaceState(null, '', `#${id}`);
}

function toggleFaq(item) {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(openItem => {
        openItem.classList.remove('open');
        const body = openItem.querySelector('.faq-a');
        if (body) body.style.maxHeight = null;
    });

    if (!isOpen) {
        item.classList.add('open');
        const body = item.querySelector('.faq-a');
        if (body) body.style.maxHeight = `${body.scrollHeight}px`;
    }
}

function initDocsPage() {
    const sbNav = document.getElementById('sb-nav');
    const mobInner = document.getElementById('mob-tabs-inner');
    if (!sbNav || !mobInner) return;

    TABS.forEach(tab => {
        sbNav.appendChild(buildTabButton(tab));
        mobInner.appendChild(buildMobileTab(tab));
    });

    document.querySelectorAll('.faq-item').forEach(item => {
        const trigger = item.querySelector('.faq-q');
        if (!trigger) return;
        trigger.addEventListener('click', () => toggleFaq(item));
    });

    const hash = location.hash.replace('#', '');
    const active = TABS.find(tab => tab.id === hash) ? hash : TABS[0].id;
    go(active);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    initDocsPage();
}
