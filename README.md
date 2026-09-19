# License Key Server

Simple license key management system I built for my apps.

## What's Inside

- **Backend** - Node.js/Express API with Prisma ORM
- **Frontend** - Next.js admin dashboard
- **Database** - PostgreSQL
- **Cache** - Redis for rate limiting

## Running It

```bash
docker-compose up -d
```

Then open http://localhost:3000

Login with: `admin` / `admin123`

## Endpoints

Validate licenses from your app:
```
GET /api/check?udid=YOUR_UDID&key=LICENSE_KEY&bundleId=com.your.app
```

Returns `{"status": "true"}` or `{"status": "false"}`

## Configuration

Edit `.env` or docker-compose.yml to change:
- Database credentials
- Admin username/password
- JWT secret
- Port numbers