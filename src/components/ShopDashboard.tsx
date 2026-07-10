import React, { useState, useEffect } from 'react';
import type { User, Order, Medicine, BillItem, OrderStatus } from '../types';
import { 
  getStoredOrders, setStoredOrders, getStoredInventory, setStoredInventory, addActivityLog 
} from '../utils/storage';
import { 
  Pill, Clock, CheckCircle, Plus, Search, Eye, ShoppingBag, 
  X, ClipboardList, Check, Calendar, LogOut 
} from 'lucide-react';

interface ShopDashboardProps {
  user: User;
  onLogout: () => void;
}

export const ShopDashboard: React.FC<ShopDashboardProps> = ({ user, onLogout }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<Medicine[]>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'inventory'>('timeline');

  // Modals state
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<Order | null>(null);
  const [selectedPrescUrl, setSelectedPrescUrl] = useState<string | null>(null);

  // Billing Modal Inner State
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [medQuantity, setMedQuantity] = useState<number>(1);
  const [customBillNo, setCustomBillNo] = useState<string>('');
  const [billError, setBillError] = useState<string>('');

  // Add inventory state
  const [isAddingMed, setIsAddingMed] = useState<boolean>(false);
  const [newMedName, setNewMedName] = useState<string>('');
  const [newMedPrice, setNewMedPrice] = useState<number>(10);
  const [newMedStock, setNewMedStock] = useState<number>(50);
  const [newMedDosage, setNewMedDosage] = useState<string>('1 daily');
  const [newMedCategory, setNewMedCategory] = useState<string>('General');

  useEffect(() => {
    loadData();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'med_shop_orders' || e.key === 'med_shop_inventory') {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loadData = () => {
    setOrders(getStoredOrders());
    setInventory(getStoredInventory());
  };

  const handleUpdateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    const allOrders = getStoredOrders();
    const updated = allOrders.map(o => {
      if (o.id === orderId) {
        addActivityLog(`Order ${orderId} status changed to '${nextStatus}' by pharmacy staff.`, 'info');
        return { ...o, status: nextStatus };
      }
      return o;
    });
    setStoredOrders(updated);
    loadData();
  };

  const handleOpenBilling = (order: Order) => {
    setSelectedOrderForBill(order);
    setBillItems([]);
    setSearchQuery('');
    setSelectedMed(null);
    setMedQuantity(1);
    setCustomBillNo(`BILL-${Math.floor(100000 + Math.random() * 900000)}`);
    setBillError('');
  };

  const handleAddMedicineToBill = () => {
    setBillError('');
    if (!selectedMed) {
      setBillError('Select a medicine from the list first.');
      return;
    }

    if (medQuantity <= 0) {
      setBillError('Quantity must be greater than 0.');
      return;
    }

    if (selectedMed.stock < medQuantity) {
      setBillError(`Insufficient stock! Only ${selectedMed.stock} unit(s) of ${selectedMed.name} are available.`);
      return;
    }

    // Check if already added
    const existingIndex = billItems.findIndex(i => i.medicineId === selectedMed.id);
    if (existingIndex > -1) {
      const updatedItems = [...billItems];
      const newQty = updatedItems[existingIndex].quantity + medQuantity;
      if (selectedMed.stock < newQty) {
        setBillError(`Insufficient stock! Cannot add more. Total stock: ${selectedMed.stock}`);
        return;
      }
      updatedItems[existingIndex].quantity = newQty;
      setBillItems(updatedItems);
    } else {
      const newItem: BillItem = {
        medicineId: selectedMed.id,
        name: selectedMed.name,
        price: selectedMed.price,
        quantity: medQuantity
      };
      setBillItems([...billItems, newItem]);
    }

    // Reset picker
    setSelectedMed(null);
    setSearchQuery('');
    setMedQuantity(1);
  };

  const handleRemoveBillItem = (index: number) => {
    const updated = [...billItems];
    updated.splice(index, 1);
    setBillItems(updated);
  };

  const handleSubmitBill = () => {
    setBillError('');
    if (billItems.length === 0) {
      setBillError('Please add at least one medicine to the bill.');
      return;
    }

    if (!selectedOrderForBill) return;

    // Deduct stock from local inventory
    const currentInventory = getStoredInventory();
    const updatedInventory = currentInventory.map(med => {
      const billItem = billItems.find(item => item.medicineId === med.id);
      if (billItem) {
        const remainingStock = Math.max(0, med.stock - billItem.quantity);
        return { ...med, stock: remainingStock };
      }
      return med;
    });

    // Save inventory back
    setStoredInventory(updatedInventory);

    // Calculate final billing amounts
    const subtotal = billItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
    const tax = Number((subtotal * 0.12).toFixed(2)); // 12% GST
    const totalBill = Number((subtotal + tax).toFixed(2));

    // Update order
    const allOrders = getStoredOrders();
    const updatedOrders = allOrders.map(o => {
      if (o.id === selectedOrderForBill.id) {
        return {
          ...o,
          status: 'ready' as OrderStatus,
          items: billItems,
          totalBill,
          tax,
          billNumber: customBillNo
        };
      }
      return o;
    });

    setStoredOrders(updatedOrders);
    addActivityLog(`Order ${selectedOrderForBill.id} billed (No. ${customBillNo}) and packed. Total amount: ₹${totalBill}.`, 'success');
    
    // Close modal & reload lists
    setSelectedOrderForBill(null);
    loadData();
  };

  const handleAddMedicineToInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName || newMedPrice <= 0 || newMedStock < 0 || !newMedDosage || !newMedCategory) {
      alert('Please fill out all fields correctly.');
      return;
    }

    const currentInventory = getStoredInventory();
    const newMed: Medicine = {
      id: `med-${Date.now()}`,
      name: newMedName,
      price: Number(newMedPrice),
      stock: Number(newMedStock),
      dosage: newMedDosage,
      category: newMedCategory
    };

    setStoredInventory([...currentInventory, newMed]);
    addActivityLog(`New medicine '${newMedName}' added to inventory catalog.`, 'success');
    
    // Reset fields
    setNewMedName('');
    setNewMedPrice(10);
    setNewMedStock(50);
    setNewMedDosage('1 daily');
    setNewMedCategory('General');
    setIsAddingMed(false);
    loadData();
  };

  // Filter inventory based on search query
  const filteredMeds = searchQuery 
    ? inventory.filter(med => med.name.toLowerCase().includes(searchQuery.toLowerCase())) 
    : [];

  // Filter orders by status
  const pendingOrders = orders.filter(o => o.status === 'submitted' || o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  // Compute total sales metrics for today
  const activePickupsToday = orders.filter(o => o.status === 'ready');
  const salesTodayTotal = orders
    .filter(o => o.status === 'completed')
    .reduce((acc, curr) => acc + curr.totalBill, 0);

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'var(--clr-primary-glow)',
            color: 'var(--clr-primary)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)'
          }}>
            <Pill size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem' }} className="gradient-text">Shop Panel</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pharmacy Dashboard</span>
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
          <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Offline Care Pharmacy</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Staff ID: {user.emailOrPhone}</p>
        </div>

        <ul className="nav-menu" style={{ flex: 1 }}>
          <li>
            <a 
              className={`nav-link ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              <Calendar size={18} />
              Pickup Schedule & Queue
            </a>
          </li>
          <li>
            <a 
              className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              <Pill size={18} />
              Inventory Catalog
            </a>
          </li>
        </ul>

        <button onClick={onLogout} className="btn btn-secondary logout-btn" style={{ width: '100%' }}>
          <LogOut size={16} />
          Sign Out
        </button>
      </aside>

      {/* Main content pane */}
      <main className="main-content">
        <header style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>
            Pharmacy <span className="gradient-text">Operations Console</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Review uploaded prescriptions, pack items with automatic bill invoicing, and track daily scheduled customer visits.
          </p>
        </header>

        {/* Dashboard metrics block */}
        <section className="metrics-grid">
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pending Prescriptions</span>
            <h3 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--clr-primary)' }}>
              {orders.filter(o => o.status === 'submitted').length}
            </h3>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Actively Preparing</span>
            <h3 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--clr-warning)' }}>
              {orders.filter(o => o.status === 'preparing').length}
            </h3>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ready for Pickup Today</span>
            <h3 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--clr-success)' }}>
              {activePickupsToday.length}
            </h3>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Completed Sales Today</span>
            <h3 style={{ fontSize: '2.0rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--clr-secondary)' }}>
              ₹{salesTodayTotal.toFixed(2)}
            </h3>
          </div>
        </section>

        {activeTab === 'timeline' ? (
          <div className="grid-split-2-1">
            
            {/* Orders Processing Queue */}
            <section>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList size={20} style={{ color: 'var(--clr-primary)' }} />
                Customer Prescriptions Queue
              </h2>

              {pendingOrders.length === 0 && readyOrders.length === 0 ? (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <ShoppingBag size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
                  <p>All clean! There are no active customer requests right now.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Pending/Preparing orders list */}
                  {[...pendingOrders, ...readyOrders].map((order) => (
                    <div 
                      key={order.id} 
                      className="glass-panel" 
                      style={{ 
                        padding: '1.5rem',
                        borderLeft: `4px solid ${
                          order.status === 'ready' ? 'var(--clr-success)' :
                          order.status === 'preparing' ? 'var(--clr-warning)' : 'var(--clr-info)'
                        }`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{order.id}</h4>
                            <span className={`badge ${
                              order.status === 'submitted' ? 'badge-info' :
                              order.status === 'preparing' ? 'badge-warning' : 'badge-success'
                            }`}>
                              {order.status === 'submitted' ? 'New Request' : order.status === 'preparing' ? 'Preparing' : 'Ready to Collect'}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Patient: <strong>{order.patientName}</strong> ({order.patientPhone})
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Planned pickup slot:</span>
                          <span style={{ display: 'block', fontSize: '0.9rem', color: 'var(--clr-primary)', fontWeight: 600 }}>
                            {order.pickupStart} - {order.pickupEnd}
                          </span>
                        </div>
                      </div>

                      {/* Display Medicines if ready */}
                      {order.status === 'ready' && (
                        <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Packed Invoice Items:</span>
                          {order.items.map((it, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0' }}>
                              <span>{it.name} x {it.quantity}</span>
                              <span>₹{(it.price * it.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--clr-success)' }}>
                            <span>Total Bill:</span>
                            <span>₹{order.totalBill.toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-muted)', paddingTop: '1rem', marginTop: '1rem' }}>
                        <button 
                          className="btn btn-secondary"
                          onClick={() => setSelectedPrescUrl(order.prescriptionUrl)}
                          style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                        >
                          <Eye size={14} />
                          Prescription Slip
                        </button>

                        {order.status === 'submitted' && (
                          <button
                            className="btn btn-primary"
                            onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                            style={{ padding: '0.4rem 1.25rem', fontSize: '0.85rem', marginLeft: 'auto' }}
                          >
                            Accept & Prepare
                          </button>
                        )}

                        {order.status === 'preparing' && (
                          <button
                            className="btn btn-primary"
                            onClick={() => handleOpenBilling(order)}
                            style={{ padding: '0.4rem 1.25rem', fontSize: '0.85rem', marginLeft: 'auto', background: 'var(--clr-success)', color: '#000' }}
                          >
                            <Plus size={14} />
                            Generate Bill & Pack
                          </button>
                        )}

                        {order.status === 'ready' && (
                          <button
                            className="btn btn-success"
                            onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                            style={{ padding: '0.4rem 1.25rem', fontSize: '0.85rem', marginLeft: 'auto' }}
                          >
                            <Check size={14} />
                            Mark Handed Over / Paid
                          </button>
                        )}

                        <button
                          className="btn btn-danger"
                          onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                          style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Timings Pickups Timeline */}
            <section className="glass-panel" style={{ padding: '1.75rem', height: 'fit-content' }}>
              <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} style={{ color: 'var(--clr-primary)' }} />
                Today's Pickup Timeline
              </h2>

              {orders.filter(o => o.status === 'ready').length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
                  No customer visits scheduled. Invoices marked as 'Ready for Pickup' will populate here chronologically.
                </p>
              ) : (
                <div className="timeline">
                  {orders
                    .filter(o => o.status === 'ready')
                    // Sort by pickup start time
                    .sort((a, b) => a.pickupStart.localeCompare(b.pickupStart))
                    .map((order) => (
                      <div key={order.id} className="timeline-item active">
                        <div className="timeline-time">
                          <Clock size={12} />
                          {order.pickupStart} - {order.pickupEnd}
                        </div>
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{order.patientName}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                            Order: {order.id} | Bill: ₹{order.totalBill.toFixed(2)}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Phone: {order.patientPhone}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          /* Inventory Manager Tab */
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Pill size={20} style={{ color: 'var(--clr-primary)' }} />
                Store Medicine Stock
              </h2>
              <button onClick={() => setIsAddingMed(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                <Plus size={16} />
                Add Medicine
              </button>
            </div>

            {/* Search inventory */}
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search stock catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '38px' }}
              />
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
                    <th style={{ textAlign: 'center' }}>Modify</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory
                    .filter(med => med.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((med) => (
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
                              onClick={() => {
                                const addQty = prompt(`Enter units to add to stock for ${med.name}:`, '50');
                                if (addQty !== null) {
                                  const parsed = parseInt(addQty, 10);
                                  if (!isNaN(parsed) && parsed > 0) {
                                    const updated = inventory.map(m => m.id === med.id ? { ...m, stock: m.stock + parsed } : m);
                                    setStoredInventory(updated);
                                    addActivityLog(`Stock increased for ${med.name} by +${parsed} units.`, 'success');
                                    loadData();
                                  }
                                }
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                            >
                              + Refill
                            </button>
                            <button
                              onClick={() => {
                                const newPrice = prompt(`Enter new price (₹) for ${med.name}:`, med.price.toString());
                                if (newPrice !== null) {
                                  const parsed = parseFloat(newPrice);
                                  if (!isNaN(parsed) && parsed > 0) {
                                    const updated = inventory.map(m => m.id === med.id ? { ...m, price: parsed } : m);
                                    setStoredInventory(updated);
                                    addActivityLog(`Price updated for ${med.name} to ₹${parsed}.`, 'info');
                                    loadData();
                                  }
                                }
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                            >
                              ₹ Price
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Prescription Zoom / Lightbox modal */}
      {selectedPrescUrl && (
        <div className="modal-overlay" onClick={() => setSelectedPrescUrl(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem' }}>Patient Prescription Details</h3>
              <button 
                onClick={() => setSelectedPrescUrl(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ background: '#05070a', display: 'flex', justifyContent: 'center', padding: '1rem' }}>
              <img 
                src={selectedPrescUrl} 
                alt="Prescription Large" 
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Billing Console Modal */}
      {selectedOrderForBill && (
        <div className="modal-overlay" onClick={() => setSelectedOrderForBill(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList size={18} style={{ color: 'var(--clr-primary)' }} />
                Add Billing & Pack Medicines
              </h3>
              <button 
                onClick={() => setSelectedOrderForBill(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              {/* Order prescription preview thumbnail */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Prescription:</span>
                  <div style={{ 
                    maxHeight: '110px', 
                    overflow: 'hidden', 
                    borderRadius: 'var(--radius-sm)', 
                    border: '1px solid var(--border-muted)',
                    cursor: 'zoom-in'
                  }}
                  onClick={() => setSelectedPrescUrl(selectedOrderForBill.prescriptionUrl)}
                  >
                    <img 
                      src={selectedOrderForBill.prescriptionUrl} 
                      alt="Rx preview" 
                      style={{ width: '100%', height: '110px', objectFit: 'cover' }} 
                    />
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '0.85rem' }}>Order ID: <strong>{selectedOrderForBill.id}</strong></p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Patient: <strong>{selectedOrderForBill.patientName}</strong></p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Phone: <strong>{selectedOrderForBill.patientPhone}</strong></p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--clr-primary)', fontWeight: 600, marginTop: '0.25rem' }}>
                    Scheduled Visit: {selectedOrderForBill.pickupStart} - {selectedOrderForBill.pickupEnd}
                  </p>
                </div>
              </div>

              {/* Billing error details */}
              {billError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  fontSize: '0.8rem',
                  color: 'var(--clr-danger)',
                  marginBottom: '1rem'
                }}>
                  {billError}
                </div>
              )}

              {/* Add items to bill form */}
              <div style={{ 
                border: '1px solid var(--border-muted)', 
                borderRadius: 'var(--radius-md)', 
                padding: '1.25rem', 
                background: 'rgba(0,0,0,0.1)',
                marginBottom: '1.5rem' 
              }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Select Medicine from Inventory</h4>
                
                <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Type medicine name to search..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSelectedMed(null);
                      }}
                      className="form-input"
                    />
                    
                    {/* Autocomplete suggestion container */}
                    {searchQuery && !selectedMed && filteredMeds.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--bg-popover)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 'var(--radius-sm)',
                        maxHeight: '150px',
                        overflowY: 'auto',
                        zIndex: 200,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                      }}>
                        {filteredMeds.map(med => (
                          <div 
                            key={med.id}
                            onClick={() => {
                              setSelectedMed(med);
                              setSearchQuery(med.name);
                            }}
                            style={{
                              padding: '0.6rem 1rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(255,255,255,0.03)',
                              fontSize: '0.85rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 600 }}>{med.name}</span>
                              <span style={{ color: 'var(--clr-primary)' }}>₹{med.price.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <span>Stock: {med.stock} units</span>
                              <span>{med.dosage}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ width: '80px' }}>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={medQuantity}
                      onChange={(e) => setMedQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="form-input"
                    />
                  </div>

                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleAddMedicineToBill}
                    style={{ padding: '0 1.25rem' }}
                  >
                    Add
                  </button>
                </div>

                {selectedMed && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--clr-success)', marginTop: '0.5rem' }}>
                    Selected: <strong>{selectedMed.name}</strong> (₹{selectedMed.price.toFixed(2)} / unit). Dosage instruction: {selectedMed.dosage}
                  </p>
                )}
              </div>

              {/* Items List compiler */}
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Compiling Invoice Items</h4>
              {billItems.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem', 
                  border: '1px dashed var(--border-muted)', 
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem'
                }}>
                  No medicines added to bill yet. Select inventory items above.
                </div>
              ) : (
                <div className="table-container" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th style={{ textAlign: 'right' }}>Price</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                        <th style={{ textAlign: 'center' }}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billItems.map((item, index) => (
                        <tr key={index}>
                          <td style={{ fontWeight: 600 }}>{item.name}</td>
                          <td style={{ textAlign: 'right' }}>₹{item.price.toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{(item.price * item.quantity).toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveBillItem(index)}
                              style={{ background: 'none', border: 'none', color: 'var(--clr-danger)', cursor: 'pointer' }}
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Cost Calculations */}
              {billItems.length > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  marginTop: '1rem'
                }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Bill Invoice Number</label>
                    <input
                      type="text"
                      value={customBillNo}
                      onChange={(e) => setCustomBillNo(e.target.value)}
                      className="form-input"
                      style={{ padding: '0.35rem 0.5rem', width: '130px', fontSize: '0.8rem', marginTop: '0.25rem' }}
                    />
                  </div>
                  
                  <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Subtotal: ₹{billItems.reduce((a,c) => a + c.price*c.quantity, 0).toFixed(2)}
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      GST (12%): ₹{(billItems.reduce((a,c) => a + c.price*c.quantity, 0) * 0.12).toFixed(2)}
                    </p>
                    <p style={{ fontSize: '1.1rem', color: 'var(--clr-primary)', fontWeight: 'bold', marginTop: '0.25rem' }}>
                      Payable total: ₹{(billItems.reduce((a,c) => a + c.price*c.quantity, 0) * 1.12).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setSelectedOrderForBill(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleSubmitBill}
                style={{ background: 'var(--clr-success)', color: '#000' }}
              >
                <CheckCircle size={16} />
                Finalize & Mark Ready
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add Medicine to inventory drawer */}
      {isAddingMed && (
        <div className="modal-overlay" onClick={() => setIsAddingMed(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem' }}>Add Medicine to Stock</h3>
              <button onClick={() => setIsAddingMed(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer' }}>
                &times;
              </button>
            </div>
            
            <form onSubmit={handleAddMedicineToInventory}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Medicine Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paracetamol 650mg"
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    className="form-input"
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="1"
                      value={newMedPrice}
                      onChange={(e) => setNewMedPrice(parseFloat(e.target.value) || 0)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Stock Quantity</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newMedStock}
                      onChange={(e) => setNewMedStock(parseInt(e.target.value, 10) || 0)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Dosage Instructions</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1 tablet daily morning after meal"
                    value={newMedDosage}
                    onChange={(e) => setNewMedDosage(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={newMedCategory}
                    onChange={(e) => setNewMedCategory(e.target.value)}
                    className="form-input"
                    style={{ background: 'var(--bg-popover)' }}
                  >
                    <option value="Analgesics">Analgesics (Pain Relievers)</option>
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Antihistamines">Antihistamines (Allergies)</option>
                    <option value="Antacids">Antacids (Stomach)</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Vitamins & Supplements">Vitamins & Supplements</option>
                    <option value="Cough & Cold">Cough & Cold</option>
                    <option value="General">General Care</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddingMed(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Medicine</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
