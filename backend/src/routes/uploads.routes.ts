import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/error.js';

const ALLOWED_MIME = /^image\/(png|jpe?g|webp|gif)$/;

// Buffered in memory rather than written to disk, so it can be normalized by sharp first -
// staff upload whatever they have (a phone photo, any orientation, any size), and every
// product image ends up a consistently-sized webp either way.
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

      const image = await prisma.image.create({ data: { data: processed, mimeType: 'image/webp' } });

      const url = `${req.protocol}://${req.get('host')}/api/uploads/${image.id}`;
      res.status(201).json({ url });
    } catch (procErr) {
      next(new HttpError(400, procErr instanceof Error ? procErr.message : 'Could not process image'));
    }
  });
});

// Public - product/pack images are shown on the storefront, no auth needed to view them.
uploadsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const image = await prisma.image.findUnique({ where: { id: req.params.id } });
    if (!image) {
      res.status(404).end();
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Type', image.mimeType);
    // Prisma returns Bytes fields as a plain Uint8Array, not a real Buffer instance -
    // res.send() only recognizes an actual Buffer as binary, otherwise it JSON-serializes it.
    res.send(Buffer.from(image.data));
  })
);
