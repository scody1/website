import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { ApiError, json, route } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BYTES = 1.5 * 1024 * 1024;
const MAGIC: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46]
};

/** Stores an (already compressed) product photo and returns its URL. */
export const POST = route(async (req: NextRequest) => {
  await requireAdmin(req, ['products.create', 'products.edit']);
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') throw new ApiError(400, 'No file uploaded.');
  const magic = MAGIC[file.type];
  if (!magic) throw new ApiError(400, 'Only JPEG, PNG or WebP images are allowed.');
  if (file.size > MAX_BYTES) throw new ApiError(400, 'Image is too large (max 1.5 MB after compression).');
  const buf = Buffer.from(await file.arrayBuffer());
  if (!magic.every((b, i) => buf[i] === b)) throw new ApiError(400, 'The file content is not a valid image.');
  const [row] = await db()`
    INSERT INTO images (content_type, data, size_bytes) VALUES (${file.type}, ${buf}, ${buf.length}) RETURNING id
  `;
  return json({ url: `/api/images/${row.id}` }, { status: 201 });
});
