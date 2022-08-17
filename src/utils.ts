import { ATLAS_TREE_POE_VERSION } from './constants'
import type { NodeContainer } from 'models/nodes'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { State } from './models/misc'

// eslint-disable-next-line import/prefer-default-export
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => matchMedia(query).matches)

  useLayoutEffect(() => {
    const mediaQuery = matchMedia(query)

    function onMediaQueryChange(): void {
      setMatches(mediaQuery.matches)
    }

    mediaQuery.addEventListener('change', onMediaQueryChange)

    return (): void => {
      mediaQuery.removeEventListener('change', onMediaQueryChange)
    }
  }, [query])

  return matches
}

export function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

/* eslint-disable no-bitwise */
const stringToBytes = (input: string): number[] => {
  let result: number[] = []
  for (let index = 0; index < input.length; index += 1) {
    let char = input.codePointAt(index)
    if (char === undefined) return [0]
    const st = []
    do {
      st.push(char & 0xff)
      char >>= 8
    } while (char)
    result = [...result, ...st]
  }
  return result
}

export const base64URLDecode = (input: string): number[] => {
  let result = input.replaceAll('-', '+').replaceAll('_', '/')
  const pad = input.length % 4
  if (pad) {
    if (pad === 1) throw new Error('Invalid input !')
    result += Array.from({ length: 5 - pad }).join('=')
  }
  return stringToBytes(window.atob(result))
}

export function useForceUpdate(): () => void {
  const setValue = useState(0)[1]
  return useRef(() => setValue(v => v + 1)).current
}

const bytesToString = (input: number[]): string =>
  input
    .map(x => String.fromCodePoint(x))
    .reduce((previous, current) => previous + current)

export const base64URLEncode = (input: number[]): string => {
  let b64 = window.btoa(bytesToString(input))
  b64 = b64.replaceAll('+', '-').replace(/\//g, '_')
  return b64
}

export const UInt32ToBytes = (input: number): number[] => {
  const array = Array.from<number>({ length: 4 })

  array[0] = input & 0xff
  array[1] = (input >> 8) & 0xff
  array[2] = (input >> 16) & 0xff
  array[3] = (input >> 24) & 0xff

  return array.reverse()
}

export const UInt16ToBytes = (input: number): number[] => {
  const array = Array.from<number>({ length: 2 })

  array[0] = input & 0xff
  array[1] = (input >> 8) & 0xff

  return array.reverse()
}

export const toUInt32 = (bytes: number[]): number => {
  let result = 0
  if (bytes.length % 4 !== 0)
    throw new Error(`Invalid bytes length: ${bytes.length}`)
  for (let index = 0; index < bytes.length; index += 4) {
    result |= bytes[index % 4] << 24
    result |= bytes[(index % 4) + 1] << 16
    result |= bytes[(index % 4) + 2] << 8
    result |= bytes[(index % 4) + 3]
  }
  return result
}

export const toUInt16 = (bytes: number[]): number => {
  let result = 0
  if (bytes.length % 2 !== 0)
    throw new Error(`Invalid bytes length: ${bytes.length}`)
  for (let index = 0; index < bytes.length; index += 2) {
    result |= bytes[index % 2] << 8
    result |= bytes[(index % 2) + 1]
  }
  return result
}

export default { base64URLDecode }

export function useEventListener<T>(
  eventName: string,
  eventHandler: (data: T) => void
): void {
  useEffect(() => {
    const handleEvent = (event: CustomEvent<T> | Event): void => {
      const data = (event as CustomEvent<T>).detail
      eventHandler(data)
    }

    document.addEventListener(eventName, handleEvent, false)

    return () => {
      document.removeEventListener(eventName, handleEvent, false)
    }
  })
}

export function emitEvent<T>(eventName: string, data?: T): void {
  const event = new CustomEvent<T>(eventName, { detail: data })
  document.dispatchEvent(event)
}

export const stateToString = (state?: State, canAllocate?: boolean): string => {
  if (state === undefined) return 'unallocated'
  if (state === State.INTERMEDIATE) return 'highlighted'
  if (state === State.ACTIVE) return 'active'
  if (canAllocate) return 'highlighted'
  return 'unallocated'
}

/**
 * Adapted from PathOfBuilding
 * https://github.com/PathOfBuildingCommunity/PathOfBuilding/blob/b8efa6a40ec2db702009c0e7a1d8abed8b0c0346/src/Classes/PassiveTree.lua#L36
 * @param skillsPerOrbit
 */
export function calculateOrbitAngles(
  skillsPerOrbit: number[]
): Record<number, number[]> {
  const orbitAngles: Record<number, number[]> = {}
  for (const [orbitIndex, skillsInOrbit] of skillsPerOrbit.entries()) {
    if (skillsInOrbit === 16) {
      orbitAngles[orbitIndex] = [
        0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330
      ]
    } else if (skillsInOrbit === 40) {
      orbitAngles[orbitIndex] = [
        0, 10, 20, 30, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 135, 140,
        150, 160, 170, 180, 190, 200, 210, 220, 225, 230, 240, 250, 260, 270,
        280, 290, 300, 310, 315, 320, 330, 340, 350
      ]
    } else {
      orbitAngles[orbitIndex] = []
      for (let index = 0; index < skillsInOrbit; index += 1) {
        orbitAngles[orbitIndex][index] = (360 * index) / skillsInOrbit
      }
    }
  }

  return orbitAngles
}

export function updateObject<T>(
  oldObject: T,
  updatedProperties: Partial<T>
): T {
  for (const [key, value] of Object.entries(updatedProperties)) {
    if (value === undefined) continue
    oldObject[key as keyof T] = value as T[keyof T]
  }

  return oldObject
}

export function findStartFromNode(
  from: number,
  searchIn: NodeContainer,
  visited: Set<number>
): boolean {
  visited.add(from)
  const node = searchIn[from]
  node.visited = true
  const linked = [...node.out, ...node.in]
    .filter(o => Number.parseInt(o, 10) in searchIn)
    .map(o => searchIn[Number.parseInt(o, 10)])
  return linked.some(other => {
    if (visited.has(other.skill)) return false
    if (other.visited) return false
    if (other.isStartPoint) return true
    return findStartFromNode(other.skill, searchIn, visited)
  })
}

type History = {
  past: number[][]
  present: number[]
  future: number[][]
}

export const addToHistory = (allocated: number[]) => {
  const currentHistoryStr = localStorage.getItem('tree-history')
  let currentHistory: History
  if (!currentHistoryStr) currentHistory = { past: [], present: [], future: [] }
  else currentHistory = JSON.parse(currentHistoryStr)
  currentHistory.past.push(currentHistory.present)
  currentHistory.present = allocated
  localStorage.setItem('tree-history', JSON.stringify(currentHistory))
}

export const undoHistory = (): number[] => {
  const currentHistoryStr = localStorage.getItem('tree-history')
  if (!currentHistoryStr) return []
  const currentHistory: History = JSON.parse(currentHistoryStr)
  let latest = currentHistory.past.pop()
  if (!latest) latest = []
  const future = currentHistory.present
  currentHistory.present = latest
  currentHistory.future.push(future)
  localStorage.setItem('tree-history', JSON.stringify(currentHistory))
  return latest
}

export const redoHistory = (): number[] => {
  const currentHistoryStr = localStorage.getItem('tree-history')
  if (!currentHistoryStr) return []
  const currentHistory: History = JSON.parse(currentHistoryStr)
  let latest = currentHistory.future.pop()
  if (!latest) return []
  const past = currentHistory.present
  currentHistory.present = latest
  currentHistory.past.push(past)
  localStorage.setItem('tree-history', JSON.stringify(currentHistory))
  return latest
}

export const useModal = () => {
  const [isShowing, setIsShowing] = useState(false)

  function toggle() {
    setIsShowing(!isShowing)
  }

  return {
    isShowing,
    toggle
  }
}

export const getFromPath = <T>(obj: any, path: string[]): T => {
  if (path.length === 0) return obj
  if (path.length === 1) return obj[path[0]]
  if (!obj[path[0]]) return obj
  return getFromPath(obj[path[0]], path.slice(1))
}

export const setFromPath = (obj: any, path: string[], value?: any) => {
  for (let i = 0; i <= path.length - 2; i++) {
    if (!obj[path[i]]) obj[path[i]] = {}
    obj = obj[path[i]]
  }
  if (!value) delete obj[path[path.length - 1]]
  else obj[path[path.length - 1]] = value
}

export const useOutsideClick = (ref: any, callback: Function) => {
  useEffect(() => {
    /**
     * Alert if clicked on outside of element
     */
    function handleClickOutside(event: MouseEvent) {
      if (
        ref.current &&
        !ref.current.contains(event.target) &&
        !(event.target instanceof HTMLButtonElement)
      ) {
        callback()
      }
    }
    // Bind the event listener
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [ref, callback])
}

export const importTree = (encodedTree?: string) => {
  if (!encodedTree) throw new Error('The tree you provided is invalid.')
  const decoded = base64URLDecode(encodedTree)
  let version = 0
  try {
    version = toUInt32(decoded.slice(0, 4))
  } catch (e) {
    console.error(e)
    throw new Error('The tree you provided is invalid.')
  }
  const decodedClass = decoded[4]
  const ascendancy = decoded[5]
  if (version !== ATLAS_TREE_POE_VERSION)
    throw new Error('The provided tree is either too old or not compatible.')
  if (decodedClass > 0 || ascendancy > 0)
    throw new Error('The provided tree is not an Atlas Skill tree.')
  const nodesCount = decoded[6]
  const decodedNodes = []
  let cursor = 7
  for (let index = 0; index < nodesCount; index += 1) {
    let node = 0
    try {
      node = toUInt16(decoded.slice(cursor, cursor + 2))
    } catch {
      throw new Error('The tree you provided is invalid.')
    }
    decodedNodes.push(node)
    cursor += 2
  }
  return decodedNodes
}
