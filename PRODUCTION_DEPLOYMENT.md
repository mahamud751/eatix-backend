# Eatix API Production Deployment Guide

## Domain Information
- **Primary Domain:** eatixapi.pino7.com
- **Alternate Domain:** www.eatixapi.pino7.com
- **Port:** 9001
- **Database:** PostgreSQL (eatix)

## Quick Start Deployment

### Prerequisites
Before running the setup script, ensure:
1. Domain DNS records are configured (A records pointing to server IP)
2. PostgreSQL is installed and running
3. Node.js (v18+) and npm are installed
4. Nginx is installed
5. PM2 is installed globally (`npm install -g pm2`)

### One-Command Setup
Run the automated setup script:
```bash
cd /var/www/eatix-backend
sudo ./setup-production.sh
```

This script will:
1. ✅ Create PostgreSQL database 'eatix'
2. ✅ Install Node.js dependencies
3. ✅ Generate Prisma Client
4. ✅ Run database migrations
5. ✅ Build the NestJS application
6. ✅ Create logs directory
7. ✅ Setup Nginx configuration
8. ✅ Test and reload Nginx
9. ✅ Stop existing PM2 processes
10. ✅ Start application with PM2
11. ✅ Save PM2 configuration
12. ✅ Configure PM2 startup script

## Manual Setup Steps

### 1. Database Setup
```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE eatix;"

# Verify database exists
sudo -u postgres psql -l | grep eatix
```

### 2. Application Setup
```bash
cd /var/www/eatix-backend

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Build application
npm run build
```

### 3. Nginx Configuration
```bash
# Copy Nginx configuration
sudo cp /var/www/eatix-backend/eatixapi.pino7.com.conf /etc/nginx/sites-available/eatixapi.pino7.com

# Enable site
sudo ln -sf /etc/nginx/sites-available/eatixapi.pino7.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 4. PM2 Process Management
```bash
cd /var/www/eatix-backend

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup systemd
```

## SSL Certificate Setup

### Install Certbot
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### Generate SSL Certificate
```bash
sudo certbot --nginx -d eatixapi.pino7.com -d www.eatixapi.pino7.com
```

Follow the prompts to:
- Enter email address for renewal notifications
- Agree to Terms of Service
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### Auto-renewal Test
```bash
# Test certificate renewal
sudo certbot renew --dry-run
```

## DNS Configuration

Ensure the following DNS records are set:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | eatixapi.pino7.com | YOUR_SERVER_IP | 3600 |
| A | www.eatixapi.pino7.com | YOUR_SERVER_IP | 3600 |

## Verification

### 1. Check Application Status
```bash
pm2 status
pm2 logs eatix-backend
```

### 2. Test API Endpoints
```bash
# Health check
curl http://eatixapi.pino7.com/

# API Documentation
curl http://eatixapi.pino7.com/docs

# API endpoint
curl http://eatixapi.pino7.com/v1/
```

### 3. Check Nginx Status
```bash
sudo systemctl status nginx
sudo nginx -t
```

### 4. Check PostgreSQL
```bash
sudo -u postgres psql -c "\l" | grep eatix
```

## Important Files

### Configuration Files
- **Nginx Config:** `/etc/nginx/sites-available/eatixapi.pino7.com`
- **Environment:** `/var/www/eatix-backend/.env`
- **PM2 Config:** `/var/www/eatix-backend/ecosystem.config.js`
- **Prisma Schema:** `/var/www/eatix-backend/prisma/schema.prisma`

### Log Files
- **PM2 Error Logs:** `/var/www/eatix-backend/logs/err.log`
- **PM2 Output Logs:** `/var/www/eatix-backend/logs/out.log`
- **PM2 Combined Logs:** `/var/www/eatix-backend/logs/combined.log`
- **Nginx Access:** `/var/log/nginx/access.log`
- **Nginx Error:** `/var/log/nginx/error.log`

## Common Management Commands

### PM2 Commands
```bash
# View status
pm2 status

# View logs
pm2 logs eatix-backend

# Restart application
pm2 restart eatix-backend

# Stop application
pm2 stop eatix-backend

# Monitor
pm2 monit
```

### Nginx Commands
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View status
sudo systemctl status nginx
```

### Database Commands
```bash
# Access database
sudo -u postgres psql eatix

# Run migrations
cd /var/www/eatix-backend
npx prisma migrate deploy

# View database
npx prisma studio
```

## Deployment Workflow

### For Updates
```bash
cd /var/www/eatix-backend

# Pull latest changes (if using git)
git pull

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Build application
npm run build

# Restart PM2
pm2 restart eatix-backend

# Check status
pm2 status
pm2 logs eatix-backend --lines 50
```

## Troubleshooting

### Application Won't Start
```bash
# Check logs
pm2 logs eatix-backend --lines 100

# Check if port is in use
sudo lsof -i :9001

# Restart application
pm2 restart eatix-backend
```

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Verify database exists
sudo -u postgres psql -l | grep eatix

# Check connection string in .env
cat /var/www/eatix-backend/.env | grep DATABASE_URL
```

### Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

## Security Checklist

- ✅ Firewall configured (allow ports 80, 443, 22)
- ✅ SSL certificate installed
- ✅ Environment variables secured (.env not in git)
- ✅ PostgreSQL password changed from default
- ✅ JWT secret is strong and unique
- ✅ Cloudflare R2 credentials secured
- ✅ Regular backups configured
- ✅ PM2 running as non-root user (when possible)

## Monitoring

### System Resources
```bash
# CPU and Memory
pm2 monit

# Disk usage
df -h

# Database size
sudo -u postgres psql -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS size FROM pg_database;"
```

### Application Metrics
- API Documentation: http://eatixapi.pino7.com/docs
- Health Check: http://eatixapi.pino7.com/v1/health (if implemented)

## Backup Strategy

### Database Backup
```bash
# Manual backup
sudo -u postgres pg_dump eatix > /backup/eatix_$(date +%Y%m%d_%H%M%S).sql

# Automated daily backup (add to crontab)
0 2 * * * /usr/bin/pg_dump -U postgres eatix > /backup/eatix_$(date +\%Y\%m\%d).sql
```

### Application Backup
```bash
# Backup uploads directory
tar -czf /backup/uploads_$(date +%Y%m%d).tar.gz /var/www/eatix-backend/public/uploads/

# Backup environment file
cp /var/www/eatix-backend/.env /backup/.env.backup
```

## Support

### Get Help
- Check PM2 logs: `pm2 logs eatix-backend`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Check system logs: `sudo journalctl -xe`

### Quick Status Check
```bash
# One-liner to check everything
echo "=== PM2 Status ===" && pm2 list | grep eatix && \
echo "=== Nginx Status ===" && sudo systemctl status nginx --no-pager && \
echo "=== Database Status ===" && sudo -u postgres psql -c "\l" | grep eatix && \
echo "=== Disk Space ===" && df -h /var/www/eatix-backend
```

---

**Last Updated:** 2026-02-13
**Environment:** Production
**Server:** srv1209731
