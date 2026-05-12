import { get, ref, runTransaction, serverTimestamp } from 'firebase/database'
import { database } from '../firebase/firebaseConfig'

const WORDS_PATH = 'words'
const WORD_ROTATION_PATH = 'wordRotation'
const WORD_TEXT_PATTERN = /^\S+$/

class WordServiceError extends Error {
  constructor(message) {
    super(message)
    this.name = 'WordServiceError'
  }
}

function getDatabaseReference(path) {
  if (!database) {
    throw new WordServiceError('Firebase database is not configured.')
  }

  return ref(database, path)
}

function isValidWordText(text) {
  return Boolean(text && WORD_TEXT_PATTERN.test(text))
}

function normalizeWord(wordId, word) {
  const text = String(word?.text ?? '').trim()

  if (!word || word.active !== true || !isValidWordText(text)) {
    return null
  }

  return {
    wordId,
    id: word.id,
    text,
    category: word.category ?? 'General',
    active: true,
  }
}

function pickRandomWord(words) {
  const randomIndex = Math.floor(Math.random() * words.length)
  return words[randomIndex]
}

function normalizeUsedWordIds(usedWordIds = {}, activeWordIds) {
  return Object.fromEntries(
    Object.entries(usedWordIds).filter(([wordId, isUsed]) => {
      return isUsed === true && activeWordIds.has(wordId)
    }),
  )
}

export function getNextWordFromRotation(activeWords, rotation = {}) {
  const activeWordIds = new Set(activeWords.map((word) => word.wordId))
  const usedWordIds = normalizeUsedWordIds(rotation.usedWordIds ?? {}, activeWordIds)
  const remainingWords = activeWords.filter((word) => !usedWordIds[word.wordId])
  const wordPool = remainingWords.length > 0 ? remainingWords : activeWords
  const nextUsedWordIds = remainingWords.length > 0 ? usedWordIds : {}
  const selectedWord = pickRandomWord(wordPool)

  nextUsedWordIds[selectedWord.wordId] = true

  return {
    selectedWord,
    usedWordIds: nextUsedWordIds,
  }
}

export async function getActiveWords() {
  const snapshot = await get(getDatabaseReference(WORDS_PATH))
  const words = snapshot.val() ?? {}

  return Object.entries(words)
    .map(([wordId, word]) => normalizeWord(wordId, word))
    .filter(Boolean)
}

export async function markWordAsUsed(wordId) {
  if (!wordId) {
    throw new WordServiceError('Word id is required.')
  }

  await runTransaction(getDatabaseReference(WORD_ROTATION_PATH), (rotation) => {
    const currentRotation = rotation ?? {}

    return {
      ...currentRotation,
      usedWordIds: {
        ...(currentRotation.usedWordIds ?? {}),
        [wordId]: true,
      },
      lastWordId: wordId,
      updatedAt: serverTimestamp(),
    }
  })
}

export async function resetUsedWordsIfAllUsed() {
  const activeWords = await getActiveWords()

  if (activeWords.length === 0) {
    return false
  }

  const activeWordIds = new Set(activeWords.map((word) => word.wordId))
  let didReset = false

  await runTransaction(getDatabaseReference(WORD_ROTATION_PATH), (rotation) => {
    const currentRotation = rotation ?? {}
    const usedWordIds = normalizeUsedWordIds(
      currentRotation.usedWordIds ?? {},
      activeWordIds,
    )
    const allWordsAreUsed = activeWords.every((word) => usedWordIds[word.wordId])

    if (!allWordsAreUsed) {
      didReset = false
      return {
        ...currentRotation,
        usedWordIds,
      }
    }

    didReset = true
    return {
      ...currentRotation,
      usedWordIds: null,
      updatedAt: serverTimestamp(),
    }
  })

  return didReset
}

export async function getNextWord() {
  const activeWords = await getActiveWords()

  if (activeWords.length === 0) {
    throw new WordServiceError('No active words are available.')
  }

  let selectedWord = null

  await runTransaction(
    getDatabaseReference(WORD_ROTATION_PATH),
    (rotation) => {
      const currentRotation = rotation ?? {}
      const nextRotation = getNextWordFromRotation(activeWords, currentRotation)
      selectedWord = nextRotation.selectedWord

      return {
        ...currentRotation,
        usedWordIds: nextRotation.usedWordIds,
        lastWordId: selectedWord.wordId,
        updatedAt: serverTimestamp(),
      }
    },
    { applyLocally: false },
  )

  return selectedWord
}
