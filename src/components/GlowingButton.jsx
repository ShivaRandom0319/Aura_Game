import { motion } from 'framer-motion'

const variantClasses = {
  primary:
    'bg-cyan-300 text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.55)] hover:bg-cyan-200 focus:ring-cyan-200',
  secondary:
    'border border-cyan-200/30 bg-slate-900/80 text-cyan-100 shadow-[0_0_22px_rgba(125,211,252,0.2)] hover:border-cyan-200/60 hover:bg-slate-800 focus:ring-cyan-200/70',
  danger:
    'bg-rose-500 text-white shadow-[0_0_26px_rgba(244,63,94,0.52)] hover:bg-rose-400 focus:ring-rose-300',
  success:
    'bg-emerald-400 text-slate-950 shadow-[0_0_26px_rgba(52,211,153,0.5)] hover:bg-emerald-300 focus:ring-emerald-200',
}

function GlowingButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  className = '',
  type = 'button',
}) {
  const selectedVariant = variantClasses[variant] ?? variantClasses.primary

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        'relative inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold uppercase tracking-[0.08em]',
        'transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950',
        'disabled:cursor-not-allowed disabled:opacity-45',
        selectedVariant,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      whileHover={disabled ? undefined : { scale: 1.04, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
    >
      {children}
    </motion.button>
  )
}

export default GlowingButton
