export interface User {
  id: string;
  phone: string;
  name: string;
  name_ar?: string;
  role: 'admin' | 'salesman' | 'super_admin';
  email?: string;
  created_at: string;
  is_active: boolean;
  tenant_id?: string;
  tenantId?: string;
  preferred_language?: string;
  assigned_plants?: string[]; // Array of plant IDs this admin has access to (empty = all plants)
}

export interface Visit {
  id: string;
  salesman_id: string;
  salesman_name: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  visit_type: 'new' | 'followup' | 'delivery';
  notes: string;
  products: VisitProduct[];
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  visit_date: string;
  created_at: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface VisitProduct {
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  unit_price: number;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gst_number?: string;
  credit_limit: number;
  outstanding_balance: number;
  is_active: boolean;
  created_at: string;
  last_visit_date?: string;
}

export interface DashboardStats {
  totalVisits: number;
  todayVisits: number;
  activeProducts: number;
  activeSalesmen: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export interface ProductTarget {
  product_id: string;
  product_name?: string;
  target_quantity: number;
}

export interface SalesmanTarget {
  id: string;
  salesman_id: string;
  salesman_name?: string;
  salesman_name_ar?: string;
  salesmen?: { name: string };
  month: number;
  year: number;
  visits_per_month: number;
  working_days?: number;
  visits_per_day: number;
  new_visits_per_month: number;
  repeat_visits_per_month: number;
  orders_per_month: number;
  order_value_per_month: number;
  product_targets: ProductTarget[];
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface TargetPerformance {
  salesman_id: string;
  salesman_name: string;
  month: number;
  year: number;
  
  // Targets
  target_visits: number;
  target_daily_visits: number;
  target_new_visits: number;
  target_repeat_visits: number;
  target_orders: number;
  target_order_value: number;
  
  // Actuals
  actual_visits: number;
  actual_daily_visits: number;
  actual_new_visits: number;
  actual_repeat_visits: number;
  actual_orders: number;
  actual_order_value: number;
  
  // Achievement percentages
  visits_achievement: number;
  new_visits_achievement: number;
  repeat_visits_achievement: number;
  orders_achievement: number;
  order_value_achievement: number;
  overall_achievement: number;
}
