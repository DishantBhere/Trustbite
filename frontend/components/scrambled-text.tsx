'use client'

import { useEffect, useRef, useState } from 'react'

interface ScrambledTextProps {
  text: string
  duration?: number
  speed?: number
  radius?: number
  scrambleChars?: string
  style?: React.CSSProperties
}

export function ScrambledText({
  text,
  duration = 1.2,
  speed = 0.5,
  radius = 100,
  scrambleChars = '.:/\\|?!%#@X',
  style,
}: ScrambledTextProps) {
  const [displayText, setDisplayText] = useState(text)
  const [isScrambling, setIsScrambling] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const scramble = () => {
    setIsScrambling(true)
    const chars = scrambleChars
    const textLength = text.length
    const durationMs = duration * 1000
    const speedMs = (1 - speed) * 100
    const startTime = Date.now()

    const updateText = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / durationMs, 1)

      let newText = ''
      for (let i = 0; i < textLength; i++) {
        const charProgress = Math.max(0, progress - (i / textLength) * (1 - speed))
        if (charProgress >= 1) {
          newText += text[i]
        } else if (charProgress > 0) {
          const randomChar = chars[Math.floor(Math.random() * chars.length)]
          newText += randomChar
        } else {
          newText += text[i]
        }
      }

      setDisplayText(newText)

      if (progress < 1) {
        setTimeout(updateText, speedMs)
      } else {
        setDisplayText(text)
        setIsScrambling(false)
      }
    }

    updateText()
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      scramble()
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const handleMouseEnter = () => {
    if (!isScrambling) {
      scramble()
    }
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      style={{
        ...style,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {displayText}
    </div>
  )
}
