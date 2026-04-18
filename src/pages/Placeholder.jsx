export default function Placeholder({ name }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: '12px',
      color: 'var(--muted)',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--gold)',
        opacity: 0.6,
      }}>
        panel
      </span>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '28px',
        fontWeight: 600,
        color: 'var(--text)',
        letterSpacing: '-0.01em',
      }}>
        {name}
      </h1>
    </div>
  )
}
