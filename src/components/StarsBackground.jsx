import { motion } from 'framer-motion'

const stars = Array.from({ length: 72 }, (_, index) => ({
  id: index,
  left: (index * 37) % 100,
  top: (index * 53) % 100,
  size: 1 + (index % 3),
  delay: (index % 12) * 0.25,
  duration: 2.6 + (index % 5) * 0.45,
}))

function StarsBackground({ className = '' }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#020617] ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.16),transparent_28%),radial-gradient(circle_at_50%_85%,rgba(16,185,129,0.13),transparent_35%)]" />
      <motion.div
        className="absolute left-[-12%] top-[18%] h-32 w-[124%] rotate-[-10deg] bg-cyan-300/10 blur-3xl"
        animate={{ x: ['-5%', '5%', '-5%'], opacity: [0.22, 0.42, 0.22] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      {stars.map((star) => (
        <motion.span
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            boxShadow: `0 0 ${star.size * 7}px rgba(255,255,255,0.85)`,
          }}
          animate={{
            opacity: [0.18, 0.95, 0.28],
            scale: [1, 1.45, 1],
            y: [0, -5, 0],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

export default StarsBackground
