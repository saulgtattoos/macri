// Building blocks shared by the owner consultation wizard and the client form.
import { LABEL_STYLE } from '../../constants/consultationOptions'

export function PillToggle({ options, value, onChange, multi = false }) {
  function handleClick(opt) {
    if (multi) {
      const arr = Array.isArray(value) ? value : []
      onChange(arr.includes(opt) ? arr.filter(v => v !== opt) : [...arr, opt])
    } else {
      onChange(value === opt ? '' : opt)
    }
  }

  const selected = multi ? (Array.isArray(value) ? value : []) : value

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => {
        const active = multi ? selected.includes(opt) : selected === opt
        return (
          <button
            key={opt}
            onClick={() => handleClick(opt)}
            style={{
              minHeight: 36,
              padding: '0 12px',
              borderRadius: 8,
              border: active ? '1px solid #c9a96e' : '1px solid rgba(122,120,111,0.3)',
              background: active ? '#1e1e1b' : 'transparent',
              color: active ? '#c9a96e' : '#7a786f',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s',
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <span style={LABEL_STYLE}>{label}</span>
      {children}
    </div>
  )
}
