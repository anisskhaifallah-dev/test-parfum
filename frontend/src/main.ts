import utils from './utils';
import navbarInit from './bootstrap-navbar';
import detectorInit from './detector';
import scrollToTop from './scroll-to-top';
import { initNavBadges } from './nav-badges';
import { initI18n } from './i18n';
import { initLangSwitcher } from './lang-switcher';
import { initNewsletter } from './newsletter';
import { loadCatalog } from './data/products';
import { initHomeFeatured } from './home-featured';
import { initHomePacks } from './home-packs';

/* -------------------------------------------------------------------------- */
/*                            Theme Initialization                            */
/* -------------------------------------------------------------------------- */

utils.docReady(initI18n);
utils.docReady(navbarInit);
utils.docReady(detectorInit);
utils.docReady(scrollToTop);
utils.docReady(initNavBadges);
utils.docReady(initLangSwitcher);
utils.docReady(initNewsletter);

await loadCatalog();
utils.docReady(initHomeFeatured);
utils.docReady(initHomePacks);
window.addEventListener('localechange', initHomeFeatured);
window.addEventListener('localechange', initHomePacks);
