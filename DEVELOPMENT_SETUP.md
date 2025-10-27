# 🚀 Development Setup Guide

## Multi-Tenant Organization Switching Setup

### Prerequisites
- Frontend running on `http://localhost:8080`
- Backend running on `http://127.0.0.1:8000`
- Both organizations have test data

### Method 1: localStorage Organization Switching (Recommended for Testing)

This is the easiest method for testing organization switching:

1. **Open the test page:**
   ```
   http://localhost:8080/test-organization-switching.html
   ```

2. **Switch organizations using the buttons:**
   - Click "Switch to Tejas" to see Tejas organization data
   - Click "Switch to Nathkrupa" to see Nathkrupa organization data
   - Click "Test Tejas API" or "Test Nathkrupa API" to test API calls

3. **Manual switching in browser console:**
   ```javascript
   // Switch to Tejas organization
   localStorage.setItem('dev_organization_id', '1');
   window.location.reload();
   
   // Switch to Nathkrupa organization
   localStorage.setItem('dev_organization_id', '2');
   window.location.reload();
   
   // Check current organization
   console.log('Current org:', localStorage.getItem('dev_organization_id'));
   ```

### Method 2: Subdomain Development (Advanced)

For testing subdomain-based routing:

1. **Update your hosts file** (`C:\Windows\System32\drivers\etc\hosts`):
   ```
   127.0.0.1 tej-org.localhost
   127.0.0.1 nathkrupa.localhost
   ```

2. **Access via subdomains:**
   - Tejas: `http://tej-org.localhost:8080`
   - Nathkrupa: `http://nathkrupa.localhost:8080`

3. **Test organization detection:**
   ```javascript
   // In browser console
   console.log('Detected org:', getOrganizationFromSubdomain());
   ```

### Testing Organization Filtering

1. **Backend Test:**
   ```bash
   cd nathkrupa_mfg
   python manage.py shell -c "
   from shop.models import ProductShop
   from companies.models import Organization
   
   tejas = Organization.objects.get(id=1)
   nathkrupa = Organization.objects.get(id=2)
   
   print('Tejas products:', ProductShop.objects.filter(organization=tejas).count())
   print('Nathkrupa products:', ProductShop.objects.filter(organization=nathkrupa).count())
   "
   ```

2. **Frontend Test:**
   - Open `http://localhost:8080/test-organization-switching.html`
   - Use the test buttons to switch organizations
   - Verify different products are shown for each organization

### Expected Results

**Tejas Organization (ID: 1):**
- Should see: 15 wheel cover, Product Test, TVS Rims, etc. (20 products)
- Should NOT see: Nathkrupa products

**Nathkrupa Organization (ID: 2):**
- Should see: Nathkrupa Premium Rims, Nathkrupa LED Headlights, etc. (5 products)
- Should NOT see: Tejas products

### Troubleshooting

1. **If both organizations show same data:**
   - Check if `localStorage.getItem('dev_organization_id')` is set
   - Verify backend middleware is working
   - Check browser network tab for `X-Organization-ID` header

2. **If API calls fail:**
   - Ensure you're logged in (JWT token in localStorage)
   - Check backend is running on port 8000
   - Verify CORS settings allow localhost:8080

3. **If organization switching doesn't work:**
   - Clear localStorage: `localStorage.clear()`
   - Reload page and try again
   - Check browser console for errors

### API Testing

Test organization filtering via API:

```bash
# Test with Tejas organization
curl -H "X-Organization-ID: 1" -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8000/api/shop/shop-product-list/

# Test with Nathkrupa organization  
curl -H "X-Organization-ID: 2" -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8000/api/shop/shop-product-list/
```

### Development Commands

```bash
# Start backend
cd nathkrupa_mfg
python manage.py runserver 127.0.0.1:8000

# Start frontend (in another terminal)
cd manufacturing-nathkrupa-frontend
npm run dev
# or
yarn dev
```

The frontend should start on `http://localhost:8080` and automatically detect the organization context.
