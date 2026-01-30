# Admin Seed Endpoint

A dev-only endpoint for generating demo client portal data.

## Security

The endpoint is protected by the `SEED_TOKEN` environment variable:
- If `SEED_TOKEN` is not set, the endpoint returns 404 (hidden)
- If the provided token doesn't match, the endpoint returns 404
- This ensures the endpoint is invisible in production unless explicitly enabled

## Setup

1. Add to your `.env`:
   ```bash
   SEED_TOKEN=your-secret-token-here
   ```

2. Generate a secure token:
   ```bash
   openssl rand -hex 32
   ```

## Usage

```bash
curl -X POST http://localhost:3000/api/admin/seed \
  -H "Authorization: Bearer YOUR_SEED_TOKEN"
```

## Response

```json
{
  "ok": true,
  "message": "Demo data created successfully",
  "data": {
    "clientId": "clx...",
    "clientName": "Demo Client",
    "projectId": "clx...",
    "projectTitle": "Demo Hospitality Project",
    "galleryId": "clx...",
    "galleryTitle": "Demo Gallery",
    "accessCode": "DEMO-ABC123",
    "accessUrl": "/client/DEMO-ABC123",
    "expiresAt": "2025-03-01T00:00:00.000Z"
  }
}
```

## What Gets Created

1. **Client**
   - Name: Demo Client
   - Email: demo@example.com
   - Company: Demo Company

2. **Project**
   - Title: Demo Hospitality Project
   - Category: Hospitality
   - Location: Miami, FL

3. **Gallery**
   - Title: Demo Gallery
   - 3 sample images (from /work/hotel-01/)
   - Client notes included

4. **Access Token**
   - Unique code (e.g., DEMO-ABC123)
   - Expires in 30 days
   - Downloads enabled

## Testing the Client Portal

1. Run the seed endpoint to get an access code
2. Visit `/client` in your browser
3. Enter the access code from the response
4. You'll see the demo gallery with sample images

## Notes

- The endpoint uses upsert, so it's safe to run multiple times
- Each run creates a new access code
- Demo images use placeholder SVGs from `/work/hotel-01/`
- For real testing, upload images to R2/S3 and update the gallery

## Production Safety

**Never set `SEED_TOKEN` in production** unless you have a specific need for seeding.

If you need to seed production data:
1. Use a very strong token
2. Remove the token immediately after use
3. Consider using a database migration instead
