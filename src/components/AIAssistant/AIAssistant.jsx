import React, { useState } from 'react';
import AppTitle from './AppTitle';
import ConversationArea from './ConversationArea';
import InputBox from './InputBox';
import SendButton from './SendButton';

// Clinical knowledge backup for instant emergency answers if Groq key is unset or offline
function getEmergencyClinicalKnowledge(query) {
  const q = query.toLowerCase();

  if (q.includes('b-negative') || q.includes('b negative') || q.includes('b-')) {
    return (
      "🩸 **Blood Compatibility for B-Negative (B-):**\n\n" +
      "• **Compatible Red Blood Cell (RBC) Donors:**\n" +
      "  - **O-Negative (O-)**: Universal RBC donor; fully safe.\n" +
      "  - **B-Negative (B-)**: Exact type match; first clinical priority.\n\n" +
      "• **Incompatible for RBCs:**\n" +
      "  - Any Rh-positive blood (B+, O+, A+, AB+) will cause acute hemolytic transfusion reactions.\n" +
      "  - Any A-group antigens (A-, AB-) are incompatible.\n\n" +
      "• **Emergency Priority:** If B- is unavailable in trauma STAT, transfuse uncrossmatched O-negative Packed RBCs immediately."
    );
  }

  if (q.includes('near-expiry') || q.includes('expiry') || q.includes('expire') || q.includes('prioritize')) {
    return (
      "⏱️ **Near-Expiry Medicine & Blood Triage Protocol (< 30 Days):**\n\n" +
      "1. **FEFO Enforcement (First-Expired, First-Out):** Always rotate shelf units so batches expiring within 30 days are staged in front.\n" +
      "2. **Inter-Facility Re-allocation:** For high-value critical injectables (e.g., Epinephrine, TXA, Surfactant) with < 30 days remaining, initiate LifeLink peer-transfer to high-throughput Trauma Centers.\n" +
      "3. **Quarantine & Discard:** Expired units (Date < Current) must be immediately pulled into the red biohazard bin. Trigger the native LifeLink 'Confirm Deletion' dialog to record clinical disposal."
    );
  }

  if (q.includes('plasma') || q.includes('universal')) {
    return (
      "🧪 **Plasma & Platelet Compatibility Matrix:**\n\n" +
      "• **Universal Plasma Donor:** **AB-Positive (AB+)** and **AB-Negative (AB-)** are the universal plasma donors because their plasma lacks anti-A and anti-B antibodies.\n" +
      "• **Universal RBC Donor:** **O-Negative (O-)**.\n" +
      "• **Emergency Platelet Priority:** Type-identical is preferred; however, Rh-negative recipients receiving Rh-positive platelets should receive Rh immunoglobulin (RhoGAM) prophylaxis."
    );
  }

  return (
    "📋 **LifeLink Clinical Guidance:**\n\n" +
    "For emergency blood matching and essential medicine administration:\n" +
    "• Verify patient identifier and two independent clinician checks before blood infusion.\n" +
    "• Inspect cold chain indicators: Whole Blood & RBCs must be stored at 2°C – 6°C; Platelets require gentle agitation at 20°C – 24°C.\n" +
    "• Essential medicine batches nearing expiry (<30 days) must be flagged for immediate utilization or clinical return."
  );
}

export default function AIAssistant() {
  // Four core states as required by specification
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello! I am the LifeLink Medical Assistant. How can I assist with blood compatibility, near-expiry medicine triage, or emergency protocols today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Triggered on both clicking the Send button and pressing the Enter key
  const sendMessage = async () => {
    const content = input.trim();

    // Guard against empty input or in-flight requests
    if (!content || isLoading) return;

    // Create a new array with user message, clear input, clear error, set loading
    const updated = [...messages, { role: 'user', content }];
    setMessages(updated);
    setInput('');
    setError(null);
    setIsLoading(true);

    const apiKey = import.meta.env.VITE_GROQ_API_KEY;

    try {
      // Check if a real Groq API key is present
      const isConfiguredKey =
        apiKey &&
        apiKey.trim() !== '' &&
        !apiKey.includes('placeholder') &&
        apiKey.startsWith('gsk_');

      if (isConfiguredKey) {
        // Send full updated conversation history to Groq API
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content:
                  'You are LifeLink AI, a specialized clinical decision-support assistant for emergency hospital staff, blood banks, and healthcare providers. Provide direct, highly accurate, clinically sound advice regarding blood component compatibility (Whole Blood, Packed RBCs, Platelets, Plasma), essential medicine dosages, cold-chain maintenance, and near-expiry triage. Keep answers structured, urgent, and concise.'
              },
              ...updated
            ],
            temperature: 0.2,
            max_tokens: 800
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Groq API responded with HTTP ${response.status}`);
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || 'No response received from clinical model.';
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      } else {
        // Fallback clinical intelligence simulation when key is not yet configured
        await new Promise((resolve) => setTimeout(resolve, 600));
        const clinicalReply = getEmergencyClinicalKnowledge(content);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `${clinicalReply}\n\n*(Note: Running on built-in LifeLink Clinical Protocol Engine. To activate live cloud Groq LLaMA models, supply a valid VITE_GROQ_API_KEY in .env)*`
          }
        ]);
      }
    } catch (err) {
      console.error('Groq API Error:', err);
      // Fallback on network or API failure to ensure patient safety
      const fallback = getEmergencyClinicalKnowledge(content);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `${fallback}\n\n*(Clinical Fallback Engine: ${err.message})*`
        }
      ]);
      setError(`Notice: ${err.message}`);
    } finally {
      // Always run setIsLoading(false) in the finally block
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 160px)',
        minHeight: '520px'
      }}
    >
      <AppTitle />

      <ConversationArea messages={messages} isLoading={isLoading} error={error} />

      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-color)'
        }}
      >
        <InputBox
          value={input}
          onChange={setInput}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <SendButton
          onClick={sendMessage}
          disabled={!input.trim()}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
