import { readCookie, writeCookie } from './cookies.js';

const translations = {};
let languages = null;
const keyedStores = {};
const languageChangeHandlers = [];
let languageOptions = [];

export function loadLanguages() {
    if (languages) return Promise.resolve(languages);
    return fetch('i18n/languages.json')
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
            languages = data || { en: 'English' };
            return languages;
        })
        .catch(() => {
            languages = { en: 'English' };
            return languages;
        });
}

function loadKeyedFile(url) {
    return fetch(url)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => data || {})
        .catch(() => ({}));
}

function loadKeyedStore(name, url) {
    if (keyedStores[name]) return Promise.resolve(keyedStores[name]);
    return loadKeyedFile(url).then((data) => {
        keyedStores[name] = data;
        return keyedStores[name];
    });
}

function mergeKeyedTranslations(source, languageCode) {
    const target = translations[languageCode];
    Object.keys(source).forEach((key) => {
        const entry = source[key];
        const value = entry[languageCode] !== undefined ? entry[languageCode] : entry.en;
        if (value !== undefined) target[key] = value;
    });
}

export function loadTranslations(languageCode) {
    if (translations[languageCode]) return Promise.resolve(translations[languageCode]);
    return Promise.all([
        loadKeyedStore('general', 'i18n/general/general_translations.json'),
        loadKeyedStore('guides', 'i18n/guides/guides_translations.json')
    ]).then(([general, guides]) => {
        translations[languageCode] = {};
        mergeKeyedTranslations(general, languageCode);
        mergeKeyedTranslations(guides, languageCode);
        return translations[languageCode];
    }).catch(() => null);
}

export function getTranslations(languageCode) {
    return translations[languageCode] || translations.en || null;
}

function isSupportedLanguage(languageCode) {
    if (languages) return Object.prototype.hasOwnProperty.call(languages, languageCode);
    return languageCode === 'en' || languageCode === 'tr' || languageCode === 'ru';
}

export function getLanguage() {
    let languageCode = readCookie('language');
    if (languageCode && isSupportedLanguage(languageCode)) return languageCode;
    const browserLanguage = (navigator.language || 'en').toLowerCase().split('-')[0];
    languageCode = isSupportedLanguage(browserLanguage) ? browserLanguage : 'en';
    writeCookie('language', languageCode);
    return languageCode;
}

function renderLanguagePicker() {
    const container = document.getElementById('footer-languages');
    if (!container || !languages) return;
    Object.keys(languages).forEach((code) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'footer-lang-opt';
        option.dataset.language = code;
        option.textContent = languages[code];
        option.addEventListener('click', () => selectLanguage(code));
        container.appendChild(option);
    });
    languageOptions = container.querySelectorAll('.footer-lang-opt');
}

function updateLanguagePickerState(languageCode) {
    languageOptions.forEach((option) => {
        option.classList.toggle('active', option.dataset.language === languageCode);
    });
}

export function applyStaticTranslations(languageCode) {
    const active = translations[languageCode] || translations.en;
    if (!active) return;
    document.querySelectorAll('[data-i18n]').forEach((element) => {
        const key = element.getAttribute('data-i18n');
        if (active[key] === undefined) return;
        if (element.hasAttribute('data-i18n-html')) {
            element.innerHTML = active[key];
        } else {
            element.textContent = active[key];
        }
    });
}

export function applyFeatureStaticTranslations(languageCode) {
    const active = translations[languageCode] || translations.en;
    if (!active) return;
    document.querySelectorAll('[data-features-i18n]').forEach((element) => {
        const key = element.getAttribute('data-features-i18n');
        if (active[key] === undefined) return;
        element.textContent = active[key];
    });
    document.querySelectorAll('[data-features-i18n-placeholder]').forEach((element) => {
        const key = element.getAttribute('data-features-i18n-placeholder');
        if (active[key] !== undefined) element.placeholder = active[key];
    });
}

export function onLanguageChange(handler) {
    languageChangeHandlers.push(handler);
}

function notifyLanguageChange(languageCode) {
    languageChangeHandlers.forEach((handler) => handler(languageCode));
}

export function selectLanguage(languageCode) {
    writeCookie('language', languageCode);
    updateLanguagePickerState(languageCode);
    return loadTranslations(languageCode).then(() => {
        applyStaticTranslations(languageCode);
        applyFeatureStaticTranslations(languageCode);
        notifyLanguageChange(languageCode);
    });
}

export function initLocalization() {
    return loadLanguages().then(() => {
        renderLanguagePicker();
        const languageCode = getLanguage();
        updateLanguagePickerState(languageCode);
        const pending = languageCode === 'en'
            ? [loadTranslations('en')]
            : [loadTranslations('en'), loadTranslations(languageCode)];
        return Promise.all(pending).then(() => {
            applyStaticTranslations(languageCode);
            applyFeatureStaticTranslations(languageCode);
            notifyLanguageChange(languageCode);
            return languageCode;
        });
    });
}
