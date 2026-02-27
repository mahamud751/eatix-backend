#!/bin/bash

echo "=========================================="
echo "Eatix Backend Production Setup"
echo "Domain: eatixapi.pino7.com"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}➜ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root or with sudo"
    exit 1
fi

# Step 1: Create database
print_info "Step 1: Creating PostgreSQL database 'eatix'..."
sudo -u postgres psql -c "CREATE DATABASE eatix;" 2>/dev/null
if [ $? -eq 0 ]; then
    print_success "Database 'eatix' created successfully"
else
    print_info "Database 'eatix' may already exist (this is okay)"
fi

# Step 2: Install dependencies
print_info "Step 2: Installing Node.js dependencies..."
cd /var/www/eatix-backend
npm install
if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 3: Generate Prisma Client
print_info "Step 3: Generating Prisma Client..."
npx prisma generate
if [ $? -eq 0 ]; then
    print_success "Prisma Client generated successfully"
else
    print_error "Failed to generate Prisma Client"
    exit 1
fi

# Step 4: Run database migrations
print_info "Step 4: Running database migrations..."
npx prisma migrate deploy
if [ $? -eq 0 ]; then
    print_success "Database migrations completed successfully"
else
    print_error "Failed to run database migrations"
    exit 1
fi

# Step 5: Build the application
print_info "Step 5: Building NestJS application..."
npm run build
if [ $? -eq 0 ]; then
    print_success "Application built successfully"
else
    print_error "Failed to build application"
    exit 1
fi

# Step 6: Create logs directory
print_info "Step 6: Creating logs directory..."
mkdir -p /var/www/eatix-backend/logs
chmod 755 /var/www/eatix-backend/logs
print_success "Logs directory created"

# Step 7: Setup Nginx configuration
print_info "Step 7: Setting up Nginx configuration..."
if [ -f /etc/nginx/sites-available/eatixapi.pino7.com ]; then
    print_info "Removing old Nginx configuration..."
    rm /etc/nginx/sites-available/eatixapi.pino7.com
    rm -f /etc/nginx/sites-enabled/eatixapi.pino7.com
fi

cp /var/www/eatix-backend/eatixapi.pino7.com.conf /etc/nginx/sites-available/eatixapi.pino7.com
ln -sf /etc/nginx/sites-available/eatixapi.pino7.com /etc/nginx/sites-enabled/
print_success "Nginx configuration copied and linked"

# Step 8: Test Nginx configuration
print_info "Step 8: Testing Nginx configuration..."
nginx -t
if [ $? -eq 0 ]; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Step 9: Reload Nginx
print_info "Step 9: Reloading Nginx..."
systemctl reload nginx
if [ $? -eq 0 ]; then
    print_success "Nginx reloaded successfully"
else
    print_error "Failed to reload Nginx"
    exit 1
fi

# Step 10: Stop any existing PM2 process
print_info "Step 10: Stopping existing PM2 processes..."
pm2 stop eatix-backend 2>/dev/null
pm2 delete eatix-backend 2>/dev/null
print_success "Stopped existing processes"

# Step 11: Start application with PM2
print_info "Step 11: Starting application with PM2..."
cd /var/www/eatix-backend
pm2 start ecosystem.config.js
if [ $? -eq 0 ]; then
    print_success "Application started with PM2"
else
    print_error "Failed to start application"
    exit 1
fi

# Step 12: Save PM2 configuration
print_info "Step 12: Saving PM2 configuration..."
pm2 save
print_success "PM2 configuration saved"

# Step 13: Setup PM2 startup script
print_info "Step 13: Setting up PM2 startup script..."
pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER
print_success "PM2 startup script configured"

# Step 14: Setup SSL with Certbot
print_info "Step 14: Setting up SSL certificate..."
echo ""
echo "To enable SSL for eatixapi.pino7.com, run:"
echo "sudo certbot --nginx -d eatixapi.pino7.com -d www.eatixapi.pino7.com"
echo ""

# Final status
echo ""
echo "=========================================="
print_success "Production setup completed!"
echo "=========================================="
echo ""
echo "API Endpoints:"
echo "  - http://eatixapi.pino7.com"
echo "  - http://www.eatixapi.pino7.com"
echo ""
echo "API Documentation:"
echo "  - http://eatixapi.pino7.com/docs"
echo ""
echo "Next Steps:"
echo "  1. Ensure DNS records point to this server:"
echo "     - A record: eatixapi.pino7.com → Server IP"
echo "     - A record: www.eatixapi.pino7.com → Server IP"
echo ""
echo "  2. Install and setup SSL certificate:"
echo "     sudo apt install certbot python3-certbot-nginx -y"
echo "     sudo certbot --nginx -d eatixapi.pino7.com -d www.eatixapi.pino7.com"
echo ""
echo "  3. Check application status:"
echo "     pm2 status"
echo "     pm2 logs eatix-backend"
echo ""
echo "  4. Monitor logs:"
echo "     pm2 logs eatix-backend --lines 100"
echo ""
echo "=========================================="
