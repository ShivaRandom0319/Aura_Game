import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import GameCard from '../components/GameCard'
import PlayerAvatar from '../components/PlayerAvatar'
import StarsBackground from '../components/StarsBackground'
import TimerCircle from '../components/TimerCircle'
import { REVEAL_TIME_SECONDS } from '../constants/gameConstants'
import { advanceRevealToTyping } from '../services/gameService'

function getPhaseStartedAt(room) {
  return typeof room?.phaseStartedAt === 'number' ? room.phaseStartedAt : Date.now()
}

function getRevealSecondsLeft(room) {
  const duration = room?.phaseDurationSeconds ?? REVEAL_TIME_SECONDS
  const elapsedSeconds = Math.floor((Date.now() - getPhaseStartedAt(room)) / 1000)

  return Math.max(0, duration - elapsedSeconds)
}

function RevealPage({ room, currentPlayerId }) {
  const advanceRequestedRef = useRef(false)
  const [secondsLeft, setSecondsLeft] = useState(() => getRevealSecondsLeft(room))
  const currentPlayer = room?.players?.[currentPlayerId]
  const isImpostor = currentPlayer?.role === 'impostor'
  const roleTitle = isImpostor ? 'Impostor' : 'Crewmate'
  const roleText = isImpostor ? 'Guess the word' : `Word: ${room?.currentWord?.text ?? ''}`
  const helperText = isImpostor
    ? 'Blend in. Watch others and guess the secret word.'
    : 'Give clues carefully. Do not make it too obvious.'
  const totalSeconds = room?.phaseDurationSeconds ?? REVEAL_TIME_SECONDS

  useEffect(() => {
    advanceRequestedRef.current = false

    const intervalId = window.setInterval(() => {
      setSecondsLeft(getRevealSecondsLeft(room))
    }, 250)

    return () => window.clearInterval(intervalId)
  }, [room])

  useEffect(() => {
    if (secondsLeft > 0 || advanceRequestedRef.current) {
      return
    }

    advanceRequestedRef.current = true
    advanceRevealToTyping().catch(() => {
      advanceRequestedRef.current = false
    })
  }, [secondsLeft])

  const avatar = useMemo(() => {
    if (!currentPlayer) {
      return null
    }

    return (
      <PlayerAvatar
        username={currentPlayer.username}
        color={currentPlayer.color}
        isHost={currentPlayer.isHost}
        isCurrentPlayer
        size="lg"
      />
    )
  }, [currentPlayer])

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-7 text-white">
      <StarsBackground />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-5xl items-center justify-center">
        <GameCard className="grid w-full items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <motion.section
            className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-white/10 bg-white/5 p-6"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {avatar}
            <TimerCircle secondsLeft={secondsLeft} totalSeconds={totalSeconds} />
          </motion.section>

          <motion.section
            className="text-center lg:text-left"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
          >
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
              Reveal
            </p>
            <h1 className="mt-3 text-5xl font-black tracking-normal text-white drop-shadow-[0_0_20px_rgba(34,211,238,0.55)]">
              {roleTitle}
            </h1>
            <p className="mt-5 text-3xl font-black tracking-normal text-cyan-100">
              {roleText}
            </p>
            <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-slate-300">
              {helperText}
            </p>
          </motion.section>
        </GameCard>
      </div>
    </main>
  )
}

export default RevealPage
