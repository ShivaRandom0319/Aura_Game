import { ref, runTransaction, serverTimestamp } from 'firebase/database'
import { DEFAULT_ROOM_CODE } from '../constants/gameConstants'
import { database } from '../firebase/firebaseConfig'

const ROOM_PATH = `rooms/${DEFAULT_ROOM_CODE}`

export const VOTING_ERROR_MESSAGES = {
  alreadyVoted: 'Your vote is already locked.',
  firebase: 'Could not save vote. Please try again.',
  invalidSelection: 'Select the required number of different players.',
}

class VotingServiceError extends Error {
  constructor(message) {
    super(message)
    this.name = 'VotingServiceError'
  }
}

function getRoomReference() {
  if (!database) {
    throw new VotingServiceError(VOTING_ERROR_MESSAGES.firebase)
  }

  return ref(database, ROOM_PATH)
}

function getActivePlayers(room) {
  return Object.values(room?.players ?? {}).filter((player) => player?.online !== false)
}

function getImpostorIds(room) {
  return Object.keys(room?.impostorIds ?? {}).filter((playerId) => {
    return room.impostorIds[playerId] === true
  })
}

export function getRequiredVoteCount(room) {
  return getImpostorIds(room).length > 1 ? 2 : 1
}

function getSecondsElapsed(room) {
  if (typeof room?.phaseStartedAt !== 'number') {
    return 0
  }

  return Math.floor((Date.now() - room.phaseStartedAt) / 1000)
}

function isVotingExpired(room) {
  const duration = room?.phaseDurationSeconds ?? 0

  return duration > 0 && getSecondsElapsed(room) >= duration
}

function normalizeTargets(targetIds) {
  return [...new Set(targetIds.map((targetId) => String(targetId ?? '').trim()))].filter(
    Boolean,
  )
}

function validateTargets(room, targetIds) {
  const activePlayerIds = new Set(getActivePlayers(room).map((player) => player.id))
  const requiredVoteCount = getRequiredVoteCount(room)
  const normalizedTargets = normalizeTargets(targetIds)

  if (normalizedTargets.length !== requiredVoteCount) {
    return {
      error: VOTING_ERROR_MESSAGES.invalidSelection,
      isValid: false,
      targets: normalizedTargets,
    }
  }

  const targetsAreActivePlayers = normalizedTargets.every((targetId) => {
    return activePlayerIds.has(targetId)
  })

  if (!targetsAreActivePlayers) {
    return {
      error: VOTING_ERROR_MESSAGES.invalidSelection,
      isValid: false,
      targets: normalizedTargets,
    }
  }

  return {
    error: '',
    isValid: true,
    targets: normalizedTargets,
  }
}

function countVotes(room) {
  const activePlayerIds = new Set(getActivePlayers(room).map((player) => player.id))
  const voteCounts = Object.fromEntries(
    [...activePlayerIds].map((playerId) => [playerId, 0]),
  )

  Object.entries(room.votes ?? {}).forEach(([voterId, vote]) => {
    if (!activePlayerIds.has(voterId) || !vote?.confirmed || !Array.isArray(vote.targets)) {
      return
    }

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

  const highestPlayerId = highestPlayers[0][0]

  if (highestPlayerId === impostorId) {
    return {
      reason: 'The highest voted player was the impostor.',
      winningTeam: 'crewmates',
    }
  }

  return {
    reason: 'The highest voted player was not the impostor.',
    winningTeam: 'impostors',
  }
}

function calculateTwoImpostorResult(room, voteCounts, impostorIds) {
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
  const playersAtOrAboveSecond = entries.filter(([, count]) => count >= secondPlaceVotes)

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

  if (foundBothImpostors) {
    return {
      reason: 'The top two voted players were both impostors.',
      winningTeam: 'crewmates',
    }
  }

  return {
    reason: 'The top two voted players did not include both impostors.',
    winningTeam: 'impostors',
  }
}

function calculateResult(room) {
  const impostorIds = getImpostorIds(room)
  const voteCounts = countVotes(room)
  const outcome =
    impostorIds.length > 1
      ? calculateTwoImpostorResult(room, voteCounts, impostorIds)
      : calculateSingleImpostorResult(voteCounts, impostorIds[0])
  const impostorProfiles = impostorIds.map((impostorId) => {
    const player = room.players?.[impostorId] ?? room.gamePlayers?.[impostorId]

    return {
      id: impostorId,
      username: player?.username ?? 'Impostor',
      color: player?.color ?? '#fb7185',
      isHost: Boolean(player?.isHost),
    }
  })

  return {
    winningTeam: outcome.winningTeam,
    impostorIds: Object.fromEntries(impostorIds.map((impostorId) => [impostorId, true])),
    impostorNames: impostorProfiles.map((player) => player.username),
    impostorProfiles,
    word: room.currentWord ?? null,
    reason: outcome.reason,
  }
}

function allActivePlayersConfirmed(room) {
  const activePlayers = getActivePlayers(room)

  return (
    activePlayers.length > 0 &&
    activePlayers.every((player) => room.votes?.[player.id]?.confirmed === true)
  )
}

function finishVoting(room) {
  return {
    ...room,
    gamePhase: 'result',
    result: calculateResult(room),
  }
}

export async function submitVote(voterId, targetIds) {
  let submitError = ''

  const transactionResult = await runTransaction(
    getRoomReference(),
    (room) => {
      if (!room || room.gamePhase !== 'voting') {
        return room
      }

      if (!voterId || !room.players?.[voterId] || room.players[voterId].online === false) {
        submitError = VOTING_ERROR_MESSAGES.firebase
        return undefined
      }

      if (room.votes?.[voterId]?.confirmed === true) {
        submitError = VOTING_ERROR_MESSAGES.alreadyVoted
        return undefined
      }

      const targetValidation = validateTargets(room, targetIds)

      if (!targetValidation.isValid) {
        submitError = targetValidation.error
        return undefined
      }

      const nextRoom = {
        ...room,
        votes: {
          ...(room.votes ?? {}),
          [voterId]: {
            voterId,
            targets: targetValidation.targets,
            confirmed: true,
            votedAt: serverTimestamp(),
          },
        },
      }

      if (allActivePlayersConfirmed(nextRoom)) {
        return finishVoting(nextRoom)
      }

      return nextRoom
    },
    { applyLocally: false },
  )

  if (!transactionResult.committed) {
    throw new VotingServiceError(submitError || VOTING_ERROR_MESSAGES.firebase)
  }
}

export async function finishVotingIfExpired() {
  await runTransaction(
    getRoomReference(),
    (room) => {
      if (!room || room.gamePhase !== 'voting' || !isVotingExpired(room)) {
        return room
      }

      return finishVoting(room)
    },
    { applyLocally: false },
  )
}
