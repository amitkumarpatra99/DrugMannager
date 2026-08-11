import React, { useState, useEffect } from 'react';
import type { User, Order, OrderStatus, BillItem } from '../types';
import { getStoredOrders, setStoredOrders, addActivityLog, getStoredInventory } from '../utils/storage';
import { 
  Upload, Clock, FileText, CheckCircle, AlertCircle, ShoppingBag, 
  Trash2, Receipt, LogOut, User as UserIcon, Calendar, Printer,
  Menu, X, Sparkles, Pill, Search
} from 'lucide-react';

interface PatientDashboardProps {
  user: User;
  onLogout: () => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ user, onLogout }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [prescBase64, setPrescBase64] = useState<string>('');
  const [prescFileName, setPrescFileName] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'orders' | 'catalog'>('orders');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  
  // Simulated AI Scanner States
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannedItems, setScannedItems] = useState<BillItem[]>([]);
  const [selectedScanItemIds, setSelectedScanItemIds] = useState<string[]>([]);
  
  // Pickup Times
  const [pickupStart, setPickupStart] = useState<string>('09:00');
  const [pickupEnd, setPickupEnd] = useState<string>('12:00');
  
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Modal for Invoice
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'med_shop_orders') {
        loadOrders();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loadOrders = () => {
    const allOrders = getStoredOrders();
    const patientOrders = allOrders.filter(o => o.patientId === user.id);
    // Sort by newest first
    setOrders(patientOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const runAIScan = (fileName: string) => {
    setIsScanning(true);
    setScannedItems([]);
    setSelectedScanItemIds([]);
    
    setTimeout(() => {
      const inv = getStoredInventory();
      const matches: BillItem[] = [];
      
      if (fileName === 'Generated_Rx_Prescription.png') {
        // Dolo (med-1) and Novamox (med-2)
        const dolo = inv.find(m => m.id === 'med-1');
        const novamox = inv.find(m => m.id === 'med-2');
        
        if (dolo) {
          matches.push({
            medicineId: dolo.id,
            name: dolo.name,
            price: dolo.price,
            quantity: 10
          });
        }
        if (novamox) {
          matches.push({
            medicineId: novamox.id,
            name: novamox.name,
            price: novamox.price,
            quantity: 15
          });
        }
      } else {
        // Try file name keywords
        const nameLower = fileName.toLowerCase();
        let found = false;
        
        if (nameLower.includes('dolo') || nameLower.includes('paracetamol')) {
          const dolo = inv.find(m => m.id === 'med-1');
          if (dolo) { matches.push({ medicineId: dolo.id, name: dolo.name, price: dolo.price, quantity: 10 }); found = true; }
        }
        if (nameLower.includes('cough') || nameLower.includes('alex')) {
          const syrup = inv.find(m => m.id === 'med-12');
          if (syrup) { matches.push({ medicineId: syrup.id, name: syrup.name, price: syrup.price, quantity: 2 }); found = true; }
        }
        if (nameLower.includes('novamox') || nameLower.includes('amoxicillin')) {
          const nov = inv.find(m => m.id === 'med-2');
          if (nov) { matches.push({ medicineId: nov.id, name: nov.name, price: nov.price, quantity: 15 }); found = true; }
        }
        if (nameLower.includes('vitamin') || nameLower.includes('zincovit') || nameLower.includes('limcee')) {
          const vit = inv.find(m => m.id === 'med-11') || inv.find(m => m.id === 'med-15');
          if (vit) { matches.push({ medicineId: vit.id, name: vit.name, price: vit.price, quantity: 10 }); found = true; }
        }
        
        // Default matches if none found
        if (!found) {
          const dolo = inv.find(m => m.id === 'med-1') || inv[0];
          const zinc = inv.find(m => m.id === 'med-11') || inv[1];
          if (dolo) matches.push({ medicineId: dolo.id, name: dolo.name, price: dolo.price, quantity: 5 });
          if (zinc) matches.push({ medicineId: zinc.id, name: zinc.name, price: zinc.price, quantity: 10 });
        }
      }
      
      setScannedItems(matches);
      setSelectedScanItemIds(matches.map(m => m.medicineId));
      setIsScanning(false);
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('File is too large. Please upload an image under 2MB.');
        return;
      }
      setPrescFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setPrescBase64(reader.result as string);
        runAIScan(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateMockPrescription = () => {
    setError('');
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, 0, 400, 300);
      
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 390, 290);
      
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 36px Times New Roman';
      ctx.fillText('Rx', 25, 60);
      
      ctx.font = 'bold 14px Outfit, sans-serif';
      ctx.fillText('METRO CLINIC - Dr. A. K. Roy', 120, 35);
      ctx.font = '10px Outfit, sans-serif';
      ctx.fillStyle = '#4b5563';
      ctx.fillText('Reg No: MCI-99281 | Tel: 555-0199', 120, 50);
      
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, 70);
      ctx.lineTo(380, 70);
      ctx.stroke();
      
      ctx.font = '12px Outfit, sans-serif';
      ctx.fillStyle = '#111827';
      ctx.fillText(`Patient: ${user.name || 'Anonymous Patient'}`, 25, 95);
      ctx.fillText(`Contact: ${user.emailOrPhone}`, 25, 115);
      ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 260, 95);
      
      ctx.beginPath();
      ctx.moveTo(20, 130);
      ctx.lineTo(380, 130);
      ctx.stroke();
      
      ctx.font = 'italic bold 14px Times New Roman';
      ctx.fillText('1. Tab. Paracetamol 650mg (Dolo) - Qty: 10', 40, 160);
      ctx.font = '10px Outfit, sans-serif';
      ctx.fillStyle = '#4b5563';
      ctx.fillText('   Dosage: 1 tab as needed for fever, max 3 daily.', 40, 175);
      
      ctx.font = 'italic bold 14px Times New Roman';
      ctx.fillStyle = '#111827';
      ctx.fillText('2. Tab. Amoxicillin 500mg - Qty: 15', 40, 205);
      ctx.font = '10px Outfit, sans-serif';
      ctx.fillStyle = '#4b5563';
      ctx.fillText('   Dosage: 1 tab three times daily for 5 days.', 40, 220);
      
      ctx.font = 'bold 12px Times New Roman';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText('[ Signed Dr. Roy ]', 260, 265);
    }
    
    setPrescBase64(canvas.toDataURL());
    setPrescFileName('Generated_Rx_Prescription.png');
    setSuccess('Mock prescription sheet generated successfully!');
    runAIScan('Generated_Rx_Prescription.png');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!prescBase64) {
      setError('Please upload or generate a prescription sheet.');
      return;
    }

    if (!pickupStart || !pickupEnd) {
      setError('Please specify your planned pickup times.');
      return;
    }

    const [sH, sM] = pickupStart.split(':').map(Number);
    const [eH, eM] = pickupEnd.split(':').map(Number);
    if (sH > eH || (sH === eH && sM >= eM)) {
      setError('Pickup End Time must be later than Start Time.');
      return;
    }

    const allOrders = getStoredOrders();
    const suggested: BillItem[] = scannedItems
      .filter(item => selectedScanItemIds.includes(item.medicineId))
      .map(item => ({
        medicineId: item.medicineId,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

    const newOrder: Order = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      patientId: user.id,
      patientName: user.name || 'Patient',
      patientPhone: user.emailOrPhone,
      prescriptionUrl: prescBase64,
      status: 'submitted',
      pickupStart,
      pickupEnd,
      items: [],
      totalBill: 0,
      tax: 0,
      createdAt: new Date().toLocaleString(),
      suggestedItems: suggested
    };

    setStoredOrders([...allOrders, newOrder]);
    addActivityLog(`Order ${newOrder.id} submitted by Patient ${user.name || user.emailOrPhone} for pickup between ${pickupStart} - ${pickupEnd}.`, 'info');
    
    setPrescBase64('');
    setPrescFileName('');
    setScannedItems([]);
    setSelectedScanItemIds([]);
    setSuccess(`Order ${newOrder.id} submitted! The pharmacy will review and pack your medicines.`);
    loadOrders();
  };

  const handleCancelOrder = (orderId: string) => {
    const allOrders = getStoredOrders();
    const updated = allOrders.map(o => {
      if (o.id === orderId) {
        addActivityLog(`Order ${orderId} cancelled by Patient.`, 'danger');
        return { ...o, status: 'cancelled' as OrderStatus };
      }
      return o;
    });
    setStoredOrders(updated);
    loadOrders();
  };

  const renderStatusStepper = (status: OrderStatus) => {
    if (status === 'cancelled') {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          padding: '0.75rem',
          borderRadius: 'var(--radius-md)',
          color: 'var(--clr-danger)',
          fontSize: '0.85rem'
        }}>
          <AlertCircle size={16} />
          <span>This order has been cancelled. Please upload a new prescription if needed.</span>
        </div>
      );
    }

    const steps = [
      { key: 'submitted', label: 'Submitted' },
      { key: 'preparing', label: 'Preparing' },
      { key: 'ready', label: 'Ready for Pickup' },
      { key: 'completed', label: 'Picked Up' }
    ];

    const getStepClass = (stepKey: string, index: number) => {
      const statusIndex = steps.findIndex(s => s.key === status);
      if (status === stepKey) return 'stepper-step active';
      if (index < statusIndex) return 'stepper-step completed';
      return 'stepper-step';
    };

    return (
      <div className="stepper">
        {steps.map((step, idx) => (
          <div key={step.key} className={getStepClass(step.key, idx)}>
            <div className="stepper-bubble">{idx + 1}</div>
            <div className="stepper-label">{step.label}</div>
          </div>
        ))}
      </div>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="app-container">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <button className="menu-toggle-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="mobile-header-logo">
          <ShoppingBag size={20} style={{ color: 'var(--clr-primary)' }} />
          <span>Patient Portal</span>
        </div>
        <button onClick={onLogout} className="mobile-logout-btn" title="Sign Out">
          <LogOut size={18} />
        </button>
      </header>

      {/* Sidebar backdrop overlay */}
      {isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'var(--clr-primary-glow)',
            color: 'var(--clr-primary)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)'
          }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem' }} className="gradient-text">Patient Portal</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MediQuick Offline Pickups</span>
          </div>
        </div>

        {/* Profile Card */}
        <div className="sidebar-profile" style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-muted)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--clr-primary)'
            }}>
              <UserIcon size={16} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user.name || 'Valued Patient'}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.emailOrPhone}</p>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-muted)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
            Address: {user.address || 'Not Provided'}
          </p>
        </div>

        <ul className="nav-menu" style={{ flex: 1 }}>
          <li>
            <a className={`nav-link ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => { setActiveTab('orders'); setIsMobileMenuOpen(false); }}>
              <ShoppingBag size={18} />
              My Orders & Upload
            </a>
          </li>
          <li>
            <a className={`nav-link ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => { setActiveTab('catalog'); setIsMobileMenuOpen(false); }}>
              <Pill size={18} />
              Check Medicine Catalog
            </a>
          </li>
        </ul>

        <button onClick={onLogout} className="btn btn-secondary logout-btn" style={{ width: '100%' }}>
          <LogOut size={16} />
          Sign Out
        </button>
      </aside>

      {/* Main Dashboard Space */}
      <main className="main-content">
        <header style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>
            Hello, <span className="gradient-text">{user.name || 'Guest Patient'}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {activeTab === 'orders' 
              ? "Upload your prescription, schedule your visiting time, and we'll have your medicine packed with the bill ready for pickup."
              : "Search through the pharmacy catalog to check real-time drug pricing, dosage instructions, and inventory availability."}
          </p>
        </header>

        {/* Top Notifications */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            color: 'var(--clr-danger)',
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            color: 'var(--clr-success)',
            marginBottom: '1.5rem'
          }}>
            {success}
          </div>
        )}

        {activeTab === 'catalog' ? (
          /* Medicine Catalog Search Tab */
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Pill size={20} style={{ color: 'var(--clr-primary)' }} />
                Pharmacy Medicine Catalog
              </h2>
            </div>

            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search medicines by name, dosage or category..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '38px' }}
              />
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Medicine Name</th>
                    <th>Category</th>
                    <th>Dosage Instructions</th>
                    <th style={{ textAlign: 'right' }}>Price (₹)</th>
                    <th style={{ textAlign: 'center' }}>Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {getStoredInventory()
                    .filter(med => 
                      med.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                      med.category.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                      med.dosage.toLowerCase().includes(catalogSearch.toLowerCase())
                    )
                    .map((med) => (
                      <tr key={med.id}>
                        <td style={{ fontWeight: 600 }}>{med.name}</td>
                        <td><span className="badge badge-neutral" style={{ textTransform: 'none' }}>{med.category}</span></td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{med.dosage}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{med.price.toFixed(2)}</td>
                        <td style={{ textAlign: 'center' }}>
                          {med.stock > 10 ? (
                            <span className="badge badge-success">In Stock</span>
                          ) : med.stock > 0 ? (
                            <span className="badge badge-warning">Low Stock</span>
                          ) : (
                            <span className="badge badge-danger">Out of Stock</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  {getStoredInventory().filter(med => 
                    med.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                    med.category.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                    med.dosage.toLowerCase().includes(catalogSearch.toLowerCase())
                  ).length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                        No medicines match your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          /* Main Workspace - Orders List and Upload */
          <div className="grid-split-1-1-3">
            
            {/* Upload and Schedule Panel */}
            <section className="glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} style={{ color: 'var(--clr-primary)' }} />
                Submit New Prescription
              </h2>

              <form onSubmit={handleOrderSubmit}>
                {/* Prescription File Picker */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <span className="form-label">Prescription Document / Image</span>
                  
                  <div style={{
                    border: '2px dashed var(--border-muted)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.5rem',
                    textAlign: 'center',
                    background: 'rgba(0,0,0,0.15)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'border 0.2s'
                  }}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setPrescBase64(reader.result as string);
                        runAIScan(file.name);
                      };
                      reader.readAsDataURL(file);
                      setPrescFileName(file.name);
                    }
                  }}
                  >
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                    <Upload size={32} style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }} />
                    {prescFileName ? (
                      <div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--clr-primary)', fontWeight: 600 }}>{prescFileName}</p>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click or drag to replace file</span>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Drag & drop image here or click to browse</p>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>JPEG, PNG up to 2MB</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Mock generation helper */}
                  <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Don't have an image? </span>
                    <button
                      type="button"
                      onClick={generateMockPrescription}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--clr-primary)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                        textDecoration: 'underline',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Sparkles size={12} />
                      Generate Mock Rx Sheet
                    </button>
                  </div>

                  {/* AI Scanner Display */}
                  {isScanning && (
                    <div style={{
                      position: 'relative',
                      height: '140px',
                      background: 'rgba(0, 242, 254, 0.03)',
                      border: '1px solid var(--clr-primary-glow)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '1.25rem'
                    }}>
                      <div className="scanning-bar"></div>
                      <div style={{ textAlign: 'center', zIndex: 10 }}>
                        <Sparkles size={20} className="sparkle-animation" style={{ color: 'var(--clr-primary)', marginBottom: '0.35rem' }} />
                        <p style={{ fontSize: '0.85rem', color: 'var(--clr-primary)', fontWeight: 600 }}>AI Scanner Active</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Extracting drug names & matching catalog...</p>
                      </div>
                    </div>
                  )}

                  {/* Scanner Match Results */}
                  {!isScanning && prescBase64 && scannedItems.length > 0 && (
                    <div style={{
                      marginTop: '1.25rem',
                      background: 'rgba(0, 242, 254, 0.02)',
                      border: '1px solid rgba(0, 242, 254, 0.15)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem'
                    }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem', color: 'var(--clr-primary)' }}>
                        <Sparkles size={14} />
                        AI Scan Match Results
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                        The items below were detected. Adjust quantities as per prescription:
                      </p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {scannedItems.map((item, idx) => {
                          const isChecked = selectedScanItemIds.includes(item.medicineId);
                          return (
                            <div key={item.medicineId} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'rgba(0,0,0,0.15)',
                              padding: '0.4rem 0.6rem',
                              borderRadius: 'var(--radius-sm)',
                              border: `1px solid ${isChecked ? 'rgba(0, 242, 254, 0.1)' : 'var(--border-muted)'}`
                            }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1, userSelect: 'none' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedScanItemIds(selectedScanItemIds.filter(id => id !== item.medicineId));
                                    } else {
                                      setSelectedScanItemIds([...selectedScanItemIds, item.medicineId]);
                                    }
                                  }}
                                  style={{ accentColor: 'var(--clr-primary)' }}
                                />
                                <span style={{ fontSize: '0.825rem', fontWeight: 500, color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.name}</span>
                              </label>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹{item.price.toFixed(2)}</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                    const updated = [...scannedItems];
                                    updated[idx].quantity = val;
                                    setScannedItems(updated);
                                  }}
                                  style={{
                                    width: '48px',
                                    padding: '0.15rem 0.25rem',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid var(--border-muted)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: '#fff',
                                    fontSize: '0.75rem',
                                    textAlign: 'center'
                                  }}
                                  disabled={!isChecked}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px dashed var(--border-muted)',
                        marginTop: '0.75rem',
                        paddingTop: '0.5rem',
                        fontSize: '0.8rem'
                      }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Est. Prescription Cost:</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--clr-primary)' }}>
                          ₹{scannedItems
                            .filter(it => selectedScanItemIds.includes(it.medicineId))
                            .reduce((sum, it) => sum + (it.price * it.quantity), 0)
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timing Selection */}
                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <span className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={16} />
                    Offline Store Visiting Window
                  </span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Specify the time range you will visit the pharmacy to pick up your package.
                  </p>
                  <div className="time-range-grid">
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Visit After:</span>
                      <input
                        type="time"
                        required
                        value={pickupStart}
                        onChange={(e) => setPickupStart(e.target.value)}
                        className="form-input"
                        style={{ marginTop: '0.25rem' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Visit Before:</span>
                      <input
                        type="time"
                        required
                        value={pickupEnd}
                        onChange={(e) => setPickupEnd(e.target.value)}
                        className="form-input"
                        style={{ marginTop: '0.25rem' }}
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  <CheckCircle size={18} />
                  Submit Prescription & Schedule
                </button>
              </form>
            </section>

            {/* Active Orders Track list */}
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={20} style={{ color: 'var(--clr-primary)' }} />
                Active Orders & Pickups ({orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length})
              </h2>

              {orders.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <ShoppingBag size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
                  <p>You have no submitted orders yet.</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Upload a prescription to schedule a pickup.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {orders.map((order) => {
                    const isActive = order.status !== 'completed' && order.status !== 'cancelled';
                    
                    return (
                      <div 
                        key={order.id} 
                        className="glass-panel" 
                        style={{ 
                          padding: '1.5rem',
                          opacity: isActive ? 1 : 0.7,
                          borderLeft: `4px solid ${
                            order.status === 'completed' ? 'var(--clr-success)' :
                            order.status === 'cancelled' ? 'var(--clr-danger)' :
                            order.status === 'ready' ? 'var(--clr-primary)' : 'var(--clr-warning)'
                          }`
                        }}
                      >
                        {/* Order Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{order.id}</span>
                              <span className={`badge ${
                                order.status === 'submitted' ? 'badge-info' :
                                order.status === 'preparing' ? 'badge-warning' :
                                order.status === 'ready' ? 'badge-success' :
                                order.status === 'completed' ? 'badge-neutral' : 'badge-danger'
                              }`}>
                                {order.status === 'submitted' && 'Awaiting Review'}
                                {order.status === 'preparing' && 'Preparing Medicines'}
                                {order.status === 'ready' && 'Ready for Pickup'}
                                {order.status === 'completed' && 'Completed'}
                                {order.status === 'cancelled' && 'Cancelled'}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created: {order.createdAt}</span>
                          </div>

                          {/* Visited Window */}
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Pickup Schedule:</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--clr-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                              <Calendar size={14} />
                              {order.pickupStart} - {order.pickupEnd}
                            </span>
                          </div>
                        </div>

                        {/* Stepper for Active, details for inactive */}
                        {renderStatusStepper(order.status)}

                        {/* Suggested Matched Items list */}
                        {order.suggestedItems && order.suggestedItems.length > 0 && (order.status === 'submitted' || order.status === 'preparing') && (
                          <div style={{
                            background: 'rgba(0, 242, 254, 0.02)',
                            border: '1px solid rgba(0, 242, 254, 0.1)',
                            borderRadius: 'var(--radius-md)',
                            padding: '0.75rem 1rem',
                            marginBottom: '1rem',
                            fontSize: '0.85rem'
                          }}>
                            <span style={{ color: 'var(--clr-primary)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                              <Sparkles size={12} />
                              Requested Medicines (AI Auto-Match):
                            </span>
                            {order.suggestedItems.map((it, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0' }}>
                                <span style={{ color: 'var(--text-primary)' }}>{it.name} x {it.quantity}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>₹{(it.price * it.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action buttons inside card */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border-muted)', paddingTop: '1rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              // View prescription modal
                              setActiveInvoiceOrder(order);
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                          >
                            <FileText size={14} />
                            View Prescription Sheet
                          </button>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {/* Cancel button if just submitted */}
                            {order.status === 'submitted' && (
                              <button
                                type="button"
                                onClick={() => handleCancelOrder(order.id)}
                                className="btn btn-danger"
                                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                              >
                                <Trash2 size={14} />
                                Cancel Order
                              </button>
                            )}

                            {/* Invoice Bill button if ready or completed */}
                            {(order.status === 'ready' || order.status === 'completed') && (
                              <button
                                type="button"
                                onClick={() => setActiveInvoiceOrder(order)}
                                className="btn btn-success"
                                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                              >
                                <Receipt size={14} />
                                View Bill & Invoice
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Invoice Receipt Modal */}
      {activeInvoiceOrder && (
        <div className="modal-overlay" onClick={() => setActiveInvoiceOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Receipt size={20} style={{ color: 'var(--clr-primary)' }} />
                Order Record: {activeInvoiceOrder.id}
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
                <div className="invoice-meta-grid" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
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
                {activeInvoiceOrder.items.length > 0 ? (
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
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Items and pricing will appear as soon as the shop compiles the order.</p>
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

                {/* Note */}
                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Thank you! Please show this screen or provide Order ID <strong>{activeInvoiceOrder.id}</strong> when you arrive at the counter between <strong>{activeInvoiceOrder.pickupStart} and {activeInvoiceOrder.pickupEnd}</strong>.
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
                  <Printer size={16} />
                  Print Receipt Bill
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
