import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const uploadsDir = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_MIME = /^image\/(png|jpe?g|webp|gif)$/;

// Buffered in memory rather than written to disk as-is, so it can be normalized by
// sharp first - staff upload whatever they have (a phone photo, any orientation, any
// size), and every product image ends up a consistently-sized webp either way.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only png/jpeg/webp/gif images are allowed'));
    }
  },
});

export const uploadsRouter = Router();

// Staff-only - this is how a non-technical staff member sets a product's image without
// touching the codebase: pick a file, get back a URL, use it as the product's `image`.
uploadsRouter.post('/', requireAuth, (req, res, next) => {
  upload.single('image')(req, res, async (err: unknown) => {
    if (err) {
      next(new HttpError(400, err instanceof Error ? err.message : 'Upload failed'));
      return;
    }
    if (!req.file) {
      next(new HttpError(400, 'No image file received'));
      return;
    }

    try {
      // .rotate() with no args reads the image's EXIF orientation (common on phone
      // photos) and auto-corrects it before resizing, so sideways uploads come out upright.
      const processed = await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

      const filename = `${crypto.randomUUID()}.webp`;
      await fs.promises.writeFile(path.join(uploadsDir, filename), processed);

      const url = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
      res.status(201).json({ url });
    } catch (procErr) {
      next(new HttpError(400, procErr instanceof Error ? procErr.message : 'Could not process image'));
    }
  });
});
