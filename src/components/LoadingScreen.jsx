import { motion } from 'framer-motion'
import StarsBackground from './StarsBackground'

function LoadingScreen({ text = 'Loading Aura...', helperText = 'Reconnecting to Aura...' }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <StarsBackground />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <motion.p
          className="text-2xl font-black tracking-normal text-cyan-100 drop-shadow-[0_0_18px_rgba(34,211,238,0.75)]"
          animate={{ opacity: [0.55, 1, 0.55], scale: [0.98, 1.02, 0.98] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {text}
        </motion.p>
        {helperText && (
          <p className="text-sm font-semibold text-slate-400">{helperText}</p>
        )}
      </div>
    </div>
  )
}

export default LoadingScreen
