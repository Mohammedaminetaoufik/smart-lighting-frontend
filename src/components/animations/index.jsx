// Reusable Framer Motion components — the app's animation toolkit.
// Import from '../../components/animations' and compose. Every component
// respects prefers-reduced-motion (via MotionConfig in AnimatedPage + the
// AnimatedNumber guard).

import { useEffect } from 'react'
import {
  motion, MotionConfig, useMotionValue, useTransform, animate, useReducedMotion,
} from 'framer-motion'
import { cn } from '../../utils/helpers'
import {
  pageVariants, staggerContainer, staggerItem, fadeIn,
  SPRING, EASE_OUT,
} from '../../lib/animations'

/* ── AnimatedPage : entrance + reduced-motion boundary ─────── */
export function AnimatedPage({ children, className }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={className}
        variants={pageVariants}
        initial="initial"
        animate="animate"
      >
        {children}
      </motion.div>
    </MotionConfig>
  )
}

/* ── Stagger container + item ─────────────────────────────── */
export function Stagger({ children, className, ...props }) {
  return (
    <motion.div className={className} variants={staggerContainer} initial="initial" animate="animate" {...props}>
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className, ...props }) {
  return (
    <motion.div className={className} variants={staggerItem} {...props}>
      {children}
    </motion.div>
  )
}

/* ── Simple reveals ───────────────────────────────────────── */
export function FadeIn({ children, className, delay = 0, ...props }) {
  return (
    <motion.div className={className} variants={fadeIn} initial="initial" animate="animate"
      transition={{ delay }} {...props}>
      {children}
    </motion.div>
  )
}

export function SlideUp({ children, className, delay = 0, ...props }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, ease: EASE_OUT, delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/* ── HoverCard : entrance (stagger) + subtle lift on hover ──── */
export function HoverCard({ children, className, lift = true, ...props }) {
  return (
    <motion.div
      className={className}
      variants={staggerItem}
      whileHover={lift ? { y: -5, transition: SPRING } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/* ── GlowCard : premium animated border/glow (AI, hero blocks) */
export function GlowCard({ children, className, active = true }) {
  return (
    <motion.div
      className={cn('glow-card', active && 'glow-card--active', className)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}

/* ── Tappable : hover + tap feedback for buttons/clickables ── */
export function Tappable({ children, className, ...props }) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/* ── AnimatedNumber : count-up (respects reduced motion) ───── */
export function AnimatedNumber({
  value = 0, decimals = 0, prefix = '', suffix = '', duration = 1, className,
}) {
  const reduced = useReducedMotion()
  const mv = useMotionValue(reduced ? value : 0)
  const text = useTransform(mv, (v) =>
    `${prefix}${Number(v).toLocaleString('fr-FR', {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals,
    })}${suffix}`)

  useEffect(() => {
    if (reduced) { mv.set(value); return }
    const controls = animate(mv, value, { duration, ease: EASE_OUT })
    return () => controls.stop()
  }, [value, reduced]) // eslint-disable-line react-hooks/exhaustive-deps

  return <motion.span className={className}>{text}</motion.span>
}

export { motion }
