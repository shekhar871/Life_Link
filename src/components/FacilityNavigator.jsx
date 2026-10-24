/**
 * ============================================================================
 * LIFELINK — REGIONAL FACILITY SUPPLY NAVIGATOR (FacilityNavigator.jsx)
 * ============================================================================
 * [LECTURE REQUIREMENTS IMPLEMENTED]:
 * 1. Single Record Fetch with Prev/Next Pagination:
 *    - Calls GET http://localhost:3000/facilities/${id}
 *    - Navigation buttons: Previous (id - 1) and Next (id + 1)
 * 2. Blood Component Supply Matrix:
 *    - Tracks 4 components: Whole Blood, Packed RBCs, Platelets, Plasma
 *    - Across all 8 blood groups: A+, A-, B+, B-, AB+, AB-, O+, O-
 * 3. Search & Filter Bar:
 *    - Client-side filtering by facility name, address, or medicine
 *    - Dropdown filters for blood group and component availability
 * 4. Role-Guarded Actions:
 *    - Stock increment/decrement (+ / -) requiring Staff or Admin role key
 *    - Discard expired medicine button triggering native OS confirmation dialog
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Search,
  Droplet,
  Pill,
  AlertTriangle,
  Clock,
  Phone,
  MapPin,
  Plus,
  Minus,
  Trash2,
  Filter,
  CheckCircle2,
  XCircle
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENTS = ['Whole Blood', 'Packed RBCs', 'Platelets', 'Plasma'];

export default function FacilityNavigator({ userRole, roleKey, onStockUpdated }) {
  const [currentId, setCurrentId] = useState(1);
  const [facilityData, setFacilityData] = useState(null);
  const [totalCount, setTotalCount] = useState(4);
  const [hasNext, setHasNext] = useState(true);
  const [hasPrev, setHasPrev] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter Bar state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBloodGroup, setFilterBloodGroup] = useState('');
  const [filterComponent, setFilterComponent] = useState('');
  const [allFacilities, setAllFacilities] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load single facility by ID via standard browser fetch
  const fetchFacility = async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:3000/facilities/${id}`);
      if (!res.ok) {
        throw new Error(`Facility #${id} not found`);
      }
      const data = await res.json();
      setFacilityData(data.facility);
      setTotalCount(data.totalCount || 4);
      setHasNext(data.hasNext);
      setHasPrev(data.hasPrev);
      setCurrentId(id);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all facilities for comprehensive search & filter bar
  const fetchAllFacilities = async () => {
    try {
      const res = await fetch('http://localhost:3000/facilities');
      if (res.ok) {
        const data = await res.json();
        setAllFacilities(data);
      }
    } catch (err) {
      console.warn('Could not load full facilities directory:', err.message);
    }
  };

  useEffect(() => {
    fetchFacility(currentId);
    fetchAllFacilities();
  }, []);

  // Previous & Next navigation handlers (GET /facilities/:id with id - 1 and id + 1)
  const handlePrev = () => {
    if (hasPrev && currentId > 1) {
      fetchFacility(currentId - 1);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      fetchFacility(currentId + 1);
    }
  };

  // Stock modification (Role-guarded via Express backend)
  const handleUpdateStock = async (componentType, bloodGroup, change) => {
    if (userRole === 'User') {
      alert('Stock updates require Facility Staff or Administrator privileges.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/facilities/${currentId}/stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-lifelink-role': userRole === 'Administrator' ? 'admin' : 'staff',
          'x-lifelink-role-key': roleKey
        },
        body: JSON.stringify({ componentType, bloodGroup, change })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update stock');
      }

      setFacilityData(data.facility);
      if (onStockUpdated) onStockUpdated();
    } catch (err) {
      alert(`Stock update error: ${err.message}`);
    }
  };

  // Discard expired medicine with native dialog
  const handleDeleteMedicine = async (medId) => {
    if (userRole === 'User') {
      alert('Discarding medications requires Staff or Administrator privileges.');
      return;
    }

    // Call native OS dialog via IPC
    let responseCode = 1;
    if (window.lifelinkAPI && window.lifelinkAPI.showDeleteMedicineDialog) {
      responseCode = await window.lifelinkAPI.showDeleteMedicineDialog();
    } else {
      responseCode = window.confirm('Confirm Deletion: Remove this expired medicine batch from inventory?') ? 0 : 1;
    }

    // Only proceed if button 0 ("Delete") was selected
    if (responseCode === 0) {
      try {
        const res = await fetch(`http://localhost:3000/facilities/${currentId}/medicines/${medId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-lifelink-role': userRole === 'Administrator' ? 'admin' : 'staff',
            'x-lifelink-role-key': roleKey
          }
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Deletion failed');
        }

        setFacilityData(data.facility);
      } catch (err) {
        alert(`Deletion error: ${err.message}`);
      }
    }
  };

  // Helper to calculate days until expiry
  const getDaysUntilExpiry = (expiryDateStr) => {
    if (!expiryDateStr) return 999;
    const expiry = new Date(expiryDateStr);
    const now = new Date('2026-10-23T00:00:00Z');
    const diffTime = expiry - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Filter facilities based on search bar
  const filteredFacilities = allFacilities.filter((fac) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      fac.facilityName.toLowerCase().includes(q) ||
      fac.address.toLowerCase().includes(q) ||
      fac.medicines?.some((m) => m.name.toLowerCase().includes(q) || m.batchNumber.toLowerCase().includes(q));

    const matchesBloodGroup =
      !filterBloodGroup ||
      Object.keys(fac.bloodStock || {}).some((comp) => (fac.bloodStock[comp]?.[filterBloodGroup] || 0) > 0);

    const matchesComponent =
      !filterComponent ||
      Object.values(fac.bloodStock?.[filterComponent] || {}).some((qty) => qty > 0);

    return matchesQuery && matchesBloodGroup && matchesComponent;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Search & Filter Bar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Search facility name, location, or medicine (e.g. Epinephrine)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} color="var(--text-muted)" />
            <select
              className="input-field"
              style={{ width: '130px', padding: '9px 10px' }}
              value={filterBloodGroup}
              onChange={(e) => setFilterBloodGroup(e.target.value)}
            >
              <option value="">All Blood Types</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>
                  Group {bg}
                </option>
              ))}
            </select>

            <select
              className="input-field"
              style={{ width: '150px', padding: '9px 10px' }}
              value={filterComponent}
              onChange={(e) => setFilterComponent(e.target.value)}
            >
              <option value="">All Components</option>
              {COMPONENTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {(searchQuery || filterBloodGroup || filterComponent) && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSearchQuery('');
                  setFilterBloodGroup('');
                  setFilterComponent('');
                }}
                style={{ fontSize: '12px' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Search Results Dropdown/Pills if active */}
        {(searchQuery || filterBloodGroup || filterComponent) && (
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
              Matching Facilities ({filteredFacilities.length}):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {filteredFacilities.map((fac) => (
                <button
                  key={fac.id}
                  onClick={() => {
                    fetchFacility(fac.id);
                    setSearchQuery('');
                  }}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '12px',
                    borderColor: currentId === fac.id ? 'var(--brand-red)' : 'var(--border-color)',
                    background: currentId === fac.id ? 'var(--brand-red-light)' : 'var(--bg-hover)'
                  }}
                >
                  <Building2 size={13} color="var(--brand-red)" />
                  <span>{fac.facilityName}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Single Facility View with Previous / Next Controls */}
      <div className="card">
        {/* Navigation Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '16px',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'var(--brand-red-light)',
                color: 'var(--brand-red)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {facilityData ? facilityData.facilityName : `Loading Facility #${currentId}...`}
                </h2>
                <span className="badge badge-emerald">ID #{currentId} of {totalCount}</span>
              </div>
              {facilityData && (
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} /> {facilityData.address}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={13} /> {facilityData.contact}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Previous (id - 1) and Next (id + 1) Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handlePrev}
              disabled={!hasPrev || isLoading}
              className="btn btn-secondary"
              title="Previous Facility (id - 1)"
            >
              <ChevronLeft size={16} />
              <span>Previous (id - 1)</span>
            </button>
            <span style={{ fontSize: '13px', fontWeight: 600, padding: '0 6px', color: 'var(--text-secondary)' }}>
              {currentId} / {totalCount}
            </span>
            <button
              onClick={handleNext}
              disabled={!hasNext || isLoading}
              className="btn btn-secondary"
              title="Next Facility (id + 1)"
            >
              <span>Next (id + 1)</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <div className="animate-spin" style={{ display: 'inline-block', marginBottom: '8px' }}>⏳</div>
            <p>Fetching facility data from Express backend (http://localhost:3000/facilities/{currentId})...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--brand-red)' }}>
            <AlertTriangle size={32} style={{ margin: '0 auto 8px' }} />
            <p>Error loading facility: {error}</p>
            <button onClick={() => fetchFacility(currentId)} className="btn btn-secondary" style={{ marginTop: '12px' }}>
              Retry Fetch
            </button>
          </div>
        ) : facilityData ? (
          <div>
            {/* Blood Component Inventory Grid */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Droplet size={18} color="var(--brand-red)" />
                  Blood Component Supply Matrix (Real-Time Units)
                </h3>
                {userRole !== 'User' && (
                  <span className="badge badge-blue">Staff Live Editing Active</span>
                )}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-hover)', borderBottom: '2px solid var(--border-color)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 600 }}>Blood Component</th>
                      {BLOOD_GROUPS.map((bg) => (
                        <th key={bg} style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700 }}>
                          {bg}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPONENTS.map((comp) => (
                      <tr key={comp} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {comp}
                        </td>
                        {BLOOD_GROUPS.map((bg) => {
                          const count = facilityData.bloodStock?.[comp]?.[bg] || 0;
                          const isLow = count < 3;
                          return (
                            <td key={bg} style={{ padding: '8px 6px', textAlign: 'center' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    color: isLow ? 'var(--brand-red)' : 'var(--text-primary)',
                                    background: isLow ? 'var(--brand-red-light)' : 'transparent',
                                    padding: '2px 8px',
                                    borderRadius: '6px'
                                  }}
                                >
                                  {count}
                                </span>
                                {userRole !== 'User' && (
                                  <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
                                    <button
                                      onClick={() => handleUpdateStock(comp, bg, -1)}
                                      disabled={count <= 0}
                                      style={{
                                        width: '18px',
                                        height: '18px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-card)',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                    >
                                      -
                                    </button>
                                    <button
                                      onClick={() => handleUpdateStock(comp, bg, 1)}
                                      style={{
                                        width: '18px',
                                        height: '18px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-card)',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Essential Medicines & Expiry Tracking */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Pill size={18} color="var(--brand-blue)" />
                  Essential Emergency Medicines & Expiry Tracking
                </h3>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                  <span className="badge badge-red">Expired (&lt; 0 days)</span>
                  <span className="badge badge-amber">Near Expiry (&lt; 30 days)</span>
                  <span className="badge badge-emerald">Safe</span>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-hover)', borderBottom: '2px solid var(--border-color)' }}>
                      <th style={{ padding: '10px 14px' }}>Medicine Name</th>
                      <th style={{ padding: '10px 14px' }}>Batch Number</th>
                      <th style={{ padding: '10px 14px' }}>Category</th>
                      <th style={{ padding: '10px 14px' }}>Quantity</th>
                      <th style={{ padding: '10px 14px' }}>Expiry Date</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      {userRole !== 'User' && <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {facilityData.medicines && facilityData.medicines.length > 0 ? (
                      facilityData.medicines.map((med) => {
                        const daysLeft = getDaysUntilExpiry(med.expiryDate);
                        const isExpired = daysLeft <= 0;
                        const isNearExpiry = daysLeft > 0 && daysLeft <= 30;

                        return (
                          <tr
                            key={med.id || med.batchNumber}
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              background: isExpired
                                ? 'rgba(225, 29, 72, 0.05)'
                                : isNearExpiry
                                ? 'rgba(217, 119, 6, 0.05)'
                                : 'transparent'
                            }}
                          >
                            <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                              {med.name}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <code style={{ fontSize: '12px', color: 'var(--brand-blue)' }}>{med.batchNumber}</code>
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                              {med.category}
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                              {med.quantity} {med.unit}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={14} color={isExpired ? 'var(--brand-red)' : isNearExpiry ? 'var(--brand-amber)' : 'var(--text-muted)'} />
                                <span style={{ fontWeight: isExpired || isNearExpiry ? 700 : 400 }}>
                                  {med.expiryDate}
                                </span>
                                <span style={{ fontSize: '11px', color: isExpired ? 'var(--brand-red)' : isNearExpiry ? 'var(--brand-amber)' : 'var(--text-muted)' }}>
                                  ({isExpired ? `Expired ${Math.abs(daysLeft)}d ago` : `${daysLeft}d left`})
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              {isExpired ? (
                                <span className="badge badge-red">Expired</span>
                              ) : isNearExpiry ? (
                                <span className="badge badge-amber">Near Expiry</span>
                              ) : (
                                <span className="badge badge-emerald">Available</span>
                              )}
                            </td>
                            {userRole !== 'User' && (
                              <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                {isExpired && (
                                  <button
                                    onClick={() => handleDeleteMedicine(med.id)}
                                    className="btn btn-danger"
                                    style={{ padding: '4px 10px', fontSize: '11px' }}
                                    title="Trigger Native Delete Confirmation Dialog"
                                  >
                                    <Trash2 size={13} />
                                    <span>Discard Batch</span>
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No registered essential medicines for this facility.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
