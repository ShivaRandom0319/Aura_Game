import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import GameCard from '../components/GameCard'
import GlowingButton from '../components/GlowingButton'
import PlayerAvatar from '../components/PlayerAvatar'
import StarsBackground from '../components/StarsBackground'
import { resetGameToLobby } from '../services/gameService'

function getImpostorPlayers(room) {
  const resultImpostorIds = Object.keys(room?.result?.impostorIds ?? {})

  return resultImpostorIds.map((playerId, index) => {
    const player = room?.players?.[playerId]
    const profile =
      room?.result?.impostorProfiles?.find?.((impostor) => impostor.id === playerId) ??
      room?.result?.impostorProfiles?.[index]

    return {
      id: playerId,
      username:
        player?.username ??
        profile?.username ??
        room?.result?.impostorNames?.[index] ??
        'Impostor',
      color: player?.color ?? profile?.color ?? '#fb7185',
      isHost: Boolean(player?.isHost ?? profile?.isHost),
    }
  })
}

function getResultCopy(playerRole, winningTeam) {
  const isImpostor = playerRole === 'impostor'
  const playerWon =
    (isImpostor && winningTeam === 'impostors') ||
    (!isImpostor && winningTeam === 'crewmates')

  if (isImpostor && playerWon) {
    return {
      playerWon,
      subtext: 'You fooled the crew.',
      title: 'Victory',
    }
  }

  if (isImpostor) {
    return {
      playerWon,
      subtext: 'The crew discovered the impostor.',
      title: 'Defeat',
    }
  }

  if (playerWon) {
    return {
      playerWon,
      subtext: 'The impostor was found.',
      title: 'Victory',
    }
  }

  return {
    playerWon,
    subtext: 'The impostor escaped.',
    title: 'Defeat',
  }
}

function ResultPage({ room, currentPlayerId }) {
  const [isReturning, setIsReturning] = useState(false)
  const [error, setError] = useState('')
  const currentPlayer = room?.players?.[currentPlayerId]
  const result = room?.result ?? {}
  const resultCopy = getResultCopy(currentPlayer?.role, result.winningTeam)
  const impostorPlayers = useMemo(() => getImpostorPlayers(room), [room])
  const currentPlayerIsImpostor = currentPlayer?.role === 'impostor'

  const handleReturnToLobby = async () => {
    setIsReturning(true)
    setError('')

    try {
      await resetGameToLobby()
    } catch {
      setError('Could not return to lobby. Please try again.')
      setIsReturning(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-7 text-white">
      <StarsBackground />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-6xl items-center justify-center">
        <GameCard className="w-full p-7 text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
              Final Result
            </p>
            <h1
              className={[
                'mt-3 text-6xl font-black tracking-normal drop-shadow-[0_0_24px_rgba(34,211,238,0.6)] md:text-7xl',
                resultCopy.playerWon ? 'text-cyan-100' : 'text-rose-100',
              ].join(' ')}
            >
              {resultCopy.title}
            </h1>
            <p className="mt-4 text-xl font-bold text-slate-200">
              {resultCopy.subtext}
            </p>

            {currentPlayerIsImpostor && result.word?.text && (
              <p className="mt-4 text-2xl font-black text-cyan-100">
                Word: {result.word.text}
              </p>
            )}
          </motion.div>

          <motion.section
            className={[
              'mt-9 grid items-center justify-center gap-6',
              impostorPlayers.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1',
            ].join(' ')}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          >
            {impostorPlayers.map((player) => (
              <div
                key={player.id}
                className="mx-auto w-full max-w-xs rounded-3xl border border-cyan-200/15 bg-slate-950/55 p-6 shadow-[0_0_28px_rgba(34,211,238,0.14)]"
              >
                <PlayerAvatar
                  username={player.username}
                  color={player.color}
                  isHost={player.isHost}
                  size="lg"
                />
              </div>
            ))}
          </motion.section>

          {error && <p className="mt-6 text-sm font-semibold text-rose-200">{error}</p>}

          <div className="mt-8 flex justify-center">
            <GlowingButton
              variant="primary"
              disabled={isReturning}
              onClick={handleReturnToLobby}
            >
              Return to Lobby
            </GlowingButton>
          </div>
        </GameCard>
      </div>
    </main>
  )
}

export default ResultPage
