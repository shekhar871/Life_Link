/**
 * ============================================================================
 * LIFELINK — COMMUNITY DONOR AVAILABILITY ROSTER (DonorRoster.jsx)
 * ============================================================================
 * [LECTURE REQUIREMENTS IMPLEMENTED]:
 * 1. Community Donor Roster:
 *    - Real-time availability tracking across 8 blood groups
 *    - Component eligibility (Whole Blood, Packed RBCs, Platelets, Plasma)
 *    - Universal donor identification badge (O-Negative)
 * 2. Volunteer Registration & Status Toggling:
 *    - POST /donors/register to register new community donors
 *    - PATCH /donors/:id/status to toggle status: Available ↔ Donating ↔ Unavailable
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Droplet,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  Heart,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENTS = ['Whole Blood', 'Packed RBCs', 'Platelets', 'Plasma'];

export default function DonorRoster() {
  const [donors, setDonors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O-');
  const [selectedComponents, setSelectedComponents] = useState(['Whole Blood']);
  const [contact, setContact] = useState('');
  const [district, setDistrict] = useState('Central District');

  const fetchDonors = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3000/donors');
      if (res.ok) {
        const data = await res.json();
        setDonors(data);
      }
    } catch (err) {
      console.error('Failed to load donors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, []);

  const handleToggleStatus = async (donorId, currentStatus) => {
    const nextStatus =
      currentStatus === 'Available'
        ? 'Donating'
        : currentStatus === 'Donating'
        ? 'Unavailable'
        : 'Available';

    try {
      const res = await fetch(`http://localhost:3000/donors/${donorId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        const data = await res.json();
        setDonors((prev) =>
          prev.map((d) => (d.id === donorId ? data.donor : d))
        );
      }
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch('http://localhost:3000/donors/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name.trim(),
          bloodGroup,
          eligibleComponents: selectedComponents,
          contact: contact.trim() || '+1 (555) 019-2819',
          district: district.trim() || 'Central Metro'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDonors((prev) => [...prev, data.donor]);
        setShowRegisterModal(false);
        setName('');
        setContact('');
      }
    } catch (err) {
      alert(`Registration failed: ${err.message}`);
    }
  };

  const toggleComponent = (comp) => {
    setSelectedComponents((prev) =>
      prev.includes(comp) ? prev.filter((c) => c !== comp) : [...prev, comp]
    );
  };

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
                background: 'var(--brand-emerald-light)',
                color: 'var(--brand-emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Users size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                  Community Blood Donor Availability Network
                </h2>
                <span className="badge badge-emerald">{donors.length} Registered Donors</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Real-time active donor statuses and rapid emergency dispatch readiness
              </p>
            </div>
          </div>

          <button onClick={() => setShowRegisterModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Register as Donor</span>
          </button>
        </div>
      </div>

      {/* Donors Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {isLoading ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            <p>Loading community donor roster...</p>
          </div>
        ) : donors.length > 0 ? (
          donors.map((donor) => {
            const isAvailable = donor.status === 'Available';
            const isDonating = donor.status === 'Donating';

            return (
              <div key={donor.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: donor.bloodGroup === 'O-' ? 'var(--brand-red)' : 'var(--brand-red-light)',
                          color: donor.bloodGroup === 'O-' ? '#fff' : 'var(--brand-red)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '16px'
                        }}
                      >
                        {donor.bloodGroup}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                          {donor.fullName}
                        </h4>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={11} /> {donor.district}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(donor.id, donor.status)}
                      className={`badge ${isAvailable ? 'badge-emerald' : isDonating ? 'badge-amber' : 'badge-red'}`}
                      style={{ cursor: 'pointer', border: 'none', padding: '4px 10px' }}
                      title="Click to toggle availability status"
                    >
                      {donor.status}
                    </button>
                  </div>

                  {donor.isUniversalDonor && (
                    <div style={{ marginBottom: '10px' }}>
                      <span className="badge badge-red" style={{ fontSize: '10px' }}>
                        ⭐ Universal RBC Donor (O-)
                      </span>
                    </div>
                  )}

                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                      ELIGIBLE COMPONENTS:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {donor.eligibleComponents?.map((c) => (
                        <span key={c} className="badge badge-blue" style={{ fontSize: '10px' }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '10px',
                    fontSize: '11px',
                    color: 'var(--text-muted)'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={12} /> {donor.contact}
                  </span>
                  <span>Last Donated: {donor.lastDonationDate}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            <p>No registered donors found. Be the first to register!</p>
          </div>
        )}
      </div>

      {/* Register Donor Modal */}
      {showRegisterModal && (
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
          <div className="card" style={{ width: '460px', maxWidth: '92vw', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
              Register Volunteer Blood Donor
            </h3>
            <form onSubmit={handleRegister}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Full Legal Name:
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Arthur Pendelton"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Blood Group:
                    </label>
                    <select
                      className="input-field"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                    >
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      City District:
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. North Sector"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Eligible Blood Components:
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {COMPONENTS.map((comp) => {
                      const selected = selectedComponents.includes(comp);
                      return (
                        <button
                          type="button"
                          key={comp}
                          onClick={() => toggleComponent(comp)}
                          className="btn"
                          style={{
                            padding: '6px 10px',
                            fontSize: '11px',
                            background: selected ? 'var(--brand-blue-light)' : 'var(--bg-hover)',
                            color: selected ? 'var(--brand-blue)' : 'var(--text-secondary)',
                            borderColor: selected ? 'var(--brand-blue)' : 'var(--border-color)',
                            borderWidth: '1px'
                          }}
                        >
                          {comp}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Emergency Phone Contact:
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register in Network
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
