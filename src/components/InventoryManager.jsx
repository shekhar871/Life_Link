/**
 * ============================================================================
 * LIFELINK — HOSPITAL LOCAL INVENTORY MANAGER (InventoryManager.jsx)
 * ============================================================================
 * [LECTURE REQUIREMENTS IMPLEMENTED]:
 * 1. Local File Persistence via Secure IPC:
 *    - Persisted into OS userData JSON file (survives application restarts)
 *    - Guarded saving useEffect prevents startup state wipe
 * 2. Expiry Horizon Tracking:
 *    - Flags expired batches (days <= 0) and near-expiry batches (< 30 days)
 * 3. Browser Notifications API Integration:
 *    - Requests permission and triggers native OS Notification alerts for near-expiry items
 * 4. Native OS Confirmation Dialog:
 *    - Invokes window.lifelinkAPI.showDeleteMedicineDialog()
 *    - Proceeds with record removal only if user clicks button 0 ("Delete")
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  Package,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  Bell,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  FileSpreadsheet
} from 'lucide-react';

export default function InventoryManager({
  inventory,
  setInventory,
  userRole,
  onNotificationTriggered
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBatch, setNewBatch] = useState('');
  const [newCategory, setNewCategory] = useState('Emergency Resuscitation');
  const [newQuantity, setNewQuantity] = useState(10);
  const [newUnit, setNewUnit] = useState('vials');
  const [newExpiryDate, setNewExpiryDate] = useState('2026-11-15');
  const [newNotes, setNewNotes] = useState('');

  // Calculate days left relative to simulated clinical timeline (2026-10-23)
  const getDaysUntilExpiry = (expiryDateStr) => {
    if (!expiryDateStr) return 999;
    const expiry = new Date(expiryDateStr);
    const now = new Date('2026-10-23T00:00:00Z');
    const diffTime = expiry - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Discard expired medicine using native Electron dialog
  const handleDeleteItem = async (itemId, itemName) => {
    let response = 1;

    if (window.lifelinkAPI && window.lifelinkAPI.showDeleteMedicineDialog) {
      // Calls native Electron dialog.showMessageBox()
      response = await window.lifelinkAPI.showDeleteMedicineDialog();
    } else {
      response = window.confirm('Confirm Deletion: Remove this expired medicine batch from inventory?') ? 0 : 1;
    }

    // Only proceed in React if the returned response index is 0
    if (response === 0) {
      setInventory((prev) => prev.filter((item) => item.id !== itemId));
    }
  };

  // Add new item to local persistent storage
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newBatch.trim() || !newExpiryDate) return;

    const newItem = {
      id: `local-inv-${Date.now()}`,
      medicineName: newName.trim(),
      batchNumber: newBatch.trim().toUpperCase(),
      category: newCategory,
      quantity: Number(newQuantity) || 1,
      unit: newUnit,
      expiryDate: newExpiryDate,
      status: getDaysUntilExpiry(newExpiryDate) <= 0 ? 'Expired' : getDaysUntilExpiry(newExpiryDate) <= 30 ? 'Near Expiry' : 'Adequate',
      notes: newNotes.trim() || 'Logged via LifeLink Desktop'
    };

    setInventory((prev) => [newItem, ...prev]);
    setShowAddModal(false);
    setNewName('');
    setNewBatch('');
    setNewNotes('');
  };

  // Trigger browser Notification API for near-expiry medicines
  const triggerExpiryNotifications = async () => {
    const nearExpiryList = inventory.filter((item) => {
      const d = getDaysUntilExpiry(item.expiryDate);
      return d <= 30;
    });

    if (nearExpiryList.length === 0) {
      alert('All local inventory items have safe expiry horizons (> 30 days).');
      return;
    }

    if ('Notification' in window) {
      let permission = Notification.permission;
      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        nearExpiryList.forEach((item) => {
          const d = getDaysUntilExpiry(item.expiryDate);
          new Notification('⚠️ LifeLink Expiry Alert', {
            body: `${item.medicineName} (${item.batchNumber}) has ${d <= 0 ? 'EXPIRED' : `${d} days remaining`}! Immediate triage required.`,
            icon: '/vite.svg'
          });
        });
      }
    }

    if (onNotificationTriggered) onNotificationTriggered();
  };

  const expiredCount = inventory.filter((i) => getDaysUntilExpiry(i.expiryDate) <= 0).length;
  const nearExpiryCount = inventory.filter((i) => {
    const d = getDaysUntilExpiry(i.expiryDate);
    return d > 0 && d <= 30;
  }).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'var(--brand-blue-light)',
                color: 'var(--brand-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Package size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                  Hospital Local Inventory (IPC File Persisted)
                </h2>
                <span className="badge badge-blue">userData JSON</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Stored locally at <code style={{ color: 'var(--brand-blue)' }}>userData/lifelink_inventory.json</code> • Survives restarts
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={triggerExpiryNotifications}
              className="btn btn-secondary"
              title="Test browser Notifications API for near-expiry medicine alerts"
            >
              <Bell size={15} color="var(--brand-amber)" />
              <span>Broadcast Expiry Alerts ({nearExpiryCount + expiredCount})</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              <Plus size={16} />
              <span>Add Stock Batch</span>
            </button>
          </div>
        </div>

        {/* Status Indicators */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '20px' }}>
          <div style={{ padding: '12px', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL LOCAL BATCHES</div>
            <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px' }}>{inventory.length}</div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(217, 119, 6, 0.08)', borderRadius: '8px', border: '1px solid rgba(217, 119, 6, 0.3)' }}>
            <div style={{ fontSize: '11px', color: 'var(--brand-amber)', fontWeight: 600 }}>NEAR EXPIRY (&lt; 30 DAYS)</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--brand-amber)', marginTop: '4px' }}>
              {nearExpiryCount}
            </div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(225, 29, 72, 0.08)', borderRadius: '8px', border: '1px solid rgba(225, 29, 72, 0.3)' }}>
            <div style={{ fontSize: '11px', color: 'var(--brand-red)', fontWeight: 600 }}>EXPIRED BATCHES</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--brand-red)', marginTop: '4px' }}>
              {expiredCount}
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '12px 14px' }}>Item / Medicine Name</th>
                <th style={{ padding: '12px 14px' }}>Batch Code</th>
                <th style={{ padding: '12px 14px' }}>Category</th>
                <th style={{ padding: '12px 14px' }}>Quantity</th>
                <th style={{ padding: '12px 14px' }}>Expiry Date</th>
                <th style={{ padding: '12px 14px' }}>Clinical Status</th>
                <th style={{ padding: '12px 14px' }}>Clinical Notes</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.length > 0 ? (
                inventory.map((item) => {
                  const days = getDaysUntilExpiry(item.expiryDate);
                  const isExp = days <= 0;
                  const isNear = days > 0 && days <= 30;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: isExp
                          ? 'rgba(225, 29, 72, 0.05)'
                          : isNear
                          ? 'rgba(217, 119, 6, 0.05)'
                          : 'transparent'
                      }}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>{item.medicineName}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <code style={{ fontSize: '12px', color: 'var(--brand-blue)' }}>{item.batchNumber}</code>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{item.category}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                        {item.quantity} {item.unit}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} color={isExp ? 'var(--brand-red)' : isNear ? 'var(--brand-amber)' : 'var(--text-muted)'} />
                          <span style={{ fontWeight: isExp || isNear ? 700 : 400 }}>{item.expiryDate}</span>
                          <span style={{ fontSize: '11px', color: isExp ? 'var(--brand-red)' : isNear ? 'var(--brand-amber)' : 'var(--text-muted)' }}>
                            ({isExp ? `Expired` : `${days}d left`})
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {isExp ? (
                          <span className="badge badge-red">Expired</span>
                        ) : isNear ? (
                          <span className="badge badge-amber">Near Expiry</span>
                        ) : (
                          <span className="badge badge-emerald">Safe</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {item.notes}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.medicineName)}
                          className="btn btn-secondary"
                          style={{
                            padding: '6px 10px',
                            fontSize: '11px',
                            color: 'var(--brand-red)',
                            borderColor: isExp ? 'var(--brand-red)' : 'var(--border-color)'
                          }}
                          title="Trigger Native OS Confirmation Dialog (dialog.showMessageBox)"
                        >
                          <Trash2 size={13} />
                          <span>{isExp ? 'Discard (Native Dialog)' : 'Delete'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No inventory records found in local storage. Click "Add Stock Batch" to log a record.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
        >
          <div className="card" style={{ width: '480px', maxWidth: '92vw', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
              Add Local Inventory Batch
            </h3>
            <form onSubmit={handleAddItem}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Item / Medicine Name:
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Epinephrine 1mg/mL Auto-Injectors"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Batch Number:
                    </label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      value={newBatch}
                      onChange={(e) => setNewBatch(e.target.value)}
                      placeholder="e.g. EPI-2026-99"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Category:
                    </label>
                    <select
                      className="input-field"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    >
                      <option value="Emergency Resuscitation">Emergency Resuscitation</option>
                      <option value="Blood Component">Blood Component</option>
                      <option value="Hemostatics / Trauma">Hemostatics / Trauma</option>
                      <option value="Critical Antibiotics">Critical Antibiotics</option>
                      <option value="Analgesics & Sedation">Analgesics & Sedation</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Quantity:
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="input-field"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Unit:
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      placeholder="vials, units, ampoules"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Expiry Date:
                  </label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Clinical Storage Notes:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="e.g. Stored at 4°C in Trauma Bay Refrigerator 2"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save to Local JSON
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
