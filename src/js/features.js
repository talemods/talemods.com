import { getLanguage, getTranslations, onLanguageChange } from './localization.js';
import { scrollBehaviorPreference } from './environment.js';

const telegramIcon = '<span class="fp-media-icon" aria-hidden="true"></span>';

let initialized = false;
let applyHashCallback = null;

export function ensureFeaturesApp() {
    if (initialized) return Promise.resolve();
    initialized = true;
    return initFeaturesApp(getLanguage());
}

export function applyFeaturesHash() {
    if (applyHashCallback) applyHashCallback();
}

function initFeaturesApp(initialLanguage) {
    const state = {
        currentLanguage: initialLanguage || 'en',
        currentFilter: 'ALL',
        currentSearch: '',
        mainConfig: null,
        featuresData: {},
        currentFeatureId: null
    };

    function localized(data, key) {
        const language = state.currentLanguage;
        const localizedKey = language === 'en' ? key : key + '_' + language;
        return data[localizedKey] || data[key] || '';
    }

    function platformBadge(platform) {
        if (!platform) return '';
        const normalizedPlatform = String(platform).toLowerCase();
        if (normalizedPlatform === 'ios' || normalizedPlatform === 'apple') {
            return '<div class="fp-platform fp-platform-ios"><i class="fa-brands fa-apple"></i> Only iOS</div>';
        }
        if (normalizedPlatform === 'android') {
            return '<div class="fp-platform fp-platform-android"><i class="fa-brands fa-android"></i> Only Android</div>';
        }
        return '';
    }

    const tagClasses = {
        'TALE+': 'fp-tag-taleplus',
        'GENERAL': 'fp-tag-general',
        'BATTLE': 'fp-tag-battle',
        'EXPLOIT': 'fp-tag-exploit',
        'VISUAL': 'fp-tag-visual'
    };
    const validTags = ['ALL', 'TALE+', 'GENERAL', 'BATTLE', 'EXPLOIT', 'VISUAL'];

    const mainText = document.getElementById('main-text');
    const grid = document.getElementById('features-grid');
    const noResults = document.getElementById('no-results');
    const detailElement = document.getElementById('feature-detail');
    const titleElement = document.getElementById('detail-title');
    const platformElement = document.getElementById('detail-platform');
    const exploitWarning = document.getElementById('detail-exploit-warning');
    const descriptionElement = document.getElementById('detail-description');
    const videosSection = document.getElementById('videos-section');
    const videoGrid = document.getElementById('video-grid');
    const photosSection = document.getElementById('photos-section');
    const photoGrid = document.getElementById('photo-grid');
    const shareButton = document.getElementById('share-btn');
    const copyToast = document.getElementById('copy-toast');
    const mainPage = document.getElementById('main-page');
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    const filterButtons = document.querySelectorAll('.fp-filter-btn');
    const backButton = document.getElementById('back-btn');

    function mediaLabel(key, fallback) {
        const active = getTranslations(state.currentLanguage);
        return (active && active[key]) || fallback;
    }

    function applyFilters() {
        const filter = state.currentFilter;
        const search = state.currentSearch;
        const cards = grid.querySelectorAll('.fp-card');
        let visible = 0;
        cards.forEach((card) => {
            const cardTags = (card.dataset.tags || '').split(',');
            let matches = filter === 'ALL' || cardTags.includes(filter);
            if (matches && search) {
                const searchTitle = card.dataset.searchTitle || '';
                const searchDescription = card.dataset.searchDescription || '';
                const tagText = (card.dataset.tags || '').toLowerCase();
                matches = searchTitle.includes(search) || searchDescription.includes(search) || tagText.includes(search);
            }
            if (matches) { card.classList.remove('hidden'); visible++; }
            else { card.classList.add('hidden'); }
        });
        if (noResults) noResults.classList.toggle('visible', visible === 0 && !!search);
    }

    function renderGrid() {
        grid.innerHTML = '';
        Object.keys(state.featuresData).forEach((featureId) => {
            const data = state.featuresData[featureId];
            if (!data) return;
            const card = document.createElement('div');
            card.className = 'fp-card';
            const tags = data.tags || [];
            card.dataset.tags = tags.join(',');
            card.dataset.featureId = featureId;
            const title = localized(data, 'mod_title');
            const description = localized(data, 'mod_description');
            card.dataset.searchTitle = title.toLowerCase();
            card.dataset.searchDescription = description.toLowerCase();
            let tagsHtml = '';
            if (tags.length) {
                tagsHtml = '<div class="fp-card-tags">';
                tags.forEach((tag) => {
                    const tagClassName = tagClasses[tag.toUpperCase()] || 'fp-tag-general';
                    tagsHtml += '<span class="fp-tag ' + tagClassName + '">' + tag + '</span>';
                });
                tagsHtml += '</div>';
            }
            const platformHtml = platformBadge(data.platform);
            card.innerHTML = '<div class="fp-card-titlerow"><h3 class="fp-card-title">' + title + '</h3>' + platformHtml + '</div>' + tagsHtml;
            card.addEventListener('click', () => { showDetail(featureId, false); });
            grid.appendChild(card);
        });
        applyFilters();
    }

    function renderMedia(section, grid, items, label) {
        section.style.display = items.length ? 'block' : 'none';
        let html = '';
        for (let index = 0; index < items.length; index++) {
            html += '<a href="' + items[index] + '" target="_blank" class="fp-media-btn">' + telegramIcon + '<span>' + label + '</span><span class="num">' + (index + 1) + '</span></a>';
        }
        grid.innerHTML = html;
    }

    function setFilter(tag, fromHash) {
        state.currentFilter = tag;
        filterButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.tag === tag);
        });
        if (!fromHash) {
            const nextHash = tag === 'ALL' ? '' : '#' + tag.toLowerCase();
            history.replaceState({ route: 'features' }, '', '/features' + nextHash);
        }
        applyFilters();
    }

    function showMain(fromHash) {
        mainPage.style.display = 'block';
        detailElement.classList.remove('active');
        if (!fromHash) {
            const nextHash = state.currentFilter === 'ALL' ? '' : '#' + state.currentFilter.toLowerCase();
            history.replaceState({ route: 'features' }, '', '/features' + nextHash);
        }
        window.scrollTo({ top: 0, behavior: scrollBehaviorPreference() });
    }

    function showDetail(featureId, fromHash) {
        const data = state.featuresData[featureId];
        if (!data) return;
        state.currentFeatureId = featureId;
        titleElement.textContent = localized(data, 'mod_title');
        platformElement.innerHTML = platformBadge(data.platform);
        exploitWarning.hidden = !(data.tags || []).some((tag) => String(tag).toUpperCase() === 'EXPLOIT');
        descriptionElement.textContent = localized(data, 'mod_description');
        renderMedia(videosSection, videoGrid, data.videos || [], mediaLabel('features.watchVideo', 'Watch Video'));
        renderMedia(photosSection, photoGrid, data.photos || [], mediaLabel('features.viewPhoto', 'View Photo'));
        mainPage.style.display = 'none';
        detailElement.classList.add('active');
        if (!fromHash) {
            history.pushState({ route: 'features', detail: featureId }, '', '/features#' + featureId);
        }
        window.scrollTo({ top: 0, behavior: scrollBehaviorPreference() });
    }

    function applyHash() {
        const hash = window.location.hash.slice(1);
        if (!hash) {
            setFilter('ALL', true);
            mainPage.style.display = 'block';
            detailElement.classList.remove('active');
            return;
        }
        const upperHash = hash.toUpperCase();
        if (validTags.includes(upperHash)) {
            setFilter(upperHash, true);
            mainPage.style.display = 'block';
            detailElement.classList.remove('active');
            return;
        }
        if (state.featuresData[hash]) {
            showDetail(hash, true);
            return;
        }
        setFilter('ALL', true);
    }

    function fallbackCopy(text, onDone) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try { document.execCommand('copy'); if (onDone) onDone(); } catch {}
        document.body.removeChild(textArea);
    }

    function handleLanguageChanged(language) {
        state.currentLanguage = language;
        if (state.mainConfig) {
            mainText.textContent = localized(state.mainConfig, 'main_text');
        }
        renderGrid();
        if (state.currentFeatureId && detailElement.classList.contains('active')) {
            const data = state.featuresData[state.currentFeatureId];
            if (data) {
                titleElement.textContent = localized(data, 'mod_title');
                descriptionElement.textContent = localized(data, 'mod_description');
                renderMedia(videosSection, videoGrid, data.videos || [], mediaLabel('features.watchVideo', 'Watch Video'));
                renderMedia(photosSection, photoGrid, data.photos || [], mediaLabel('features.viewPhoto', 'View Photo'));
            }
        }
    }

    let searchDebounceTimer = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            const query = searchInput.value.trim().toLowerCase();
            state.currentSearch = query;
            searchClear.classList.toggle('visible', !!query);
            applyFilters();
        }, 150);
    });
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        state.currentSearch = '';
        searchClear.classList.remove('visible');
        applyFilters();
    });
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            searchInput.value = '';
            state.currentSearch = '';
            searchClear.classList.remove('visible');
            applyFilters();
            searchInput.blur();
        }
    });

    filterButtons.forEach((button) => {
        button.addEventListener('click', () => { setFilter(button.dataset.tag, false); });
    });

    backButton.addEventListener('click', () => { showMain(false); });

    shareButton.addEventListener('click', () => {
        const url = window.location.href;
        function showToast() {
            copyToast.classList.add('show');
            setTimeout(() => { copyToast.classList.remove('show'); }, 2000);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(showToast).catch(() => {
                fallbackCopy(url, showToast);
            });
        } else {
            fallbackCopy(url, showToast);
        }
    });

    document.addEventListener('keydown', (event) => {
        const homeView = document.getElementById('home-view');
        if (homeView && !homeView.hidden) return;
        if (event.key === 'Escape') {
            if (detailElement.classList.contains('active')) {
                showMain(false);
            }
        }
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            searchInput.focus();
        }
    });

    applyHashCallback = applyHash;
    onLanguageChange(handleLanguageChanged);

    return fetch('i18n/features/features_translations.json')
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null)
        .then((data) => {
            if (!data) {
                mainText.textContent = 'Failed to load';
                return;
            }
            state.mainConfig = data.main;
            (data.features || []).forEach((feature, index) => {
                const featureId = (feature.mod_title || '').toLowerCase().replace(/[^a-z0-9]+/g, '') || ('mod' + index);
                state.featuresData[featureId] = feature;
            });
            mainText.textContent = localized(state.mainConfig, 'main_text');
            renderGrid();
            applyHash();
        });
}
