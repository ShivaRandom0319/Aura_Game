import { motion } from 'framer-motion'

function GameCard({ children, className = '' }) {
  return (
    <motion.section
      className={[
        'rounded-2xl border border-cyan-200/20 bg-slate-950/72 p-6 text-white',
        'shadow-[0_0_34px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  )
}

export default GameCard
