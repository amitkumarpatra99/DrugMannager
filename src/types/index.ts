export interface User {
  id: string;
  emailOrPhone: string;
  password: string;
  role: 'patient' | 'shop' | 'admin';
  name?: string;
  address?: string;
}

export interface Medicine {
  id: string;
  name: string;
  price: number;
  stock: number;
  dosage: string;
  category: string;
}

export interface BillItem {
  medicineId: string;
  name: string;
  price: number;
  quantity: number;
}

export type OrderStatus = 'submitted' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  prescriptionUrl: string; // Base64 data URL or mockup string
  status: OrderStatus;
  pickupStart: string; // e.g. "14:00"
  pickupEnd: string;   // e.g. "16:00"
  items: BillItem[];
  totalBill: number;
  tax: number;
  createdAt: string;
  billNumber?: string;
  suggestedItems?: BillItem[];
}

export interface ResetRequest {
  id: string;
  emailOrPhone: string;
  role: 'patient' | 'shop';
  status: 'pending' | 'resolved';
  requestedAt: string;
  tempPassword?: string;
}

export interface ActivityLog {
  id: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'danger';
}
