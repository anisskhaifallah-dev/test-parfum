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

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
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
