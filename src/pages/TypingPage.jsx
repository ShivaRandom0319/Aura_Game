import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import GameCard from '../components/GameCard'
import GlowingButton from '../components/GlowingButton'
import PlayerAvatar from '../components/PlayerAvatar'
import StarsBackground from '../components/StarsBackground'
import TextInput from '../components/TextInput'
import TimerCircle from '../components/TimerCircle'
import { TYPING_TIME_SECONDS } from '../constants/gameConstants'
import {
  ROUND_ERROR_MESSAGES,
  skipUnavailableTypingPlayer,
  submitClue,
  submitNoClueForExpiredTypingRound,
  validateClue,
} from '../services/roundService'

function getRoundOrder(room) {
  if (Array.isArray(room?.roundOrder)) {
    return room.roundOrder
  }

  return Object.entries(room?.roundOrder ?? {})
    .sort(([firstIndex], [secondIndex]) => Number(firstIndex) - Number(secondIndex))
    .map(([, playerId]) => playerId)
}

function getPhaseStartedAt(room) {
  return typeof room?.phaseStartedAt === 'number' ? room.phaseStartedAt : Date.now()
}

function getSecondsLeft(room, fallbackDuration) {
  const duration = room?.phaseDurationSeconds ?? fallbackDuration
  const elapsedSeconds = Math.floor((Date.now() - getPhaseStartedAt(room)) / 1000)

  return Math.max(0, duration - elapsedSeconds)
}

function TypingPage({ room, currentPlayerId }) {
  const timeoutRequestedRef = useRef(false)
  const skipDisconnectedRef = useRef(false)
  const [clue, setClue] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(() =>
    getSecondsLeft(room, TYPING_TIME_SECONDS),
  )
  const roundOrder = useMemo(() => getRoundOrder(room), [room])
  const currentTypingPlayerId = room?.currentTypingPlayerId
  const currentTypingPlayer = room?.players?.[currentTypingPlayerId]
  const isCurrentTypingPlayer = currentTypingPlayerId === currentPlayerId
  const roundNumber = (room?.currentRoundIndex ?? 0) + 1
  const totalRounds = roundOrder.length

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSecondsLeft(getSecondsLeft(room, TYPING_TIME_SECONDS))
    }, 250)

    return () => window.clearInterval(intervalId)
  }, [room])

  useEffect(() => {
    const currentTypingPlayerIsAvailable =
      currentTypingPlayer && currentTypingPlayer.online !== false

    if (
      !currentTypingPlayerId ||
      currentTypingPlayerIsAvailable ||
      skipDisconnectedRef.current
    ) {
      return
    }

    skipDisconnectedRef.current = true
    skipUnavailableTypingPlayer().catch(() => {
      skipDisconnectedRef.current = false
    })
  }, [currentTypingPlayer, currentTypingPlayerId])

  useEffect(() => {
    if (secondsLeft > 0 || timeoutRequestedRef.current) {
      return
    }

    timeoutRequestedRef.current = true
    submitNoClueForExpiredTypingRound().catch(() => {
      timeoutRequestedRef.current = false
    })
  }, [secondsLeft])

  const handleSubmitClue = async (event) => {
    event.preventDefault()
    const clueValidation = validateClue(clue)

    if (!clueValidation.isValid) {
      setError(clueValidation.error)
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await submitClue(currentPlayerId, clueValidation.clue)
    } catch (submitError) {
      setError(submitError?.message || ROUND_ERROR_MESSAGES.firebase)
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-7 text-white">
      <StarsBackground />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-6xl flex-col">
        <header className="flex items-start justify-between gap-6">
          <motion.p
            className="rounded-full border border-cyan-200/20 bg-slate-950/70 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.16)]"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            Round {roundNumber} of {totalRounds}
          </motion.p>

          <TimerCircle
            secondsLeft={secondsLeft}
            totalSeconds={room?.phaseDurationSeconds ?? TYPING_TIME_SECONDS}
          />
        </header>

        <div className="flex flex-1 items-center justify-center">
          {isCurrentTypingPlayer ? (
            <GameCard className="w-full max-w-xl text-center">
              <motion.form
                className="flex flex-col gap-5"
                onSubmit={handleSubmitClue}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <h1 className="text-4xl font-black tracking-normal text-white">
                  Enter your clue
                </h1>
                <TextInput
                  name="clue"
                  placeholder="One simple clue"
                  value={clue}
                  onChange={(event) => setClue(event.target.value)}
                  error={error}
                  maxLength={20}
                  autoComplete="off"
                />
                <GlowingButton type="submit" disabled={isSubmitting}>
                  OK
                </GlowingButton>
                <p className="text-sm font-semibold text-slate-300">
                  Type one simple clue. Do not reveal too much.
                </p>
              </motion.form>
            </GameCard>
          ) : (
            <GameCard className="w-full max-w-xl text-center">
              <motion.div
                className="flex flex-col items-center gap-5"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <PlayerAvatar
                  username={currentTypingPlayer?.username}
                  color={currentTypingPlayer?.color}
                  isHost={currentTypingPlayer?.isHost}
                  size="lg"
                />
                <h1 className="text-4xl font-black tracking-normal text-white">
                  {currentTypingPlayer?.username ?? 'Player'} is typing...
                </h1>
                <p className="max-w-md text-sm font-semibold leading-6 text-slate-300">
                  Watch carefully. Their clue may reveal the impostor.
                </p>
              </motion.div>
            </GameCard>
          )}
        </div>
      </section>
    </main>
  )
}

export default TypingPage
