# Multi-Tenant Frontend Deployment Guide

## Overview
This guide explains how to deploy the multi-tenant frontend with subdomain-based organization access.

## Domain Structure
```
tej-org.nathkrupabody.com     → Tejas test org (ID: 1)
nathkrupa.nathkrupabody.com   → nathkrupa-1 (ID: 2)
admin.nathkrupabody.com       → Superuser access
app.nathkrupabody.com         → Organization selection page
```

## Prerequisites
- Domain: `nathkrupabody.com`
- SSL certificate (wildcard or individual)
- Nginx or similar web server
- Backend API running on `pg.nathkrupabody.com`

## Step 1: DNS Configuration

### A Records
```
nathkrupabody.com           → Your server IP
```

### CNAME Records
```
tej-org.nathkrupabody.com   → nathkrupabody.com
nathkrupa.nathkrupabody.com → nathkrupabody.com
admin.nathkrupabody.com     → nathkrupabody.com
app.nathkrupabody.com       → nathkrupabody.com
```

## Step 2: Nginx Configuration

Create `/etc/nginx/sites-available/nathkrupa-multi-tenant`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name *.nathkrupabody.com nathkrupabody.com;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS configuration
server {
    listen 443 ssl http2;
    server_name *.nathkrupabody.com nathkrupabody.com;
    
    # SSL Configuration
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Root directory
    root /var/www/nathkrupa-frontend/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Serve React app
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://pg.nathkrupabody.com;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header Access-Control-Allow-Origin $http_origin always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
        add_header Access-Control-Allow-Credentials true always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin $http_origin;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With";
            add_header Access-Control-Allow-Credentials true;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

## Step 3: Enable Site

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/nathkrupa-multi-tenant /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 4: Frontend Build Configuration

### Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
})
```

### Update `.env.production`:

```env
VITE_API_ROOT=https://pg.nathkrupabody.com
VITE_APP_TITLE=Nathkrupa ERP
VITE_APP_VERSION=1.0.0
```

## Step 5: Build and Deploy

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Copy to server
scp -r dist/* user@your-server:/var/www/nathkrupa-frontend/dist/

# Set permissions
sudo chown -R www-data:www-data /var/www/nathkrupa-frontend/
sudo chmod -R 755 /var/www/nathkrupa-frontend/
```

## Step 6: Backend CORS Configuration

Update your Django settings to allow the subdomains:

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "https://nathkrupabody.com",
    "https://tej-org.nathkrupabody.com",
    "https://nathkrupa.nathkrupabody.com",
    "https://admin.nathkrupabody.com",
    "https://app.nathkrupabody.com",
]

CORS_ALLOW_CREDENTIALS = True
```

## Step 7: SSL Certificate

### Option 1: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get wildcard certificate
sudo certbot certonly --manual --preferred-challenges dns -d "*.nathkrupabody.com" -d "nathkrupabody.com"

# Update Nginx config with certificate paths
# /etc/letsencrypt/live/nathkrupabody.com/fullchain.pem
# /etc/letsencrypt/live/nathkrupabody.com/privkey.pem
```

### Option 2: Commercial Certificate

Upload your wildcard certificate files and update the Nginx configuration with the correct paths.

## Step 8: Testing

### Test URLs:
- `https://tej-org.nathkrupabody.com` - Should show Tejas organization
- `https://nathkrupa.nathkrupabody.com` - Should show Nathkrupa organization
- `https://admin.nathkrupabody.com` - Should show admin panel
- `https://app.nathkrupabody.com` - Should show organization selection

### Test Features:
1. Organization detection from subdomain
2. Organization switching
3. API calls with organization context
4. Branding changes per organization
5. User authentication and authorization

## Step 9: Monitoring

### Log Files:
```bash
# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Application logs (if using PM2)
pm2 logs nathkrupa-frontend
```

### Health Checks:
```bash
# Check if site is responding
curl -I https://tej-org.nathkrupabody.com

# Check API connectivity
curl -I https://tej-org.nathkrupabody.com/api/manufacturing/customers/
```

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Check backend CORS configuration
2. **SSL Issues**: Verify certificate installation
3. **DNS Issues**: Check DNS propagation with `dig` or `nslookup`
4. **Nginx Errors**: Check configuration with `sudo nginx -t`

### Debug Commands:

```bash
# Check DNS resolution
nslookup tej-org.nathkrupabody.com

# Check SSL certificate
openssl s_client -connect tej-org.nathkrupabody.com:443

# Check Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx
```

## Security Considerations

1. **HTTPS Only**: All traffic should be encrypted
2. **Security Headers**: Implement proper security headers
3. **Rate Limiting**: Consider implementing rate limiting
4. **Access Logs**: Monitor access logs for suspicious activity
5. **Regular Updates**: Keep Nginx and certificates updated

## Backup Strategy

1. **Configuration Backup**: Backup Nginx configuration
2. **SSL Certificate Backup**: Backup SSL certificates
3. **Application Backup**: Regular backups of the application files
4. **Database Backup**: Ensure backend database is backed up

## Scaling Considerations

1. **Load Balancing**: Consider load balancer for multiple servers
2. **CDN**: Use CDN for static assets
3. **Caching**: Implement Redis for session caching
4. **Monitoring**: Set up comprehensive monitoring and alerting

This deployment guide provides a complete setup for multi-tenant frontend access with subdomain-based organization routing.
