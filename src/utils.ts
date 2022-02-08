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

/* eslint-disable no-bitwise */
const stringToBytes = (input: string): number[] => {
	let result: number[] = []
	for (let index = 0; index < input.length; index += 1) {
		let char = input.codePointAt(index)
		if (!char) return [0]
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
	return stringToBytes(atob(result))
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
	let b64 = btoa(bytesToString(input))
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
	const event = new CustomEvent(eventName, { detail: data })
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
