import { useState, useEffect, useRef } from 'react'

// Respect user's OS-level motion preference
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function TypewriterText({
  text = '',
  speed = 15,
  className = '',
  enabled = true,
  showCursor = true,
}) {
  const [displayed, setDisplayed]   = useState('')
  const [isDone, setIsDone]         = useState(false)
  const timerRef                    = useRef(null)
  const indexRef                    = useRef(0)

  const shouldAnimate = enabled && !prefersReducedMotion

  useEffect(() => {
    // Reset on new text
    clearInterval(timerRef.current)
    indexRef.current = 0
    setIsDone(false)

    if (!text) {
      setDisplayed('')
      return
    }

    // Skip animation if disabled or user prefers reduced motion
    if (!shouldAnimate) {
      setDisplayed(text)
      setIsDone(true)
      return
    }

    setDisplayed('')

    timerRef.current = setInterval(() => {
      indexRef.current += 1
      setDisplayed(text.slice(0, indexRef.current))

      if (indexRef.current >= text.length) {
        clearInterval(timerRef.current)
        setIsDone(true)
      }
    }, speed)

    return () => clearInterval(timerRef.current)
  }, [text, speed, shouldAnimate])

  if (!text) return null

  return (
    <span className={className}>
      {displayed}
      {showCursor && !isDone && (
        <span
          aria-hidden="true"
          className="inline-block w-0.5 h-[1em] bg-current ml-0.5 align-middle"
          style={{ animation: 'blink 0.8s step-end infinite' }}
        />
      )}
      {/* Invisible full text keeps layout stable — avoids height jump */}
      <span aria-hidden="true" className="invisible absolute select-none">
        {text}
      </span>
    </span>
  )
}
