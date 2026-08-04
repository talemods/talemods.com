const guideSlug = 'tale-stars-installation-guide';

const guidesView = document.getElementById('guides-view');
const guidePanels = {
    list: document.getElementById('guides-list'),
    guide: document.getElementById('guide-tale'),
    android: document.getElementById('guide-tale-android'),
    ios: document.getElementById('guide-tale-ios'),
    windows: document.getElementById('guide-tale-windows'),
    macos: document.getElementById('guide-tale-macos')
};

function resetGuideTabs(scope, defaultTab) {
    if (!scope) return;
    scope.querySelectorAll('.guide-tab').forEach((tab) => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === defaultTab);
    });
    scope.querySelectorAll('.guide-tab-panel').forEach((panel) => {
        panel.hidden = panel.getAttribute('data-tabpanel') !== defaultTab;
    });
}

export function showGuidePanel(panel) {
    Object.keys(guidePanels).forEach((key) => {
        if (guidePanels[key]) guidePanels[key].hidden = key !== panel;
    });
    if (panel === 'ios') resetGuideTabs(guidePanels.ios, 'pc');
}

export function guidePanelFromPath(path) {
    const normalizedPath = (path || window.location.pathname).replace(/\/+$/, '');
    if (normalizedPath === '/guides') return 'list';
    if (normalizedPath === '/guides/' + guideSlug) return 'guide';
    const match = normalizedPath.match(new RegExp('^/guides/' + guideSlug + '/(android|ios|windows|macos)$'));
    if (match) return match[1];
    return null;
}

export function guidePathForPanel(panel) {
    if (panel === 'list') return '/guides';
    if (panel === 'guide') return '/guides/' + guideSlug;
    if (panel === 'android' || panel === 'ios' || panel === 'windows' || panel === 'macos') {
        return '/guides/' + guideSlug + '/' + panel;
    }
    return '/guides';
}

export function goGuidePanel(panel, push) {
    showGuidePanel(panel);
    const url = guidePathForPanel(panel);
    try {
        if (push) history.pushState({ route: 'guides', gp: panel }, '', url);
        else history.replaceState({ route: 'guides', gp: panel }, '', url);
    } catch (e) {
        return;
    }
    window.scrollTo(0, 0);
}

function detectGuidePlatform() {
    const navigatorRef = window.navigator || {};
    const userAgentData = navigatorRef.userAgentData;
    const signature = ((navigatorRef.userAgent || '') + ' ' + ((userAgentData && userAgentData.platform) || navigatorRef.platform || '')).toLowerCase();
    if (/android/.test(signature)) return 'android';
    if (/iphone|ipad|ipod/.test(signature)) return 'ios';
    if (/mac/.test(signature) && (navigatorRef.maxTouchPoints || 0) > 1) return 'ios';
    if (/win/.test(signature)) return 'windows';
    if (/mac/.test(signature)) return 'macos';
    return '';
}

export function initGuides() {
    if (!guidesView) return;

    const guideCardTale = guidesView.querySelector('.guide-card[data-guide="tale"]');
    if (guideCardTale) guideCardTale.addEventListener('click', () => { goGuidePanel('guide', true); });

    const panelButtons = [
        ['guide-tale-back', 'list'],
        ['guide-platform-android', 'android'],
        ['guide-android-back', 'guide'],
        ['guide-platform-windows', 'windows'],
        ['guide-windows-back', 'guide'],
        ['guide-platform-macos', 'macos'],
        ['guide-macos-back', 'guide'],
        ['guide-platform-ios', 'ios'],
        ['guide-ios-back', 'guide']
    ];
    panelButtons.forEach(([id, panel]) => {
        const button = document.getElementById(id);
        if (button) button.addEventListener('click', () => { goGuidePanel(panel, true); });
    });

    guidesView.querySelectorAll('.guide-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            const scope = tab.closest('.guide-detail') || guidesView;
            scope.querySelectorAll('.guide-tab').forEach((otherTab) => { otherTab.classList.toggle('active', otherTab === tab); });
            scope.querySelectorAll('.guide-tab-panel').forEach((panel) => { panel.hidden = panel.getAttribute('data-tabpanel') !== tabName; });
            window.scrollTo(0, 0);
        });
    });

    guidesView.querySelectorAll('.guide-acc-head').forEach((head) => {
        head.addEventListener('click', () => {
            const item = head.closest('.guide-acc-item');
            if (!item) return;
            const body = item.querySelector('.guide-acc-body');
            const open = item.classList.toggle('open');
            if (body) body.hidden = !open;
        });
    });

    const currentPlatform = detectGuidePlatform();
    if (currentPlatform) {
        const youButton = document.getElementById('guide-platform-' + currentPlatform);
        if (youButton) youButton.classList.add('guide-platform-row--you');
    }
}
