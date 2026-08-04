import { initHome } from './home.js';
import { initGuides } from './guides.js';
import { initRouter } from './router.js';
import { initLocalization } from './localization.js';
import { initNews } from './news.js';

initHome();
initGuides();
initRouter();
initLocalization().then(() => {
    initNews();
});
