import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import GameCard from '../components/GameCard'
import GlowingButton from '../components/GlowingButton'
import StarsBackground from '../components/StarsBackground'
import TextInput from '../components/TextInput'
import { MAX_PLAYERS, ROOM_OPTIONS, USERNAME_MAX_LENGTH } from '../constants/gameConstants'
import {
  joinRoom,
  LOBBY_ERROR_MESSAGES,
  listenToRoomSummaries,
  validateUsername,
} from '../services/lobbyService'

function JoinPage({ onBack, onJoinLobby }) {
  const [username, setUsername] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [roomSummaries, setRoomSummaries] = useState(() =>
    ROOM_OPTIONS.map((room) => ({
      ...room,
      gamePhase: 'lobby',
      isFull: false,
      playerCount: 0,
    })),
  )
  const [errors, setErrors] = useState({})
  const [isJoining, setIsJoining] = useState(false)

  useEffect(() => {
    const unsubscribeRooms = listenToRoomSummaries(
      (summaries) => {
        setRoomSummaries(summaries)
      },
      () => {
        setErrors((currentErrors) => ({
          ...currentErrors,
          form: 'Could not load rooms. Please try again.',
        }))
      },
    )

    return () => unsubscribeRooms()
  }, [])

  const selectedRoom = useMemo(() => {
    return roomSummaries.find((room) => room.id === selectedRoomId)
  }, [roomSummaries, selectedRoomId])

  const validateJoinForm = () => {
    const nextErrors = {}
    const usernameValidation = validateUsername(username)

    if (!usernameValidation.isValid) {
      nextErrors.username = usernameValidation.error
    }

    if (!selectedRoom) {
      nextErrors.room = LOBBY_ERROR_MESSAGES.invalidRoom
    } else if (selectedRoom.isFull) {
      nextErrors.room = LOBBY_ERROR_MESSAGES.roomFull
    }

    setErrors(nextErrors)
    return {
      isValid: Object.keys(nextErrors).length === 0,
      values: {
        roomId: selectedRoom?.id ?? '',
        username: usernameValidation.username,
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
      const joinedRoom = await joinRoom(result.values.username, result.values.roomId)
      onJoinLobby(joinedRoom)
    } catch (error) {
      const message = error?.message || LOBBY_ERROR_MESSAGES.firebase

      if (message === LOBBY_ERROR_MESSAGES.duplicateUsername) {
        setErrors({ username: message })
      } else if (message === LOBBY_ERROR_MESSAGES.invalidRoom) {
        setErrors({ room: message })
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
              Enter your name, choose one room, and join the lobby.
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
              maxLength={USERNAME_MAX_LENGTH}
              pattern="[A-Za-z0-9_]+"
              autoComplete="off"
            />

            <section className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-cyan-100/80">
                Rooms
              </p>
              <div className="grid gap-3">
                {roomSummaries.map((room) => {
                  const isSelected = selectedRoomId === room.id

                  return (
                    <label
                      key={room.id}
                      className={[
                        'flex cursor-pointer items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition duration-200',
                        isSelected
                          ? 'border-cyan-200/80 bg-cyan-200/10 shadow-[0_0_20px_rgba(34,211,238,0.18)]'
                          : 'border-cyan-200/15 bg-slate-950/45 hover:border-cyan-200/45',
                        room.isFull ? 'cursor-not-allowed opacity-60' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <span className="text-base font-black text-white">{room.name}</span>
                      <span className="ml-auto text-sm font-black text-cyan-100">
                        {room.playerCount}/{MAX_PLAYERS}
                      </span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={room.isFull}
                        onChange={() => setSelectedRoomId(room.id)}
                        className="h-5 w-5 accent-cyan-300"
                        aria-label={`Select ${room.name}`}
                      />
                    </label>
                  )
                })}
              </div>
              {errors.room && (
                <p className="text-sm font-semibold text-rose-200">{errors.room}</p>
              )}
            </section>

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
