import React, { useState } from 'react';
import { ShieldCheck, Lock, X, AlertCircle, KeyRound, Check } from 'lucide-react';

export default function RoleGuardModal({ isOpen, onClose, currentRole, onRoleChanged }) {
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (selectedRole === 'User') {
      onRoleChanged('User', null, ['SEARCH', 'DONATE', 'REQUEST']);
      onClose();
      return;
    }

    if (!passcode.trim()) {
      setError('Please enter the security passkey for this role.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/verify-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole === 'Facility Staff' ? 'staff' : 'admin',
          roleKey: passcode.trim()
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Invalid role passcode');
      }

      onRoleChanged(data.role, passcode.trim(), data.permissions);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100
      }}
    >
      <div
        className="card"
        style={{
          width: '460px',
          maxWidth: '92vw',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--brand-emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Role-Based Access Control</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Verified via Express Backend Authentication
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Select Operational Role:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {['User', 'Facility Staff', 'Administrator'].map((role) => (
                <button
                  type="button"
                  key={role}
                  onClick={() => {
                    setSelectedRole(role);
                    setError('');
                  }}
                  className="btn"
                  style={{
                    padding: '10px 8px',
                    fontSize: '12px',
                    flexDirection: 'column',
                    gap: '4px',
                    background: selectedRole === role ? 'var(--brand-red-light)' : 'var(--bg-hover)',
                    color: selectedRole === role ? 'var(--brand-red)' : 'var(--text-secondary)',
                    borderColor: selectedRole === role ? 'var(--brand-red)' : 'var(--border-color)',
                    borderWidth: '1px'
                  }}
                >
                  <span style={{ fontWeight: selectedRole === role ? 700 : 500 }}>{role}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedRole !== 'User' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Enter {selectedRole} Security Passkey:
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }}
                />
                <input
                  type="password"
                  className="input-field"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder={
                    selectedRole === 'Facility Staff'
                      ? 'e.g. STAFF-MED-2026'
                      : 'e.g. ADMIN-SUPER-SECURE-99'
                  }
                  style={{ paddingLeft: '38px' }}
                />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                *Test Passkeys: Staff: <code style={{ color: 'var(--brand-blue)' }}>STAFF-MED-2026</code> | Admin: <code style={{ color: 'var(--brand-blue)' }}>ADMIN-SUPER-SECURE-99</code>
              </p>
            </div>
          )}

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'var(--brand-red-light)',
                color: 'var(--brand-red)',
                borderRadius: '8px',
                fontSize: '12px',
                marginBottom: '16px'
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Authenticate Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
