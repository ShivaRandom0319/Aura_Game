import { get, ref, runTransaction, serverTimestamp } from 'firebase/database'
import {
  DEFAULT_ROOM_CODE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  REVEAL_TIME_SECONDS,
  TYPING_TIME_SECONDS,
  VOTING_TIME_SECONDS,
} from '../constants/gameConstants'
import { database } from '../firebase/firebaseConfig'
import { getNextWord } from './wordService'

const ROOM_PATH = `rooms/${DEFAULT_ROOM_CODE}`

export const GAME_ERROR_MESSAGES = {
  alreadyStarted: 'Game has already started.',
  firebase: 'Could not start game. Please try again.',
  hostOnly: 'Only the host can start the game.',
  notEnoughPlayers: 'Need at least 3 players to start.',
  roomFull: 'Lobby is full. Maximum 11 players can join.',
}

class GameServiceError extends Error {
  constructor(message) {
    super(message)
    this.name = 'GameServiceError'
  }
}

function getRoomReference() {
  if (!database) {
    throw new GameServiceError(GAME_ERROR_MESSAGES.firebase)
  }

  return ref(database, ROOM_PATH)
}

function getActivePlayers(players = {}) {
  return Object.values(players)
    .filter((player) => player?.online !== false)
    .sort((firstPlayer, secondPlayer) => {
      return Number(firstPlayer.joinedAt ?? 0) - Number(secondPlayer.joinedAt ?? 0)
    })
}

function shuffleItems(items) {
  const shuffledItems = [...items]

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const currentItem = shuffledItems[index]
    shuffledItems[index] = shuffledItems[randomIndex]
    shuffledItems[randomIndex] = currentItem
  }

  return shuffledItems
}

function getImpostorCount(playerCount) {
  return playerCount > 6 ? 2 : 1
}

function assignRoles(players) {
  const shuffledPlayers = shuffleItems(players)
  const impostorCount = getImpostorCount(players.length)
  const impostors = shuffledPlayers.slice(0, impostorCount)
  const impostorIds = Object.fromEntries(impostors.map((player) => [player.id, true]))

  const playersWithRoles = Object.fromEntries(
    players.map((player) => [
      player.id,
      {
        ...player,
        role: impostorIds[player.id] ? 'impostor' : 'crewmate',
      },
    ]),
  )

  return {
    impostorIds,
    playersWithRoles,
  }
}

function createRoundOrder(playersWithRoles) {
  const crewmates = shuffleItems(
    Object.values(playersWithRoles).filter((player) => player.role === 'crewmate'),
  )
  const impostors = shuffleItems(
    Object.values(playersWithRoles).filter((player) => player.role === 'impostor'),
  )
  const firstPlayer = crewmates[0]
  const remainingPlayers = shuffleItems([...crewmates.slice(1), ...impostors])

  return [firstPlayer, ...remainingPlayers].map((player) => player.id)
}

function getRoundOrder(room) {
  if (Array.isArray(room?.roundOrder)) {
    return room.roundOrder
  }

  return Object.entries(room?.roundOrder ?? {})
    .sort(([firstIndex], [secondIndex]) => Number(firstIndex) - Number(secondIndex))
    .map(([, playerId]) => playerId)
}

function findNextOnlineRoundPlayer(room, startIndex = 0) {
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

function clearPlayerRoundState(players = {}) {
  return Object.fromEntries(
    Object.entries(players).map(([playerId, player]) => {
      const persistentPlayer = { ...player }

      delete persistentPlayer.role
      delete persistentPlayer.selectedVoteTargets
      delete persistentPlayer.typedWord
      delete persistentPlayer.voteTargets

      return [playerId, persistentPlayer]
    }),
  )
}

function validateStartRoom(room, hostPlayerId) {
  if (!room?.players) {
    throw new GameServiceError(GAME_ERROR_MESSAGES.firebase)
  }

  if (room.gamePhase !== 'lobby') {
    throw new GameServiceError(GAME_ERROR_MESSAGES.alreadyStarted)
  }

  const hostPlayer = room.players[hostPlayerId]

  if (
    room.hostId !== hostPlayerId ||
    !hostPlayer?.isHost ||
    hostPlayer.online === false
  ) {
    throw new GameServiceError(GAME_ERROR_MESSAGES.hostOnly)
  }

  const activePlayers = getActivePlayers(room.players)

  if (activePlayers.length < MIN_PLAYERS) {
    throw new GameServiceError(GAME_ERROR_MESSAGES.notEnoughPlayers)
  }

  if (activePlayers.length > MAX_PLAYERS) {
    throw new GameServiceError(GAME_ERROR_MESSAGES.roomFull)
  }

  return activePlayers
}

export async function startGame(hostPlayerId) {
  const roomReference = getRoomReference()
  const roomSnapshot = await get(roomReference)

  validateStartRoom(roomSnapshot.val(), hostPlayerId)

  let selectedWord

  try {
    selectedWord = await getNextWord()
  } catch {
    throw new GameServiceError(GAME_ERROR_MESSAGES.firebase)
  }

  let startError = ''

  const transactionResult = await runTransaction(
    roomReference,
    (room) => {
      try {
        validateStartRoom(room, hostPlayerId)
      } catch (error) {
        startError = error?.message || GAME_ERROR_MESSAGES.firebase
        return undefined
      }

      const activePlayers = getActivePlayers(room.players)
      const roleAssignment = assignRoles(activePlayers)
      const roundOrder = createRoundOrder(roleAssignment.playersWithRoles)
      const nextPlayers = { ...room.players }

      activePlayers.forEach((player) => {
        nextPlayers[player.id] = roleAssignment.playersWithRoles[player.id]
      })

      return {
        ...room,
        currentRoundIndex: 0,
        currentTypingPlayerId: null,
        currentWord: {
          id: selectedWord.id,
          text: selectedWord.text,
          category: selectedWord.category,
        },
        gamePhase: 'reveal',
        gamePlayers: roleAssignment.playersWithRoles,
        impostorIds: roleAssignment.impostorIds,
        phaseDurationSeconds: REVEAL_TIME_SECONDS,
        phaseStartedAt: serverTimestamp(),
        players: nextPlayers,
        discussionSkips: null,
        result: null,
        roundClues: null,
        roundOrder,
        votes: null,
      }
    },
    { applyLocally: false },
  )

  if (!transactionResult.committed) {
    throw new GameServiceError(startError || GAME_ERROR_MESSAGES.firebase)
  }

  return transactionResult.snapshot.val()
}

export async function resetGameToLobby() {
  await runTransaction(
    getRoomReference(),
    (room) => {
      if (!room || room.gamePhase === 'lobby') {
        return room
      }

      return {
        ...room,
        currentRoundIndex: null,
        currentTypingPlayerId: null,
        currentWord: null,
        discussionSkips: null,
        gamePlayers: null,
        gamePhase: 'lobby',
        impostorIds: null,
        phaseDurationSeconds: null,
        phaseStartedAt: null,
        players: clearPlayerRoundState(room.players),
        result: null,
        roundClues: null,
        roundOrder: null,
        votes: null,
      }
    },
    { applyLocally: false },
  )
}

export async function advanceRevealToTyping() {
  await runTransaction(
    getRoomReference(),
    (room) => {
      if (!room || room.gamePhase !== 'reveal') {
        return room
      }

      const firstTypingPlayer = findNextOnlineRoundPlayer(room, 0)

      if (!firstTypingPlayer) {
        return {
          ...room,
          currentTypingPlayerId: null,
          gamePhase: 'voting',
          phaseDurationSeconds: VOTING_TIME_SECONDS,
          phaseStartedAt: serverTimestamp(),
        }
      }

      return {
        ...room,
        currentRoundIndex: firstTypingPlayer.roundIndex,
        currentTypingPlayerId: firstTypingPlayer.playerId,
        gamePhase: 'typing',
        phaseDurationSeconds: TYPING_TIME_SECONDS,
        phaseStartedAt: serverTimestamp(),
      }
    },
    { applyLocally: false },
  )
}
