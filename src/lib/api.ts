// API helper with JWT auth and auto-refresh
// Auto-detect environment and use appropriate API URLs

const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

export const API_ROOT = (import.meta as any).env?.VITE_API_ROOT || (
  isProduction
    ? "https://pg.nathkrupabody.com"  // Production API endpoint
    : "http://127.0.0.1:8000"
);

const MANUFACTURING_BASE = ((import.meta as any).env?.VITE_API_BASE as string) || `${API_ROOT}/api/manufacturing`;
// Align with Django URLs mounted under /api/auth/
const AUTH_BASE = `${API_ROOT}/api/auth`;
// Shop API base for admin pages
const SHOP_BASE = `${API_ROOT}/api/shop`;
// Inventory API base (inventory is under shop/)
const INVENTORY_BASE = `${API_ROOT}/api/shop/inventory`;
// Finance API base
const FINANCE_BASE = `${API_ROOT}/api/finance`;
// Purchase API base
const PURCHASE_BASE = `${API_ROOT}/api/purchase`;
type Tokens = { access: string; refresh: string };

const TOKEN_KEY = "nk:tokens";

export function getTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    const tokens = raw ? (JSON.parse(raw) as Tokens) : null;
    return tokens;
  } catch {
    return null;
  }
}

export function setTokens(tokens: Tokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const t = getTokens();
  const headers: Record<string, string> = {};

  if (t?.access) {
    headers['Authorization'] = `Bearer ${t.access}`;
  }

  return headers;
}

function toHeaders(init?: HeadersInit): Headers {
  const out = new Headers();
  if (!init) return out;
  if (init instanceof Headers) {
    init.forEach((v, k) => out.append(k, v));
  } else if (Array.isArray(init)) {
    init.forEach(([k, v]) => out.append(k, v));
  } else {
    Object.entries(init).forEach(([k, v]) => out.append(k, v));
  }
  return out;
}

function mergeHeaders(...parts: Array<HeadersInit | undefined>): Headers {
  const merged = new Headers();
  for (const p of parts) {
    const h = toHeaders(p);
    h.forEach((v, k) => merged.set(k, v));
  }
  return merged;
}

async function refreshAccessToken(): Promise<string | null> {
  const t = getTokens();
  if (!t?.refresh) return null;
  const res = await fetch(`${AUTH_BASE}/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: t.refresh }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access: string };
  const newTokens = { access: data.access, refresh: t.refresh };
  setTokens(newTokens);
  return data.access;
}

async function request<T>(base: string, path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const baseHeaderInit = options.body instanceof FormData ? undefined : { "Content-Type": "application/json" };
  const headers = mergeHeaders(baseHeaderInit, authHeaders(), options.headers);
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers,
    // We authenticate with JWT Bearer tokens; no cookies are needed.
    // Using credentials: "include" triggers stricter CORS requirements
    // (Access-Control-Allow-Credentials + exact Origin) which can block
    // cross-origin requests from the S3 website endpoint. Omit credentials
    // to simplify CORS and allow Authorization header only.
    credentials: "omit",
  });
  if (res.status === 401 && retry) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      return request<T>(base, path, options, false);
    } else {
      clearTokens();
      // Simple redirect to login page
      window.location.href = '/login';
      const text = await res.text();
      throw new Error(text || "Unauthorized");
    }
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.status === 204 ? (undefined as unknown as T) : res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(MANUFACTURING_BASE, path),
  post: <T>(path: string, body: unknown) => request<T>(MANUFACTURING_BASE, path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(MANUFACTURING_BASE, path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(MANUFACTURING_BASE, path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(MANUFACTURING_BASE, path, { method: "DELETE" }),
  postForm: <T>(path: string, form: FormData) => request<T>(MANUFACTURING_BASE, path, { method: "POST", body: form }),
};

export const shopApi = {
  get: <T>(path: string) => request<T>(SHOP_BASE, path),
  post: <T>(path: string, body: unknown) => request<T>(SHOP_BASE, path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(SHOP_BASE, path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(SHOP_BASE, path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(SHOP_BASE, path, { method: "DELETE" }),
  postForm: <T>(path: string, form: FormData) => request<T>(SHOP_BASE, path, { method: "POST", body: form }),
};

export const inventoryApi = {
  get: <T>(path: string) => request<T>(INVENTORY_BASE, path),
  post: <T>(path: string, body: unknown) => request<T>(INVENTORY_BASE, path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(INVENTORY_BASE, path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(INVENTORY_BASE, path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(INVENTORY_BASE, path, { method: "DELETE" }),
  postForm: <T>(path: string, form: FormData) => request<T>(INVENTORY_BASE, path, { method: "POST", body: form }),
};

export const financeApi = {
  get: <T>(path: string) => request<T>(FINANCE_BASE, path),
  post: <T>(path: string, body: unknown) => request<T>(FINANCE_BASE, path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(FINANCE_BASE, path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(FINANCE_BASE, path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(FINANCE_BASE, path, { method: "DELETE" }),
  postForm: <T>(path: string, form: FormData) => request<T>(FINANCE_BASE, path, { method: "POST", body: form }),

  // Create a finance transaction for manufacturing payment
  createManufacturingPayment: async (payment: {
    bill_number: string;
    customer_name: string;
    amount: string;
    payment_type: string;
    notes?: string;
    payment_date?: string;
    payment_method?: string;
    reference_number?: string;
  }) => {
    const tokens = getTokens();
    const response = await fetch(`${FINANCE_BASE}/transactions/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {}),
      },
      body: JSON.stringify({
        transaction_type: 'Credit',
        amount: payment.amount,
        from_party: payment.customer_name,
        to_party: 'Nathkrupa Body Builder',
        purpose: `Payment received for bill ${payment.bill_number} - ${payment.payment_type}`,
        bill_no: payment.bill_number,
        utr_number: payment.reference_number || '',
        time: payment.payment_date || new Date().toISOString(),
        notes: payment.notes || '',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    return response.json();
  },

  // Create transaction with image upload
  createTransactionWithImage: async (transactionData: any, imageFile?: File) => {
    const tokens = getTokens();

    if (imageFile) {
      // Use FormData for file upload
      const formData = new FormData();
      formData.append('account', transactionData.account);
      formData.append('transaction_type', transactionData.transaction_type);
      formData.append('amount', transactionData.amount);
      formData.append('from_party', transactionData.from_party);
      formData.append('to_party', transactionData.to_party);
      if (transactionData.vendor) {
        formData.append('vendor', transactionData.vendor);
      }
      formData.append('purpose', transactionData.purpose);
      formData.append('bill_no', transactionData.bill_no);
      formData.append('utr_number', transactionData.utr_number);
      formData.append('time', transactionData.time);
      formData.append('notes', transactionData.notes);
      formData.append('image', imageFile);

      const response = await fetch(`${FINANCE_BASE}/transactions/`, {
        method: 'POST',
        headers: {
          ...(tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      return response.json();
    } else {
      // Use JSON for regular transaction
      const response = await fetch(`${FINANCE_BASE}/transactions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {}),
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      return response.json();
    }
  },
};

export const purchaseApiBase = {
  get: <T>(path: string) => request<T>(PURCHASE_BASE, path),
  post: <T>(path: string, body: unknown) => request<T>(PURCHASE_BASE, path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(PURCHASE_BASE, path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(PURCHASE_BASE, path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(PURCHASE_BASE, path, { method: "DELETE" }),
  postForm: <T>(path: string, form: FormData) => request<T>(PURCHASE_BASE, path, { method: "POST", body: form }),
};

export const authApi = {
  async login(email: string, password: string, device_id_hash?: string): Promise<Tokens> {
    const res = await fetch(`${AUTH_BASE}/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, device_id_hash }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const data = (await res.json()) as { tokens: Tokens };
    const tokens = data.tokens;
    setTokens(tokens);
    return tokens;
  },
  async logout() {
    clearTokens();
  },
};

export type Paginated<T> = { results: T[] };

// Types
// Work Order type
export type WorkOrder = {
  id: number;
  work_order_number: string;
  quotation: QuotationData;
  work_order?: {
    quotation: QuotationData;
  };
  status: 'scheduled' | 'in_progress' | 'painting' | 'workdone' | 'completed' | 'delivered' | 'cancelled';
  work_order_date: string;
  appointment_date: string;
  estimated_completion_days: number;
  expected_delivery_date: string;
  actual_delivery_date?: string;
  quoted_price: number;
  total_added_features_cost: number;
  total_payments: number;
  remaining_balance: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  // Additional fields for work order to bill conversion
  has_bill?: boolean;
  bill_number?: string;
  added_features?: any[];
  payments?: any[];
  job_notes?: any[];
};

// Bill returned by backend includes nested quotation with customer/vehicle info.
export type Bill = {
  id: number;
  bill_number: string;
  is_test: boolean;
  status: 'scheduled' | 'in_progress' | 'painting' | 'workdone' | 'completed' | 'delivered' | 'cancelled';
  bill_date: string;
  appointment_date: string;
  estimated_completion_days: number;
  expected_delivery_date: string;
  actual_delivery_date?: string;
  quoted_price: number;
  booking_amount?: number;
  total_added_features_cost: number;
  total_payments: number;
  remaining_balance: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  quotation: {
    id: number;
    quotation_number: string;
    customer: { id: number; name: string; phone_number: string; email?: string | null };
    vehicle_maker: { id: number; name: string };
    vehicle_model: { id: number; name: string };
    vehicle_number?: string | null;
    suggested_total: string | number;
    final_total: string | number;
    total_discount_amount?: number;
    discounted_total?: number;
    features?: Array<{
      id: number;
      custom_name?: string | null;
      feature_type?: { name: string } | null;
      quantity?: number;
      unit_price?: number;
      total_price?: number;
    }>;
  } | null;
  work_order?: {
    id: number;
    work_order_number: string;
    quotation: {
      id: number;
      quotation_number: string;
      customer: { id: number; name: string; phone_number: string; email?: string | null };
      vehicle_maker: { id: number; name: string };
      vehicle_model: { id: number; name: string };
      vehicle_number?: string | null;
      suggested_total: string | number;
      final_total: string | number;
      total_discount_amount?: number;
      discounted_total?: number;
      features?: Array<{
        id: number;
        custom_name?: string | null;
        feature_type?: { name: string } | null;
        quantity?: number;
        unit_price?: number;
        total_price?: number;
      }>;
    } | null;
  } | null;
  vehicle_intake?: VehicleIntake; // Optional embedded intake (if backend returns)
  added_features?: AddedFeature[];
};

export type VehicleIntake = {
  id: number;
  work_order_id: number;
  recorded_by?: { id: number; username: string };
  recorded_at: string;
  stepney_present: boolean; jack_present: boolean; jack_handle_present: boolean; tool_kit_present: boolean; rope_present: boolean; tarpaulin_present: boolean; battery_present: boolean; music_system_present: boolean; documents_all_present: boolean;
  fuel_level?: string | null; odometer_reading?: number | null;
  exterior_notes?: string | null; interior_notes?: string | null; other_notes?: string | null;
  images?: VehicleIntakeImage[];
};

export type VehicleIntakeImage = { id: number; image: string; description?: string | null; uploaded_at: string; intake?: number };

export type FinanceSummary = {
  base_amount?: number; // future field
  added_features_total: number;
  gross_total: number;
  payments: Record<string, number> & {
    booking?: number; partial?: number; drop_off?: number; final?: number; other?: number;
  };
  total_paid: number;
  balance_due: number;
  overpayment?: number;
};

export type ScheduleDay = { date: string; load: number; capacity: number; available: boolean };

export type QuotationDiscount = {
  id: number;
  mode: 'amount' | 'percent';
  value: number;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  created_by: { id: number; username: string };
  approved_at?: string | null;
  approved_by?: { id: number; username: string } | null;
};

export type FeatureType = {
  id: number;
  name: string;
  description?: string | null;
  category?: { id: number; name: string };
};

export type FeatureCategory = { id: number; name: string; description?: string | null };
export type FeaturePrice = { id: number; vehicle_model: number; feature_category: FeatureCategory; feature_type?: FeatureType | null; price: number };

export type ManufacturingLoad = {
  total_active_jobs: number;
  total_estimated_days: number;
  average_job_duration: number;
  max_daily_capacity: number;
  upcoming_availability: Array<{
    date: string;
    load_count: number;
    availability: number;
    is_full: boolean;
    jobs: Array<{
      bill_number: string;
      customer_name: string;
      vehicle_model: string;
      status: string;
      estimated_days: number;
      start_date: string;
      end_date: string;
    }>;
  }>;
  next_available_slots: {
    [key: string]: {
      start_date: string | null;
      end_date: string | null;
      days_from_now: number | null;
      message?: string;
    };
  };
  load_summary: {
    high_load_days: number;
    available_days: number;
    fully_booked_days: number;
  };
};

// Payment type removed - all payments now handled through finance app

export type AddedFeature = {
  id: number;
  work_order?: number | null;
  bill?: number | null;
  feature_name: string;
  description?: string | null;
  cost: number;
  added_by: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  added_at: string;
  notes?: string | null;
};

// Customer type
export type Customer = {
  id: number;
  name: string;
  phone_number: string;
  whatsapp_number?: string | null;
  email?: string | null;
  address?: string | null;
  org_id?: string | null;
  gst_id?: string | null;
  addresses?: CustomerAddress[];
  created_at: string;
  updated_at?: string;
};

export type CustomerAddress = {
  id: number;
  customer: number;
  label?: string | null;
  line1: string;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export const customersApi = {
  // List customers; when search provided uses DRF SearchFilter (?search=term)
  list: (search?: string) => api.get<Paginated<Customer> | Customer[]>(`/customers/${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  create: (payload: { name: string; phone_number: string; whatsapp_number?: string; email?: string; address?: string }) => api.post<Customer>('/customers/', payload),
  update: (id: number, payload: Partial<{ name: string; phone_number: string; whatsapp_number?: string | null; email?: string | null; address?: string | null; org_id?: string | null; gst_id?: string | null }>) => api.patch<Customer>(`/customers/${id}/`, payload),
  get: (id: number) => api.get<Customer>(`/customers/${id}/`),
  searchByPhone: (phone: string) => api.get<Customer[]>(`/customers/search_by_phone/?phone=${encodeURIComponent(phone)}`),
  vehicles: (id: number) => api.get<{ count: number; vehicles: Array<{ vehicle_maker: { id: number; name: string }; vehicle_model: { id: number; name: string }; vehicle_number?: string | null; quotation_id: number; quotation_number: string }>; }>(`/customers/${id}/vehicles/`),
};

export const customerAddressesApi = {
  list: (customer: number) => api.get<CustomerAddress[]>(`/customer-addresses/?customer=${customer}`),
  create: (payload: { customer: number; label?: string; line1: string; line2?: string; city?: string; state?: string; pincode?: string; is_primary?: boolean }) => api.post<CustomerAddress>('/customer-addresses/', payload),
  update: (id: number, payload: Partial<{ label: string; line1: string; line2: string; city: string; state: string; pincode: string; is_primary: boolean }>) => api.patch<CustomerAddress>(`/customer-addresses/${id}/`, payload),
  delete: (id: number) => api.del<void>(`/customer-addresses/${id}/`),
};

export const quotationApi = {
  list: () => api.get<Paginated<QuotationData> | QuotationData[]>('/quotations/'),
  getById: (id: number) => api.get<QuotationData>(`/quotations/${id}/`),
  searchByNumber: (query: string) => api.get<Paginated<QuotationData>>(`/quotations/?search=${encodeURIComponent(query)}`),
  listDiscounts: (qid: number) => api.get<{ items: QuotationDiscount[]; base_total: number; total_discount: number; discounted_total: number }>(`/quotations/${qid}/discounts/`),
  addDiscount: (qid: number, payload: { mode: 'amount' | 'percent'; value: number; note?: string }) => api.post(`/quotations/${qid}/discounts/`, payload),
  approveDiscount: (qid: number, did: number) => api.post(`/quotations/${qid}/discounts/${did}/approve/`, {}),
  rejectDiscount: (qid: number, did: number) => api.post(`/quotations/${qid}/discounts/${did}/reject/`, {}),
  addFeature: (qid: number, payload: { feature_type_id?: number; feature_category_id?: number; name?: string; quantity: number; unit_price?: number }) => api.post(`/quotations/${qid}/add_feature/`, payload),
};

export type QuotationData = { // Export QuotationData
  id: number;
  quotation_number: string;
  customer: { id: number; name: string; phone_number: string; email?: string | null };
  vehicle_maker: { id: number; name: string };
  vehicle_model: { id: number; name: string };
  vehicle_number?: string | null;
  suggested_total: string | number;
  final_total: string | number;
  total_discount_amount?: number;
  discounted_total?: number;
  quotation_date: string;
  features?: Array<{
    id: number;
    custom_name?: string | null;
    feature_type?: { name: string } | null;
    quantity?: number;
    unit_price?: number;
    total_price?: number;
  }>;
};

export const featureApi = {
  // Correct hyphenated backend routes
  byVehicleModel: (vehicle_model_id: number, category_id?: number) => api.get<FeatureType[]>(`/feature-types/by_vehicle_model/?vehicle_model_id=${vehicle_model_id}${category_id ? `&category_id=${category_id}` : ''}`),
  parentCategories: () => api.get<FeatureCategory[]>(`/feature-categories/parents/`),
  childCategories: (parent_id: number) => api.get<FeatureCategory[]>(`/feature-categories/children/?parent_id=${parent_id}`),
  categories: () => api.get<FeatureCategory[]>(`/feature-categories/`), // fallback / full list
  pricesByModel: (vehicle_model_id: number) => api.get<FeaturePrice[]>(`/feature-prices/?vehicle_model=${vehicle_model_id}`),
};

export const workOrdersApi = {
  list: () => api.get<Paginated<WorkOrder> | WorkOrder[]>('/work-orders/'),
  getById: (id: number) => api.get<WorkOrder>(`/work-orders/${id}/`),
  get: (id: number) => api.get<WorkOrder>(`/work-orders/${id}/`),
  create: (payload: { quotation_id: number; work_order_date: string; appointment_date: string; estimated_completion_days: number; booking_amount?: number; }) => api.post<WorkOrder>('/work-orders/', payload),
  updateStatus: (id: number, action: string, data?: any) => {
    switch (action) {
      case 'start_job': return api.post<{ message: string }>(`/work-orders/${id}/start_job/`, {});
      case 'move_to_painting': return api.post<{ message: string }>(`/work-orders/${id}/move_to_painting/`, {});
      case 'mark_workdone': return api.post<{ message: string }>(`/work-orders/${id}/mark_workdone/`, {});
      case 'complete_job': return api.post<{ message: string }>(`/work-orders/${id}/complete/`, {});
      case 'deliver': return api.post<{ message: string }>(`/work-orders/${id}/deliver/`, {});
      case 'cancel': return api.post<{ status: string; reason: string }>(`/work-orders/${id}/cancel/`, data || {});
      default: throw new Error(`Unknown action: ${action}`);
    }
  },
  start: (id: number) => api.post<{ message: string }>(`/work-orders/${id}/start_job/`, {}),
  moveToPainting: (id: number) => api.post<{ message: string }>(`/work-orders/${id}/move_to_painting/`, {}),
  markWorkDone: (id: number) => api.post<{ message: string }>(`/work-orders/${id}/mark_workdone/`, {}),
  complete: (id: number) => api.post<{ message: string }>(`/work-orders/${id}/complete/`, {}),
  deliver: (id: number) => api.post<{ message: string }>(`/work-orders/${id}/deliver/`, {}),
  cancel: (id: number, reason?: string) => api.post<{ status: string; reason: string }>(`/work-orders/${id}/cancel/`, { reason: reason || 'No reason provided' }),
  scheduleSummary: (start: string, days = 30) => api.get<ScheduleDay[]>(`/bills/schedule_summary/?start=${start}&days=${days}`),
  // New flexible conversion methods
  convertToBill: (workOrderId: number, forceConvert = false, billDate?: string) => api.post<Bill>(`/work-orders/${workOrderId}/convert_to_bill/`, { force_convert: forceConvert, bill_date: billDate }),
  bulkConvertToBills: (workOrderIds: number[], forceConvert = false, billDate?: string) => api.post<{
    created_bills: Bill[];
    errors: string[];
    success_count: number;
    error_count: number;
  }>('/work-orders/bulk_convert_to_bills/', {
    work_order_ids: workOrderIds,
    force_convert: forceConvert,
    bill_date: billDate
  }),
  scheduleSuggest: (required_days: number, start?: string) => api.post<{ suggestionDate: string }>(`/bills/schedule_suggest/`, { required_days, start }),
  getCurrentLoad: () => api.get<ManufacturingLoad>(`/bills/current_load/`),
  finance: (id: number) => api.get<FinanceSummary>(`/bills/${id}/finance/`),
  addPayment: (bill_id: number, payment: { payment_type: string; amount: number; payment_method?: string; reference_number?: string; notes?: string; }) => api.post(`/payments/`, { bill_id, ...payment }),
};

export const billsApi = {
  list: () => api.get<Paginated<Bill> | Bill[]>('/bills/'),
  getById: (id: number) => api.get<Bill>(`/bills/${id}/`),
  get: (id: number) => api.get<Bill>(`/bills/${id}/`),
  create: (data: any) => api.post<Bill>('/bills/', data),
};

// paymentsApi removed - all payments now handled through finance app


export const addedFeaturesApi = {
  list: (filter?: { bill?: number; work_order?: number }) => {
    const params = new URLSearchParams();
    if (filter?.bill) params.append('bill', filter.bill.toString());
    if (filter?.work_order) params.append('work_order', filter.work_order.toString());
    return api.get<AddedFeature[]>(`/added-features/?${params.toString()}`);
  },
  create: (feature: { bill?: number; work_order?: number; feature_name: string; cost: string; notes?: string }) =>
    api.post<AddedFeature>('/added-features/', feature),
};

export const vehicleIntakeApi = {
  getByBill: (billId: number) => api.get<VehicleIntake[]>(`/vehicle-intakes/?bill=${billId}`).then(arr => Array.isArray(arr) ? arr[0] : (arr as any)[0]),
  getByWorkOrder: (workOrderId: number) => api.get<VehicleIntake[]>(`/vehicle-intakes/?work_order=${workOrderId}`).then(arr => Array.isArray(arr) ? arr[0] : (arr as any)[0]),
  create: (payload: Omit<VehicleIntake, 'id' | 'recorded_at' | 'recorded_by' | 'images'> & { work_order_id: number }) => api.post<VehicleIntake>('/vehicle-intakes/', payload),
  update: (id: number, payload: Partial<VehicleIntake>) => api.patch<VehicleIntake>(`/vehicle-intakes/${id}/`, payload),
  print: async (id: number) => {
    const tokens = getTokens();
    const res = await fetch(`${MANUFACTURING_BASE}/vehicle-intakes/${id}/print/`, { headers: tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {} });
    if (!res.ok) { throw new Error(await res.text() || `HTTP ${res.status}`); }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
  }
};

export const vehicleIntakeImagesApi = {
  upload: async (intake_id: number, file: File, description?: string) => {
    const form = new FormData();
    form.append('intake_id', String(intake_id));
    form.append('image', file);
    if (description) form.append('description', description);
    return api.postForm<VehicleIntakeImage>('/vehicle-intake-images/', form);
  },
  list: (intake_id: number) => api.get<VehicleIntakeImage[]>(`/vehicle-intake-images/?intake=${intake_id}`)
};

// Purchase API types
export interface Vendor {
  id: number;
  name: string;
  gst_number: string;
  email: string;
  rating: number;
  priority: 'High' | 'Medium' | 'Low';
  created_at: string;
  updated_at: string;
  bank_details: VendorBankDetail[];
  contacts: VendorContact[];
  addresses: VendorAddress[];
}

export interface VendorBankDetail {
  id: number;
  bank_name: string;
  ifsc_code: string;
  branch: string;
  account_number: string;
}

export interface VendorContact {
  id: number;
  name: string;
  mobile_number: string;
}

export interface VendorAddress {
  id: number;
  address: string;
}

export interface PurchaseBill {
  id: number;
  vendor: Vendor;
  bill_date: string;
  bill_number: string;
  total_amount: number;
  discount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: 'paid' | 'partial' | 'outstanding';
  items_count: number;
  notes: string;
  attachment?: string;
  created_at: string;
  updated_at: string;
  items: PurchaseBillItem[];
  payments: PurchasePayment[];
}

export interface PurchaseBillItem {
  id: number;
  product?: {
    id: number;
    title: string;
    price: number;
  };
  item_name: string;
  quantity: number;
  purchase_price: number;
  gst_percent: number;
  gst_amount: number;
  total: number;
}

export interface PurchasePayment {
  id: number;
  bill?: {
    id: number;
    bill_number: string;
    vendor: {
      name: string;
    };
  };
  vendor?: {
    id: number;
    name: string;
  };
  amount: number;
  payment_date: string;
  mode: 'Cash' | 'Bank' | 'UPI' | 'Credit';
  note: string;
  attachment?: string;
  allocated_amount: number;
  unallocated_amount: number;
  created_at: string;
  allocations?: PaymentAllocation[];
  bill_number?: string;
  vendor_name?: string;
}

export interface PaymentAllocation {
  id: number;
  payment: number;
  bill: number;
  bill_number: string;
  amount: number;
  created_at: string;
}

// Shop API types
export interface ShopProduct {
  product_id: string; // UUID string
  title: string;
  price: number;
  purchase_price?: number;
  discounted_price?: number;
  final_price?: number;
  price_inclusive_tax: number;
  taxes?: number;
  discount_amount?: number;
  discount_percentage?: number;
  is_active: boolean;
  stock: number;
  starting_price: number;
  hsn_code?: string;
  barcode?: string;
  image?: string;
  rating?: number;
  category?: {
    id: number;
    title: string;
    ref_name: string;
  };
  brand?: {
    id: number;
    name: string;
  };
  tags?: Array<{
    id: number;
    name: string;
    ref_name: string;
  }>;
  product_variant?: Array<any>;
}

export interface ShopApiResponse {
  error: boolean;
  count: number;
  data: ShopProduct[];
}

export interface ShopCategory {
  id: number;
  title: string;
  ref_name: string;
  parent?: {
    id: number;
    title: string;
    ref_name: string;
  };
}

export const purchaseApi = {
  // Dashboard
  dashboardStats: () => purchaseApiBase.get('/dashboard-stats/'),

  // Vendors
  vendors: {
    list: (params?: Record<string, any>) => purchaseApiBase.get<Vendor[]>('/vendors/'),
    get: (id: number) => purchaseApiBase.get<Vendor>(`/vendors/${id}/`),
    create: (data: Partial<Vendor>) => purchaseApiBase.post<Vendor>('/vendors/', data),
    update: (id: number, data: Partial<Vendor>) => purchaseApiBase.put<Vendor>(`/vendors/${id}/`, data),
    delete: (id: number) => purchaseApiBase.del(`/vendors/${id}/`),
    search: (query: string) => purchaseApiBase.get<Vendor[]>(`/vendors/search_by_name/?name=${query}`),
    bills: (id: number) => purchaseApiBase.get<PurchaseBill[]>(`/vendors/${id}/bills/`),
    payments: (id: number) => purchaseApiBase.get<PurchasePayment[]>(`/vendors/${id}/payments/`),
    addPayment: (id: number, data: any) => purchaseApiBase.post<PurchasePayment>(`/vendors/${id}/add_payment/`, data),
    outstandingBills: (id: number) => purchaseApiBase.get<PurchaseBill[]>(`/vendors/${id}/outstanding_bills/`),
    paymentSummary: (id: number) => purchaseApiBase.get<any>(`/vendors/${id}/payment_summary/`),
  },

  // Bills
  bills: {
    list: (params?: Record<string, any>) => purchaseApiBase.get<PurchaseBill[]>('/bills/'),
    get: (id: number) => purchaseApiBase.get<PurchaseBill>(`/bills/${id}/`),
    create: (data: any) => purchaseApiBase.post<PurchaseBill>('/bills/', data),
    update: (id: number, data: Partial<PurchaseBill>) => purchaseApiBase.put<PurchaseBill>(`/bills/${id}/`, data),
    delete: (id: number) => purchaseApiBase.del(`/bills/${id}/`),
    recent: (limit = 10) => purchaseApiBase.get<PurchaseBill[]>(`/bills/recent/?limit=${limit}`),
    byStatus: (status: string) => purchaseApiBase.get<PurchaseBill[]>(`/bills/by_status/?status=${status}`),
    addPayment: (id: number, data: any) => purchaseApiBase.post<any>(`/bills/${id}/add_payment/`, data),
    payments: (id: number) => purchaseApiBase.get<PurchasePayment[]>(`/bills/${id}/payments/`),
    recalculate: (id: number) => purchaseApiBase.post<any>(`/bills/${id}/recalculate_amounts/`, {}),
    calculations: (id: number) => purchaseApiBase.get<any>(`/bills/${id}/calculations/`),
    refresh: (id: number) => purchaseApiBase.get<PurchaseBill>(`/bills/${id}/refresh/`),
  },

  // Payments
  payments: {
    list: (params?: Record<string, any>) => purchaseApiBase.get<PurchasePayment[]>('/payments/'),
    get: (id: number) => purchaseApiBase.get<PurchasePayment>(`/payments/${id}/`),
    create: (data: any) => purchaseApiBase.post<PurchasePayment>('/payments/', data),
    update: (id: number, data: Partial<PurchasePayment>) => purchaseApiBase.put<PurchasePayment>(`/payments/${id}/`, data),
    delete: (id: number) => purchaseApiBase.del(`/payments/${id}/`),
    summary: () => purchaseApiBase.get('/payments/summary/'),
    allocateToBill: (id: number, data: { bill_id: number; amount: number }) =>
      purchaseApiBase.post<any>(`/payments/${id}/allocate_to_bill/`, data),
  },

  // Payment Allocations
  paymentAllocations: {
    list: (params?: Record<string, any>) => purchaseApiBase.get<PaymentAllocation[]>('/payment-allocations/'),
    get: (id: number) => purchaseApiBase.get<PaymentAllocation>(`/payment-allocations/${id}/`),
    create: (data: any) => purchaseApiBase.post<PaymentAllocation>('/payment-allocations/', data),
    update: (id: number, data: Partial<PaymentAllocation>) => purchaseApiBase.put<PaymentAllocation>(`/payment-allocations/${id}/`, data),
    delete: (id: number) => purchaseApiBase.del(`/payment-allocations/${id}/`),
    summary: () => purchaseApiBase.get('/payment-allocations/summary/'),
  },

  // Bank Details
  bankDetails: {
    list: (params?: Record<string, any>) => purchaseApiBase.get<VendorBankDetail[]>('/vendor-bank-details/'),
    create: (data: Partial<VendorBankDetail>) => purchaseApiBase.post<VendorBankDetail>('/vendor-bank-details/', data),
    update: (id: number, data: Partial<VendorBankDetail>) => purchaseApiBase.put<VendorBankDetail>(`/vendor-bank-details/${id}/`, data),
    delete: (id: number) => purchaseApiBase.del(`/vendor-bank-details/${id}/`),
  },

  // Contacts
  contacts: {
    list: (params?: Record<string, any>) => purchaseApiBase.get<VendorContact[]>('/vendor-contacts/'),
    create: (data: Partial<VendorContact>) => purchaseApiBase.post<VendorContact>('/vendor-contacts/', data),
    update: (id: number, data: Partial<VendorContact>) => purchaseApiBase.put<VendorContact>(`/vendor-contacts/${id}/`, data),
    delete: (id: number) => purchaseApiBase.del(`/vendor-contacts/${id}/`),
  },

  // Addresses
  addresses: {
    list: (params?: Record<string, any>) => purchaseApiBase.get<VendorAddress[]>('/vendor-addresses/'),
    create: (data: Partial<VendorAddress>) => purchaseApiBase.post<VendorAddress>('/vendor-addresses/', data),
    update: (id: number, data: Partial<VendorAddress>) => purchaseApiBase.put<VendorAddress>(`/vendor-addresses/${id}/`, data),
    delete: (id: number) => purchaseApiBase.del(`/vendor-addresses/${id}/`),
  },

  // Vendor Product Prices
  vendorProductPrices: {
    list: (params?: Record<string, any>) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString());
          }
        });
      }
      const query = searchParams.toString();
      return purchaseApiBase.get<any[]>(`/vendor-product-prices/${query ? `?${query}` : ''}`);
    },
    get: (id: number) => purchaseApiBase.get<any>(`/vendor-product-prices/${id}/`),
    create: (data: any) => purchaseApiBase.post<any>('/vendor-product-prices/', data),
    update: (id: number, data: any) => purchaseApiBase.put<any>(`/vendor-product-prices/${id}/`, data),
    delete: (id: number) => purchaseApiBase.del(`/vendor-product-prices/${id}/`),
    getByProduct: (productId: string) => purchaseApiBase.get<any[]>(`/vendor-product-prices/by-product/?product_id=${productId}`),
    getPrice: (vendorId: number, productId: string) => purchaseApiBase.get<any>(`/vendor-product-prices/get-price/?vendor_id=${vendorId}&product_id=${productId}`),
    getPriceHistory: (id: number) => purchaseApiBase.get<any[]>(`/vendor-product-prices/${id}/price-history/`),
    exportExcelAsync: (filters: { vendor_id?: string; is_active?: string }) => purchaseApiBase.post<{ task_id: string }>('/vendor-product-prices/export-excel-async/', filters),
    getReportStatus: (taskId: string) => purchaseApiBase.get<any>(`/vendor-product-prices/report-status/${taskId}/`),
  },
};

// Shop API functions
export const shopProductsApi = {
  list: async (params?: Record<string, any>) => {
    const response = await shopApi.get<ShopApiResponse>('/shop-product-list/');
    return response.error ? [] : response.data;
  },
  get: async (productId: string) => {
    const response = await shopApi.get<any>(`/shop-product-detailview/${productId}/`);
    return response.error ? null : response.product_data?.[0];
  },
  create: (data: Partial<ShopProduct>) => shopApi.post<ShopProduct>('/create/products/', data),
  update: (productId: string, data: Partial<ShopProduct>) => shopApi.put<ShopProduct>(`/update/product/${productId}/`, data),
  delete: (productId: string) => shopApi.del(`/update/product/${productId}/`),
  search: async (query: string) => {
    const response = await shopApi.get<ShopApiResponse>(`/search-parts/?search=${encodeURIComponent(query)}`);
    return response.error ? [] : response.data;
  },
};

export const shopCategoriesApi = {
  list: async () => {
    const response = await shopApi.get<ShopCategory[]>('/shop-product-category-list/?no_pagination=true');
    return Array.isArray(response) ? response : [];
  },
};

// Shop Customers API
export interface ShopCustomer {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  phone_number?: string;
  organization_name?: string;
  billing_address_1?: string;
  billing_address_2?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  gst_no?: string;
  source: 'user_auth' | 'quotation';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  full_name?: string;
}

export const shopCustomersApi = {
  list: async (search?: string) => {
    const url = search
      ? `/shop/customers/?search=${encodeURIComponent(search)}`
      : '/shop/customers/';
    const response = await shopApi.get<{ error: boolean; count: number; data: ShopCustomer[] }>(url);
    return response.error ? [] : response.data;
  },
};

// Category Products API
export const categoryProductsApi = {
  getProducts: async (params: {
    category_id?: number;
    category_ref_name?: string;
    maker_id?: string;
    model_id?: string;
    year?: number;
    variant_id?: string;
  }) => {
    const searchParams = new URLSearchParams();

    if (params.category_id) searchParams.append('category_id', params.category_id.toString());
    if (params.category_ref_name) searchParams.append('category_ref_name', params.category_ref_name);
    if (params.maker_id) searchParams.append('maker_id', params.maker_id);
    if (params.model_id) searchParams.append('model_id', params.model_id);
    if (params.year) searchParams.append('year', params.year.toString());
    if (params.variant_id) searchParams.append('variant_id', params.variant_id);

    const response = await shopApi.get<any>(`/category-products/?${searchParams.toString()}`);
    return response.error ? [] : response.data;
  },
};

// Test Mode API functions
export const testModeApi = {
  // Get test mode statistics
  getStats: async (): Promise<{
    test_bills_count: number;
    production_bills_count: number;
    test_bill_range: string;
    next_available_test_number: string;
  }> => {
    return await api.get<{
      test_bills_count: number;
      production_bills_count: number;
      test_bill_range: string;
      next_available_test_number: string;
    }>('/test-bills/statistics/');
  },

  // Get test bills
  list: async (): Promise<{ results: Bill[] }> => {
    return await api.get<{ results: Bill[] }>('/test-bills/');
  },

  // Clean all test bills
  clean: async (): Promise<{ message: string }> => {
    return await api.post<{ message: string }>('/test-bills/clean/', {});
  },

  // Get CA/government submissions (production bills only)
  getCASubmissions: async (): Promise<{ results: Bill[] }> => {
    return await api.get<{ results: Bill[] }>('/ca-government-submissions/');
  },

  // Get CA submission summary
  getCASummary: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<{
    total_bills: number;
    total_amount: number;
    status_breakdown: Array<{ status: string; count: number }>;
    date_range: { start_date?: string; end_date?: string };
    note: string;
  }> => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);

    return await api.get<{
      total_bills: number;
      total_amount: number;
      status_breakdown: Array<{ status: string; count: number }>;
      date_range: { start_date?: string; end_date?: string };
      note: string;
    }>(`/ca-government-submissions/summary/?${searchParams.toString()}`);
  },

  // Export bills for CA submission
  exportForCA: async (params?: {
    status?: string;
  }): Promise<{
    bills: Array<{
      bill_number: string;
      customer_name: string;
      appointment_date: string;
      expected_delivery_date: string;
      quoted_price: number;
      total_added_features_cost: number;
      total_amount: number;
      status: string;
      created_at: string;
    }>;
    export_date: string;
    total_count: number;
    note: string;
  }> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);

    return await api.get<{
      bills: Array<{
        bill_number: string;
        customer_name: string;
        appointment_date: string;
        expected_delivery_date: string;
        quoted_price: number;
        total_added_features_cost: number;
        total_amount: number;
        status: string;
        created_at: string;
      }>;
      export_date: string;
      total_count: number;
      note: string;
    }>(`/ca-government-submissions/export_for_ca/?${searchParams.toString()}`);
  },

  // Test mode management
  getTestModeStatus: async (): Promise<{
    test_mode: boolean;
    test_bills_count: number;
    production_bills_count: number;
    next_test_bill_number: string;
    next_production_bill_number: string;
  }> => {
    return await api.get<{
      test_mode: boolean;
      test_bills_count: number;
      production_bills_count: number;
      next_test_bill_number: string;
      next_production_bill_number: string;
    }>('/test-mode/status/');
  },

  enableTestMode: async (): Promise<{ message: string }> => {
    return await api.post<{ message: string }>('/test-mode/enable/', {});
  },

  disableTestMode: async (): Promise<{ message: string }> => {
    return await api.post<{ message: string }>('/test-mode/disable/', {});
  },
};

// ==================== INVENTORY TYPES ====================

export interface Unit {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_decimal: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  contact_person?: string;
  contact_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_racks?: number;
  total_inventory_items?: number;
}

export interface Rack {
  id: string;
  warehouse: string;
  rack_number: string;
  row_count: number;
  column_count: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_cells?: number;
  inventory_count?: number;
  // Related objects (populated by backend)
  warehouse_details?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface InventoryEntry {
  id: string;
  product: string;
  product_variant?: string;
  warehouse: string;
  rack: string;
  row: number;
  column: number;
  quantity: number;
  unit?: number;
  created_at: string;
  updated_at: string;
  location_code?: string;
  // Related objects (populated by backend)
  product_details?: {
    title: string;
    product_id: string;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    volume_m3?: number;
  };
  product_variant_details?: {
    title: string;
    variant_id: string;
  };
  warehouse_details?: {
    name: string;
    code: string;
  };
  rack_details?: {
    rack_number: string;
  };
  unit_details?: {
    name: string;
    code: string;
  };
}

// ==================== INVENTORY API FUNCTIONS ====================

export const inventoryApiFunctions = {
  // Units
  units: {
    list: () => inventoryApi.get<Unit[]>('/units/'),
    get: (id: number) => inventoryApi.get<Unit>(`/units/${id}/`),
    create: (data: Partial<Unit>) => inventoryApi.post<Unit>('/units/', data),
    update: (id: number, data: Partial<Unit>) => inventoryApi.put<Unit>(`/units/${id}/`, data),
    delete: (id: number) => inventoryApi.del(`/units/${id}/`),
  },

  // Warehouses
  warehouses: {
    list: () => inventoryApi.get<Warehouse[]>('/warehouses/'),
    get: (id: string) => inventoryApi.get<Warehouse>(`/warehouses/${id}/`),
    create: (data: Partial<Warehouse>) => inventoryApi.post<Warehouse>('/warehouses/', data),
    update: (id: string, data: Partial<Warehouse>) => inventoryApi.put<Warehouse>(`/warehouses/${id}/`, data),
    delete: (id: string) => inventoryApi.del(`/warehouses/${id}/`),
    inventorySummary: (id: string) => inventoryApi.get<{
      warehouse: Warehouse;
      inventory_stats: {
        total_entries: number;
        total_quantity: number;
        total_products: number;
      };
      rack_stats: {
        total_racks: number;
        total_cells: number;
      };
    }>(`/warehouses/${id}/inventory_summary/`),
  },

  // Racks
  racks: {
    list: (params?: Record<string, any>) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString());
          }
        });
      }
      const url = searchParams.toString() ? `/racks/?${searchParams.toString()}` : '/racks/';
      return inventoryApi.get<Rack[]>(url);
    },
    get: (id: string) => inventoryApi.get<Rack>(`/racks/${id}/`),
    create: (data: Partial<Rack>) => inventoryApi.post<Rack>('/racks/', data),
    update: (id: string, data: Partial<Rack>) => inventoryApi.put<Rack>(`/racks/${id}/`, data),
    delete: (id: string) => inventoryApi.del(`/racks/${id}/`),
    inventory: (id: string) => inventoryApi.get<InventoryEntry[]>(`/racks/${id}/inventory/`),
  },

  // Inventory Entries
  inventory: {
    baseUrl: INVENTORY_BASE,
    list: (params?: Record<string, any>) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString());
          }
        });
      }
      const queryString = searchParams.toString();
      return inventoryApi.get<InventoryEntry[]>(`/inventory/${queryString ? `?${queryString}` : ''}`);
    },
    get: (id: string) => inventoryApi.get<InventoryEntry>(`/inventory/${id}/`),
    create: (data: Partial<InventoryEntry>) => inventoryApi.post<InventoryEntry>('/inventory/', data),
    update: (id: string, data: Partial<InventoryEntry>) => inventoryApi.put<InventoryEntry>(`/inventory/${id}/`, data),
    delete: (id: string) => inventoryApi.del(`/inventory/${id}/`),
    byProduct: (productId: string) => inventoryApi.get<{
      product_id: string;
      total_quantity: number;
      entries: InventoryEntry[];
    }>(`/inventory/by_product/?product_id=${productId}`),
    byWarehouse: (warehouseId?: string) => {
      const query = warehouseId ? `?warehouse_id=${warehouseId}` : '';
      return inventoryApi.get<Array<{
        warehouse__name: string;
        warehouse__code: string;
        product__title: string;
        product_id: string;
        total_quantity: number;
        entry_count: number;
      }>>(`/inventory/by_warehouse/${query}`);
    },
    lowStock: (threshold = 10) => inventoryApi.get<Array<{
      product__title: string;
      product__product_id: string;
      product_id: string;
      total_quantity: number;
    }>>(`/inventory/low_stock/?threshold=${threshold}`),
    bulkCreate: (entries: Partial<InventoryEntry>[]) => inventoryApi.post<InventoryEntry[]>('/inventory/bulk_create/', { entries }),
    adjustQuantity: (id: string, adjustment: number) => inventoryApi.post<{
      message: string;
      entry: InventoryEntry;
    }>(`/inventory/${id}/adjust_quantity/`, { adjustment }),
    shippingReport: (params?: Record<string, any>) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString());
          }
        });
      }
      const queryString = searchParams.toString();
      return inventoryApi.get<{
        total_items: number;
        items: Array<{
          weight_kg?: number;
          length_cm?: number;
          width_cm?: number;
          height_cm?: number;
          volume_m3?: number;
          quantity: number;
          unit?: string;
          location_code: string;
          product_title: string;
        }>;
      }>(`/inventory/shipping_report/${queryString ? `?${queryString}` : ''}`);
    },
  },
};