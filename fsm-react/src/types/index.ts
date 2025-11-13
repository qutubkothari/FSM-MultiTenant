export interface User {
  id: string;
  phone: string;
  name: string;
  role: 'admin' | 'salesman';
  email?: string;
  created_at: string;
  is_active: boolean;
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
