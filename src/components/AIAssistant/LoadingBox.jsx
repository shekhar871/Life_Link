import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingBox() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'var(--bg-hover)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '12px 18px',
        maxWidth: '320px',
        marginBottom: '16px'
      }}
    >
      <Loader2 size={18} className="animate-spin" color="var(--brand-red)" />
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
        Consulting Groq Clinical Models...
      </span>
    </div>
  );
}
