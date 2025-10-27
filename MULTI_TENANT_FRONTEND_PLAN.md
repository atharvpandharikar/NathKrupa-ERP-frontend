# Multi-Tenant Frontend Implementation Plan

## Overview
This document outlines the implementation plan for multi-tenant frontend access for the Nathkrupa Body Builder ERP system.

## Current State Analysis

### ✅ Already Implemented
- Organization context in AuthContext
- Organization selection in login response
- Organization ID storage in localStorage
- API structure supports organization filtering

### 🔧 Needs Implementation
- Subdomain-based routing
- Organization context detection from URL
- Organization switching mechanism
- Multi-tenant branding
- Organization-specific configurations

## Recommended Approach: Subdomain-based Multi-tenancy

### Domain Structure
```
tej-org.nathkrupabody.com     → Tejas test org (ID: 1)
nathkrupa.nathkrupabody.com   → nathkrupa-1 (ID: 2)
admin.nathkrupabody.com       → Superuser access
app.nathkrupabody.com         → Organization selection page
```

### Benefits
1. **Professional**: Each organization gets their own subdomain
2. **Scalable**: Easy to add new organizations
3. **SEO Friendly**: Each organization can have their own branding
4. **Security**: Clear separation between organizations
5. **User Experience**: Users remember their organization URL

## Implementation Plan

### Phase 1: Backend API Updates
- [x] Multi-tenancy middleware implemented
- [x] Organization-based data filtering
- [x] Organization management commands

### Phase 2: Frontend Core Updates

#### 2.1 Organization Context Detection
```typescript
// New utility: src/lib/organization.ts
export const getOrganizationFromSubdomain = (): OrganizationInfo | null => {
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];
  
  const orgMap = {
    'tej-org': { id: 1, name: 'Tejas test org', slug: 'tej-org' },
    'nathkrupa': { id: 2, name: 'nathkrupa-1', slug: 'nathkrupa' },
    'admin': { id: null, name: 'Admin', slug: 'admin' }
  };
  
  return orgMap[subdomain] || null;
};
```

#### 2.2 Enhanced AuthContext
```typescript
// Update src/context/AuthContext.tsx
interface AuthContextProps {
  // ... existing props
  currentOrganization: OrganizationInfo | null;
  switchOrganization: (orgId: number) => void;
  isSuperuser: boolean;
}
```

#### 2.3 Organization Router
```typescript
// New component: src/components/OrganizationRouter.tsx
export const OrganizationRouter = () => {
  const organization = getOrganizationFromSubdomain();
  
  if (!organization) {
    return <OrganizationSelectionPage />;
  }
  
  if (organization.slug === 'admin') {
    return <AdminApp />;
  }
  
  return <TenantApp organization={organization} />;
};
```

### Phase 3: UI/UX Updates

#### 3.1 Organization Header
```typescript
// New component: src/components/layout/OrganizationHeader.tsx
export const OrganizationHeader = () => {
  const { currentOrganization, switchOrganization } = useAuth();
  
  return (
    <div className="organization-header">
      <div className="org-info">
        <h2>{currentOrganization?.name}</h2>
        <span className="org-slug">{currentOrganization?.slug}</span>
      </div>
      <OrganizationSwitcher onSwitch={switchOrganization} />
    </div>
  );
};
```

#### 3.2 Organization Switcher
```typescript
// New component: src/components/OrganizationSwitcher.tsx
export const OrganizationSwitcher = ({ onSwitch }: { onSwitch: (id: number) => void }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  
  const handleSwitch = (orgId: number) => {
    // Redirect to new subdomain
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      window.location.href = `https://${org.slug}.nathkrupabody.com`;
    }
  };
  
  return (
    <Select onValueChange={handleSwitch}>
      {organizations.map(org => (
        <SelectItem key={org.id} value={org.id.toString()}>
          {org.name}
        </SelectItem>
      ))}
    </Select>
  );
};
```

### Phase 4: Configuration Updates

#### 4.1 Environment Configuration
```typescript
// Update src/lib/api.ts
const getApiRoot = () => {
  const hostname = window.location.hostname;
  
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'http://127.0.0.1:8000';
  }
  
  // Production API root
  return 'https://pg.nathkrupabody.com';
};
```

#### 4.2 Organization-specific Branding
```typescript
// New utility: src/lib/branding.ts
export const getOrganizationBranding = (orgId: number) => {
  const branding = {
    1: { // Tejas test org
      name: 'Tejas Body Builder',
      logo: '/logos/tej-org-logo.png',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF'
    },
    2: { // nathkrupa-1
      name: 'Nathkrupa Body Builder',
      logo: '/logos/nathkrupa-logo.png',
      primaryColor: '#059669',
      secondaryColor: '#047857'
    }
  };
  
  return branding[orgId] || branding[1]; // Default to Tejas
};
```

### Phase 5: Deployment Configuration

#### 5.1 Nginx Configuration
```nginx
# /etc/nginx/sites-available/nathkrupa-multi-tenant
server {
    listen 80;
    server_name *.nathkrupabody.com nathkrupabody.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name *.nathkrupabody.com nathkrupabody.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Serve React app
    location / {
        root /var/www/nathkrupa-frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 5.2 DNS Configuration
```
A    nathkrupabody.com           → Server IP
CNAME tej-org.nathkrupabody.com  → nathkrupabody.com
CNAME nathkrupa.nathkrupabody.com → nathkrupabody.com
CNAME admin.nathkrupabody.com    → nathkrupabody.com
CNAME app.nathkrupabody.com      → nathkrupabody.com
```

### Phase 6: Migration Strategy

#### 6.1 Gradual Migration
1. **Week 1**: Implement subdomain detection and organization context
2. **Week 2**: Add organization switching UI
3. **Week 3**: Implement organization-specific branding
4. **Week 4**: Deploy and test with DNS configuration

#### 6.2 Backward Compatibility
- Keep current single-domain access working
- Add organization selection page for users without subdomain
- Redirect old URLs to appropriate subdomains

## Implementation Steps

### Step 1: Create Organization Utilities
```bash
# Create new files
touch src/lib/organization.ts
touch src/lib/branding.ts
touch src/components/OrganizationRouter.tsx
touch src/components/OrganizationSwitcher.tsx
touch src/components/layout/OrganizationHeader.tsx
```

### Step 2: Update AuthContext
- Add organization detection from subdomain
- Add organization switching functionality
- Add superuser detection

### Step 3: Update API Configuration
- Dynamic API root based on environment
- Organization context in API requests
- Error handling for organization access

### Step 4: Update Routing
- Add organization-based routing
- Handle subdomain changes
- Add organization selection page

### Step 5: Update UI Components
- Add organization header to all pages
- Update branding based on organization
- Add organization switcher

### Step 6: Testing
- Test subdomain detection
- Test organization switching
- Test API calls with organization context
- Test branding changes

## Security Considerations

1. **CORS Configuration**: Update backend CORS to allow subdomains
2. **JWT Validation**: Ensure JWT tokens are valid for the organization
3. **Organization Access**: Prevent users from accessing other organizations' data
4. **Subdomain Validation**: Validate subdomain against user's organizations

## Benefits of This Approach

1. **Professional**: Each organization gets their own branded subdomain
2. **Scalable**: Easy to add new organizations
3. **User-Friendly**: Users remember their organization URL
4. **SEO**: Each organization can have their own search presence
5. **Security**: Clear separation between organizations
6. **Branding**: Each organization can have their own look and feel

## Alternative Approaches

### Path-based Multi-tenancy
- `nathkrupabody.com/tej-org/`
- `nathkrupabody.com/nathkrupa/`
- Simpler to implement but less professional

### Organization Selection Only
- Keep current approach
- Add organization switching in UI
- Simpler but less scalable

## Conclusion

The subdomain-based approach provides the most professional and scalable solution for multi-tenant frontend access. It allows each organization to have their own branded experience while maintaining security and scalability.
