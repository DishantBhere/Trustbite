'use client'

import { useEffect, useRef, useState } from 'react'

interface GlitchTextProps {
  text: string
  style?: React.CSSProperties
}

export function GlitchText({ text, style }: GlitchTextProps) {
  const [isGlitching, setIsGlitching] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const triggerGlitch = () => {
    if (isGlitching) return
    setIsGlitching(true)
    setTimeout(() => setIsGlitching(false), 600)
  }

  useEffect(() => {
    // Auto-trigger on mount
    const timer = setTimeout(() => {
      triggerGlitch()
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      ref={containerRef}
      style={style}
      onMouseEnter={triggerGlitch}
      onTouchStart={triggerGlitch}
      className={isGlitching ? 'glitch-active' : ''}
    >
      {/* Main text */}
      <span style={{ position: 'relative', display: 'inline-block' }}>
        {text}
      </span>

      {/* Glitch layers - only render when glitching */}
      {isGlitching && (
        <>
          {/* Red channel - shift left */}
          <span
            style={{
              position: 'absolute',
              left: '-3px',
              top: 0,
              color: '#24003D',
              textShadow: '-3px 0px red',
              mixBlendMode: 'multiply',
              zIndex: 1,
              animation: 'glitch-shift 0.6s ease-out forwards',
            }}
          >
            {text}
          </span>

          {/* Blue channel - shift right */}
          <span
            style={{
              position: 'absolute',
              right: '-3px',
              top: 0,
              color: '#24003D',
              textShadow: '3px 0px cyan',
              mixBlendMode: 'screen',
              zIndex: 1,
              animation: 'glitch-shift-reverse 0.6s ease-out forwards',
            }}
          >
            {text}
          </span>
        </>
      )}

      <style>{`
        @keyframes glitch-shift {
          0% {
            transform: translateX(-3px);
            clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
          }
          50% {
            clip-path: polygon(0 20%, 100% 0, 100% 80%, 0 100%);
          }
          100% {
            transform: translateX(0);
            clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
          }
        }

        @keyframes glitch-shift-reverse {
          0% {
            transform: translateX(3px);
            clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
          }
          50% {
            clip-path: polygon(0 0, 100% 20%, 100% 100%, 0 80%);
          }
          100% {
            transform: translateX(0);
            clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
          }
        }
      `}</style>
    </div>
  )
}
