import React from 'react';

export default function InputBox({ value, onChange, onKeyDown, disabled, placeholder }) {
  return (
    <input
      type="text"
      className="input-field"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      disabled={disabled}
      placeholder={placeholder || 'Ask about blood compatibility, near-expiry triage, or emergency protocols...'}
      style={{
        flex: 1,
        padding: '12px 16px',
        fontSize: '13.5px'
      }}
    />
  );
}
