# Organization Field Not Saved in Products - FIXED

## Problem
When creating products from:
1. `http://localhost:8080/user-admin/products/add`
2. `http://localhost:8080/purchase/bills/new` (Add Product form)

The organization field was not being saved, causing newly added products to not appear in the respective organization's product list.

## Root Causes

### 1. Backend: Duplicate `create()` Method in Serializer
**File**: `nathkrupa-bodybuilder-erp/nathkrupa_mfg/shop/serializers.py`

The `ProductShopCreateSerializer` had TWO `create()` methods:
- First method (line 398-427): Properly handled organization assignment
- Second method (line 472-480): **Overrode the first method** and didn't handle organization

**Fix**: Removed the duplicate `create()` method at lines 472-480, keeping only the first one that properly assigns organization.

```python
# REMOVED DUPLICATE (was at line 472-480):
def create(self, validated_data):
    # Handle the typo'd field name - map llead_time to lead_time
    if 'llead_time' in validated_data and 'lead_time' not in validated_data:
        validated_data['lead_time'] = validated_data.pop('llead_time')
    elif 'llead_time' in validated_data:
        validated_data.pop('llead_time')
    
    return super().create(validated_data)
```

The correct `create()` method (lines 398-427) now properly:
1. Gets organization from `get_current_organization()` (middleware)
2. Falls back to validated_data if not in context
3. Logs organization assignment for debugging

### 2. Frontend: Missing Organization Header
**File**: `manufacturing-nathkrupa-frontend/src/components/AddProductForm.tsx`

The `AddProductForm` component was using manual `fetch()` calls that only included the `Authorization` header but **NOT** the `X-Organization-ID` header.

**Fix**: Updated to use `authHeaders()` function from `shop-api.ts`:

```typescript
// BEFORE (lines 1218-1222):
const tokens = getTokens();
const headers: Record<string, string> = {};
if (tokens?.access) {
    headers['Authorization'] = `Bearer ${tokens.access}`;
}

// AFTER:
// Use authHeaders() to include both Authorization and X-Organization-ID
const headers = authHeaders();
```

Applied this fix in two places:
1. `createProduct()` function (line 1219)
2. `uploadProductImages()` function (line 1316)

## How Organization Context Works

### Frontend → Backend Flow:
1. **Frontend** (`shop-api.ts`):
   - `authHeaders()` gets organization ID from:
     - `tokens.activeOrganizationId`
     - `localStorage.getItem('nk:activeOrganizationId')`
     - `localStorage.getItem('dev_organization_id')`
   - Sends as `X-Organization-ID` header

2. **Backend Middleware** (`multi_tenant.py`):
   - Reads `HTTP_X_ORGANIZATION_ID` from request headers
   - Stores in thread-local storage
   - Validates user has access to the organization

3. **Backend Serializer** (`serializers.py`):
   - Calls `get_current_organization()` to get from thread-local
   - Assigns to product's organization field

## Verification

### Check Organization is Set:
1. **Frontend**: Look for console logs:
   ```
   🏢 Sending organization header: <org_id>
   ```

2. **Backend**: Look for logs in product creation:
   ```
   ✅ Organization from context: <Organization object>
   ```

3. **Database**: Query products and verify organization_id is set:
   ```python
   from shop.models import ProductShop
   products = ProductShop.objects.all().values('product_id', 'title', 'organization_id')
   print(list(products))
   ```

### Test Cases:
- [x] Create product from `/user-admin/products/add` → Organization is saved
- [x] Create product from `/purchase/bills/new` (Add Product button) → Organization is saved
- [x] Products appear in correct organization's product list
- [x] Multi-org users can create products for their active organization

## Files Modified

### Backend:
- `nathkrupa-bodybuilder-erp/nathkrupa_mfg/shop/serializers.py`
  - Removed duplicate `create()` method

### Frontend:
- `manufacturing-nathkrupa-frontend/src/components/AddProductForm.tsx`
  - Added `authHeaders` import from `shop-api.ts`
  - Updated `createProduct()` to use `authHeaders()`
  - Updated `uploadProductImages()` to use `authHeaders()`

## Notes

- `AddProduct.tsx` page was already handling organization correctly (lines 802-809 and 872)
- The middleware properly checks for `X-Organization-ID` header
- The fix ensures organization context is properly passed from frontend to backend
- All products created after this fix will have proper organization assignment

## Related Files
- Frontend API: `src/lib/shop-api.ts` - Contains `authHeaders()` function
- Middleware: `middleware/multi_tenant.py` - Handles organization context
- Backend Views: `shop/views.py` - ProductShopViewSet
- Backend Models: `shop/models.py` - ProductShop model

