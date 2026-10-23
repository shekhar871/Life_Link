import React, { useEffect, useRef } from 'react';
import ChatBubble from './ChatBubble';
import LoadingBox from './LoadingBox';
import ErrorBox from './ErrorBox';

export default function ConversationArea({ messages, isLoading, error }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, error]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        paddingRight: '8px',
        marginBottom: '16px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {messages.length === 0 ? (
        <div
          style={{
            margin: 'auto',
            textAlign: 'center',
            maxWidth: '460px',
            padding: '30px',
            color: 'var(--text-muted)'
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🩺</div>
          <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            LifeLink Clinical AI Knowledge Engine
          </h3>
          <p style={{ fontSize: '13px', lineHeight: 1.5, marginBottom: '16px' }}>
            Ask queries regarding blood component compatibility (Whole Blood, Platelets, Packed RBCs, Plasma), near-expiry triage protocols, or pediatric medicine dosing.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            <span className="badge badge-red">Which blood groups can donate to B-negative?</span>
            <span className="badge badge-blue">How to prioritize near-expiry medicines?</span>
            <span className="badge badge-emerald">Universal plasma donor guidelines</span>
          </div>
        </div>
      ) : (
        messages.map((msg, idx) => <ChatBubble key={idx} message={msg} />)
      )}

      {isLoading && <LoadingBox />}
      {error && <ErrorBox error={error} />}

      <div ref={bottomRef} />
    </div>
  );
}
