import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { authRouter } from './routes/auth.routes.js';
import { productsRouter, packsRouter } from './routes/products.routes.js';
import { ordersRouter } from './routes/orders.routes.js';
import { newsletterRouter } from './routes/newsletter.routes.js';
import { uploadsRouter, uploadsDir } from './routes/uploads.routes.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import { errorHandler } from './middleware/error.js';

const app = express();

// Comma-separated list, e.g. "https://www.yyparfum.com,https://yyparfum.com" - lets the
// storefront be reachable at more than one domain (custom domain + www + Vercel default)
// without needing a code change every time a domain is added.
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  })
);
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/packs', packsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/analytics', analyticsRouter);

app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`YY Parfums backend listening on http://localhost:${port}`);
});
