import { motion } from 'framer-motion'

function TimerCircle({ secondsLeft = 0, totalSeconds = 1 }) {
  const safeTotal = Math.max(totalSeconds, 1)
  const safeSeconds = Math.max(0, Math.min(secondsLeft, safeTotal))
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const progress = safeSeconds / safeTotal
  const strokeDashoffset = circumference * (1 - progress)
  const isLow = safeSeconds <= Math.ceil(safeTotal * 0.2)

  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg className="-rotate-90" width="112" height="112" viewBox="0 0 112 112">
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,0.22)"
          strokeWidth="10"
        />
        <motion.circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke={isLow ? '#fb7185' : '#22d3ee'}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/40">
        <span className="text-3xl font-black text-white">{safeSeconds}</span>
      </div>
    </div>
  )
}

export default TimerCircle
