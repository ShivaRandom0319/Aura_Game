import { useState } from 'react'
import { motion } from 'framer-motion'
import GameCard from '../components/GameCard'
import GlowingButton from '../components/GlowingButton'
import StarsBackground from '../components/StarsBackground'
import TextInput from '../components/TextInput'
import { DEFAULT_ROOM_CODE } from '../constants/gameConstants'
import {
  joinRoom,
  LOBBY_ERROR_MESSAGES,
  validateUsername,
} from '../services/lobbyService'

function JoinPage({ onBack, onJoinLobby }) {
  const [username, setUsername] = useState('')
  const [roomCode, setRoomCode] = useState(DEFAULT_ROOM_CODE)
  const [errors, setErrors] = useState({})
  const [isJoining, setIsJoining] = useState(false)

  const validateJoinForm = () => {
    const nextErrors = {}
    const usernameValidation = validateUsername(username)
    const normalizedRoomCode = roomCode.trim().toUpperCase()

    if (!usernameValidation.isValid) {
      nextErrors.username = usernameValidation.error
    }

    if (normalizedRoomCode !== DEFAULT_ROOM_CODE) {
      nextErrors.roomCode = LOBBY_ERROR_MESSAGES.invalidRoomCode
    }

    setErrors(nextErrors)
    return {
      isValid: Object.keys(nextErrors).length === 0,
      values: {
        username: usernameValidation.username,
        roomCode: normalizedRoomCode,
      },
    }
  }

  const handleJoinLobby = async (event) => {
    event.preventDefault()
    const result = validateJoinForm()

    if (!result.isValid) {
      return
    }

    setIsJoining(true)

    try {
      const joinedRoom = await joinRoom(result.values.username, result.values.roomCode)
      onJoinLobby(joinedRoom)
    } catch (error) {
      const message = error?.message || LOBBY_ERROR_MESSAGES.firebase

      if (message === LOBBY_ERROR_MESSAGES.duplicateUsername) {
        setErrors({ username: message })
      } else if (message === LOBBY_ERROR_MESSAGES.invalidRoomCode) {
        setErrors({ roomCode: message })
      } else {
        setErrors({ form: message })
      }
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-7 text-white">
      <StarsBackground />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-5xl items-center">
        <GameCard className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.section
            className="flex flex-col justify-center"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
              Join Aura
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-normal text-white md:text-5xl">
              Step into the lobby.
            </h1>
            <p className="mt-5 text-base font-medium leading-8 text-slate-300 md:text-lg">
              Enter your name and use room code ABC123 to join the lobby.
            </p>
          </motion.section>

          <motion.form
            className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-5"
            onSubmit={handleJoinLobby}
            noValidate
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
          >
            <TextInput
              label="Username"
              name="username"
              placeholder="Your name"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              error={errors.username}
              autoComplete="off"
            />

            <TextInput
              label="Room Code"
              name="roomCode"
              placeholder={DEFAULT_ROOM_CODE}
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              error={errors.roomCode}
              autoComplete="off"
            />

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {errors.form && (
                <p className="text-sm font-semibold text-rose-200 sm:mr-auto">
                  {errors.form}
                </p>
              )}
              <GlowingButton variant="secondary" onClick={onBack} disabled={isJoining}>
                Back
              </GlowingButton>
              <GlowingButton type="submit" disabled={isJoining}>
                Join Lobby
              </GlowingButton>
            </div>
          </motion.form>
        </GameCard>
      </div>
    </main>
  )
}

export default JoinPage
