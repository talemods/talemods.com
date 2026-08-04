import { getLanguage, getTranslations } from './localization.js';

const newsContainer = document.getElementById('news-cards');
const newsCacheKey = 'taleNewsCache';

function newsLinkLabel() {
    const active = getTranslations(getLanguage()) || {};
    return active['news.open'] || 'View on Telegram';
}

function renderNewsCards(posts, channel) {
    const channelName = (channel && channel.name) || 'Tale Stars | Tale Royale';
    const channelPhoto = channel && channel.photo;
    newsContainer.innerHTML = '';
    posts.forEach((post) => {
        const card = document.createElement('article');
        card.className = 'news-card';
        const dateText = post.date
            ? post.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
            : '';
        card.innerHTML =
            '<div class="news-card-head">' +
                '<span class="news-card-avatar">' +
                    (channelPhoto ? '<img alt="" referrerpolicy="no-referrer" />' : '<i class="fa-brands fa-telegram"></i>') +
                '</span>' +
                '<div class="news-card-meta">' +
                    '<span class="news-card-channel"></span>' +
                    '<span class="news-card-date"></span>' +
                '</div>' +
            '</div>' +
            (post.photo ? '<div class="news-card-photo"><img loading="lazy" alt="" referrerpolicy="no-referrer" /></div>' : '') +
            '<p class="news-card-text"></p>' +
            '<a class="news-card-link" target="_blank" rel="noopener">' +
                '<i class="fa-brands fa-telegram"></i><span></span>' +
            '</a>';
        card.querySelector('.news-card-channel').textContent = channelName;
        card.querySelector('.news-card-date').textContent = dateText;
        const messageText = card.querySelector('.news-card-text');
        if (post.html) {
            messageText.innerHTML = post.html;
        } else {
            messageText.textContent = post.text;
        }
        if (channelPhoto) {
            const avatarImage = card.querySelector('.news-card-avatar img');
            avatarImage.onerror = () => {
                avatarImage.parentNode.innerHTML = '<i class="fa-brands fa-telegram"></i>';
            };
            avatarImage.src = channelPhoto;
        }
        if (post.photo) {
            const photoContainer = card.querySelector('.news-card-photo');
            const photoImage = photoContainer.querySelector('img');
            photoImage.onerror = () => { photoContainer.remove(); };
            photoImage.src = post.photo;
        }
        const link = card.querySelector('.news-card-link');
        link.href = post.link;
        link.querySelector('span').textContent = newsLinkLabel();
        newsContainer.appendChild(card);
    });
}

function showNewsFallback() {
    newsContainer.innerHTML =
        '<a class="news-card news-card-fallback" href="https://t.me/talebrawl" target="_blank" rel="noopener">' +
            '<span class="news-card-avatar"><i class="fa-brands fa-telegram"></i></span>' +
            '<span class="news-card-channel">@talebrawl</span>' +
            '<span class="news-card-date">t.me/talebrawl</span>' +
        '</a>';
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function emojiSafeHtml(node) {
    let html = '';
    Array.prototype.forEach.call(node.childNodes, (child) => {
        if (child.nodeType === 3) {
            html += escapeHtml(child.nodeValue);
        } else if (child.nodeType === 1) {
            if (child.tagName === 'BR') {
                html += '\n';
            } else if (child.tagName === 'TG-EMOJI' && /^\d+$/.test(child.getAttribute('emoji-id') || '')) {
                html += '<img class="news-emoji" src="https://t.me/i/emoji/' +
                    child.getAttribute('emoji-id') + '.webp" alt="' +
                    escapeHtml(child.textContent) + '" loading="lazy" />';
            } else if (child.tagName === 'I' && child.classList.contains('emoji')) {
                const backgroundStyle = (child.getAttribute('style') || '').match(/url\('([^']+)'\)/);
                const label = escapeHtml(child.textContent);
                if (backgroundStyle && /^(https?:)?\/\//.test(backgroundStyle[1])) {
                    html += '<img class="news-emoji" src="' + escapeHtml(backgroundStyle[1]) + '" alt="' + label + '" loading="lazy" />';
                } else {
                    html += label;
                }
            } else {
                html += emojiSafeHtml(child);
            }
        }
    });
    return html;
}

function parseNewsHtml(html) {
    const parsedDocument = new DOMParser().parseFromString(html, 'text/html');

    const titleElement = parsedDocument.querySelector('.tgme_channel_info_header_title');
    const avatarElement = parsedDocument.querySelector('.tgme_page_photo_image img') ||
        parsedDocument.querySelector('.tgme_widget_message_user_photo img');
    const channel = {
        name: titleElement ? titleElement.textContent.trim() : null,
        photo: avatarElement ? avatarElement.getAttribute('src') : null
    };

    const messageNodes = parsedDocument.querySelectorAll('.tgme_widget_message_wrap');
    const posts = [];
    for (let index = messageNodes.length - 1; index >= 0 && posts.length < 3; index--) {
        const messageNode = messageNodes[index];
        const messageTextElement = messageNode.querySelector('.tgme_widget_message_text');
        const dateLink = messageNode.querySelector('a.tgme_widget_message_date');
        if (!messageTextElement || !dateLink) continue;
        let photo = null;
        const photoWrap = messageNode.querySelector('.tgme_widget_message_photo_wrap');
        if (photoWrap) {
            const backgroundStyle = (photoWrap.getAttribute('style') || '').match(/url\('([^']+)'\)/);
            if (backgroundStyle) photo = backgroundStyle[1];
        }
        const timeElement = dateLink.querySelector('time');
        posts.push({
            text: messageTextElement.textContent.trim(),
            html: emojiSafeHtml(messageTextElement).trim(),
            link: dateLink.href,
            date: timeElement ? new Date(timeElement.getAttribute('datetime')) : null,
            photo: photo
        });
    }
    return { posts: posts, channel: channel };
}

function readNewsCache() {
    try {
        const serialized = localStorage.getItem(newsCacheKey);
        if (!serialized) return null;
        const cache = JSON.parse(serialized);
        if (!cache.posts || !cache.posts.length) return null;
        return {
            channel: cache.channel || null,
            posts: cache.posts.map((post) => ({
                text: post.text,
                html: post.html,
                link: post.link,
                photo: post.photo,
                date: post.date ? new Date(post.date) : null
            }))
        };
    } catch (e) {
        return null;
    }
}

function writeNewsCache(posts, channel) {
    try {
        localStorage.setItem(newsCacheKey, JSON.stringify({ time: Date.now(), posts: posts, channel: channel }));
    } catch {}
}

function fetchNews(onSuccess, onFail) {
    const abortController = ('AbortController' in window) ? new AbortController() : null;
    const timeoutId = setTimeout(() => { if (abortController) abortController.abort(); }, 12000);
    fetch('https://stars.talemods.com/get_latest_telegram_news', abortController ? { signal: abortController.signal } : {})
        .then((response) => {
            if (!response.ok) throw new Error('upstream');
            return response.text();
        })
        .then((html) => {
            clearTimeout(timeoutId);
            const parsed = parseNewsHtml(html);
            if (!parsed.posts.length) throw new Error('no posts');
            onSuccess(parsed);
        })
        .catch(() => {
            clearTimeout(timeoutId);
            onFail();
        });
}

export function initNews() {
    if (!newsContainer) return;
    const cached = readNewsCache();
    if (cached) {
        renderNewsCards(cached.posts, cached.channel);
    }
    fetchNews((data) => {
        writeNewsCache(data.posts, data.channel);
        renderNewsCards(data.posts, data.channel);
    }, () => {
        if (!cached) showNewsFallback();
    });
}
