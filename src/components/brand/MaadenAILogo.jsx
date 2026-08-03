import { useId } from 'react'

import { cn } from '../../utils/helpers'

export default function MaadenAILogo({ size = 40, thinking = false, wordmark = false, className = '' }) {
  const rawId = useId().replace(/:/g, '')
  const gradientId = `maaden-ai-gradient-${rawId}`
  const glowId = `maaden-ai-glow-${rawId}`

  return (
    <span
      className={cn('maaden-ai-mark', thinking && 'maaden-ai-mark--thinking', className)}
      style={{ '--maaden-ai-size': `${size}px` }}
      role="img"
      aria-label="MAADEN AI"
    >
      <svg className="maaden-ai-mark__glyph" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#71E6FF" />
            <stop offset="0.48" stopColor="#19B8F0" />
            <stop offset="1" stopColor="#7C5CFF" />
          </linearGradient>
          <radialGradient id={glowId} cx="0" cy="0" r="1" gradientTransform="translate(32 32) rotate(90) scale(20)">
            <stop stopColor="#55D9FF" stopOpacity=".34" />
            <stop offset="1" stopColor="#675CFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle className="maaden-ai-mark__aura" cx="32" cy="32" r="21" fill={`url(#${glowId})`} />
        <g className="maaden-ai-mark__orbit maaden-ai-mark__orbit--outer" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.6" strokeLinecap="round">
          <path d="M32 4.5A27.5 27.5 0 0 1 59.5 32" />
          <path d="M59.5 32A27.5 27.5 0 0 1 32 59.5" opacity=".42" />
          <path d="M32 59.5A27.5 27.5 0 0 1 4.5 32" opacity=".7" />
          <circle cx="32" cy="4.5" r="2.2" fill="#71E6FF" stroke="none" />
          <circle cx="59.5" cy="32" r="1.65" fill="#7C5CFF" stroke="none" />
        </g>
        <g className="maaden-ai-mark__orbit maaden-ai-mark__orbit--inner" fill="none" stroke="#7DDFFF" strokeWidth="1.15" strokeDasharray="3 5" opacity=".58">
          <circle cx="32" cy="32" r="21.8" />
        </g>

        <path
          className="maaden-ai-mark__crystal"
          d="M32 10.5 50.6 21v22L32 53.5 13.4 43V21L32 10.5Z"
          fill="#071827"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path className="maaden-ai-mark__facet" d="m32 10.5 8.8 17.2L32 34l-8.8-6.3L32 10.5Z" fill="#38CFFF" fillOpacity=".13" />
        <path className="maaden-ai-mark__facet maaden-ai-mark__facet--delay" d="m13.4 43 9.8-15.3L32 34v19.5L13.4 43Z" fill="#19B8F0" fillOpacity=".12" />
        <path className="maaden-ai-mark__facet" d="M50.6 43 40.8 27.7 32 34v19.5L50.6 43Z" fill="#7C5CFF" fillOpacity=".14" />

        <path
          className="maaden-ai-mark__monogram"
          d="M20.5 41V24.2L32 34.1l11.5-9.9V41"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="3.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle className="maaden-ai-mark__core" cx="32" cy="34" r="3.1" fill="#B7F3FF" />
        <circle className="maaden-ai-mark__node maaden-ai-mark__node--one" cx="20.5" cy="24.2" r="2" fill="#60E2FF" />
        <circle className="maaden-ai-mark__node maaden-ai-mark__node--two" cx="43.5" cy="24.2" r="2" fill="#8B76FF" />
      </svg>

      {wordmark && (
        <span className="maaden-ai-mark__wordmark">
          <strong>MAADEN</strong><em>AI</em>
        </span>
      )}
    </span>
  )
}
