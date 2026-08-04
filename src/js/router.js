import { isCoarsePointer, prefersReducedMotion } from './environment.js';
import { onLanguageChange } from './localization.js';
import { ensureFeaturesApp, applyFeaturesHash } from './features.js';
import { guidePanelFromPath, guidePathForPanel, showGuidePanel, goGuidePanel } from './guides.js';

const homeView = document.getElementById('home-view');
const featuresView = document.getElementById('features-view');
const guidesView = document.getElementById('guides-view');
const notFoundView = document.getElementById('notfound-view');
const contributeView = document.getElementById('contribute-view');
const privacyView = document.getElementById('privacy-view');
const tosView = document.getElementById('tos-view');

const navBar = document.querySelector('.navbar');
const navPill = navBar ? navBar.querySelector('.nav-pill') : null;
const navTravel = navBar ? navBar.querySelector('.nav-travel') : null;
const navTravelText = navTravel ? navTravel.querySelector('span') : null;

let routeTransitionBusy = false;
const routeFadeDurationMs = 160;

function viewByName(name) {
    if (name === 'features') return featuresView;
    if (name === 'guides') return guidesView;
    if (name === 'contribute') return contributeView;
    if (name === 'privacy') return privacyView;
    if (name === 'tos') return tosView;
    if (name === 'notfound') return notFoundView;
    return homeView;
}

function currentVisibleRoute() {
    if (featuresView && !featuresView.hidden) return 'features';
    if (guidesView && !guidesView.hidden) return 'guides';
    if (contributeView && !contributeView.hidden) return 'contribute';
    if (privacyView && !privacyView.hidden) return 'privacy';
    if (tosView && !tosView.hidden) return 'tos';
    if (notFoundView && !notFoundView.hidden) return 'notfound';
    return 'home';
}

function positionNavHighlight(animateText) {
    if (!navBar || !navPill) return;
    const active = navBar.querySelector('.nav-item-class.active');
    if (!active) {
        navPill.style.opacity = '0';
        if (navTravel) navTravel.style.opacity = '0';
        return;
    }
    const navBounds = navBar.getBoundingClientRect();
    const itemBounds = active.getBoundingClientRect();
    navPill.style.opacity = '1';
    navPill.style.transform = 'translateX(' + (itemBounds.left - navBounds.left) + 'px)';
    navPill.style.width = itemBounds.width + 'px';
    const label = active.querySelector('.nav-label');
    if (navTravel && navTravelText && label) {
        const labelBounds = label.getBoundingClientRect();
        navTravel.style.opacity = '1';
        navTravel.style.transform = 'translateX(' + (labelBounds.left - navBounds.left) + 'px)';
        const labelInner = label.querySelector('span');
        const text = labelInner ? labelInner.textContent : '';
        if (navTravelText.textContent !== text) {
            if (animateText) {
                navTravelText.style.opacity = '0';
                window.setTimeout(() => {
                    navTravelText.textContent = text;
                    navTravelText.style.opacity = '1';
                }, 170);
            } else {
                navTravelText.textContent = text;
            }
        }
    }
}

function navFlipSwitch(name) {
    if (!navBar) return;
    const items = Array.prototype.slice.call(navBar.querySelectorAll('.nav-item-class'));
    const firstLeft = items.map((item) => item.querySelector('.nav-icon').getBoundingClientRect().left);
    items.forEach((item) => {
        item.classList.toggle('active', item.getAttribute('data-target') === name);
    });
    items.forEach((item, index) => {
        const icon = item.querySelector('.nav-icon');
        const deltaX = firstLeft[index] - icon.getBoundingClientRect().left;
        if (Math.abs(deltaX) < 0.5) return;
        icon.style.transition = 'none';
        icon.style.transform = 'translateX(' + deltaX + 'px)';
        void icon.offsetWidth;
        icon.style.transition = 'transform 0.4s cubic-bezier(0.3, 1, 0.5, 1)';
        icon.style.transform = 'translateX(0)';
    });
    positionNavHighlight(true);
}

function initNavHighlight() {
    if (!navPill) return;
    const pillTransition = navPill.style.transition;
    const travelTransition = navTravel ? navTravel.style.transition : '';
    navPill.style.transition = 'none';
    if (navTravel) navTravel.style.transition = 'none';
    positionNavHighlight(false);
    void navPill.offsetWidth;
    navPill.style.transition = pillTransition;
    if (navTravel) navTravel.style.transition = travelTransition;
}

function applyViewSwap(name) {
    navFlipSwitch(name);
    homeView.hidden = name !== 'home';
    featuresView.hidden = name !== 'features';
    guidesView.hidden = name !== 'guides';
    contributeView.hidden = name !== 'contribute';
    privacyView.hidden = name !== 'privacy';
    tosView.hidden = name !== 'tos';
    notFoundView.hidden = name !== 'notfound';
    if (name === 'features') applyFeaturesHash();
    if (name === 'guides') showGuidePanel(guidePanelFromPath() || 'guide');
    const routeTitles = {
        home: 'TaleMods (Tale Stars)',
        features: 'TaleMods (Tale Stars) – Features',
        guides: 'TaleMods (Tale Stars) – Installation Guide',
        contribute: 'Contribute — TaleMods (Tale Stars)',
        privacy: 'Privacy Policy — TaleMods (Tale Stars)',
        tos: 'Terms of Service — TaleMods (Tale Stars)',
        notfound: '404 — TaleMods (Tale Stars)'
    };
    document.title = routeTitles[name] || routeTitles.home;
}

function fadeOutElement(element) {
    return new Promise((resolve) => {
        if (!element || element.hidden) return resolve();
        element.style.transition = 'opacity ' + routeFadeDurationMs + 'ms ease';
        element.style.opacity = '0';
        setTimeout(() => {
            element.style.transition = '';
            resolve();
        }, routeFadeDurationMs);
    });
}

function fadeInElement(element) {
    return new Promise((resolve) => {
        if (!element) return resolve();
        element.style.opacity = '0';
        element.style.transition = 'opacity ' + routeFadeDurationMs + 'ms ease';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                element.style.opacity = '1';
            });
        });
        setTimeout(() => {
            element.style.transition = '';
            element.style.opacity = '';
            resolve();
        }, routeFadeDurationMs + 32);
    });
}

export function showRoute(name, push, hashOverride) {
    const hash = hashOverride !== undefined ? hashOverride : window.location.hash;
    const path = name === 'features' ? '/features'
        : name === 'guides' ? guidePathForPanel(guidePanelFromPath() || 'guide')
        : name === 'contribute' ? '/contribute'
        : name === 'privacy' ? '/privacy'
        : name === 'tos' ? '/tos'
        : name === 'notfound' ? window.location.pathname
        : '/';
    const url = (name === 'guides' || name === 'notfound') ? path : path + (hash || '');

    if (routeTransitionBusy) {
        try { history.replaceState({ route: name }, '', url); } catch {}
        return;
    }

    const currentRoute = currentVisibleRoute();
    if (currentRoute === name && !hash) {
        if (push) { try { history.replaceState({ route: name }, '', url); } catch {} }
        return;
    }

    if (push) {
        try { history.pushState({ route: name }, '', url); } catch {}
    }

    const fromElement = viewByName(currentRoute);
    const toElement = viewByName(name);
    const preparation = name === 'features' ? ensureFeaturesApp() : Promise.resolve();
    const shouldAnimate = !isCoarsePointer && !prefersReducedMotion();

    preparation.then(() => {
        if (!shouldAnimate) {
            applyViewSwap(name);
            window.scrollTo(0, 0);
            return;
        }
        routeTransitionBusy = true;
        fadeOutElement(fromElement)
            .then(() => {
                applyViewSwap(name);
                window.scrollTo(0, 0);
                return fadeInElement(toElement);
            })
            .then(() => { routeTransitionBusy = false; })
            .catch(() => { routeTransitionBusy = false; });
    });
}

export function currentRouteFromUrl() {
    const path = window.location.pathname.replace(/\/+$/, '');
    if (path === '' || path === '/index.html') return 'home';
    if (path === '/features' || path === '/features.html') return 'features';
    if (path === '/guides' || path === '/guides.html' || path.indexOf('/guides/') === 0) return 'guides';
    if (path === '/contribute' || path === '/contribute.html') return 'contribute';
    if (path === '/privacy' || path === '/privacy.html') return 'privacy';
    if (path === '/tos' || path === '/tos.html') return 'tos';
    return 'notfound';
}

function onPlainClick(element, handler) {
    element.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
        event.preventDefault();
        handler();
    });
}

function initRouteLinks() {
    document.querySelectorAll('a[href="/features"]:not(.nav-item-class), a[href^="/features#"]:not(.nav-item-class)').forEach((link) => {
        onPlainClick(link, () => {
            const url = link.getAttribute('href');
            const hash = url.indexOf('#') >= 0 ? url.substring(url.indexOf('#')) : '';
            showRoute('features', true, hash);
        });
    });

    document.querySelectorAll('a[href="/"]:not(.nav-item-class)').forEach((link) => {
        onPlainClick(link, () => showRoute('home', true, ''));
    });

    document.querySelectorAll('a[href="/guides"]:not(.nav-item-class), a[href^="/guides/"]:not(.nav-item-class)').forEach((link) => {
        onPlainClick(link, () => {
            const url = link.getAttribute('href');
            const panel = guidePanelFromPath(url) || 'guide';
            if (currentVisibleRoute() === 'guides') {
                goGuidePanel(panel, true);
            } else {
                try { history.pushState({ route: 'guides', gp: panel }, '', url); } catch {}
                showRoute('guides', false);
            }
        });
    });

    ['privacy', 'tos'].forEach((route) => {
        document.querySelectorAll('a[href="/' + route + '"]').forEach((link) => {
            onPlainClick(link, () => showRoute(route, true, ''));
        });
    });

    document.querySelectorAll('.navbar .nav-item-class').forEach((item) => {
        onPlainClick(item, () => {
            const target = item.getAttribute('data-target');
            if (target === 'features' || target === 'home' || target === 'guides' || target === 'contribute') {
                showRoute(target, true, '');
            }
        });
    });
}

export function initRouter() {
    initRouteLinks();
    onLanguageChange(() => positionNavHighlight(false));

    window.addEventListener('popstate', () => {
        const route = currentRouteFromUrl();
        if (route === 'guides' && currentVisibleRoute() === 'guides') {
            showGuidePanel(guidePanelFromPath() || 'guide');
            window.scrollTo(0, 0);
            return;
        }
        showRoute(route, false);
    });

    initNavHighlight();
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => { initNavHighlight(); });
    }
    let lastNavWidth = 0;
    window.addEventListener('resize', () => {
        const width = navBar ? navBar.getBoundingClientRect().width : 0;
        if (Math.abs(width - lastNavWidth) > 0.5) { lastNavWidth = width; initNavHighlight(); }
    });

    showRoute(currentRouteFromUrl(), false);
}
