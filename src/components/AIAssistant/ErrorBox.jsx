import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function ErrorBox({ error }) {
  if (!error) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        background: 'var(--brand-red-light)',
        border: '1px solid var(--brand-red)',
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '16px',
        color: 'var(--brand-red)'
      }}
    >
      <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '1px' }} />
      <div style={{ fontSize: '13px', lineHeight: 1.4 }}>
        <strong>Clinical Model Request Notice:</strong> {error}
      </div>
    </div>
  );
}
