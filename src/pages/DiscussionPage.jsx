import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import GameCard from '../components/GameCard'
import GlowingButton from '../components/GlowingButton'
import PlayerAvatar from '../components/PlayerAvatar'
import StarsBackground from '../components/StarsBackground'
import TimerCircle from '../components/TimerCircle'
import { DISCUSSION_TIME_SECONDS } from '../constants/gameConstants'
import {
  finishDiscussionRoundIfExpired,
  skipDiscussion,
} from '../services/roundService'

function getRoundKey(roundIndex) {
  return `round_${roundIndex}`
}

function getPhaseStartedAt(room) {
  return typeof room?.phaseStartedAt === 'number' ? room.phaseStartedAt : Date.now()
}

function getSecondsLeft(room, fallbackDuration) {
  const duration = room?.phaseDurationSeconds ?? fallbackDuration
  const elapsedSeconds = Math.floor((Date.now() - getPhaseStartedAt(room)) / 1000)

  return Math.max(0, duration - elapsedSeconds)
}

function DiscussionPage({ room, currentPlayerId }) {
  const timeoutRequestedRef = useRef(false)
  const [isSkipping, setIsSkipping] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(() =>
    getSecondsLeft(room, DISCUSSION_TIME_SECONDS),
  )
  const roundKey = getRoundKey(room?.currentRoundIndex ?? 0)
  const clue = room?.roundClues?.[roundKey]
  const cluePlayer = room?.players?.[clue?.playerId]
  const hasSkipped = Boolean(room?.discussionSkips?.[roundKey]?.[currentPlayerId])

  const avatar = useMemo(() => {
    if (!cluePlayer) {
      return null
    }

    return (
      <PlayerAvatar
        username={cluePlayer.username}
        color={cluePlayer.color}
        isHost={cluePlayer.isHost}
        size="lg"
      />
    )
  }, [cluePlayer])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSecondsLeft(getSecondsLeft(room, DISCUSSION_TIME_SECONDS))
    }, 250)

    return () => window.clearInterval(intervalId)
  }, [room])

  useEffect(() => {
    if (secondsLeft > 0 || timeoutRequestedRef.current) {
      return
    }

    timeoutRequestedRef.current = true
    finishDiscussionRoundIfExpired().catch(() => {
      timeoutRequestedRef.current = false
    })
  }, [secondsLeft])

  const handleSkip = async () => {
    if (hasSkipped || isSkipping) {
      return
    }

    setIsSkipping(true)

    try {
      await skipDiscussion(currentPlayerId)
    } finally {
      setIsSkipping(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-7 text-white">
      <StarsBackground />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-5xl items-center justify-center">
        <GameCard className="grid w-full items-center gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <motion.section
            className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-white/10 bg-white/5 p-6"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {avatar}
            <TimerCircle
              secondsLeft={secondsLeft}
              totalSeconds={room?.phaseDurationSeconds ?? DISCUSSION_TIME_SECONDS}
            />
          </motion.section>

          <motion.section
            className="text-center lg:text-left"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
          >
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
              Discuss
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-normal text-white">
              {clue?.username ?? cluePlayer?.username ?? 'Player'}
            </h1>
            <p className="mt-5 rounded-3xl border border-cyan-200/20 bg-slate-950/70 px-6 py-5 text-4xl font-black tracking-normal text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.14)]">
              {clue?.clue ?? 'No clue'}
            </p>
            <p className="mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-300">
              Discuss this clue. Press Skip if everyone is ready.
            </p>
            <div className="mt-7 flex justify-center lg:justify-start">
              <GlowingButton
                variant={hasSkipped ? 'secondary' : 'primary'}
                disabled={hasSkipped || isSkipping}
                onClick={handleSkip}
              >
                Skip
              </GlowingButton>
            </div>
          </motion.section>
        </GameCard>
      </div>
    </main>
  )
}

export default DiscussionPage
