import React, { useState, useEffect } from 'react';
import type { User, ResetRequest, ActivityLog, Medicine, Order, OrderStatus } from '../types';
import { 
  getStoredUsers, setStoredUsers, getStoredResets, setStoredResets, 
  getStoredLogs, setStoredLogs, getRawDatabase, importDatabase, 
  resetSystemDatabase, addActivityLog, getStoredInventory, setStoredInventory,
  getStoredOrders, setStoredOrders
} from '../utils/storage';
import { 
  Users, Key, ShieldAlert, Terminal, Trash2, Edit, Save, 
  Download, Upload, CheckCircle, RefreshCw, LogOut, Search,
  ShoppingBag, Plus, Pill, TrendingUp, Eye, Receipt, 
  Calendar, FileText, UserPlus, Shield, BarChart2
} from 'lucide-react';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'inventory' | 'orders' | 'resets' | 'logs' | 'database'>('dashboard');
  
  // Storage lists
  const [users, setUsers] = useState<User[]>([]);
  const [resets, setResets] = useState<ResetRequest[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [inventory, setInventory] = useState<Medicine[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rawDbJson, setRawDbJson] = useState<string>('');

  // Editing state for users
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editRole, setEditRole] = useState<'patient' | 'shop' | 'admin'>('patient');
  const [editPassword, setEditPassword] = useState<string>('');

  // Add User State
  const [isAddingUser, setIsAddingUser] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<'patient' | 'shop' | 'admin'>('patient');
  const [newUserAddress, setNewUserAddress] = useState<string>('');

  // Add Medicine State
  const [isAddingMed, setIsAddingMed] = useState<boolean>(false);
  const [newMedName, setNewMedName] = useState<string>('');
  const [newMedPrice, setNewMedPrice] = useState<number>(10);
  const [newMedStock, setNewMedStock] = useState<number>(50);
  const [newMedDosage, setNewMedDosage] = useState<string>('1 daily');
  const [newMedCategory, setNewMedCategory] = useState<string>('General');

  // Reset modal state
  const [selectedReset, setSelectedReset] = useState<ResetRequest | null>(null);
  const [newTempPassword, setNewTempPassword] = useState<string>('');

  // Search/Filters
  const [userSearch, setUserSearch] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  
  const [inventorySearch, setInventorySearch] = useState<string>('');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'low'>('all');
  
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [orderFilter, setOrderFilter] = useState<string>('all');

  const [logFilter, setLogFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState<string>('');
  const [logPage, setLogPage] = useState<number>(1);
  const logsPerPage = 15;

  // DB messages
  const [dbStatus, setDbStatus] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  // View prescription & invoice modals
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [activePrescriptionUrl, setActivePrescriptionUrl] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();

    const handleStorageChange = (e: StorageEvent) => {
      const keysToWatch = [
        'med_shop_users', 
        'med_shop_resets', 
        'med_shop_logs', 
        'med_shop_orders', 
        'med_shop_inventory'
      ];
      if (e.key && keysToWatch.includes(e.key)) {
        loadAllData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [activeTab]);

  const loadAllData = () => {
    setUsers(getStoredUsers());
    setResets(getStoredResets());
    setLogs(getStoredLogs());
    setInventory(getStoredInventory());
    setOrders(getStoredOrders());
    setRawDbJson(getRawDatabase());
  };

  // User Management CRUD
  const handleStartEditUser = (u: User) => {
    setEditingUserId(u.id);
    setEditName(u.name || '');
    setEditAddress(u.address || '');
    setEditRole(u.role);
    setEditPassword(u.password);
  };

  const handleSaveUser = (userId: string) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        addActivityLog(`Admin updated user profile for ${u.emailOrPhone} (${u.role}).`, 'info');
        return {
          ...u,
          name: editName,
          address: editAddress,
          role: editRole,
          password: editPassword
        };
      }
      return u;
    });
    setStoredUsers(updatedUsers);
    setEditingUserId(null);
    loadAllData();
  };

  const handleDeleteUser = (u: User) => {
    if (u.id === 'admin-1') {
      alert('Cannot delete primary system administrator!');
      return;
    }
    if (confirm(`Are you sure you want to delete account: ${u.emailOrPhone} (${u.role})?`)) {
      const updated = users.filter(usr => usr.id !== u.id);
      setStoredUsers(updated);
      addActivityLog(`Admin deleted user account: ${u.emailOrPhone} (${u.role}).`, 'danger');
      loadAllData();
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword || !newUserName) {
      alert('Please fill in Name, Email/Phone, and Password fields.');
      return;
    }

    const currentUsers = getStoredUsers();
    const exists = currentUsers.some(u => u.emailOrPhone.toLowerCase() === newUserEmail.toLowerCase());
    if (exists) {
      alert('An account with this email/phone number already exists in the system database.');
      return;
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      emailOrPhone: newUserEmail,
      password: newUserPassword,
      role: newUserRole,
      name: newUserName,
      address: newUserAddress
    };

    setStoredUsers([...currentUsers, newUser]);
    addActivityLog(`Admin created a new ${newUserRole} account: ${newUserEmail}.`, 'success');

    // Reset inputs
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserAddress('');
    setNewUserRole('patient');
    setIsAddingUser(false);
    loadAllData();
  };

  // Medicine Inventory Management
  const handleAddMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName || newMedPrice <= 0 || newMedStock < 0 || !newMedDosage || !newMedCategory) {
      alert('Please fill in all medicine details correctly.');
      return;
    }

    const currentInv = getStoredInventory();
    const newMed: Medicine = {
      id: `med-${Date.now()}`,
      name: newMedName,
      price: Number(newMedPrice),
      stock: Number(newMedStock),
      dosage: newMedDosage,
      category: newMedCategory
    };

    setStoredInventory([...currentInv, newMed]);
    addActivityLog(`Admin cataloged new medicine: '${newMedName}' (Price: ₹${newMedPrice}, Stock: ${newMedStock}).`, 'success');

    // Reset inputs
    setNewMedName('');
    setNewMedPrice(10);
    setNewMedStock(50);
    setNewMedDosage('1 daily');
    setNewMedCategory('General');
    setIsAddingMed(false);
    loadAllData();
  };

  const handleDeleteMedicine = (medId: string, medName: string) => {
    if (confirm(`Are you sure you want to permanently delete '${medName}' from the medicine catalog?`)) {
      const current = getStoredInventory();
      const updated = current.filter(m => m.id !== medId);
      setStoredInventory(updated);
      addActivityLog(`Admin deleted medicine '${medName}' from the database catalog.`, 'danger');
      loadAllData();
    }
  };

  const handleRefillStock = (med: Medicine) => {
    const addQty = prompt(`Enter units to add to stock for ${med.name}:`, '50');
    if (addQty !== null) {
      const parsed = parseInt(addQty, 10);
      if (!isNaN(parsed) && parsed > 0) {
        const updated = inventory.map(m => m.id === med.id ? { ...m, stock: m.stock + parsed } : m);
        setStoredInventory(updated);
        addActivityLog(`Admin increased stock for ${med.name} by +${parsed} units.`, 'success');
        loadAllData();
      } else {
        alert('Invalid stock quantity value.');
      }
    }
  };

  const handleModifyPrice = (med: Medicine) => {
    const newPrice = prompt(`Enter new price (₹) for ${med.name}:`, med.price.toString());
    if (newPrice !== null) {
      const parsed = parseFloat(newPrice);
      if (!isNaN(parsed) && parsed > 0) {
        const updated = inventory.map(m => m.id === med.id ? { ...m, price: parsed } : m);
        setStoredInventory(updated);
        addActivityLog(`Admin updated price for ${med.name} to ₹${parsed}.`, 'info');
        loadAllData();
      } else {
        alert('Invalid pricing value.');
      }
    }
  };

  // Order Console Management
  const handleUpdateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    const allOrders = getStoredOrders();
    const updated = allOrders.map(o => {
      if (o.id === orderId) {
        addActivityLog(`Admin forced update order status of ${orderId} to '${nextStatus}'.`, 'warning');
        return { ...o, status: nextStatus };
      }
      return o;
    });
    setStoredOrders(updated);
    loadAllData();
  };

  const handleDeleteOrder = (orderId: string) => {
    if (confirm(`CRITICAL: Are you sure you want to permanently delete order record ${orderId} from the database?`)) {
      const allOrders = getStoredOrders();
      const updated = allOrders.filter(o => o.id !== orderId);
      setStoredOrders(updated);
      addActivityLog(`Admin permanently deleted order record ${orderId} from the database.`, 'danger');
      loadAllData();
    }
  };

  // Password Reset Processing
  const handleOpenResetModal = (req: ResetRequest) => {
    setSelectedReset(req);
    setNewTempPassword(`RESET-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleApplyPasswordReset = () => {
    if (!selectedReset || !newTempPassword) return;

    const currentUsers = getStoredUsers();
    const userToUpdateIndex = currentUsers.findIndex(
      u => u.emailOrPhone.toLowerCase() === selectedReset.emailOrPhone.toLowerCase() && u.role === selectedReset.role
    );
    
    if (userToUpdateIndex === -1) {
      alert('Error: The user account requesting reset no longer exists.');
      setSelectedReset(null);
      return;
    }

    currentUsers[userToUpdateIndex].password = newTempPassword;
    setStoredUsers(currentUsers);

    const currentResets = getStoredResets();
    const updatedResets = currentResets.map(r => {
      if (r.id === selectedReset.id) {
        return {
          ...r,
          status: 'resolved' as const,
          tempPassword: newTempPassword
        };
      }
      return r;
    });
    setStoredResets(updatedResets);

    addActivityLog(`Admin processed password reset for ${selectedReset.emailOrPhone}. Temp password issued: ${newTempPassword}.`, 'success');
    setSelectedReset(null);
    loadAllData();
  };

  // Database Console Actions
  const handleSaveRawDb = () => {
    setDbStatus({ text: '', type: '' });
    const success = importDatabase(rawDbJson);
    if (success) {
      setDbStatus({ text: 'Database synced successfully with local storage state!', type: 'success' });
      addActivityLog('Admin modified raw database via direct JSON editor.', 'warning');
      loadAllData();
    } else {
      setDbStatus({ text: 'Failed to update database. Verify JSON syntax and keys structure.', type: 'error' });
    }
    setTimeout(() => setDbStatus({ text: '', type: '' }), 4000);
  };

  const handleExportDb = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(rawDbJson);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mediquick_full_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addActivityLog('Admin exported database backup file.', 'info');
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setRawDbJson(content);
        const success = importDatabase(content);
        if (success) {
          setDbStatus({ text: 'Database file imported and synced successfully!', type: 'success' });
          loadAllData();
        } else {
          setDbStatus({ text: 'Failed to import JSON file. Please check structure.', type: 'error' });
        }
        setTimeout(() => setDbStatus({ text: '', type: '' }), 4000);
      };
      reader.readAsText(file);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('CRITICAL WARNING: This will wipe all orders, users, catalog items and reset to defaults. Proceed?')) {
      resetSystemDatabase();
      loadAllData();
      addActivityLog('Admin triggered a full system database reset.', 'danger');
      setDbStatus({ text: 'Database completely reset to initial default state.', type: 'success' });
      setTimeout(() => setDbStatus({ text: '', type: '' }), 4000);
    }
  };

  const handleClearActivityLogs = () => {
    if (confirm('Are you sure you want to wipe all system logs?')) {
      setStoredLogs([]);
      addActivityLog('Admin wiped all system activity logs.', 'warning');
      loadAllData();
    }
  };

  const handleGenerateMockLogs = () => {
    const mockEvents = [
      { msg: 'Patient user registered a new account: pat-9821@gmail.com', type: 'success' },
      { msg: 'Shop staff compiled order invoice for ORD-4921', type: 'info' },
      { msg: 'Inventory replenishment: Dolo 650mg +100 units refilled', type: 'success' },
      { msg: 'System check: automated cache buffers synchronized', type: 'info' },
      { msg: 'Security firewall blocks an unauthorized credential retrieval attempt', type: 'danger' },
      { msg: 'Shop staff updated price of Amoxicillin 500mg to ₹85.00', type: 'warning' }
    ];
    
    let currentLogs = getStoredLogs();
    mockEvents.forEach((ev, index) => {
      const mockLog: ActivityLog = {
        id: `mock-log-${Date.now()}-${index}`,
        message: ev.msg,
        timestamp: new Date(Date.now() - (index + 1) * 3600000).toLocaleString(),
        type: ev.type as any
      };
      currentLogs = [mockLog, ...currentLogs];
    });
    setStoredLogs(currentLogs.slice(0, 150));
    loadAllData();
  };

  // Helper to color log levels
  const getLogTypeColor = (type: ActivityLog['type']) => {
    switch (type) {
      case 'success': return 'var(--clr-success)';
      case 'warning': return 'var(--clr-warning)';
      case 'danger': return 'var(--clr-danger)';
      default: return 'var(--text-secondary)';
    }
  };

  // Data Filtering
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.emailOrPhone.toLowerCase().includes(userSearch.toLowerCase()) || 
      (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.address && u.address.toLowerCase().includes(userSearch.toLowerCase()));
    
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredInventory = inventory.filter(med => {
    const matchesSearch = med.name.toLowerCase().includes(inventorySearch.toLowerCase()) || 
      med.dosage.toLowerCase().includes(inventorySearch.toLowerCase()) || 
      med.category.toLowerCase().includes(inventorySearch.toLowerCase());
    const matchesLowStock = inventoryFilter === 'all' || med.stock < 10;
    return matchesSearch && matchesLowStock;
  });

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(orderSearch.toLowerCase()) || 
      o.patientName.toLowerCase().includes(orderSearch.toLowerCase()) || 
      o.patientPhone.toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.billNumber && o.billNumber.toLowerCase().includes(orderSearch.toLowerCase()));
    const matchesStatus = orderFilter === 'all' || o.status === orderFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredLogs = logs.filter(log => {
    const matchesType = logFilter === 'all' || log.type === logFilter;
    const matchesSearch = log.message.toLowerCase().includes(logSearch.toLowerCase()) || 
      log.timestamp.toLowerCase().includes(logSearch.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Pagination for logs
  const totalLogPages = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage));
  const paginatedLogs = filteredLogs.slice((logPage - 1) * logsPerPage, logPage * logsPerPage);

  // Analytics Calculations
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.totalBill, 0);
  const pendingResetsCount = resets.filter(r => r.status === 'pending').length;
  const lowStockCount = inventory.filter(m => m.stock < 10).length;
  const totalMedicinesCount = inventory.reduce((sum, m) => sum + m.stock, 0);

  const patientCount = users.filter(u => u.role === 'patient').length;
  const shopCount = users.filter(u => u.role === 'shop').length;
  const adminCount = users.filter(u => u.role === 'admin').length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <div style={{
            background: 'var(--clr-primary-glow)',
            color: 'var(--clr-primary)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)'
          }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem' }} className="gradient-text">Admin Console</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Host Systems Portal</span>
          </div>
        </div>

        {/* Admin Profile Card */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-muted)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem 1rem',
          marginBottom: '1rem'
        }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Shield size={14} style={{ color: 'var(--clr-primary)' }} />
            {user.name || 'System Administrator'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            {user.emailOrPhone}
          </p>
        </div>

        <ul className="nav-menu" style={{ flex: 1 }}>
          <li>
            <a 
              className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveTab('dashboard'); }}
            >
              <BarChart2 size={18} />
              Overview & Analytics
            </a>
          </li>
          <li>
            <a 
              className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => { setActiveTab('users'); }}
            >
              <Users size={18} />
              User Accounts ({users.length})
            </a>
          </li>
          <li>
            <a 
              className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => { setActiveTab('inventory'); }}
            >
              <Pill size={18} />
              Medicine Inventory ({inventory.length})
            </a>
          </li>
          <li>
            <a 
              className={`nav-link ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => { setActiveTab('orders'); }}
            >
              <ShoppingBag size={18} />
              Customer Orders ({orders.length})
            </a>
          </li>
          <li>
            <a 
              className={`nav-link ${activeTab === 'resets' ? 'active' : ''}`}
              onClick={() => { setActiveTab('resets'); }}
            >
              <Key size={18} />
              Password Resets ({pendingResetsCount})
            </a>
          </li>
          <li>
            <a 
              className={`nav-link ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => { setActiveTab('logs'); setLogPage(1); }}
            >
              <Terminal size={18} />
              System Activity Logs
            </a>
          </li>
          <li>
            <a 
              className={`nav-link ${activeTab === 'database' ? 'active' : ''}`}
              onClick={() => { setActiveTab('database'); }}
            >
              <Terminal size={18} style={{ color: 'var(--clr-warning)' }} />
              Database Console
            </a>
          </li>
        </ul>

        <button onClick={onLogout} className="btn btn-secondary" style={{ width: '100%', marginTop: 'auto' }}>
          <LogOut size={16} />
          Sign Out
        </button>
      </aside>

      {/* Main Content Space */}
      <main className="main-content">
        <header style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>
            Root <span className="gradient-text">System Administration</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Control user directories, process credential resets, inspect live activities, manage catalogs, and directly debug storage structures.
          </p>
        </header>

        {/* Global Statistics */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total User Accounts</span>
            <h3 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--clr-primary)' }}>{users.length}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {patientCount} Patients • {shopCount} Shops • {adminCount} Admins
            </span>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Sales Revenue</span>
            <h3 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--clr-success)' }}>
              ₹{totalRevenue.toFixed(2)}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              From {completedOrders.length} fulfilled orders
            </span>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Inventory Health</span>
            <h3 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: lowStockCount > 0 ? 'var(--clr-danger)' : 'var(--clr-primary)' }}>
              {lowStockCount} Low Alert{lowStockCount !== 1 ? 's' : ''}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {totalMedicinesCount} total units in stock
            </span>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pending Password Resets</span>
            <h3 style={{ fontSize: '2.0rem', fontWeight: 800, marginTop: '0.25rem', color: pendingResetsCount > 0 ? 'var(--clr-warning)' : 'var(--text-muted)' }}>
              {pendingResetsCount}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Awaiting credentials override
            </span>
          </div>
        </section>

        {/* Dynamic Tab Body */}
        
        {/* TAB 1: DASHBOARD / OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
            {/* Main stats block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <section className="glass-panel" style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={20} style={{ color: 'var(--clr-primary)' }} />
                  System Metrics & Funnel
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.12)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-muted)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Orders Funnel Breakdown</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>Submitted (Awaiting review)</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--clr-info)' }}>{orders.filter(o => o.status === 'submitted').length}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>Preparing / Packing</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--clr-warning)' }}>{orders.filter(o => o.status === 'preparing').length}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>Ready for Pickup</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--clr-primary)' }}>{orders.filter(o => o.status === 'ready').length}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>Completed (Paid & Handed Over)</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--clr-success)' }}>{completedOrders.length}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>Cancelled Orders</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--clr-danger)' }}>{orders.filter(o => o.status === 'cancelled').length}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.12)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-muted)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>System Identity Pool</span>
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--clr-primary)' }}></div>
                          <span style={{ fontSize: '0.85rem', flex: 1 }}>Patients Accounts:</span>
                          <span style={{ fontWeight: 'bold' }}>{patientCount}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--clr-warning)' }}></div>
                          <span style={{ fontSize: '0.85rem', flex: 1 }}>Medicine Shops staff:</span>
                          <span style={{ fontWeight: 'bold' }}>{shopCount}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--clr-danger)' }}></div>
                          <span style={{ fontSize: '0.85rem', flex: 1 }}>System Administrators:</span>
                          <span style={{ fontWeight: 'bold' }}>{adminCount}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '0.5rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>System Status:</span>
                      <span style={{ color: 'var(--clr-success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2' }}>
                        <CheckCircle size={10} /> OPERATIONAL
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Recent 5 Logs Preview */}
              <section className="glass-panel" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Terminal size={18} style={{ color: 'var(--clr-primary)' }} />
                    Live System Audits (Recent 5)
                  </h2>
                  <button onClick={() => setActiveTab('logs')} className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}>
                    View All Logs
                  </button>
                </div>
                <div style={{
                  background: '#05070a',
                  border: '1px solid var(--border-muted)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem'
                }}>
                  {logs.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No system logs found.</div>
                  ) : (
                    logs.slice(0, 5).map(log => (
                      <div key={log.id} style={{ display: 'flex', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.3rem', gap: '0.75rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>[{log.timestamp}]</span>
                        <span style={{ color: getLogTypeColor(log.type), flex: 1 }}>{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* Quick action controls panel */}
            <section className="glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={20} style={{ color: 'var(--clr-warning)' }} />
                Administrative Controls
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button onClick={() => setIsAddingUser(true)} className="btn btn-primary" style={{ width: '100%' }}>
                  <UserPlus size={16} />
                  Provision New Account
                </button>
                
                <button onClick={() => setIsAddingMed(true)} className="btn btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <Plus size={16} />
                  Catalog New Drug
                </button>

                <div style={{ borderBottom: '1px solid var(--border-muted)', margin: '0.5rem 0' }}></div>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Storage Backups</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button onClick={handleExportDb} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
                    <Download size={14} /> Export Backup
                  </button>
                  <label className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={14} /> Import File
                    <input type="file" accept=".json" onChange={handleImportFileChange} style={{ display: 'none' }} />
                  </label>
                </div>

                <div style={{ borderBottom: '1px solid var(--border-muted)', margin: '0.5rem 0' }}></div>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Debug / Simulation</p>
                <button onClick={handleGenerateMockLogs} className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}>
                  <RefreshCw size={14} /> Simulate Activity Events
                </button>
                
                <button onClick={handleResetToDefaults} className="btn btn-danger" style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}>
                  Wipe System Database
                </button>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: USER DIRECTORY CRUD */}
        {activeTab === 'users' && (
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} style={{ color: 'var(--clr-primary)' }} />
                User Profiles Directory
              </h2>
              
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {/* Search field */}
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search name/email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '32px', padding: '0.5rem 0.5rem 0.5rem 32px', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Filter select */}
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="form-input"
                  style={{ width: '130px', padding: '0.5rem', fontSize: '0.85rem', background: 'var(--bg-popover)' }}
                >
                  <option value="all">All Roles</option>
                  <option value="patient">Patient</option>
                  <option value="shop">Medicine Shop</option>
                  <option value="admin">System Admin</option>
                </select>

                <button onClick={() => setIsAddingUser(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  <Plus size={16} /> Add User
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Email / Phone</th>
                    <th>User Name</th>
                    <th>Role Gate</th>
                    <th>Plain Password</th>
                    <th>Home/Shop Address</th>
                    <th style={{ textAlign: 'center' }}>Modify Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No user accounts match the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isEditing = editingUserId === u.id;
                      
                      return (
                        <tr key={u.id}>
                          <td>
                            <span style={{ fontWeight: 600 }}>{u.emailOrPhone}</span>
                            {u.id === 'admin-1' && <span className="badge badge-info" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>PRIMARY</span>}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="form-input"
                                style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                              />
                            ) : (
                              u.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Anonymous</span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <select
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value as any)}
                                className="form-input"
                                style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', background: 'var(--bg-popover)' }}
                              >
                                <option value="patient">Patient</option>
                                <option value="shop">Medicine Shop</option>
                                <option value="admin">System Admin</option>
                              </select>
                            ) : (
                              <span className={`badge ${
                                u.role === 'admin' ? 'badge-danger' : u.role === 'shop' ? 'badge-warning' : 'badge-info'
                              }`}>
                                {u.role}
                              </span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                                className="form-input"
                                style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                              />
                            ) : (
                              <code style={{ background: 'rgba(255,255,255,0.04)', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>
                                {u.password}
                              </code>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editAddress}
                                onChange={(e) => setEditAddress(e.target.value)}
                                className="form-input"
                                style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                              />
                            ) : (
                              u.address || <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              {isEditing ? (
                                <button
                                  onClick={() => handleSaveUser(u.id)}
                                  className="btn btn-success"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                  <Save size={12} />
                                  Save
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStartEditUser(u)}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                  <Edit size={12} />
                                  Edit
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(u)}
                                disabled={u.id === 'admin-1'}
                                className="btn btn-danger"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 3: MEDICINE INVENTORY CATALOG MANAGER */}
        {activeTab === 'inventory' && (
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Pill size={20} style={{ color: 'var(--clr-primary)' }} />
                Global Medicine Stock & Catalog
              </h2>
              
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search medicine/dosage..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '32px', padding: '0.5rem 0.5rem 0.5rem 32px', fontSize: '0.85rem' }}
                  />
                </div>

                <select
                  value={inventoryFilter}
                  onChange={(e) => setInventoryFilter(e.target.value as any)}
                  className="form-input"
                  style={{ width: '140px', padding: '0.5rem', fontSize: '0.85rem', background: 'var(--bg-popover)' }}
                >
                  <option value="all">All Medicine</option>
                  <option value="low">Low Stock Alerts</option>
                </select>

                <button onClick={() => setIsAddingMed(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  <Plus size={16} /> Catalog Drug
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Medicine Name</th>
                    <th>Dosage</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Price (₹)</th>
                    <th style={{ textAlign: 'right' }}>Stock Status</th>
                    <th style={{ textAlign: 'center' }}>Modify Catalog</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No medicines cataloged match the filter parameters.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((med) => (
                      <tr key={med.id}>
                        <td style={{ fontWeight: 600 }}>{med.name}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{med.dosage}</td>
                        <td><span className="badge badge-neutral" style={{ textTransform: 'none' }}>{med.category}</span></td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{med.price.toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ marginRight: '0.5rem', fontWeight: 600, color: med.stock < 10 ? 'var(--clr-danger)' : 'var(--text-primary)' }}>
                            {med.stock} units
                          </span>
                          {med.stock < 10 && (
                            <span className="badge badge-danger" style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}>LOW</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleRefillStock(med)}
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                            >
                              + Refill
                            </button>
                            <button
                              onClick={() => handleModifyPrice(med)}
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                            >
                              ₹ Price
                            </button>
                            <button
                              onClick={() => handleDeleteMedicine(med.id, med.name)}
                              className="btn btn-danger"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 4: GLOBAL ORDER MONITOR */}
        {activeTab === 'orders' && (
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={20} style={{ color: 'var(--clr-primary)' }} />
                Global Customer Orders Monitor
              </h2>
              
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search Order ID/Patient..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '32px', padding: '0.5rem 0.5rem 0.5rem 32px', fontSize: '0.85rem' }}
                  />
                </div>

                <select
                  value={orderFilter}
                  onChange={(e) => setOrderFilter(e.target.value)}
                  className="form-input"
                  style={{ width: '150px', padding: '0.5rem', fontSize: '0.85rem', background: 'var(--bg-popover)' }}
                >
                  <option value="all">All Orders</option>
                  <option value="submitted">Submitted</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready for Pickup</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Patient Details</th>
                    <th>Scheduled Slot</th>
                    <th>Submission Time</th>
                    <th>Status Gate</th>
                    <th>Invoice / Value</th>
                    <th style={{ textAlign: 'center' }}>Forced Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No orders recorded in the system match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((o) => (
                        <tr key={o.id}>
                          <td>
                            <span style={{ fontWeight: 700 }}>{o.id}</span>
                            {o.billNumber && (
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No: {o.billNumber}</p>
                            )}
                          </td>
                          <td>
                            <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{o.patientName}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{o.patientPhone}</p>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.85rem', color: 'var(--clr-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Calendar size={12} /> {o.pickupStart} - {o.pickupEnd}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{o.createdAt}</td>
                          <td>
                            <span className={`badge ${
                              o.status === 'submitted' ? 'badge-info' :
                              o.status === 'preparing' ? 'badge-warning' :
                              o.status === 'ready' ? 'badge-success' :
                              o.status === 'completed' ? 'badge-neutral' : 'badge-danger'
                            }`}>
                              {o.status}
                            </span>
                          </td>
                          <td>
                            {o.status === 'ready' || o.status === 'completed' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontWeight: 700, color: 'var(--clr-success)' }}>₹{o.totalBill.toFixed(2)}</span>
                                <button 
                                  onClick={() => setActiveInvoiceOrder(o)}
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                >
                                  <Receipt size={10} /> Bill
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unbilled</span>
                                <button 
                                  onClick={() => setActivePrescriptionUrl(o.prescriptionUrl)}
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                >
                                  <Eye size={10} /> Rx
                                </button>
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                              {o.status === 'submitted' && (
                                <button 
                                  onClick={() => handleUpdateOrderStatus(o.id, 'preparing')}
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                >
                                  Accept
                                </button>
                              )}
                              
                              {o.status !== 'completed' && o.status !== 'cancelled' && (
                                <button 
                                  onClick={() => handleUpdateOrderStatus(o.id, 'cancelled')}
                                  className="btn btn-danger" 
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                >
                                  Cancel
                                </button>
                              )}

                              <button 
                                onClick={() => handleDeleteOrder(o.id)}
                                className="btn btn-danger" 
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.2)' }}
                              >
                                Delete Record
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 5: PASSWORD OVERRIDES */}
        {activeTab === 'resets' && (
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={20} style={{ color: 'var(--clr-primary)' }} />
              Forgot Password Request Queue
            </h2>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Requested User</th>
                    <th>Role Gate</th>
                    <th>Submission Time</th>
                    <th>Status</th>
                    <th>Action / Resolved Password</th>
                  </tr>
                </thead>
                <tbody>
                  {resets.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No forgot password requests found in database.
                      </td>
                    </tr>
                  ) : (
                    resets
                      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
                      .map((req) => (
                        <tr key={req.id}>
                          <td style={{ fontWeight: 600 }}>{req.emailOrPhone}</td>
                          <td>
                            <span className={`badge ${req.role === 'shop' ? 'badge-warning' : 'badge-info'}`}>
                              {req.role}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{req.requestedAt}</td>
                          <td>
                            <span className={`badge ${req.status === 'pending' ? 'badge-warning' : 'badge-neutral'}`}>
                              {req.status}
                            </span>
                          </td>
                          <td>
                            {req.status === 'pending' ? (
                              <button
                                onClick={() => handleOpenResetModal(req)}
                                className="btn btn-primary"
                                style={{ padding: '0.35rem 1rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <Key size={12} />
                                Reset Password
                              </button>
                            ) : (
                              <div>
                                <span style={{ color: 'var(--clr-success)', fontSize: '0.85rem', fontWeight: 600 }}>Resolved</span>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  Reset to: <code>{req.tempPassword}</code>
                                </p>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 6: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={20} style={{ color: 'var(--clr-primary)' }} />
                Real-Time Audit Logs
              </h2>
              
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search logs description..."
                    value={logSearch}
                    onChange={(e) => { setLogSearch(e.target.value); setLogPage(1); }}
                    className="form-input"
                    style={{ paddingLeft: '32px', padding: '0.5rem 0.5rem 0.5rem 32px', fontSize: '0.85rem' }}
                  />
                </div>

                <select
                  value={logFilter}
                  onChange={(e) => { setLogFilter(e.target.value); setLogPage(1); }}
                  className="form-input"
                  style={{ width: '130px', padding: '0.5rem', fontSize: '0.85rem', background: 'var(--bg-popover)' }}
                >
                  <option value="all">All Logs</option>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="danger">Danger</option>
                </select>

                <button onClick={handleClearActivityLogs} className="btn btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  Clear Logs
                </button>
              </div>
            </div>

            <div style={{
              background: '#05070a',
              border: '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              fontFamily: 'Consolas, Monaco, monospace',
              maxHeight: '480px',
              overflowY: 'auto',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}>
              {paginatedLogs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                  No system activity logs found matching the filter description.
                </div>
              ) : (
                paginatedLogs.map((log) => (
                  <div key={log.id} style={{ display: 'flex', marginBottom: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.4rem', gap: '1rem' }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: '160px' }}>[{log.timestamp}]</span>
                    <span style={{ color: 'var(--clr-primary)', fontWeight: 600 }}>[SYSTEM]</span>
                    <span style={{ color: getLogTypeColor(log.type), flex: 1 }}>{log.message}</span>
                    <span style={{ color: getLogTypeColor(log.type), fontSize: '0.75rem', opacity: 0.8 }}>({log.type})</span>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {totalLogPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Page {logPage} of {totalLogPages} (Total {filteredLogs.length} entries)
                </span>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setLogPage(prev => Math.max(prev - 1, 1))}
                    disabled={logPage === 1}
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    Prev
                  </button>
                  <button 
                    onClick={() => setLogPage(prev => Math.min(prev + 1, totalLogPages))}
                    disabled={logPage === totalLogPages}
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 7: STORAGE DATA CONSOLE */}
        {activeTab === 'database' && (
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Terminal size={20} style={{ color: 'var(--clr-warning)' }} />
              Live localStorage JSON Console
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.4 }}>
              Directly edit the raw database below to mock states, clean up mock transactions, or fix syntax data bugs in real time.
            </p>

            {dbStatus.text && (
              <div style={{
                background: dbStatus.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${dbStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: dbStatus.type === 'success' ? 'var(--clr-success)' : 'var(--clr-danger)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                fontSize: '0.85rem',
                marginBottom: '1.25rem'
              }}>
                {dbStatus.text}
              </div>
            )}

            {/* JSON Code area */}
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <textarea
                value={rawDbJson}
                onChange={(e) => setRawDbJson(e.target.value)}
                style={{
                  width: '100%',
                  height: '380px',
                  background: '#05070a',
                  color: '#34d399',
                  border: '1px solid var(--border-muted)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '0.825rem',
                  lineHeight: 1.4,
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Console Toolbar buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={handleSaveRawDb} className="btn btn-primary" style={{ background: 'var(--clr-success)', color: '#000' }}>
                  <Save size={16} />
                  Save Database Changes
                </button>
                <button onClick={handleExportDb} className="btn btn-secondary">
                  <Download size={16} />
                  Export JSON Backup
                </button>
                
                <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                  <Upload size={16} />
                  Import JSON File
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <button onClick={handleResetToDefaults} className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <RefreshCw size={14} />
                Full Wipe & Reset
              </button>
            </div>
          </section>
        )}
      </main>

      {/* MODAL 1: Fulfill Password Reset Overrides */}
      {selectedReset && (
        <div className="modal-overlay" onClick={() => setSelectedReset(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem' }}>Fulfill Password Reset</h3>
              <button onClick={() => setSelectedReset(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer' }}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Issuing new password credentials for: <br />
                <strong>{selectedReset.emailOrPhone}</strong> ({selectedReset.role} account).
              </p>
              
              <div className="form-group">
                <label className="form-label">Temporary Password</label>
                <input
                  type="text"
                  required
                  value={newTempPassword}
                  onChange={(e) => setNewTempPassword(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedReset(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleApplyPasswordReset}>Apply & Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Create User Form Account Modal */}
      {isAddingUser && (
        <div className="modal-overlay" onClick={() => setIsAddingUser(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <form onSubmit={handleCreateUser}>
              <div className="modal-header">
                <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserPlus style={{ color: 'var(--clr-primary)' }} />
                  Provision System User Account
                </h3>
                <button type="button" onClick={() => setIsAddingUser(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer' }}>
                  &times;
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Email or Phone Number (Unique Login ID) *</label>
                  <input
                    type="text"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="e.g. name@shop.com or 9988776655"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">User Profile Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. Dr. Amit Kumar"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Sign In Password *</label>
                  <input
                    type="password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Specify login password credentials"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Account Role Designation *</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="form-input"
                    style={{ background: 'var(--bg-popover)' }}
                  >
                    <option value="patient">Patient (Medicine Customer)</option>
                    <option value="shop">Medicine Shop Staff</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Store address or Delivery Address (Optional)</label>
                  <input
                    type="text"
                    value={newUserAddress}
                    onChange={(e) => setNewUserAddress(e.target.value)}
                    placeholder="Home address or shop location details"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddingUser(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create User Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Create Medicine catalog item Modal */}
      {isAddingMed && (
        <div className="modal-overlay" onClick={() => setIsAddingMed(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <form onSubmit={handleAddMedicine}>
              <div className="modal-header">
                <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Pill style={{ color: 'var(--clr-primary)' }} />
                  Catalog New Drug Item
                </h3>
                <button type="button" onClick={() => setIsAddingMed(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer' }}>
                  &times;
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Medicine Item Name *</label>
                  <input
                    type="text"
                    required
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    placeholder="e.g. Paracetamol 650mg (Dolo)"
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Unit Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min={0.01}
                      step={0.01}
                      value={newMedPrice}
                      onChange={(e) => setNewMedPrice(parseFloat(e.target.value))}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Initial Stock Count *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newMedStock}
                      onChange={(e) => setNewMedStock(parseInt(e.target.value, 10))}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Recommended Dosage instructions *</label>
                  <input
                    type="text"
                    required
                    value={newMedDosage}
                    onChange={(e) => setNewMedDosage(e.target.value)}
                    placeholder="e.g. 1 tab as needed for fever"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category Classification *</label>
                  <input
                    type="text"
                    required
                    value={newMedCategory}
                    onChange={(e) => setNewMedCategory(e.target.value)}
                    placeholder="e.g. Analgesic, Antibiotic, General"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddingMed(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Catalog Medicine</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Invoice Receipt billing details Modal */}
      {activeInvoiceOrder && (
        <div className="modal-overlay" onClick={() => setActiveInvoiceOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Receipt size={20} style={{ color: 'var(--clr-primary)' }} />
                Order Record Details: {activeInvoiceOrder.id}
              </h3>
              <button 
                onClick={() => setActiveInvoiceOrder(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              {/* Receipt Layout */}
              <div id="invoice-print-area" style={{ background: '#111625', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                
                {/* Shop Banner */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '1px dashed var(--border-muted)', paddingBottom: '1rem' }}>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }} className="gradient-text">MEDIQUICK PHARMACY</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>102 Cyber Plaza, Medical Hub, Delhi</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tel: +91 9988776655 | License No: DL-88921</p>
                </div>

                {/* Details Meta */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  <div>
                    <p><strong>Patient Name:</strong> {activeInvoiceOrder.patientName}</p>
                    <p><strong>Phone:</strong> {activeInvoiceOrder.patientPhone}</p>
                    <p><strong>Scheduled Pickup:</strong> {activeInvoiceOrder.pickupStart} - {activeInvoiceOrder.pickupEnd}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p><strong>Bill No:</strong> {activeInvoiceOrder.billNumber || 'PENDING'}</p>
                    <p><strong>Date:</strong> {activeInvoiceOrder.createdAt}</p>
                    <p><strong>Status:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{activeInvoiceOrder.status}</span></p>
                  </div>
                </div>

                {/* Items Table */}
                {activeInvoiceOrder.items && activeInvoiceOrder.items.length > 0 ? (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-muted)', color: 'var(--text-secondary)' }}>
                          <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>Medicine</th>
                          <th style={{ textAlign: 'center', padding: '0.5rem 0' }}>Qty</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Price</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeInvoiceOrder.items.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '0.6rem 0' }}>{item.name}</td>
                            <td style={{ textAlign: 'center', padding: '0.6rem 0' }}>{item.quantity}</td>
                            <td style={{ textAlign: 'right', padding: '0.6rem 0' }}>₹{item.price.toFixed(2)}</td>
                            <td style={{ textAlign: 'right', padding: '0.6rem 0' }}>₹{(item.price * item.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pricing calculations */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', marginTop: '1rem', borderTop: '1px solid var(--border-muted)', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
                      <p style={{ color: 'var(--text-secondary)' }}>Subtotal: <strong>₹{(activeInvoiceOrder.totalBill - activeInvoiceOrder.tax).toFixed(2)}</strong></p>
                      <p style={{ color: 'var(--text-secondary)' }}>GST (12%): <strong>₹{activeInvoiceOrder.tax.toFixed(2)}</strong></p>
                      <p style={{ fontSize: '1.05rem', color: 'var(--clr-primary)', fontWeight: 'bold', marginTop: '0.25rem' }}>
                        Total Payable: ₹{activeInvoiceOrder.totalBill.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-muted)' }}>
                    <p style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>Prescription is currently under review by shop pharmacists.</p>
                  </div>
                )}

                {/* Prescription Image Attachment Preview */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px dashed var(--border-muted)', paddingTop: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Attached Prescription Sheet:</span>
                  <div style={{ 
                    maxHeight: '150px', 
                    overflow: 'hidden', 
                    borderRadius: 'var(--radius-sm)', 
                    border: '1px solid var(--border-muted)',
                    display: 'flex',
                    justifyContent: 'center',
                    background: '#000'
                  }}>
                    <img 
                      src={activeInvoiceOrder.prescriptionUrl} 
                      alt="Prescription" 
                      style={{ maxWidth: '100%', objectFit: 'contain' }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer no-print">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setActiveInvoiceOrder(null)}
              >
                Close Window
              </button>
              {(activeInvoiceOrder.status === 'ready' || activeInvoiceOrder.status === 'completed') && (
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handlePrint}
                >
                  <FileText size={16} />
                  Print Receipt Bill
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Rx Prescription zoom modal preview */}
      {activePrescriptionUrl && (
        <div className="modal-overlay" onClick={() => setActivePrescriptionUrl(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>Attached Prescription Sheet</h3>
              <button onClick={() => setActivePrescriptionUrl(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer' }}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', background: '#000', padding: '1rem' }}>
              <img 
                src={activePrescriptionUrl} 
                alt="Prescription Zoom" 
                style={{ maxWidth: '100%', maxHeight: '450px', objectFit: 'contain' }} 
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setActivePrescriptionUrl(null)}>Close View</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
