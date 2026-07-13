// Central animation system — Framer Motion variants + tokens.
// Reused across the app so motion feels consistent (durations, easing, stagger).
// Keep it subtle and professional: smooth fade + slide, no flashy loops.

/* ── Easing & duration tokens ─────────────────────────────── */
export const EASE_OUT = [0.22, 1, 0.36, 1]   // expo-out : entrées douces et rapides
export const EASE_IO  = [0.4, 0, 0.2, 1]      // standard material
export const SPRING   = { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }

export const DUR = { fast: 0.25, base: 0.4, slow: 0.6 }

/* ── Page entrance ────────────────────────────────────────── */
export const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT, when: 'beforeChildren', staggerChildren: 0.06 } },
  exit:    { opacity: 0, y: -8, transition: { duration: DUR.fast, ease: EASE_IO } },
}

/* ── Stagger container + item (KPI grids, lists, sections) ── */
export const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}

export const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT } },
}

/* ── Simple primitives ────────────────────────────────────── */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DUR.base, ease: EASE_OUT } },
}

export const slideUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR.slow, ease: EASE_OUT } },
}

/* ── Modal / overlay ──────────────────────────────────────── */
export const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DUR.fast } },
  exit:    { opacity: 0, transition: { duration: DUR.fast } },
}

export const modalVariants = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT } },
  exit:    { opacity: 0, scale: 0.97, y: 8, transition: { duration: DUR.fast, ease: EASE_IO } },
}

/* ── List item (alerts, rows) ─────────────────────────────── */
export const listItem = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0, transition: { duration: DUR.base, ease: EASE_OUT } },
}

/* ── Hover interactions (shared) ──────────────────────────── */
export const hoverLift = {
  rest:  { y: 0, transition: SPRING },
  hover: { y: -5, transition: SPRING },
}

export const tapScale = { scale: 0.97 }
