import utils from './utils';
import navbarInit from './bootstrap-navbar';
import detectorInit from './detector';
import scrollToTop from './scroll-to-top';
import { initNavBadges } from './nav-badges';
import { loadCatalog } from './data/products';
import { initHomeFeatured } from './home-featured';
import { initHomePacks } from './home-packs';

/* -------------------------------------------------------------------------- */
/*                            Theme Initialization                            */
/* -------------------------------------------------------------------------- */

utils.docReady(navbarInit);
utils.docReady(detectorInit);
utils.docReady(scrollToTop);
utils.docReady(initNavBadges);

await loadCatalog();
utils.docReady(initHomeFeatured);
utils.docReady(initHomePacks);
