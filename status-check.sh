#!/bin/bash

# Eatix Backend Status Check Script

echo "=========================================="
echo "Eatix Backend Production Status"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Check PM2 Status
echo "1. PM2 Application Status:"
pm2 list | grep eatix-backend
echo ""

# 2. Check Nginx Status
echo "2. Nginx Status:"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx is running${NC}"
else
    echo -e "${RED}✗ Nginx is not running${NC}"
fi
echo ""

# 3. Check Database
echo "3. PostgreSQL Database:"
DB_EXISTS=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w eatix)
if [ ! -z "$DB_EXISTS" ]; then
    echo -e "${GREEN}✓ Database 'eatix' exists${NC}"
    # Get database size
    DB_SIZE=$(sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('eatix'));" -t)
    echo "  Database Size:$DB_SIZE"
else
    echo -e "${RED}✗ Database 'eatix' not found${NC}"
fi
echo ""

# 4. Check Port
echo "4. Port 9001 Status:"
if sudo lsof -i :9001 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Port 9001 is in use (application running)${NC}"
    sudo lsof -i :9001 | grep LISTEN
else
    echo -e "${RED}✗ Port 9001 is not in use${NC}"
fi
echo ""

# 5. Check Nginx Configuration
echo "5. Nginx Configuration:"
if [ -f /etc/nginx/sites-enabled/eatixapi.pino7.com ]; then
    echo -e "${GREEN}✓ Nginx site configuration exists${NC}"
else
    echo -e "${RED}✗ Nginx site configuration not found${NC}"
fi
echo ""

# 6. Check SSL Certificate
echo "6. SSL Certificate:"
if sudo test -f /etc/letsencrypt/live/eatixapi.pino7.com/fullchain.pem; then
    echo -e "${GREEN}✓ SSL certificate exists${NC}"
    CERT_EXPIRY=$(sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/eatixapi.pino7.com/fullchain.pem | cut -d= -f2)
    echo "  Expires: $CERT_EXPIRY"
else
    echo -e "${YELLOW}⚠ SSL certificate not found (run certbot)${NC}"
fi
echo ""

# 7. Check Disk Space
echo "7. Disk Space:"
df -h /var/www/eatix-backend | tail -1
echo ""

# 8. Check Memory Usage
echo "8. Memory Usage:"
free -h | grep Mem
echo ""

# 9. Recent Logs
echo "9. Recent Application Logs (last 10 lines):"
if [ -f /var/www/eatix-backend/logs/combined.log ]; then
    tail -10 /var/www/eatix-backend/logs/combined.log
else
    echo "No logs found"
fi
echo ""

# 10. API Test
echo "10. API Health Check:"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9001 2>/dev/null)
if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "404" ] || [ "$HTTP_STATUS" == "301" ]; then
    echo -e "${GREEN}✓ API is responding (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}✗ API not responding properly (HTTP $HTTP_STATUS)${NC}"
fi
echo ""

echo "=========================================="
echo "End of Status Check"
echo "=========================================="
