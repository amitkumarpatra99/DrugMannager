import React, { useState, useEffect } from 'react';
import type { User, ResetRequest, ActivityLog } from '../types';
import { 
  getStoredUsers, setStoredUsers, getStoredResets, setStoredResets, 
  getStoredLogs, getRawDatabase, importDatabase, 
  resetSystemDatabase, addActivityLog 
} from '../utils/storage';
import { 
  Users, Key, ShieldAlert, Terminal, Trash2, Edit, Save, 
  Download, Upload, CheckCircle, RefreshCw, LogOut, Search 
} from 'lucide-react';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'resets' | 'logs' | 'database'>('users');
  
  // Storage lists
  const [users, setUsers] = useState<User[]>([]);
  const [resets, setResets] = useState<ResetRequest[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [rawDbJson, setRawDbJson] = useState<string>('');

  // Editing state for users
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editRole, setEditRole] = useState<'patient' | 'shop' | 'admin'>('patient');
  const [editPassword, setEditPassword] = useState<string>('');

  // Reset modal state
  const [selectedReset, setSelectedReset] = useState<ResetRequest | null>(null);
  const [newTempPassword, setNewTempPassword] = useState<string>('');

  // Search/Filters
  const [userSearch, setUserSearch] = useState<string>('');
  const [logFilter, setLogFilter] = useState<string>('all');

  // DB messages
  const [dbStatus, setDbStatus] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  useEffect(() => {
    loadAllData();

    const handleStorageChange = (e: StorageEvent) => {
      const keysToWatch = ['med_shop_users', 'med_shop_resets', 'med_shop_logs', 'med_shop_orders', 'med_shop_inventory'];
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
    setRawDbJson(getRawDatabase());
  };

  // User Management
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

  // Password Reset Processing
  const handleOpenResetModal = (req: ResetRequest) => {
    setSelectedReset(req);
    // Auto generate a simple temporary password
    setNewTempPassword(`RESET-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleApplyPasswordReset = () => {
    if (!selectedReset || !newTempPassword) return;

    // 1. Update the user password in the system users table
    const currentUsers = getStoredUsers();
    const userToUpdateIndex = currentUsers.findIndex(u => u.emailOrPhone.toLowerCase() === selectedReset.emailOrPhone.toLowerCase() && u.role === selectedReset.role);
    
    if (userToUpdateIndex === -1) {
      alert('Error: The user account requesting reset no longer exists in the database.');
      setSelectedReset(null);
      return;
    }

    currentUsers[userToUpdateIndex].password = newTempPassword;
    setStoredUsers(currentUsers);

    // 2. Update the reset request status to resolved and log temp password
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

  // Database Console
  const handleSaveRawDb = () => {
    setDbStatus({ text: '', type: '' });
    const success = importDatabase(rawDbJson);
    if (success) {
      setDbStatus({ text: 'Database state updated and synced successfully!', type: 'success' });
      addActivityLog('Admin modified raw database via direct JSON editor.', 'warning');
      loadAllData();
    } else {
      setDbStatus({ text: 'Failed to update database. Invalid JSON format or missing required tables.', type: 'error' });
    }
    setTimeout(() => setDbStatus({ text: '', type: '' }), 4000);
  };

  const handleExportDb = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(rawDbJson);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mediquick_db_backup_${Date.now()}.json`);
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
        // Prompt save immediately
        const success = importDatabase(content);
        if (success) {
          setDbStatus({ text: 'Database file imported successfully!', type: 'success' });
          loadAllData();
        } else {
          setDbStatus({ text: 'Failed to import file. Verify the file format.', type: 'error' });
        }
        setTimeout(() => setDbStatus({ text: '', type: '' }), 4000);
      };
      reader.readAsText(file);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('CRITICAL WARNING: This will wipe all orders, users, custom medicines, and reset to defaults. Proceed?')) {
      resetSystemDatabase();
      loadAllData();
      addActivityLog('Admin triggered a full system database reset.', 'danger');
      setDbStatus({ text: 'Database completely reset to initial default state.', type: 'success' });
      setTimeout(() => setDbStatus({ text: '', type: '' }), 4000);
    }
  };

  // Helper to color log types
  const getLogTypeColor = (type: ActivityLog['type']) => {
    switch (type) {
      case 'success': return 'var(--clr-success)';
      case 'warning': return 'var(--clr-warning)';
      case 'danger': return 'var(--clr-danger)';
      default: return 'var(--text-secondary)';
    }
  };

  // Filter lists
  const filteredUsers = users.filter(u => 
    u.emailOrPhone.toLowerCase().includes(userSearch.toLowerCase()) || 
    (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    return log.type === logFilter;
  });

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
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {user.name || 'System Administrator'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            {user.emailOrPhone}
          </p>
        </div>

        <ul className="nav-menu" style={{ flex: 1 }}>
          <li>
            <a 
              className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={18} />
              User Accounts ({users.length})
            </a>
          </li>
          <li>
            <a 
              className={`nav-link ${activeTab === 'resets' ? 'active' : ''}`}
              onClick={() => setActiveTab('resets')}
            >
              <Key size={18} />
              Password Resets ({resets.filter(r => r.status === 'pending').length})
            </a>
          </li>
          <li>
            <a 
              className={`nav-link ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <Terminal size={18} />
              System Activity Logs
            </a>
          </li>
          <li>
            <a 
              className={`nav-link ${activeTab === 'database' ? 'active' : ''}`}
              onClick={() => setActiveTab('database')}
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
            Control user directories, process credential resets, inspect live activities, and directly debug storage structures.
          </p>
        </header>

        {/* Global Statistics */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total User Accounts</span>
            <h3 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--clr-primary)' }}>{users.length}</h3>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pending Password Resets</span>
            <h3 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--clr-warning)' }}>
              {resets.filter(r => r.status === 'pending').length}
            </h3>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Database Health</span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--clr-success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <CheckCircle size={22} />
              Synced
            </h3>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Logs Stored</span>
            <h3 style={{ fontSize: '2.0rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--clr-secondary)' }}>{logs.length}</h3>
          </div>
        </section>

        {/* Dynamic Tab Body */}
        {activeTab === 'users' && (
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} style={{ color: 'var(--clr-primary)' }} />
                User Profiles Directory
              </h2>
              <div style={{ position: 'relative', width: '250px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '32px', padding: '0.5rem 0.5rem 0.5rem 32px', fontSize: '0.85rem' }}
                />
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
                  {filteredUsers.map((u) => {
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
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

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

        {activeTab === 'logs' && (
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={20} style={{ color: 'var(--clr-primary)' }} />
                Real-Time Audit Logs
              </h2>
              <div>
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="form-input"
                  style={{ width: '150px', padding: '0.35rem 0.5rem', fontSize: '0.85rem', background: 'var(--bg-popover)' }}
                >
                  <option value="all">All Logs</option>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="danger">Danger</option>
                </select>
              </div>
            </div>

            <div style={{
              background: '#05070a',
              border: '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              fontFamily: 'monospace',
              maxHeight: '450px',
              overflowY: 'auto',
              fontSize: '0.85rem'
            }}>
              {filteredLogs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                  No system logs match the current filter.
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} style={{ display: 'flex', marginBottom: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.4rem', gap: '1rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>[{log.timestamp}]</span>
                    <span style={{ color: 'var(--clr-primary)', fontWeight: 600 }}>[SYSTEM]</span>
                    <span style={{ color: getLogTypeColor(log.type), flex: 1 }}>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

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
                  height: '350px',
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

      {/* Admin manual password reset prompt modal */}
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
    </div>
  );
};
