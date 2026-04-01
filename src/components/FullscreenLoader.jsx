import { useEffect } from 'react'

/**
 * FullscreenLoader — blocks the entire UI with a CSS animation + message.
 * Pure inline styles (no Tailwind dependency).
 *
 * @param {Object}  props
 * @param {boolean} props.visible     - Whether to show the overlay
 * @param {string}  props.message     - Main message below animation
 * @param {string}  [props.submessage] - Optional smaller text
 */
export default function FullscreenLoader({ visible, message = 'Procesando...', submessage }) {
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [visible])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(10, 15, 30, 0.85)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)'
    }} role="alert" aria-live="assertive">
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        padding: '48px 40px',
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
        minWidth: '320px',
        maxWidth: '90vw'
      }}>
        {/* Spinning rings + center icon */}
        <div style={{ position: 'relative', width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Outer ring */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: '#4ade80',
            borderRightColor: '#4ade80',
            animation: 'fl-spin 1s linear infinite'
          }} />
          {/* Inner ring (counter-rotating) */}
          <div style={{
            position: 'absolute',
            inset: '12px',
            borderRadius: '50%',
            border: '3px solid transparent',
            borderBottomColor: '#86efac',
            borderLeftColor: '#86efac',
            animation: 'fl-spin 1.5s linear infinite reverse'
          }} />
          {/* Center icon */}
          <div style={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #16a34a, #4ade80)',
            boxShadow: '0 0 20px rgba(74, 222, 128, 0.4)'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.25rem', color: '#f1f5f9' }}>
            {message}
          </h3>
          {submessage && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5, maxWidth: '260px' }}>
              {submessage}
            </p>
          )}
        </div>

        {/* Bouncing dots */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#4ade80',
              animation: `fl-bounce 1.2s ease-in-out ${i * 0.2}s infinite`
            }} />
          ))}
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes fl-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fl-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-10px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
