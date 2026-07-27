import navbarInit from './bootstrap-navbar';
import detectorInit from './detector';
import scrollToTop from './scroll-to-top';
import { initNavBadges } from './nav-badges';
import utils from './utils';
import { loadCatalog } from './data/products';
import { initProductPage } from './product-page';

utils.docReady(navbarInit);
utils.docReady(detectorInit);
utils.docReady(scrollToTop);
utils.docReady(initNavBadges);

await loadCatalog();
utils.docReady(initProductPage);
