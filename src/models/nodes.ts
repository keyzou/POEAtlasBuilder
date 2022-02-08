import type { Container } from 'pixi.js'
import type { State } from './misc'
import type SkillAtlas from './sprite'

interface TreeNode {
	skill: number
	name: string
	icon: keyof SkillAtlas['coords']
	stats: string[]
	group: number
	orbit: number
	orbitIndex: number
	out: string[]
	in: string[]
	isProxy?: boolean
	isKeystone?: boolean
	flavourText?: string[]
	isNotable?: boolean
	isMastery?: boolean
	isJewelSocket?: boolean
	classStartIndex?: number
	ascendancyName?: string
	extra: Record<string, any>
	state?: State
	canAllocate?: boolean
	allocated: number
	hidden?: boolean
	isStartPoint?: boolean
	distanceToStart: number
	path: number[]
	pathDistance: number
	isDependencyOf: number[]
	visited?: boolean
	spriteContainer?: Container
}

export type NodeContainer = Record<number, TreeNode>

export function sanitizeNode(node: TreeNode) {
	const sanitizedNode = { ...node }
	sanitizedNode.spriteContainer = undefined
	return sanitizedNode
}

export default TreeNode
