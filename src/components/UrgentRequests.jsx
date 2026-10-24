/**
 * ============================================================================
 * LIFELINK — URGENT CLINICAL REQUEST WORKFLOW (UrgentRequests.jsx)
 * ============================================================================
 * [LECTURE REQUIREMENTS IMPLEMENTED]:
 * 1. Single Request Fetch with Prev/Next Pagination:
 *    - Queries GET http://localhost:3000/requests/${id}
 *    - Previous (id - 1) and Next (id + 1) navigation buttons
 * 2. Role-Guarded Approval Workflow:
 *    - Validates Staff/Admin permissions via POST /requests/:id/approve
 *    - Updates status to 'Approved / Dispatching'
 * 3. Emergency Dispatch Mode Transition:
 *    - Launches the verified emergency dispatch and audit session
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  Building,
  Droplet,
  Pill,
  Send,
  UserCheck
} from 'lucide-react';

export default function UrgentRequests({ userRole, roleKey, onEmergencySessionSelect }) {
  const [currentId, setCurrentId] = useState(1);
  const [requestData, setRequestData] = useState(null);
  const [allRequests, setAllRequests] = useState([]);
  const [totalCount, setTotalCount] = useState(4);
  const [hasNext, setHasNext] = useState(true);
  const [hasPrev, setHasPrev] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Fetch single request by ID with Next / Previous navigation
  const fetchRequest = async (id) => {
    setIsLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      const res = await fetch(`http://localhost:3000/requests/${id}`);
      if (!res.ok) {
        throw new Error(`Request #${id} not found`);
      }
      const data = await res.json();
      setRequestData(data.request);
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

  // Fetch list of all requests
  const fetchAllRequests = async () => {
    try {
      const res = await fetch('http://localhost:3000/requests');
      if (res.ok) {
        const data = await res.json();
        setAllRequests(data);
      }
    } catch (err) {
      console.warn('Could not fetch requests list:', err.message);
    }
  };

  useEffect(() => {
    fetchRequest(currentId);
    fetchAllRequests();
  }, []);

  const handlePrev = () => {
    if (hasPrev && currentId > 1) {
      fetchRequest(currentId - 1);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      fetchRequest(currentId + 1);
    }
  };

  // Approve request: Validated by Express backend
  const handleApprove = async () => {
    if (userRole === 'User') {
      alert('Only verified Facility Staff or Administrators can approve emergency requests.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/requests/${currentId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-lifelink-role': userRole === 'Administrator' ? 'admin' : 'staff',
          'x-lifelink-role-key': roleKey
        },
        body: JSON.stringify({
          approverName: `${userRole} (Verified Session)`
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Approval failed');
      }

      setRequestData(data.request);
      setActionMessage('Request successfully verified & approved for emergency dispatch!');
      fetchAllRequests();
    } catch (err) {
      alert(`Approval error: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'var(--brand-amber-light)',
                color: 'var(--brand-amber)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                  Urgent Clinical Requests & Verification
                </h2>
                <span className="badge badge-amber">GET /requests/:id</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Role-gated dispatch approval pipeline powered by Express backend
              </p>
            </div>
          </div>

          {/* Navigation Controls: Previous (id - 1) & Next (id + 1) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handlePrev}
              disabled={!hasPrev || isLoading}
              className="btn btn-secondary"
            >
              <ChevronLeft size={16} />
              <span>Previous (id - 1)</span>
            </button>
            <span style={{ fontSize: '13px', fontWeight: 600, padding: '0 6px' }}>
              {currentId} / {totalCount}
            </span>
            <button
              onClick={handleNext}
              disabled={!hasNext || isLoading}
              className="btn btn-secondary"
            >
              <span>Next (id + 1)</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Single Request Card */}
      <div className="card">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <p>Fetching urgent request details from Express backend...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--brand-red)' }}>
            <p>Error: {error}</p>
          </div>
        ) : requestData ? (
          <div>
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
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-red" style={{ fontSize: '12px' }}>
                    {requestData.urgency}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Request ID: #{requestData.id} • {requestData.patientIdentifier}
                  </span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: '6px', color: 'var(--text-primary)' }}>
                  {requestData.facilityName}
                </h3>
              </div>

              <div>
                {requestData.status === 'Approved / Dispatching' ? (
                  <span className="badge badge-emerald" style={{ fontSize: '12px', padding: '6px 12px' }}>
                    <CheckCircle size={14} /> Approved & Ready for Dispatch
                  </span>
                ) : (
                  <span className="badge badge-amber" style={{ fontSize: '12px', padding: '6px 12px' }}>
                    <Clock size={14} /> Pending Clinical Approval
                  </span>
                )}
              </div>
            </div>

            {actionMessage && (
              <div
                style={{
                  background: 'var(--brand-emerald-light)',
                  color: 'var(--brand-emerald)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle size={18} />
                <span>{actionMessage}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '14px', background: 'var(--bg-hover)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>REQUEST SPECIFICATION</div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {requestData.requestType === 'Blood Component' ? (
                    <>
                      <Droplet size={18} color="var(--brand-red)" />
                      <span>{requestData.bloodGroup} {requestData.component}</span>
                    </>
                  ) : (
                    <>
                      <Pill size={18} color="var(--brand-blue)" />
                      <span>{requestData.medicineName}</span>
                    </>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Requested Quantity: <strong>{requestData.unitsRequested} units</strong>
                </div>
              </div>

              <div style={{ padding: '14px', background: 'var(--bg-hover)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>CLINICAL INDICATION</div>
                <div style={{ fontSize: '13px', fontWeight: 500, marginTop: '4px', color: 'var(--text-primary)' }}>
                  {requestData.clinicalReason}
                </div>
              </div>

              <div style={{ padding: '14px', background: 'var(--bg-hover)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>SLA DEADLINE</div>
                <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '4px', color: 'var(--brand-red)' }}>
                  Before {new Date(requestData.requiredBefore).toLocaleTimeString()}
                </div>
                {requestData.approvedBy && (
                  <div style={{ fontSize: '11px', color: 'var(--brand-emerald)', marginTop: '4px' }}>
                    Approved by: {requestData.approvedBy}
                  </div>
                )}
              </div>
            </div>

            {/* Approval & Emergency Dispatch Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              {requestData.status !== 'Approved / Dispatching' && (
                <button
                  onClick={handleApprove}
                  className="btn btn-primary"
                  style={{ background: 'var(--brand-emerald)' }}
                  disabled={userRole === 'User'}
                  title={userRole === 'User' ? 'Staff or Admin credentials required' : 'Approve request'}
                >
                  <ShieldCheck size={16} />
                  <span>{userRole === 'User' ? 'Staff/Admin Login Required to Approve' : 'Approve Request (Staff Verified)'}</span>
                </button>
              )}

              {requestData.status === 'Approved / Dispatching' && (
                <button
                  onClick={() => onEmergencySessionSelect(requestData)}
                  className="btn btn-primary"
                  style={{ background: 'var(--brand-red)' }}
                >
                  <Send size={16} />
                  <span>Launch Emergency Dispatch Session</span>
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Directory of All Urgent Requests */}
      <div className="card">
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>
          All Active Clinical Requests ({allRequests.length})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {allRequests.map((req) => (
            <div
              key={req.id}
              onClick={() => fetchRequest(req.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: currentId === req.id ? 'var(--brand-red-light)' : 'var(--bg-hover)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="badge badge-red">#{req.id}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>
                    {req.facilityName} — {req.patientIdentifier}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {req.requestType === 'Blood Component' ? `${req.bloodGroup} ${req.component}` : req.medicineName} ({req.unitsRequested} units)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`badge ${req.status === 'Approved / Dispatching' ? 'badge-emerald' : 'badge-amber'}`}>
                  {req.status}
                </span>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
