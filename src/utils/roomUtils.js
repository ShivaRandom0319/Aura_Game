import { DEFAULT_ROOM_ID, ROOM_OPTIONS } from '../constants/gameConstants'

export const ROOM_ID_STORAGE_KEY = 'aura_room_id'

function getStorage() {
  return typeof window === 'undefined' ? null : window.localStorage
}

export function getRoomOption(roomId) {
  const normalizedRoomId = String(roomId ?? '').trim()

  return ROOM_OPTIONS.find((room) => room.id === normalizedRoomId) ?? null
}

export function getDefaultRoomOption() {
  return getRoomOption(DEFAULT_ROOM_ID)
}

export function getStoredRoomId() {
  return getStorage()?.getItem(ROOM_ID_STORAGE_KEY) ?? ''
}

export function getStoredRoomOption() {
  return getRoomOption(getStoredRoomId())
}

export function setStoredRoomId(roomId) {
  const roomOption = getRoomOption(roomId)

  if (!roomOption) {
    return false
  }

  getStorage()?.setItem(ROOM_ID_STORAGE_KEY, roomOption.id)
  return true
}

export function clearStoredRoomId() {
  getStorage()?.removeItem(ROOM_ID_STORAGE_KEY)
}

export function getRoomPath(roomId = getStoredRoomId()) {
  const roomOption = getRoomOption(roomId)

  return roomOption ? `rooms/${roomOption.id}` : ''
}
