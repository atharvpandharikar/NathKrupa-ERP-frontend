// API helper with JWT auth and auto-refresh
const API_ROOT = import.meta.env.VITE_API_ROOT || "http://127.0.0.1:8000";
const MANUFACTURING_BASE = (import.meta.env.VITE_API_BASE as string) || `${API_ROOT}/api/manufacturing`;
const AUTH_BASE = `${API_ROOT}/userauth`;

type Tokens = { access: string; refresh: string };

const TOKEN_KEY = "nk:tokens";

export function getTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
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
  return t?.access ? { Authorization: `Bearer ${t.access}` } as Record<string, string> : {} as Record<string, string>;
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
    credentials: "include",
  });
  if (res.status === 401 && retry) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      return request<T>(base, path, options, false);
    } else {
      clearTokens();
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

export const authApi = {
  async login(email: string, password: string): Promise<Tokens> {
    const res = await fetch(`${AUTH_BASE}/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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
// Bill returned by backend includes nested quotation with customer/vehicle info.
export type Bill = {
  id: number;
  bill_number: string;
  status: 'scheduled'|'in_progress'|'painting'|'workdone'|'completed'|'delivered'|'cancelled';
  appointment_date: string;
  estimated_completion_days: number;
  expected_delivery_date: string;
  actual_delivery_date?: string;
  quoted_price: number;
  booking_amount?: number;
  total_added_features_cost: number;
  total_payments: number;
  remaining_balance: number;
  quotation: {
    id: number;
    quotation_number: string;
    customer: { id: number; name: string; phone_number: string; email?: string|null };
    vehicle_maker: { id: number; name: string };
    vehicle_model: { id: number; name: string };
    vehicle_number?: string|null;
    suggested_total: string|number;
    final_total: string|number;
    features?: Array<{ id:number; custom_name?: string|null; feature_type?: { name: string }|null }>;
  }|null;
  vehicle_intake?: VehicleIntake; // Optional embedded intake (if backend returns)
};

export type VehicleIntake = {
  id: number;
  bill_id: number;
  recorded_by?: { id:number; username:string };
  recorded_at: string;
  stepney_present: boolean; jack_present: boolean; jack_handle_present: boolean; tool_kit_present: boolean; rope_present: boolean; tarpaulin_present: boolean; battery_present: boolean; music_system_present: boolean; documents_all_present: boolean;
  fuel_level?: string|null; odometer_reading?: number|null;
  exterior_notes?: string|null; interior_notes?: string|null; other_notes?: string|null;
  images?: VehicleIntakeImage[];
};

export type VehicleIntakeImage = { id:number; image:string; description?:string|null; uploaded_at:string; intake?: number };

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
  mode: 'amount'|'percent';
  value: number;
  note?: string;
  status: 'pending'|'approved'|'rejected';
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

export type FeatureCategory = { id:number; name:string; description?:string|null };
export type FeaturePrice = { id:number; vehicle_model:number; feature_category: FeatureCategory; feature_type?: FeatureType|null; price:number };

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

export type Payment = {
  id: number;
  bill: number;
  amount: string;
  payment_type: string;
  payment_date: string;
  notes?: string;
  payment_method?: string;
  reference_number?: string;
  created_at: string;
};

export type AddedFeature = {
  id: number;
  bill: number;
  feature_name: string;
  cost: string;
  notes?: string;
  created_at: string;
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
  list: (search?: string) => api.get<Paginated<Customer>|Customer[]>(`/customers/${search?`?search=${encodeURIComponent(search)}`:''}`),
  create: (payload: { name: string; phone_number: string; whatsapp_number?: string; email?: string; address?: string }) => api.post<Customer>('/customers/', payload),
  update: (id: number, payload: Partial<{ name: string; phone_number: string; whatsapp_number?: string|null; email?: string|null; address?: string|null; org_id?: string|null; gst_id?: string|null }>) => api.patch<Customer>(`/customers/${id}/`, payload),
  get: (id: number) => api.get<Customer>(`/customers/${id}/`),
  searchByPhone: (phone: string) => api.get<Customer[]>(`/customers/search_by_phone/?phone=${encodeURIComponent(phone)}`),
  vehicles: (id: number) => api.get<{count:number; vehicles: Array<{ vehicle_maker:{id:number; name:string}; vehicle_model:{id:number; name:string}; vehicle_number?: string|null; quotation_id:number; quotation_number:string }>;}>(`/customers/${id}/vehicles/`),
};

export const customerAddressesApi = {
  list: (customer: number) => api.get<CustomerAddress[]>(`/customer-addresses/?customer=${customer}`),
  create: (payload: { customer: number; label?: string; line1: string; line2?: string; city?: string; state?: string; pincode?: string; is_primary?: boolean }) => api.post<CustomerAddress>('/customer-addresses/', payload),
  update: (id: number, payload: Partial<{ label: string; line1: string; line2: string; city: string; state: string; pincode: string; is_primary: boolean }>) => api.patch<CustomerAddress>(`/customer-addresses/${id}/`, payload),
  delete: (id: number) => api.del<void>(`/customer-addresses/${id}/`),
};

export const quotationApi = {
  listDiscounts: (qid: number) => api.get<{ items: QuotationDiscount[]; base_total: number; total_discount: number; discounted_total: number }>(`/quotations/${qid}/discounts/`),
  addDiscount: (qid: number, payload: { mode: 'amount'|'percent'; value: number; note?: string }) => api.post(`/quotations/${qid}/discounts/`, payload),
  approveDiscount: (qid: number, did: number) => api.post(`/quotations/${qid}/discounts/${did}/approve/`, {}),
  rejectDiscount: (qid: number, did: number) => api.post(`/quotations/${qid}/discounts/${did}/reject/`, {}),
  addFeature: (qid: number, payload: { feature_type_id?: number; feature_category_id?: number; name?: string; quantity: number; unit_price?: number }) => api.post(`/quotations/${qid}/add_feature/`, payload),
};

export const featureApi = {
  // Correct hyphenated backend routes
  byVehicleModel: (vehicle_model_id: number, category_id?: number) => api.get<FeatureType[]>(`/feature-types/by_vehicle_model/?vehicle_model_id=${vehicle_model_id}${category_id?`&category_id=${category_id}`:''}`),
  parentCategories: () => api.get<FeatureCategory[]>(`/feature-categories/parents/`),
  childCategories: (parent_id: number) => api.get<FeatureCategory[]>(`/feature-categories/children/?parent_id=${parent_id}`),
  categories: () => api.get<FeatureCategory[]>(`/feature-categories/`), // fallback / full list
  pricesByModel: (vehicle_model_id:number) => api.get<FeaturePrice[]>(`/feature-prices/?vehicle_model=${vehicle_model_id}`),
};

export const workOrdersApi = {
  list: () => api.get<Paginated<Bill>|Bill[]>('/bills/'),
  getById: (id: number) => api.get<Bill>(`/bills/${id}/`),
  get: (id: number) => api.get<Bill>(`/bills/${id}/`),
  create: (payload: { quotation_id: number; appointment_date: string; estimated_completion_days: number; booking_amount?: number; }) => api.post<Bill>('/bills/', payload),
  updateStatus: (id: number, action: string) => {
    switch(action) {
      case 'start_job': return api.post<{message: string}>(`/bills/${id}/start_job/`, {});
    case 'move_to_painting': return api.post<{message: string}>(`/bills/${id}/move_to_painting/`, {});
    case 'mark_workdone': return api.post<{message: string}>(`/bills/${id}/mark_workdone/`, {});
      case 'complete_job': return api.post<{message: string}>(`/bills/${id}/complete_job/`, {});
      case 'deliver': return api.post<{message: string}>(`/bills/${id}/deliver/`, {});
      default: throw new Error(`Unknown action: ${action}`);
    }
  },
  start: (id: number) => api.post<{message: string}>(`/bills/${id}/start_job/`, {}),
  moveToPainting: (id: number) => api.post<{message: string}>(`/bills/${id}/move_to_painting/`, {}),
  markWorkDone: (id: number) => api.post<{message: string}>(`/bills/${id}/mark_workdone/`, {}),
  complete: (id: number) => api.post<{message: string}>(`/bills/${id}/complete_job/`, {}),
  deliver: (id: number) => api.post<{message: string}>(`/bills/${id}/deliver/`, {}),
  scheduleSummary: (start: string, days = 30) => api.get<ScheduleDay[]>(`/bills/schedule_summary/?start=${start}&days=${days}`),
  scheduleSuggest: (required_days: number, start?: string) => api.post<{suggestionDate: string}>(`/bills/schedule_suggest/`, { required_days, start }),
  getCurrentLoad: () => api.get<ManufacturingLoad>(`/bills/current_load/`),
  finance: (id: number) => api.get<FinanceSummary>(`/bills/${id}/finance/`),
  addPayment: (bill_id: number, payment: { payment_type: string; amount: number; payment_method?: string; reference_number?: string; notes?: string; }) => api.post(`/payments/`, { bill_id, ...payment }),
};

export const paymentsApi = {
  list: (filter?: { bill?: number }) => {
    const params = new URLSearchParams();
    if (filter?.bill) params.append('bill', filter.bill.toString());
    return api.get<Payment[]>(`/payments/?${params.toString()}`);
  },
  create: (payment: { bill: number; amount: string; payment_type: string; notes?: string; payment_date?: string; payment_method?: string; reference_number?: string }) => 
    api.post<Payment>('/payments/', payment),
};

export const addedFeaturesApi = {
  list: (filter?: { bill?: number }) => {
    const params = new URLSearchParams();
    if (filter?.bill) params.append('bill', filter.bill.toString());
    return api.get<AddedFeature[]>(`/added-features/?${params.toString()}`);
  },
  create: (feature: { bill: number; feature_name: string; cost: string; notes?: string }) => 
    api.post<AddedFeature>('/added-features/', feature),
};

export const vehicleIntakeApi = {
  getByBill: (billId: number) => api.get<VehicleIntake[]>(`/vehicle-intakes/?bill=${billId}`).then(arr => Array.isArray(arr) ? arr[0] : (arr as any)[0]),
  create: (payload: Omit<VehicleIntake,'id'|'recorded_at'|'recorded_by'|'images'> & { bill_id:number }) => api.post<VehicleIntake>('/vehicle-intakes/', payload),
  update: (id:number, payload: Partial<VehicleIntake>) => api.patch<VehicleIntake>(`/vehicle-intakes/${id}/`, payload),
  print: async (id:number) => {
    const tokens = getTokens();
    const res = await fetch(`${MANUFACTURING_BASE}/vehicle-intakes/${id}/print/`, { headers: tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {} });
    if(!res.ok){ throw new Error(await res.text() || `HTTP ${res.status}`); }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
  }
};

export const vehicleIntakeImagesApi = {
  upload: async (intake_id:number, file: File, description?: string) => {
    const form = new FormData();
    form.append('intake_id', String(intake_id));
    form.append('image', file);
    if(description) form.append('description', description);
    return api.postForm<VehicleIntakeImage>('/vehicle-intake-images/', form);
  },
  list: (intake_id:number) => api.get<VehicleIntakeImage[]>(`/vehicle-intake-images/?intake=${intake_id}`)
};
