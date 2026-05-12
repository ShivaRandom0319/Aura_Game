import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import GameCard from '../components/GameCard'
import GlowingButton from '../components/GlowingButton'
import LoadingScreen from '../components/LoadingScreen'
import PlayerAvatar from '../components/PlayerAvatar'
import StarsBackground from '../components/StarsBackground'
import { DEFAULT_ROOM_CODE, MIN_PLAYERS } from '../constants/gameConstants'
import { GAME_ERROR_MESSAGES, startGame } from '../services/gameService'
import {
  getStoredPlayerId,
  leaveRoom,
  listenToRoom,
} from '../services/lobbyService'
import DiscussionPage from './DiscussionPage'
import RevealPage from './RevealPage'
import ResultPage from './ResultPage'
import TypingPage from './TypingPage'
import VotingPage from './VotingPage'

const LOBBY_LOAD_ERROR = 'Could not load lobby. Please try again.'

function getActivePlayers(room) {
  return Object.values(room?.players ?? {})
    .filter((player) => player?.online !== false)
    .sort((firstPlayer, secondPlayer) => {
      const firstJoinedAt = Number(firstPlayer.joinedAt ?? 0)
      const secondJoinedAt = Number(secondPlayer.joinedAt ?? 0)

      return firstJoinedAt - secondJoinedAt
    })
}

function LobbyPlayerRow({ players, currentPlayerId }) {
  return (
    <div className="flex min-h-28 items-start justify-center gap-4">
      <AnimatePresence mode="popLayout">
        {players.map((player) => (
          <motion.div
            key={player.id}
            layout
            initial={{ opacity: 0, scale: 0.82, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.82, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="rounded-3xl border border-white/10 bg-slate-950/45 px-4 py-3 shadow-[0_0_22px_rgba(34,211,238,0.1)]"
          >
            <PlayerAvatar
              username={player.username}
              color={player.color}
              isHost={player.isHost}
              isCurrentPlayer={player.id === currentPlayerId}
              size="md"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function LobbyPage({ onLeaveLobby }) {
  const [room, setRoom] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isLeaving, setIsLeaving] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const currentPlayerId = getStoredPlayerId()

  useEffect(() => {
    const unsubscribeRoom = listenToRoom(
      (nextRoom) => {
        setRoom(nextRoom)
        setIsLoading(false)
        setError('')
      },
      () => {
        setError(LOBBY_LOAD_ERROR)
        setIsLoading(false)
      },
    )

    return () => {
      unsubscribeRoom()
    }
  }, [])

  const players = useMemo(() => getActivePlayers(room), [room])
  const currentPlayer = players.find((player) => player.id === currentPlayerId)
  const isCurrentPlayerHost = Boolean(currentPlayer?.isHost)
  const hasMinimumPlayers = players.length >= MIN_PLAYERS
  const canStartGame = isCurrentPlayerHost && hasMinimumPlayers

  const playerRows = [
    players.slice(0, 5),
    players.slice(5, 9),
    players.slice(9, 11),
  ]

  const handleStartGame = async () => {
    if (!canStartGame || isStarting) {
      return
    }

    setStartError('')
    setIsStarting(true)

    try {
      await startGame(currentPlayerId)
    } catch (startGameError) {
      setStartError(startGameError?.message || GAME_ERROR_MESSAGES.firebase)
    } finally {
      setIsStarting(false)
    }
  }

  const handleLeaveLobby = async () => {
    setIsLeaving(true)

    try {
      await leaveRoom(currentPlayerId)
      onLeaveLobby()
    } catch {
      setError('Could not leave lobby. Please try again.')
      setIsLeaving(false)
    }
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-7 text-white">
        <StarsBackground />
        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl items-center justify-center">
          <GameCard className="w-full text-center">
            <h1 className="text-3xl font-black tracking-normal text-white">
              Lobby unavailable
            </h1>
            <p className="mt-4 text-base font-semibold text-rose-200">{error}</p>
            <div className="mt-7 flex justify-center">
              <GlowingButton variant="secondary" onClick={onLeaveLobby}>
                Back Home
              </GlowingButton>
            </div>
          </GameCard>
        </div>
      </main>
    )
  }

  if (room?.gamePhase === 'reveal') {
    return <RevealPage room={room} currentPlayerId={currentPlayerId} />
  }

  if (room?.gamePhase === 'typing') {
    return (
      <TypingPage
        key={`typing-${room.currentRoundIndex}-${room.currentTypingPlayerId}`}
        room={room}
        currentPlayerId={currentPlayerId}
      />
    )
  }

  if (room?.gamePhase === 'discussion') {
    return (
      <DiscussionPage
        key={`discussion-${room.currentRoundIndex}`}
        room={room}
        currentPlayerId={currentPlayerId}
      />
    )
  }

  if (room?.gamePhase === 'voting') {
    return (
      <VotingPage room={room} currentPlayerId={currentPlayerId} />
    )
  }

  if (room?.gamePhase === 'result') {
    return <ResultPage room={room} currentPlayerId={currentPlayerId} />
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-5 py-5 text-white">
      <StarsBackground />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-7xl flex-col">
        <motion.header
          className="text-center"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <h1 className="text-5xl font-black tracking-normal text-white drop-shadow-[0_0_20px_rgba(34,211,238,0.7)]">
            Lobby
          </h1>
          <p className="mt-2 text-lg font-black uppercase tracking-[0.12em] text-cyan-200">
            Room Code: {DEFAULT_ROOM_CODE}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            Waiting for the host to start the game.
          </p>
        </motion.header>

        <GameCard className="mt-5 flex flex-1 flex-col justify-between gap-4 p-5">
          <div className="grid flex-1 content-center gap-4">
            <LobbyPlayerRow players={playerRows[0]} currentPlayerId={currentPlayerId} />
            <LobbyPlayerRow players={playerRows[1]} currentPlayerId={currentPlayerId} />

            <div className="grid min-h-32 grid-cols-[1fr_auto] items-end gap-4">
              <LobbyPlayerRow players={playerRows[2]} currentPlayerId={currentPlayerId} />

              <motion.aside
                className="flex min-w-72 flex-col items-stretch gap-3 rounded-3xl border border-cyan-200/15 bg-slate-950/55 p-4 shadow-[0_0_28px_rgba(34,211,238,0.12)]"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                {isCurrentPlayerHost && !hasMinimumPlayers && (
                  <p className="text-sm font-semibold text-amber-200">
                    Need at least 3 players to start.
                  </p>
                )}
                {!isCurrentPlayerHost && (
                  <p className="text-sm font-semibold text-slate-300">
                    Only the host can start the game.
                  </p>
                )}
                {startError && (
                  <p className="text-sm font-semibold text-rose-200">{startError}</p>
                )}
                <GlowingButton
                  variant="success"
                  disabled={!canStartGame || isStarting}
                  onClick={handleStartGame}
                >
                  Start
                </GlowingButton>
                <GlowingButton
                  variant="secondary"
                  disabled={isLeaving}
                  onClick={handleLeaveLobby}
                >
                  Leave Lobby
                </GlowingButton>
              </motion.aside>
            </div>
          </div>
        </GameCard>
      </section>
    </main>
  )
}

export default LobbyPage
