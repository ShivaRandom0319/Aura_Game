import { motion } from 'framer-motion'

const sizeClasses = {
  sm: {
    avatar: 'h-12 w-12 text-lg',
    name: 'max-w-20 text-xs',
    badge: 'text-[8px]',
    x: 'text-2xl',
  },
  md: {
    avatar: 'h-16 w-16 text-2xl',
    name: 'max-w-24 text-sm',
    badge: 'text-[9px]',
    x: 'text-3xl',
  },
  lg: {
    avatar: 'h-20 w-20 text-3xl',
    name: 'max-w-28 text-base',
    badge: 'text-[10px]',
    x: 'text-4xl',
  },
}

function PlayerAvatar({
  username = 'Player',
  color = '#22d3ee',
  size = 'md',
  isHost = false,
  showX = false,
  isCurrentPlayer = false,
}) {
  const displayName = username?.trim() || 'Player'
  const initial = displayName.charAt(0).toUpperCase()
  const selectedSize = sizeClasses[size] ?? sizeClasses.md
  const usesTailwindBackground = color.startsWith?.('bg-')

  return (
    <motion.div
      className="flex min-w-20 flex-col items-center gap-2 text-center"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="relative">
        <motion.div
          className={[
            'relative flex items-center justify-center rounded-full border-2 border-white/25 font-black text-white',
            'shadow-[inset_0_-10px_18px_rgba(15,23,42,0.28),0_0_24px_rgba(255,255,255,0.18)]',
            selectedSize.avatar,
            isCurrentPlayer ? 'ring-4 ring-cyan-200/80 ring-offset-2 ring-offset-slate-950' : '',
            usesTailwindBackground ? color : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={usesTailwindBackground ? undefined : { backgroundColor: color }}
          whileHover={{ scale: 1.05 }}
        >
          <span>{initial}</span>
        </motion.div>

        {isHost && (
          <span
            className={[
              'absolute -right-3 -top-2 rounded-full bg-amber-300 px-2 py-0.5 font-black uppercase tracking-wide text-slate-950 shadow-[0_0_14px_rgba(252,211,77,0.65)]',
              selectedSize.badge,
            ].join(' ')}
          >
            Host
          </span>
        )}

        {showX && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/45">
            <span
              className={[
                'font-black leading-none text-rose-300 drop-shadow-[0_0_10px_rgba(251,113,133,0.95)]',
                selectedSize.x,
              ].join(' ')}
            >
              X
            </span>
          </div>
        )}
      </div>

      <span className={`${selectedSize.name} truncate font-semibold text-slate-100`}>
        {displayName}
      </span>
    </motion.div>
  )
}

export default PlayerAvatar
