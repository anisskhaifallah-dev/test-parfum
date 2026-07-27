import utils from './utils';
import navbarInit from './bootstrap-navbar';
import detectorInit from './detector';
import scrollToTop from './scroll-to-top';
import { initNavBadges } from './nav-badges';
import { wirePackButtons } from './pack-buttons';
import { loadCatalog } from './data/products';
import { initHomeFeatured } from './home-featured';

/* -------------------------------------------------------------------------- */
/*                            Theme Initialization                            */
/* -------------------------------------------------------------------------- */

utils.docReady(navbarInit);
utils.docReady(detectorInit);
utils.docReady(scrollToTop);
utils.docReady(initNavBadges);
utils.docReady(() => wirePackButtons());

await loadCatalog();
utils.docReady(initHomeFeatured);
