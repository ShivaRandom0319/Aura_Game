import {
  onDisconnect,
  onValue,
  ref,
  runTransaction,
  serverTimestamp,
} from 'firebase/database'
import { database } from '../firebase/firebaseConfig'
import {
  DEFAULT_ROOM_CODE,
  TYPING_TIME_SECONDS,
  VOTING_TIME_SECONDS,
  MAX_PLAYERS,
  USERNAME_MAX_LENGTH,
} from '../constants/gameConstants'

const ROOM_PATH = `rooms/${DEFAULT_ROOM_CODE}`
const PLAYER_ID_STORAGE_KEY = 'aura_player_id'
const USERNAME_STORAGE_KEY = 'aura_username'
const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/
const ACTIVE_GAME_PHASES = new Set(['reveal', 'typing', 'discussion', 'voting'])

export const LOBBY_ERROR_MESSAGES = {
  duplicateUsername: 'This username is already taken. Try another name.',
  firebase: 'Could not join lobby. Please try again.',
  invalidRoomCode: 'Invalid room code. Use ABC123 to join Aura.',
  roomFull: 'Lobby is full. Maximum 11 players can join.',
}

const playerColors = [
  '#00FFFF',
  '#FF4D6D',
  '#FFD166',
  '#7CFF6B',
  '#9B5DE5',
  '#F15BB5',
  '#00BBF9',
  '#FEE440',
  '#38BDF8',
  '#FB7185',
  '#34D399',
]

class LobbyServiceError extends Error {
  constructor(message) {
    super(message)
    this.name = 'LobbyServiceError'
  }
}

function getStorage() {
  return typeof window === 'undefined' ? null : window.localStorage
}

function createPlayerId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `player_${crypto.randomUUID()}`
  }

  return `player_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function getRoomReference() {
  if (!database) {
    throw new LobbyServiceError(LOBBY_ERROR_MESSAGES.firebase)
  }

  return ref(database, ROOM_PATH)
}

function normalizeRoomCode(roomCode) {
  return String(roomCode ?? '').trim().toUpperCase()
}

function getActivePlayers(players = {}) {
  return Object.values(players ?? {})
    .filter((player) => player?.online !== false)
    .sort((firstPlayer, secondPlayer) => {
      return Number(firstPlayer.joinedAt ?? 0) - Number(secondPlayer.joinedAt ?? 0)
    })
}

function applySingleHost(players, hostId) {
  return Object.fromEntries(
    Object.entries(players ?? {}).map(([currentPlayerId, player]) => [
      currentPlayerId,
      {
        ...player,
        isHost: currentPlayerId === hostId,
      },
    ]),
  )
}

function pickPlayerColor(playerId) {
  const colorIndex = [...playerId].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  )

  return playerColors[colorIndex % playerColors.length]
}

function removeOfflinePlayers(players = {}) {
  return Object.fromEntries(
    Object.entries(players ?? {}).filter(([, player]) => player?.online !== false),
  )
}

function getImpostorIds(room) {
  return Object.keys(room?.impostorIds ?? {}).filter((playerId) => {
    return room.impostorIds[playerId] === true
  })
}

function getPlayerSnapshot(room, playerId) {
  return room?.players?.[playerId] ?? room?.gamePlayers?.[playerId] ?? null
}

function getImpostorProfiles(room, impostorIds) {
  return impostorIds.map((impostorId) => {
    const player = getPlayerSnapshot(room, impostorId)

    return {
      id: impostorId,
      username: player?.username ?? 'Impostor',
      color: player?.color ?? '#fb7185',
      isHost: Boolean(player?.isHost),
    }
  })
}

function createImpostorLeftResult(room) {
  const impostorIds = getImpostorIds(room)
  const impostorProfiles = getImpostorProfiles(room, impostorIds)

  return {
    winningTeam: 'crewmates',
    impostorIds: Object.fromEntries(impostorIds.map((impostorId) => [impostorId, true])),
    impostorNames: impostorProfiles.map((player) => player.username),
    impostorProfiles,
    word: room.currentWord ?? null,
    reason:
      impostorIds.length > 1
        ? 'An impostor left the game.'
        : 'The impostor left the game.',
  }
}

function getRoundOrder(room) {
  if (Array.isArray(room?.roundOrder)) {
    return room.roundOrder
  }

  return Object.entries(room?.roundOrder ?? {})
    .sort(([firstIndex], [secondIndex]) => Number(firstIndex) - Number(secondIndex))
    .map(([, playerId]) => playerId)
}

function findNextAvailableRoundPlayer(room, startIndex = 0) {
  const roundOrder = getRoundOrder(room)

  for (let roundIndex = startIndex; roundIndex < roundOrder.length; roundIndex += 1) {
    const playerId = roundOrder[roundIndex]
    const player = room.players?.[playerId]

    if (player && player.online !== false) {
      return {
        playerId,
        roundIndex,
      }
    }
  }

  return null
}

function moveToNextTypingRoundOrVoting(room, nextStartIndex) {
  const nextPlayer = findNextAvailableRoundPlayer(room, nextStartIndex)

  if (!nextPlayer) {
    return {
      ...room,
      currentTypingPlayerId: null,
      gamePhase: 'voting',
      phaseDurationSeconds: VOTING_TIME_SECONDS,
      phaseStartedAt: serverTimestamp(),
      result: null,
      votes: pruneVotes(room),
    }
  }

  return {
    ...room,
    currentRoundIndex: nextPlayer.roundIndex,
    currentTypingPlayerId: nextPlayer.playerId,
    gamePhase: 'typing',
    phaseDurationSeconds: TYPING_TIME_SECONDS,
    phaseStartedAt: serverTimestamp(),
  }
}

function getRoundKey(roundIndex) {
  return `round_${roundIndex}`
}

function pruneVotes(room) {
  const activePlayerIds = new Set(getActivePlayers(room?.players ?? {}).map((player) => player.id))

  return Object.fromEntries(
    Object.entries(room?.votes ?? {})
      .filter(([voterId, vote]) => {
        return activePlayerIds.has(voterId) && vote?.confirmed === true
      })
      .map(([voterId, vote]) => [
        voterId,
        {
          ...vote,
          targets: (vote.targets ?? []).filter((targetId) => activePlayerIds.has(targetId)),
        },
      ]),
  )
}

function allActivePlayersSkippedDiscussion(room) {
  const activePlayers = getActivePlayers(room.players ?? {})
  const roundKey = getRoundKey(room.currentRoundIndex ?? 0)
  const roundSkips = room.discussionSkips?.[roundKey] ?? {}

  return activePlayers.length > 0 && activePlayers.every((player) => roundSkips[player.id])
}

function allActivePlayersConfirmedVotes(room) {
  const activePlayers = getActivePlayers(room.players ?? {})

  return (
    activePlayers.length > 0 &&
    activePlayers.every((player) => room.votes?.[player.id]?.confirmed === true)
  )
}

function countVotes(room) {
  const voteCounts = Object.fromEntries(
    getActivePlayers(room.players ?? {}).map((player) => [player.id, 0]),
  )

  Object.values(pruneVotes(room)).forEach((vote) => {
    vote.targets.forEach((targetId) => {
      if (Object.prototype.hasOwnProperty.call(voteCounts, targetId)) {
        voteCounts[targetId] += 1
      }
    })
  })

  return voteCounts
}

function calculateSingleImpostorResult(voteCounts, impostorId) {
  const entries = Object.entries(voteCounts)

  if (entries.length === 0) {
    return {
      reason: 'No active votes were available, so impostors win.',
      winningTeam: 'impostors',
    }
  }

  const highestVoteCount = Math.max(...entries.map(([, count]) => count))
  const highestPlayers = entries.filter(([, count]) => count === highestVoteCount)

  if (highestPlayers.length !== 1) {
    return {
      reason: 'The highest vote was tied, so impostors win.',
      winningTeam: 'impostors',
    }
  }

  return highestPlayers[0][0] === impostorId
    ? {
        reason: 'The highest voted player was the impostor.',
        winningTeam: 'crewmates',
      }
    : {
        reason: 'The highest voted player was not the impostor.',
        winningTeam: 'impostors',
      }
}

function calculateTwoImpostorResult(voteCounts, impostorIds) {
  const entries = Object.entries(voteCounts).sort((firstEntry, secondEntry) => {
    return secondEntry[1] - firstEntry[1]
  })

  if (entries.length < 2) {
    return {
      reason: 'Fewer than two active players could be ranked, so impostors win.',
      winningTeam: 'impostors',
    }
  }

  const secondPlaceVotes = entries[1][1]
  const playersAtOrAboveSecond = entries.filter(([, count]) => {
    return count >= secondPlaceVotes
  })

  if (playersAtOrAboveSecond.length !== 2) {
    return {
      reason: 'A tie affected the top two selection, so impostors win.',
      winningTeam: 'impostors',
    }
  }

  const topTwoPlayerIds = playersAtOrAboveSecond.map(([playerId]) => playerId)
  const foundBothImpostors = impostorIds.every((impostorId) => {
    return topTwoPlayerIds.includes(impostorId)
  })

  return foundBothImpostors
    ? {
        reason: 'The top two voted players were both impostors.',
        winningTeam: 'crewmates',
      }
    : {
        reason: 'The top two voted players did not include both impostors.',
        winningTeam: 'impostors',
      }
}

function calculateVotingResult(room) {
  const impostorIds = getImpostorIds(room)
  const impostorProfiles = getImpostorProfiles(room, impostorIds)
  const voteCounts = countVotes(room)
  const outcome =
    impostorIds.length > 1
      ? calculateTwoImpostorResult(voteCounts, impostorIds)
      : calculateSingleImpostorResult(voteCounts, impostorIds[0])

  return {
    winningTeam: outcome.winningTeam,
    impostorIds: Object.fromEntries(impostorIds.map((impostorId) => [impostorId, true])),
    impostorNames: impostorProfiles.map((player) => player.username),
    impostorProfiles,
    word: room.currentWord ?? null,
    reason: outcome.reason,
  }
}

function pickHostId(room) {
  const players = room?.players ?? {}
  const currentHost = room?.hostId ? players[room.hostId] : null

  if (currentHost && currentHost.online !== false) {
    return room.hostId
  }

  return getActivePlayers(players)[0]?.id ?? null
}

function getRepairedRoom(room) {
  if (!room) {
    return room
  }

  let nextRoom = {
    ...room,
    players: removeOfflinePlayers(room.players ?? {}),
  }
  const hostId = pickHostId(nextRoom)

  nextRoom = {
    ...nextRoom,
    hostId,
    players: applySingleHost(nextRoom.players, hostId),
  }

  if (!ACTIVE_GAME_PHASES.has(nextRoom.gamePhase)) {
    return nextRoom
  }

  const impostorIds = getImpostorIds(nextRoom)
  const activeImpostorIds = impostorIds.filter((impostorId) => {
    return Boolean(nextRoom.players?.[impostorId])
  })

  if (impostorIds.length > 0 && activeImpostorIds.length < impostorIds.length) {
    return {
      ...nextRoom,
      currentTypingPlayerId: null,
      gamePhase: 'result',
      phaseDurationSeconds: null,
      phaseStartedAt: serverTimestamp(),
      result: createImpostorLeftResult(nextRoom),
      votes: pruneVotes(nextRoom),
    }
  }

  if (nextRoom.gamePhase === 'typing') {
    const currentTypingPlayer = nextRoom.players?.[nextRoom.currentTypingPlayerId]

    if (!currentTypingPlayer || currentTypingPlayer.online === false) {
      return moveToNextTypingRoundOrVoting(
        nextRoom,
        (nextRoom.currentRoundIndex ?? 0) + 1,
      )
    }
  }

  if (
    nextRoom.gamePhase === 'discussion' &&
    allActivePlayersSkippedDiscussion(nextRoom)
  ) {
    return moveToNextTypingRoundOrVoting(nextRoom, (nextRoom.currentRoundIndex ?? 0) + 1)
  }

  if (nextRoom.gamePhase === 'voting') {
    nextRoom = {
      ...nextRoom,
      votes: pruneVotes(nextRoom),
    }

    if (allActivePlayersConfirmedVotes(nextRoom)) {
      return {
        ...nextRoom,
        gamePhase: 'result',
        result: calculateVotingResult(nextRoom),
      }
    }
  }

  return nextRoom
}

function doesRoomNeedRepair(room) {
  if (!room) {
    return false
  }

  const repairedRoom = getRepairedRoom(room)

  return JSON.stringify(room) !== JSON.stringify(repairedRoom)
}

async function repairRoomState() {
  await runTransaction(
    getRoomReference(),
    (room) => {
      if (!doesRoomNeedRepair(room)) {
        return room
      }

      return getRepairedRoom(room)
    },
    { applyLocally: false },
  )
}

export function getOrCreatePlayerId() {
  const storage = getStorage()
  const existingPlayerId = storage?.getItem(PLAYER_ID_STORAGE_KEY)

  if (existingPlayerId) {
    return existingPlayerId
  }

  const playerId = createPlayerId()
  storage?.setItem(PLAYER_ID_STORAGE_KEY, playerId)
  return playerId
}

export function getStoredPlayerId() {
  return getStorage()?.getItem(PLAYER_ID_STORAGE_KEY) ?? ''
}

export function validateUsername(username) {
  const trimmedUsername = String(username ?? '').trim()

  if (!trimmedUsername) {
    return {
      error: 'Username cannot be empty.',
      isValid: false,
      username: trimmedUsername,
    }
  }

  if (trimmedUsername.length > USERNAME_MAX_LENGTH) {
    return {
      error: `Username must be ${USERNAME_MAX_LENGTH} characters or fewer.`,
      isValid: false,
      username: trimmedUsername,
    }
  }

  if (!USERNAME_PATTERN.test(trimmedUsername)) {
    return {
      error: 'Username can use letters, numbers, and underscore only.',
      isValid: false,
      username: trimmedUsername,
    }
  }

  return {
    error: '',
    isValid: true,
    username: trimmedUsername,
  }
}

export async function joinRoom(username, roomCode) {
  const normalizedRoomCode = normalizeRoomCode(roomCode)
  const usernameValidation = validateUsername(username)

  if (normalizedRoomCode !== DEFAULT_ROOM_CODE) {
    throw new LobbyServiceError(LOBBY_ERROR_MESSAGES.invalidRoomCode)
  }

  if (!usernameValidation.isValid) {
    throw new LobbyServiceError(usernameValidation.error)
  }

  const playerId = getOrCreatePlayerId()
  const roomReference = getRoomReference()
  let joinError = ''

  try {
    const transactionResult = await runTransaction(
      roomReference,
      (room) => {
        const currentRoom = room ?? {}
        const players = currentRoom.players ?? {}
        const activePlayers = getActivePlayers(players)
        const normalizedUsername = usernameValidation.username.toLowerCase()
        const duplicatePlayer = activePlayers.find((player) => {
          return (
            player.id !== playerId &&
            String(player.username ?? '').toLowerCase() === normalizedUsername
          )
        })

        if (duplicatePlayer) {
          joinError = LOBBY_ERROR_MESSAGES.duplicateUsername
          return undefined
        }

        const existingPlayer = players[playerId]
        const playerIsAlreadyActive = Boolean(existingPlayer && existingPlayer.online !== false)

        if (!playerIsAlreadyActive && activePlayers.length >= MAX_PLAYERS) {
          joinError = LOBBY_ERROR_MESSAGES.roomFull
          return undefined
        }

        const currentHost = currentRoom.hostId ? players[currentRoom.hostId] : null
        const hasOnlineHost = Boolean(currentHost && currentHost.online !== false)
        const hostId = hasOnlineHost ? currentRoom.hostId : playerId
        const timestamp = serverTimestamp()
        let nextPlayers = { ...players }

        if (!hasOnlineHost) {
          Object.keys(nextPlayers).forEach((currentPlayerId) => {
            nextPlayers[currentPlayerId] = {
              ...nextPlayers[currentPlayerId],
              isHost: false,
            }
          })
        }

        nextPlayers[playerId] = {
          id: playerId,
          username: usernameValidation.username,
          color: existingPlayer?.color ?? pickPlayerColor(playerId),
          isHost: hostId === playerId,
          online: true,
          joinedAt: existingPlayer?.joinedAt ?? timestamp,
          lastSeen: timestamp,
        }

        nextPlayers = applySingleHost(nextPlayers, hostId)

        return {
          ...currentRoom,
          roomCode: DEFAULT_ROOM_CODE,
          gamePhase: currentRoom.gamePhase ?? 'lobby',
          hostId,
          players: nextPlayers,
        }
      },
      { applyLocally: false },
    )

    if (!transactionResult.committed) {
      throw new LobbyServiceError(joinError || LOBBY_ERROR_MESSAGES.firebase)
    }

    try {
      const playerReference = ref(database, `${ROOM_PATH}/players/${playerId}`)
      await onDisconnect(playerReference).remove()
    } catch {
      // Joining should still succeed if disconnect cleanup cannot be registered.
    }

    getStorage()?.setItem(USERNAME_STORAGE_KEY, usernameValidation.username)

    return {
      playerId,
      room: transactionResult.snapshot.val(),
      username: usernameValidation.username,
    }
  } catch (error) {
    if (error instanceof LobbyServiceError) {
      throw error
    }

    throw new LobbyServiceError(LOBBY_ERROR_MESSAGES.firebase)
  }
}

export function listenToRoom(callback, onError) {
  if (!database) {
    Promise.resolve().then(() => {
      onError?.(new LobbyServiceError(LOBBY_ERROR_MESSAGES.firebase))
    })

    return () => {}
  }

  const roomReference = ref(database, ROOM_PATH)
  let isRepairingRoom = false

  return onValue(
    roomReference,
    (snapshot) => {
      const room = snapshot.val()
      callback(room)

      if (doesRoomNeedRepair(room) && !isRepairingRoom) {
        isRepairingRoom = true
        repairRoomState()
          .catch(() => {})
          .finally(() => {
            isRepairingRoom = false
          })
      }
    },
    onError,
  )
}

export async function leaveRoom(playerId) {
  if (!playerId) {
    return
  }

  const roomReference = getRoomReference()

  await runTransaction(roomReference, (room) => {
    if (!room?.players?.[playerId]) {
      return room
    }

    const players = { ...room.players }
    const removedPlayer = players[playerId]

    delete players[playerId]

    const nextRoom = {
      ...room,
      players,
    }

    if (room.gamePlayers || ACTIVE_GAME_PHASES.has(room.gamePhase)) {
      nextRoom.gamePlayers = {
        ...(room.gamePlayers ?? {}),
        [playerId]: removedPlayer,
      }
    }

    return getRepairedRoom(nextRoom)
  })
}
