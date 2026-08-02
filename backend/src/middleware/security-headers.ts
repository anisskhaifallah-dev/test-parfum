import helmet from 'helmet';

// Images are served from this API's own domain but embedded on a different frontend
// origin (<img src="https://...railway.app/api/uploads/...">) - helmet's default
// same-origin Cross-Origin-Resource-Policy would silently block the browser from
// loading them there, so it's relaxed specifically for that.
export const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});
