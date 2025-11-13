// Database Types
export interface Salesman {
  id: string;
  name: string;
  phone: string;
  email?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  description?: string;
  category?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Competitor {
  id: string;
  name: string;
  created_at: string;
}

export type MeetingType = 'Introduction' | 'Enquiry' | 'Order' | 'Payment' | 'Follow-up';
export type NextActionType = 'Meeting' | 'Send Sample' | 'Visit Again with Management' | 'Invite to Factory';
export type PotentialLevel = 'High' | 'Medium' | 'Low';

export interface Visit {
  id: string;
  salesman_id: string;
  customer_id: string;
  customer_name: string;
  contact_person?: string;
  meeting_type: MeetingType[];
  products_discussed: string[]; // Array of product IDs
  next_action?: NextActionType;
  next_action_date?: string;
  potential: PotentialLevel;
  competitor_name?: string;
  can_be_switched?: boolean;
  remarks?: string;
  gps_latitude: number;
  gps_longitude: number;
  time_in: string;
  time_out?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
  offline_id?: string; // For offline tracking
}

// Relational Types
export interface VisitWithDetails extends Visit {
  salesman?: Salesman;
  customer?: Customer;
  products?: Product[];
}

// Form Types
export interface VisitFormData {
  customer_name: string;
  contact_person?: string;
  meeting_type: MeetingType[];
  products_discussed: string[];
  next_action?: NextActionType;
  next_action_date?: Date;
  potential: PotentialLevel;
  competitor_name?: string;
  can_be_switched?: boolean;
  remarks?: string;
}

// Analytics Types
export interface SalesmanStats {
  salesman_id: string;
  salesman_name: string;
  total_visits: number;
  introductions: number;
  enquiries: number;
  orders: number;
  payments: number;
  follow_ups: number;
  hit_ratio: number;
  pipeline_value?: number;
}

export interface ProductStats {
  product_id: string;
  product_name: string;
  discussion_count: number;
  conversion_count: number;
}

export interface CustomerVisitHistory {
  customer_id: string;
  customer_name: string;
  visit_count: number;
  last_visit: string;
  total_potential: PotentialLevel;
}
