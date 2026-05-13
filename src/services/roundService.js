import { ref, runTransaction, serverTimestamp } from 'firebase/database'
import {
  DEFAULT_ROOM_CODE,
  DISCUSSION_TIME_SECONDS,
  TYPING_TIME_SECONDS,
  VOTING_TIME_SECONDS,
} from '../constants/gameConstants'
import { database } from '../firebase/firebaseConfig'

const ROOM_PATH = `rooms/${DEFAULT_ROOM_CODE}`
const CLUE_MAX_LENGTH = 20
const NO_CLUE_TEXT = 'No clue'

export const ROUND_ERROR_MESSAGES = {
  clueEmpty: 'Clue cannot be empty.',
  clueTooLong: 'Clue must be 20 characters or fewer.',
  firebase: 'Could not update round. Please try again.',
  notTypingPlayer: 'Only the current player can submit this clue.',
}

class RoundServiceError extends Error {
  constructor(message) {
    super(message)
    this.name = 'RoundServiceError'
  }
}

function getRoomReference() {
  if (!database) {
    throw new RoundServiceError(ROUND_ERROR_MESSAGES.firebase)
  }

  return ref(database, ROOM_PATH)
}

function getRoundKey(roundIndex) {
  return `round_${roundIndex}`
}

function getRoundOrder(room) {
  if (Array.isArray(room?.roundOrder)) {
    return room.roundOrder
  }

  return Object.entries(room?.roundOrder ?? {})
    .sort(([firstIndex], [secondIndex]) => Number(firstIndex) - Number(secondIndex))
    .map(([, playerId]) => playerId)
}

function hasSubmittedClue(room) {
  return Object.keys(room?.roundClues ?? {}).length > 0
}

function moveNextCrewmateIntoRoundSlot(room, roundOrder, startIndex) {
  if (hasSubmittedClue(room)) {
    return roundOrder
  }

  const crewmateIndex = roundOrder.findIndex((playerId, roundIndex) => {
    const player = room.players?.[playerId]

    return (
      roundIndex >= startIndex &&
      player &&
      player.online !== false &&
      player.role === 'crewmate'
    )
  })

  if (crewmateIndex < 0 || crewmateIndex === startIndex) {
    return roundOrder
  }

  const nextRoundOrder = [...roundOrder]
  const currentSlotPlayerId = nextRoundOrder[startIndex]
  nextRoundOrder[startIndex] = nextRoundOrder[crewmateIndex]
  nextRoundOrder[crewmateIndex] = currentSlotPlayerId

  return nextRoundOrder
}

function getActivePlayers(room) {
  return Object.values(room?.players ?? {}).filter((player) => player?.online !== false)
}

function getSecondsElapsed(room) {
  if (typeof room?.phaseStartedAt !== 'number') {
    return 0
  }

  return Math.floor((Date.now() - room.phaseStartedAt) / 1000)
}

function isPhaseExpired(room) {
  const duration = room?.phaseDurationSeconds ?? 0

  return duration > 0 && getSecondsElapsed(room) >= duration
}

function findNextOnlineRoundPlayer(room, startIndex) {
  const roundOrder = moveNextCrewmateIntoRoundSlot(room, getRoundOrder(room), startIndex)

  for (let roundIndex = startIndex; roundIndex < roundOrder.length; roundIndex += 1) {
    const playerId = roundOrder[roundIndex]
    const player = room.players?.[playerId]

    if (player && player.online !== false) {
      return {
        playerId,
        roundIndex,
        roundOrder,
      }
    }
  }

  return null
}

function moveToNextTypingRoundOrVoting(room, nextStartIndex) {
  const nextPlayer = findNextOnlineRoundPlayer(room, nextStartIndex)

  if (!nextPlayer) {
    return {
      ...room,
      currentTypingPlayerId: null,
      gamePhase: 'voting',
      phaseDurationSeconds: VOTING_TIME_SECONDS,
      phaseStartedAt: serverTimestamp(),
      result: null,
      votes: null,
    }
  }

  return {
    ...room,
    currentRoundIndex: nextPlayer.roundIndex,
    currentTypingPlayerId: nextPlayer.playerId,
    gamePhase: 'typing',
    phaseDurationSeconds: TYPING_TIME_SECONDS,
    phaseStartedAt: serverTimestamp(),
    roundOrder: nextPlayer.roundOrder,
  }
}

function moveTypingRoundToDiscussion(room, clue) {
  const roundIndex = room.currentRoundIndex ?? 0
  const roundKey = getRoundKey(roundIndex)
  const playerId = room.currentTypingPlayerId
  const player = room.players?.[playerId]

  if (!player) {
    return room
  }

  return {
    ...room,
    gamePhase: 'discussion',
    phaseDurationSeconds: DISCUSSION_TIME_SECONDS,
    phaseStartedAt: serverTimestamp(),
    roundClues: {
      ...(room.roundClues ?? {}),
      [roundKey]: {
        playerId,
        username: player.username,
        clue,
        submittedAt: serverTimestamp(),
      },
    },
  }
}

export function validateClue(clue) {
  const trimmedClue = String(clue ?? '').trim()

  if (!trimmedClue) {
    return {
      clue: trimmedClue,
      error: ROUND_ERROR_MESSAGES.clueEmpty,
      isValid: false,
    }
  }

  if (trimmedClue.length > CLUE_MAX_LENGTH) {
    return {
      clue: trimmedClue,
      error: ROUND_ERROR_MESSAGES.clueTooLong,
      isValid: false,
    }
  }

  return {
    clue: trimmedClue,
    error: '',
    isValid: true,
  }
}

export async function submitClue(playerId, clue) {
  const clueValidation = validateClue(clue)

  if (!clueValidation.isValid) {
    throw new RoundServiceError(clueValidation.error)
  }

  let submitError = ''

  const transactionResult = await runTransaction(
    getRoomReference(),
    (room) => {
      if (!room || room.gamePhase !== 'typing') {
        return room
      }

      if (room.currentTypingPlayerId !== playerId) {
        submitError = ROUND_ERROR_MESSAGES.notTypingPlayer
        return undefined
      }

      if (!room.players?.[playerId] || room.players[playerId].online === false) {
        submitError = ROUND_ERROR_MESSAGES.notTypingPlayer
        return undefined
      }

      return moveTypingRoundToDiscussion(room, clueValidation.clue)
    },
    { applyLocally: false },
  )

  if (!transactionResult.committed) {
    throw new RoundServiceError(submitError || ROUND_ERROR_MESSAGES.firebase)
  }
}

export async function submitNoClueForExpiredTypingRound() {
  await runTransaction(
    getRoomReference(),
    (room) => {
      if (!room || room.gamePhase !== 'typing' || !isPhaseExpired(room)) {
        return room
      }

      const currentTypingPlayerId = room.currentTypingPlayerId

      if (
        !currentTypingPlayerId ||
        !room.players?.[currentTypingPlayerId] ||
        room.players[currentTypingPlayerId].online === false
      ) {
        const nextStartIndex = hasSubmittedClue(room)
          ? (room.currentRoundIndex ?? 0) + 1
          : room.currentRoundIndex ?? 0

        return moveToNextTypingRoundOrVoting(room, nextStartIndex)
      }

      return moveTypingRoundToDiscussion(room, NO_CLUE_TEXT)
    },
    { applyLocally: false },
  )
}

export async function skipUnavailableTypingPlayer() {
  await runTransaction(
    getRoomReference(),
    (room) => {
      if (!room || room.gamePhase !== 'typing') {
        return room
      }

      const currentTypingPlayerId = room.currentTypingPlayerId

      const currentTypingPlayer = room.players?.[currentTypingPlayerId]

      if (
        currentTypingPlayerId &&
        currentTypingPlayer &&
        currentTypingPlayer.online !== false
      ) {
        return room
      }

      const nextStartIndex = hasSubmittedClue(room)
        ? (room.currentRoundIndex ?? 0) + 1
        : room.currentRoundIndex ?? 0

      return moveToNextTypingRoundOrVoting(room, nextStartIndex)
    },
    { applyLocally: false },
  )
}

export async function skipDiscussion(playerId) {
  await runTransaction(
    getRoomReference(),
    (room) => {
      if (!room || room.gamePhase !== 'discussion') {
        return room
      }

      if (!playerId || !room.players?.[playerId] || room.players[playerId].online === false) {
        return room
      }

      const roundKey = getRoundKey(room.currentRoundIndex ?? 0)
      const discussionSkips = room.discussionSkips ?? {}
      const roundSkips = {
        ...(discussionSkips[roundKey] ?? {}),
        [playerId]: true,
      }
      const nextRoom = {
        ...room,
        discussionSkips: {
          ...discussionSkips,
          [roundKey]: roundSkips,
        },
      }
      const activePlayers = getActivePlayers(room)
      const allActivePlayersSkipped =
        activePlayers.length > 0 && activePlayers.every((player) => roundSkips[player.id])

      if (!allActivePlayersSkipped) {
        return nextRoom
      }

      return moveToNextTypingRoundOrVoting(nextRoom, (room.currentRoundIndex ?? 0) + 1)
    },
    { applyLocally: false },
  )
}

export async function finishDiscussionRoundIfExpired() {
  await runTransaction(
    getRoomReference(),
    (room) => {
      if (!room || room.gamePhase !== 'discussion' || !isPhaseExpired(room)) {
        return room
      }

      return moveToNextTypingRoundOrVoting(room, (room.currentRoundIndex ?? 0) + 1)
    },
    { applyLocally: false },
  )
}
