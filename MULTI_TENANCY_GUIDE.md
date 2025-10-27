# Multi-Tenancy Implementation Guide

## 🎯 Overview

Your application now supports **multi-tenancy** with organization-based data isolation. Each organization has its own separate data, and users can only access data from their assigned organization.

## 🔧 Configuration

### Backend (Django)
- **Port**: 8000
- **URL**: `http://127.0.0.1:8000`
- **Database**: SQLite (local) / PostgreSQL (production)

### Frontend (React + Vite)
- **Port**: 8080
- **URL**: `http://localhost:8080`
- **API Root**: `http://127.0.0.1:8000` (local) / `https://pg.nathkrupabody.com` (production)

## 🚀 How to Use Multi-Tenancy

### 1. Local Development Access

#### Option A: Query Parameter Method (Recommended for Local)
```
http://localhost:8080/?org=tej-org        # Tejas test org
http://localhost:8080/?org=nathkrupa      # Nathkrupa-1
http://localhost:8080/?org=admin          # Admin mode (superuser only)
```

#### Option B: Subdomain Method (Production)
```
tej-org.nathkrupabody.com        # Tejas test org
nathkrupa.nathkrupabody.com      # Nathkrupa-1
admin.nathkrupabody.com          # Admin mode
```

### 2. Login Flow

1. **Go to Login Page**: `http://localhost:8080/login`
2. **Enter Credentials**:
   - Email/Username
   - Password
3. **Select Organization** (if you have multiple):
   - After login, you'll see an organization selection screen
   - Click on the organization you want to access
4. **Access Dashboard**:
   - You'll be redirected to your organization's dashboard
   - All data will be filtered by your organization

### 3. Switching Organizations

If you have access to multiple organizations:

1. **Using Organization Header**:
   - Look for the organization dropdown in the navbar (top-right)
   - Click on it to see available organizations
   - Select a different organization to switch

2. **Using App Selection**:
   - Go to `/app-selection`
   - Choose a different organization

## 🏗️ Technical Architecture

### Backend Multi-Tenancy

#### 1. Middleware (`middleware/multi_tenant.py`)
- Automatically sets organization context for each request
- Isolates data based on authenticated user's organization
- Provides helper functions for organization-based queries

#### 2. Models
All business models include an `organization` field:
```python
class Customer(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    # ... other fields
```

#### 3. ViewSets
All API viewsets use `MultiTenantMixin`:
```python
class CustomerViewSet(MultiTenantMixin, viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
```

#### 4. Data Migration
- All existing data has been assigned to "Tejas test org" (ID: 1)
- Run `python manage.py migrate` to apply the migration

### Frontend Multi-Tenancy

#### 1. Organization Router (`src/components/OrganizationRouter.tsx`)
- Handles organization context at the app level
- Validates user access to organizations
- Applies organization-specific branding
- Redirects to organization selection if needed

#### 2. Organization Utilities (`src/lib/organization.ts`)
- Detects organization from subdomain or query parameter
- Provides functions for switching organizations
- Manages organization-specific branding

#### 3. Auth Context (`src/context/AuthContext.tsx`)
- Stores active organization ID
- Manages user's organizations list
- Provides organization switching functionality

## 🔐 Security

### Access Control
- Users can only access data from their assigned organization
- Superusers can access all organizations
- Organization validation happens on both frontend and backend

### API Authentication
- All API endpoints require authentication
- JWT tokens are used for authentication
- Organization context is derived from the authenticated user

## 📊 Testing Multi-Tenancy

### Test Page
Open `http://localhost:8080/test-multi-tenancy.html` to test:
- Organization detection
- Organization switching
- API connectivity
- Local storage

### API Tests

1. **List Organizations** (requires login):
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8000/api/companies/organizations/
```

2. **Test Data Isolation**:
```bash
# Login as user from org1
# Fetch customers - you'll only see org1's customers

# Login as user from org2
# Fetch customers - you'll only see org2's customers
```

## 🐛 Troubleshooting

### Issue: Blank Page on Organization Access
**Solution**: Make sure you're logged in first. The organizations API requires authentication.

### Issue: "Access Denied" Error
**Solution**: Your user account is not associated with the organization you're trying to access.

### Issue: Import Errors
**Solution**: Make sure all imports use named exports:
```typescript
import { OrganizationRouter } from "./components/OrganizationRouter";
```

### Issue: API Returns 401 Unauthorized
**Solution**: You need to login first. The organizations API is protected.

## 🎨 Organization Branding

Each organization can have its own:
- Logo
- Primary color
- Secondary color
- Favicon
- Theme

Branding is configured in `src/lib/branding.ts` and automatically applied based on the active organization.

## 📝 Creating New Organizations

### Via Django Admin
1. Go to `http://127.0.0.1:8000/admin`
2. Login as superuser
3. Navigate to "Organizations"
4. Click "Add Organization"
5. Fill in details and save

### Via Management Command
```bash
python manage.py organization_utils create --name "New Org Name" --address "Optional Address"
```

### Assign User to Organization
```bash
python manage.py organization_utils assign_user --username "user@example.com" --organization-id 1
```

## 🔄 Switching Between Organizations (For Developers)

### Local Development
Use query parameters:
```javascript
// Set organization in localStorage
localStorage.setItem('dev_organization_id', '1');  // Tejas test org
localStorage.setItem('dev_organization_id', '2');  // Nathkrupa-1

// Then reload the page
window.location.reload();
```

### Production
Use subdomains (configured in DNS):
- `tej-org.nathkrupabody.com` → Organization ID 1
- `nathkrupa.nathkrupabody.com` → Organization ID 2

## 📚 API Endpoints

### Organizations
- `GET /api/companies/organizations/` - List user's organizations (requires auth)
- `POST /api/companies/organizations/` - Create new organization (superuser)
- `GET /api/companies/organizations/:id/` - Get organization details (requires auth)
- `POST /api/companies/organizations/:id/select_organization/` - Select active organization

### All Business Endpoints
All business API endpoints automatically filter data by organization:
- `/api/manufacturing/customers/` - Only shows current organization's customers
- `/api/manufacturing/quotations/` - Only shows current organization's quotations
- `/api/shop/products/` - Only shows current organization's products
- And so on...

## 🎯 Summary

✅ **Backend**: Multi-tenancy middleware isolates data by organization  
✅ **Frontend**: Organization router handles organization context  
✅ **API**: All endpoints require authentication and filter by organization  
✅ **Testing**: Test page available for development  
✅ **Branding**: Organization-specific themes supported  
✅ **Migration**: Existing data assigned to default organization  

**Next Steps**:
1. Start backend: `python manage.py runserver 8000`
2. Start frontend: `npm run dev` (port 8080)
3. Login to the application
4. Select your organization
5. Start working with organization-isolated data!

