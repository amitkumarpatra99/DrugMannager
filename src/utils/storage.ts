import type { User, Medicine, Order, ResetRequest, ActivityLog } from '../types';
import { mockInventory } from '../data/mockInventory';

const KEYS = {
  USERS: 'med_shop_users',
  INVENTORY: 'med_shop_inventory',
  ORDERS: 'med_shop_orders',
  RESETS: 'med_shop_resets',
  LOGS: 'med_shop_logs',
  SESSION: 'med_shop_session'
};

// Default Administrator Account
const DEFAULT_ADMIN: User = {
  id: 'admin-1',
  emailOrPhone: 'admin@shop.com',
  password: 'admin123',
  role: 'admin',
  name: 'Global Administrator'
};

// Initialize DB with defaults if empty
export const initializeDB = () => {
  // Users table
  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify([DEFAULT_ADMIN]));
  }
  // Inventory table
  if (!localStorage.getItem(KEYS.INVENTORY)) {
    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(mockInventory));
  }
  // Orders table
  if (!localStorage.getItem(KEYS.ORDERS)) {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify([]));
  }
  // Reset Requests table
  if (!localStorage.getItem(KEYS.RESETS)) {
    localStorage.setItem(KEYS.RESETS, JSON.stringify([]));
  }
  // Logs table
  if (!localStorage.getItem(KEYS.LOGS)) {
    const initialLog: ActivityLog = {
      id: 'log-init',
      message: 'System database initialized with default Admin and Inventory catalog.',
      timestamp: new Date().toLocaleString(),
      type: 'info'
    };
    localStorage.setItem(KEYS.LOGS, JSON.stringify([initialLog]));
  }
};

// Run initialization immediately on load
initializeDB();

// General helper getters & setters
export const getStoredUsers = (): User[] => {
  return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
};

export const setStoredUsers = (users: User[]): void => {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
};

export const getStoredInventory = (): Medicine[] => {
  return JSON.parse(localStorage.getItem(KEYS.INVENTORY) || '[]');
};

export const setStoredInventory = (inventory: Medicine[]): void => {
  localStorage.setItem(KEYS.INVENTORY, JSON.stringify(inventory));
};

export const getStoredOrders = (): Order[] => {
  return JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]');
};

export const setStoredOrders = (orders: Order[]): void => {
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
};

export const getStoredResets = (): ResetRequest[] => {
  return JSON.parse(localStorage.getItem(KEYS.RESETS) || '[]');
};

export const setStoredResets = (resets: ResetRequest[]): void => {
  localStorage.setItem(KEYS.RESETS, JSON.stringify(resets));
};

export const getStoredLogs = (): ActivityLog[] => {
  return JSON.parse(localStorage.getItem(KEYS.LOGS) || '[]');
};

export const setStoredLogs = (logs: ActivityLog[]): void => {
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
};

export const getStoredSession = (): User | null => {
  const session = localStorage.getItem(KEYS.SESSION);
  return session ? JSON.parse(session) : null;
};

export const setStoredSession = (user: User | null): void => {
  if (user) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
  } else {
    localStorage.removeItem(KEYS.SESSION);
  }
};

// Logging helper
export const addActivityLog = (message: string, type: ActivityLog['type'] = 'info'): void => {
  const logs = getStoredLogs();
  const newLog: ActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    message,
    timestamp: new Date().toLocaleString(),
    type
  };
  setStoredLogs([newLog, ...logs].slice(0, 150)); // Keep last 150 logs
};

// Raw JSON control for Admin panel
export const getRawDatabase = (): string => {
  const db: Record<string, any> = {};
  Object.keys(KEYS).forEach((key) => {
    const rawVal = localStorage.getItem((KEYS as any)[key]);
    db[key] = rawVal ? JSON.parse(rawVal) : null;
  });
  return JSON.stringify(db, null, 2);
};

export const importDatabase = (rawJson: string): boolean => {
  try {
    const db = JSON.parse(rawJson);
    Object.keys(KEYS).forEach((key) => {
      if (db[key] !== undefined) {
        if (db[key] === null) {
          localStorage.removeItem((KEYS as any)[key]);
        } else {
          localStorage.setItem((KEYS as any)[key], JSON.stringify(db[key]));
        }
      }
    });
    // Add log
    addActivityLog('System database imported/restored by Administrator.', 'warning');
    return true;
  } catch (e) {
    console.error('Failed to import database:', e);
    return false;
  }
};

// Reset system to defaults
export const resetSystemDatabase = (): void => {
  localStorage.removeItem(KEYS.USERS);
  localStorage.removeItem(KEYS.INVENTORY);
  localStorage.removeItem(KEYS.ORDERS);
  localStorage.removeItem(KEYS.RESETS);
  localStorage.removeItem(KEYS.LOGS);
  localStorage.removeItem(KEYS.SESSION);
  initializeDB();
};
