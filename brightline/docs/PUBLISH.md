# Database Publish

The pipeline uploads images to R2 and creates galleries in the database directly via the `/api/admin/media/upsert` endpoint. No separate publish step is required.

## Flow

1. **Pipeline** (`BrightLine_images/pipeline/index.mjs`) processes files from `_incoming/{arc,cam,cor}`.
2. For each file: validate → Sheet append (optional) → sequence → Sharp → R2 upload → **POST `/api/admin/media/upsert`**.
3. The API creates or updates Gallery and GalleryImage records.

## API: /api/admin/media/upsert

- **Auth:** Bearer `UPLOAD_TOKEN` or NextAuth admin session
- **Body:** `{ section, capturedDate, sequence, filename, fullUrl, thumbUrl, r2KeyFull, r2KeyThumb, projectId? }`
- **Response:** `{ ok: true, galleryId, imageId }`

See `docs/PIPELINE.md` for full workflow and R2 key format.
