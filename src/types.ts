export type ID = string;

export type DashboardStats = {
  totalQuotations: number;
  totalBills: number;
  monthlyRevenue: { month: string; amount: number }[];
  bestSellingFeature: string;
  topCustomers: { name: string; quotations: number }[];
};

export type Customer = {
  id: ID;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: string;
};

export type VehicleType = { id: number; code: string; name: string };
export type VehicleMaker = { id: number; name: string };
export type VehicleModel = { id: number; makerId: number; typeId: number; name: string; image?: string };

export type FeatureCategory = {
  id: number;
  name: string;
  parentId?: number | null;
};

export type FeatureType = {
  id: number;
  categoryId: number;
  name: string;
  base_cost: number;
  images?: string[];
};

export type QuotationData = {
  id: ID;
  customer?: Customer;
  vehicle: {
    typeId: number | null;
    makerId: number | null;
    modelId: number | null;
    variant?: string;
  };
  selectedFeatures: { [categoryId: number]: number | null };
  total: number;
  created_at: string;
  quotation_date: string;
};

export type QuotationCreated = QuotationData;

export type WorkOrder = {
  id: ID;
  work_order_number: string;
  quotation: QuotationData;
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

export type Bill = {
  id: ID;
  quotation_id: ID;
  customer: Customer;
  vehicle_model: VehicleModel;
  features: {
    feature_type_id: number;
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
  grand_total: number;
  status: "Paid" | "Unpaid";
  created_at: string;
  // Additional fields for work order to bill conversion
  has_bill?: boolean;
  is_test?: boolean;
  bill_number?: string;
  work_order_number?: string;
};
