import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import GameCard from '../components/GameCard'
import GlowingButton from '../components/GlowingButton'
import PlayerAvatar from '../components/PlayerAvatar'
import StarsBackground from '../components/StarsBackground'
import TimerCircle from '../components/TimerCircle'
import { VOTING_TIME_SECONDS } from '../constants/gameConstants'
import {
  finishVotingIfExpired,
  getRequiredVoteCount,
  submitVote,
  VOTING_ERROR_MESSAGES,
} from '../services/votingService'

function getPhaseStartedAt(room) {
  return typeof room?.phaseStartedAt === 'number' ? room.phaseStartedAt : Date.now()
}

function getSecondsLeft(room) {
  const duration = room?.phaseDurationSeconds ?? VOTING_TIME_SECONDS
  const elapsedSeconds = Math.floor((Date.now() - getPhaseStartedAt(room)) / 1000)

  return Math.max(0, duration - elapsedSeconds)
}

function getActivePlayers(room) {
  return Object.values(room?.players ?? {})
    .filter((player) => player?.online !== false)
    .sort((firstPlayer, secondPlayer) => {
      return Number(firstPlayer.joinedAt ?? 0) - Number(secondPlayer.joinedAt ?? 0)
    })
}

function PlayerVoteCard({ player, selectionNumber, disabled, onSelect }) {
  const isSelected = Boolean(selectionNumber)

  return (
    <motion.button
      type="button"
      layout
      disabled={disabled}
      onClick={() => onSelect(player.id)}
      className={[
        'relative rounded-3xl border px-4 py-3 transition duration-200',
        'bg-slate-950/45 shadow-[0_0_22px_rgba(34,211,238,0.1)]',
        isSelected
          ? 'border-cyan-200/80 ring-2 ring-cyan-200/50'
          : 'border-white/10 hover:border-cyan-200/45',
        disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer',
      ]
        .filter(Boolean)
        .join(' ')}
      initial={{ opacity: 0, scale: 0.82, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.82, y: -10 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {selectionNumber && (
        <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-300 text-sm font-black text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.7)]">
          {selectionNumber}
        </span>
      )}
      <PlayerAvatar
        username={player.username}
        color={player.color}
        isHost={player.isHost}
        size="md"
      />
    </motion.button>
  )
}

function PlayerVoteRow({ players, selectedTargetIds, disabled, onSelect }) {
  return (
    <div className="flex min-h-28 items-start justify-center gap-4">
      <AnimatePresence mode="popLayout">
        {players.map((player) => (
          <PlayerVoteCard
            key={player.id}
            player={player}
            disabled={disabled}
            onSelect={onSelect}
            selectionNumber={selectedTargetIds.indexOf(player.id) + 1 || 0}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ConfirmVoteModal({ selectedPlayers, onCancel, onConfirm, isConfirming }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6 backdrop-blur-sm">
      <motion.div
        className="w-full max-w-lg rounded-3xl border border-cyan-200/25 bg-slate-950 p-6 text-center text-white shadow-[0_0_42px_rgba(34,211,238,0.24)]"
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 14 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <h2 className="text-3xl font-black tracking-normal">Confirm your vote?</h2>

        <div className="mt-6 flex flex-wrap justify-center gap-5">
          {selectedPlayers.map((player) => (
            <PlayerAvatar
              key={player.id}
              username={player.username}
              color={player.color}
              isHost={player.isHost}
              size="lg"
            />
          ))}
        </div>

        <div className="mt-7 flex justify-center gap-3">
          <GlowingButton variant="secondary" disabled={isConfirming} onClick={onCancel}>
            Cancel
          </GlowingButton>
          <GlowingButton variant="success" disabled={isConfirming} onClick={onConfirm}>
            Confirm
          </GlowingButton>
        </div>
      </motion.div>
    </div>
  )
}

function VotingPage({ room, currentPlayerId }) {
  const timeoutRequestedRef = useRef(false)
  const [selectedTargetIds, setSelectedTargetIds] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(() => getSecondsLeft(room))
  const activePlayers = useMemo(() => getActivePlayers(room), [room])
  const requiredVoteCount = getRequiredVoteCount(room)
  const currentVote = room?.votes?.[currentPlayerId]
  const voteIsLocked = Boolean(currentVote?.confirmed)
  const visibleSelectedIds = voteIsLocked ? currentVote.targets ?? [] : selectedTargetIds
  const selectedPlayers = visibleSelectedIds
    .map((playerId) => room?.players?.[playerId])
    .filter(Boolean)
  const canConfirmSelection = selectedTargetIds.length === requiredVoteCount && !voteIsLocked

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSecondsLeft(getSecondsLeft(room))
    }, 250)

    return () => window.clearInterval(intervalId)
  }, [room])

  useEffect(() => {
    if (secondsLeft > 0 || timeoutRequestedRef.current) {
      return
    }

    timeoutRequestedRef.current = true
    finishVotingIfExpired().catch(() => {
      timeoutRequestedRef.current = false
    })
  }, [secondsLeft])

  const handleSelectPlayer = (playerId) => {
    if (voteIsLocked) {
      return
    }

    setError('')
    setSelectedTargetIds((currentSelection) => {
      if (currentSelection.includes(playerId)) {
        return currentSelection.filter((selectedPlayerId) => selectedPlayerId !== playerId)
      }

      if (currentSelection.length >= requiredVoteCount) {
        return [...currentSelection.slice(1), playerId]
      }

      return [...currentSelection, playerId]
    })
  }

  const handleOpenConfirm = () => {
    if (!canConfirmSelection) {
      setError(`Select exactly ${requiredVoteCount} player${requiredVoteCount > 1 ? 's' : ''}.`)
      return
    }

    setIsModalOpen(true)
  }

  const handleConfirmVote = async () => {
    setIsConfirming(true)
    setError('')

    try {
      await submitVote(currentPlayerId, selectedTargetIds)
      setIsModalOpen(false)
    } catch (voteError) {
      setError(voteError?.message || VOTING_ERROR_MESSAGES.firebase)
      setIsModalOpen(false)
    } finally {
      setIsConfirming(false)
    }
  }

  const playerRows = [
    activePlayers.slice(0, 5),
    activePlayers.slice(5, 9),
    activePlayers.slice(9, 11),
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-6 text-white">
      <StarsBackground />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
        <header className="flex items-start justify-between gap-6">
          <div>
            <motion.h1
              className="text-4xl font-black tracking-normal text-white md:text-5xl"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              WHO IS IMPOSTOR
            </motion.h1>
            <p className="mt-3 text-sm font-semibold text-slate-300">
              Choose carefully. There is no skip vote.
            </p>
          </div>

          <TimerCircle
            secondsLeft={secondsLeft}
            totalSeconds={room?.phaseDurationSeconds ?? VOTING_TIME_SECONDS}
          />
        </header>

        <div className="mt-5 h-px w-full bg-cyan-200/25 shadow-[0_0_18px_rgba(34,211,238,0.32)]" />

        <GameCard className="mt-5 flex flex-1 flex-col justify-between gap-5 p-5">
          <div className="grid flex-1 content-center gap-4">
            <PlayerVoteRow
              players={playerRows[0]}
              selectedTargetIds={visibleSelectedIds}
              disabled={voteIsLocked}
              onSelect={handleSelectPlayer}
            />
            <PlayerVoteRow
              players={playerRows[1]}
              selectedTargetIds={visibleSelectedIds}
              disabled={voteIsLocked}
              onSelect={handleSelectPlayer}
            />

            <div className="grid min-h-32 grid-cols-[1fr_auto] items-end gap-4">
              <PlayerVoteRow
                players={playerRows[2]}
                selectedTargetIds={visibleSelectedIds}
                disabled={voteIsLocked}
                onSelect={handleSelectPlayer}
              />

              <motion.aside
                className="flex min-w-72 flex-col items-stretch gap-3 rounded-3xl border border-cyan-200/15 bg-slate-950/55 p-4 shadow-[0_0_28px_rgba(34,211,238,0.12)]"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <p className="text-sm font-semibold text-slate-300">
                  Select {requiredVoteCount} impostor
                  {requiredVoteCount > 1 ? 's' : ''}.
                </p>
                {voteIsLocked && (
                  <p className="text-sm font-semibold text-emerald-200">
                    Vote locked.
                  </p>
                )}
                {error && <p className="text-sm font-semibold text-rose-200">{error}</p>}
                <GlowingButton
                  variant="success"
                  disabled={!canConfirmSelection}
                  onClick={handleOpenConfirm}
                >
                  Confirm Vote
                </GlowingButton>
              </motion.aside>
            </div>
          </div>
        </GameCard>
      </section>

      <AnimatePresence>
        {isModalOpen && (
          <ConfirmVoteModal
            selectedPlayers={selectedPlayers}
            isConfirming={isConfirming}
            onCancel={() => setIsModalOpen(false)}
            onConfirm={handleConfirmVote}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

export default VotingPage
