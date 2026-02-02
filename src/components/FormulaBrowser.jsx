import React, { useState } from 'react';

export default function FormulaBrowser({ formulas }) {
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  async function selectFormula(name) {
    setSelected(name);
    setLoading(true);
    try {
      const res = await fetch(`/api/formulas/${name}`);
      const data = await res.json();
      setDetail(data);
    } catch {
      setDetail({ error: 'Failed to load' });
    }
    setLoading(false);
  }

  if (!formulas.length) return <div className="empty">No formulas found</div>;

  return (
    <div>
      <div className="formula-list">
        {formulas.map(f => (
          <div
            key={f.name}
            className={`formula-item ${selected === f.name ? 'selected' : ''}`}
            onClick={() => selectFormula(f.name)}
          >
            <div style={{ fontWeight: 500, color: 'var(--text-bright)' }}>{f.title || f.name}</div>
            {f.description && <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{f.description.slice(0, 60)}</div>}
          </div>
        ))}
      </div>

      {selected && detail && !loading && (
        <div className="formula-detail" style={{ borderTop: '1px solid var(--border)', marginTop: 8 }}>
          <h3>{detail.formula?.title || detail.name}</h3>
          {detail.formula?.description && <p style={{ color: 'var(--text-dim)', marginBottom: 8 }}>{detail.formula.description}</p>}
          {detail.error && <p style={{ color: 'var(--red)' }}>{detail.error}</p>}
          {renderSteps(detail)}
        </div>
      )}
      {loading && <div className="empty">Loading...</div>}
    </div>
  );
}

function renderSteps(data) {
  // Formulas can have steps as [step.*] keys or nested structures
  const steps = [];
  if (data.step) {
    for (const [key, val] of Object.entries(data.step)) {
      steps.push({ key, ...val });
    }
  } else if (data.steps) {
    if (Array.isArray(data.steps)) {
      data.steps.forEach((s, i) => steps.push({ key: String(i + 1), ...s }));
    } else {
      for (const [key, val] of Object.entries(data.steps)) {
        steps.push({ key, ...val });
      }
    }
  }

  // Also check for top-level keys that look like steps
  for (const key of Object.keys(data)) {
    if (key.startsWith('step-') || key.match(/^\d+$/)) {
      steps.push({ key, ...data[key] });
    }
  }

  if (!steps.length) {
    return <div className="empty">No steps defined</div>;
  }

  return (
    <div>
      {steps.map((s, i) => (
        <div key={i} className="step">
          <span style={{ color: 'var(--accent)' }}>{s.key}</span>
          {s.title && <span style={{ color: 'var(--text-bright)', marginLeft: 8 }}>{s.title}</span>}
          {s.name && <span style={{ color: 'var(--text-bright)', marginLeft: 8 }}>{s.name}</span>}
          {s.description && <div style={{ color: 'var(--text-dim)', marginLeft: 16 }}>{s.description}</div>}
          {s.prompt && <div style={{ color: 'var(--text-dim)', marginLeft: 16, fontStyle: 'italic' }}>{String(s.prompt).slice(0, 120)}...</div>}
        </div>
      ))}
    </div>
  );
}
