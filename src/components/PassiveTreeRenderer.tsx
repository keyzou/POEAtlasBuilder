import { SmoothGraphics as Graphics } from '@pixi/graphics-smooth'
import { useTextureManager } from 'data/textureManager'
import type Connector from 'models/connector'
import type TreeGroup from 'models/groups'
import { State } from 'models/misc'
import type TreeNode from 'models/nodes'
import type { NodeContainer } from 'models/nodes'
import type SkillAtlas from 'models/sprite'
import type PassiveTree from 'models/tree'
import { Viewport } from 'pixi-viewport'
import type { DisplayObject, Texture } from 'pixi.js'
import { Application, Container, Point, Sprite, Text } from 'pixi.js'
import React, { useEffect, useRef } from 'react'
import { FaSearch } from 'react-icons/fa'
import {
	emitEvent,
	stateToString,
	useEventListener,
	useForceUpdate
} from 'utils'
import {
	NOTABLE_FRAME_INNER_RADIUS,
	orbitRadii,
	SKILL_FRAME_INNER_RADIUS
} from '../constants'

interface Properties {
	connectors: Connector[]
	nodes: NodeContainer
	groups: TreeGroup[]
	jsonTree: PassiveTree
}

const PassiveTreeRenderer: React.FC<Properties> = ({
	connectors: baseConnectors,
	nodes: baseNodes,
	groups,
	jsonTree
}) => {
	const domElement = useRef<HTMLDivElement>(null)
	const [appInstance, setAppInstance] = React.useState<Application>()
	const viewport = React.useRef<Viewport>(
		new Viewport({
			worldWidth: 8000,
			worldHeight: 8000
		})
	)

	const forceUpdate = useForceUpdate()

	const [searchQuery, setSearchQuery] = React.useState<string>()

	const textureManager = useTextureManager()

	const nodes = useRef<NodeContainer>(baseNodes)
	const connectors = React.useRef<Connector[]>(baseConnectors)
	const tooltips = React.useRef<Record<number, Container>>({})

	const allocatedNodes = useRef<number[]>([])

	const [isReady, setReady] = React.useState<boolean>(false)

	// == Assets Fetching
	function getNodeFrameTexture(node: TreeNode): Texture {
		if (node.isNotable)
			return textureManager.getTexture(
				`skill-notable-${stateToString(node.state)}`
			)
		return textureManager.getTexture(
			`skill-frame-${stateToString(node.state, node.canAllocate)}`
		)
	}

	function getConnectorStrokeColor(connector: Connector): number {
		if (allocatedNodes.current.length - 1 > jsonTree.points.totalPoints) {
			if (connector.state === State.ACTIVE) return 0xe0_6c_6e
			if (connector.state === State.INTERMEDIATE) return 0x7d_37_38
		}
		if (connector.state === State.ACTIVE) return 0xea_e3_d5
		if (connector.state === State.INTERMEDIATE) return 0x7a_6e_62
		return 0x3d_3a_2e
	}

	// === Path finding ===

	function findStartFromNode(
		from: number,
		searchIn: NodeContainer,
		visited: Set<number>
	): boolean {
		visited.add(from)
		const node = searchIn[from]
		node.visited = true
		const linked = [...node.out, ...node.in].map(
			o => searchIn[Number.parseInt(o, 10)]
		)
		return linked.some(other => {
			if (visited.has(other.skill)) return false
			if (other.visited) return false
			if (other.isStartPoint) return true
			return findStartFromNode(other.skill, searchIn, visited)
		})
	}

	/**
	 * Curtosy of Path of Building again, they're insane
	 * @param nodes Nodes to explore
	 * @returns For each node, which nodes depends on it
	 */
	function buildDependencies(): void {
		const visited = new Set<number>()
		for (const node of Object.values(nodes.current)) {
			node.visited = true
			const linked = [...node.out, ...node.in].map(
				o => nodes.current[Number.parseInt(o, 10)]
			)
			for (const other of linked) {
				if (other.visited) continue
				if (!other.allocated) continue
				if (node.isDependencyOf.includes(other.skill)) continue
				if (findStartFromNode(other.skill, nodes.current, visited)) {
					// We found the starting point, so they're not dependent on this node
					for (const x of visited) {
						const n = nodes.current[x]
						n.visited = false
					}
					visited.clear()
				} else {
					// No path found, they must depend on this node
					for (const x of visited) {
						node.isDependencyOf.push(x)
						const n = nodes.current[x]
						n.visited = false
					}
					visited.clear()
				}
			}
			node.visited = false
		}
	}

	function BFS(node: number): void {
		const startNode = nodes.current[node]
		const queue = []
		startNode.pathDistance = 0
		startNode.path = []
		queue.push(startNode)
		while (queue.length > 0) {
			const n = queue.shift()
			if (!n) continue
			const currentDistance = n.pathDistance + 1
			const linked: TreeNode[] = [...n.out, ...n.in].map(
				o => nodes.current[Number.parseInt(o, 10)]
			)
			for (const other of linked) {
				if (other.pathDistance > currentDistance && !other.isMastery) {
					other.pathDistance = currentDistance
					other.path = [other.skill, ...n.path]
					queue.push(other)
				}
			}
		}
	}

	function buildAllNodesPaths(): void {
		for (const n of Object.values(nodes.current)) {
			n.pathDistance = 1000
			n.path = []
			n.isDependencyOf = []
			if (allocatedNodes.current.includes(n.skill)) {
				n.pathDistance = 0
				n.isDependencyOf = [n.skill]
			}
			nodes.current[n.skill] = n
		}
		buildDependencies()
		for (const skill of allocatedNodes.current) {
			BFS(skill)
		}
	}
	// === === === === ===

	// === Canvas rendering

	function redrawConnector(c: Connector): void {
		if (c.hidden) return
		if (!c.sprite) return
		c.sprite.clear()
		const startNode = nodes.current[c.startNode]
		const endNode = nodes.current[c.endNode]
		if (
			startNode.group === endNode.group &&
			startNode.orbit === endNode.orbit &&
			startNode.group &&
			startNode.orbit
		) {
			const group = groups.find(x =>
				x.nodes.includes(startNode.skill.toString())
			)
			if (!group) return
			if (
				(startNode.extra.angle - endNode.extra.angle > 0 &&
					startNode.extra.angle - endNode.extra.angle < Math.PI) ||
				startNode.extra.angle - endNode.extra.angle < -Math.PI
			) {
				c.sprite.lineStyle({
					color: getConnectorStrokeColor(c),
					width: 10
				})
				c.sprite.arc(
					group.x,
					group.y,
					orbitRadii[startNode.orbit],
					endNode.extra.angle - Math.PI / 2,
					startNode.extra.angle - Math.PI / 2
				)
				c.sprite.interactive = true
			} else {
				c.sprite.lineStyle({
					color: getConnectorStrokeColor(c),
					width: 10
				})
				c.sprite.arc(
					group.x,
					group.y,
					orbitRadii[startNode.orbit],
					startNode.extra.angle - Math.PI / 2,
					endNode.extra.angle - Math.PI / 2
				)
				c.sprite.interactive = true
			}
			return
		}

		c.sprite.lineStyle({
			color: getConnectorStrokeColor(c),
			width: 10
		})
		c.sprite.moveTo(startNode.extra.posX, startNode.extra.posY)
		c.sprite.lineTo(endNode.extra.posX, endNode.extra.posY)
		c.sprite.interactive = true
	}

	function allocateNode(node: TreeNode): void {
		node.allocated = 1
		node.state = State.ACTIVE
		if (node.isNotable) {
			const masteryNode = Object.values(nodes.current).find(
				x => x.isMastery && x.group === node.group
			)
			if (!masteryNode) return
			masteryNode.state = State.ACTIVE
		}
		for (const o of node.out) {
			const otherNode = nodes.current[Number.parseInt(o, 10)]
			if (!otherNode.allocated) {
				otherNode.canAllocate = true
				otherNode.state = State.INTERMEDIATE
			}
			const connector = connectors.current.find(
				c => c.startNode === node.skill && c.endNode.toString() === o
			)
			if (!connector) continue
			if (otherNode.allocated && connector.state !== State.ACTIVE) {
				connector.state = State.ACTIVE
			} else if (!otherNode.allocated && connector.state === State.DEFAULT) {
				connector.state = State.INTERMEDIATE
			}
			if (!connector.sprite) continue
			redrawConnector(connector)
		}

		for (const index of node.in) {
			const otherNode = nodes.current[Number.parseInt(index, 10)]
			if (!otherNode.allocated) {
				otherNode.canAllocate = true
				otherNode.state = State.INTERMEDIATE
			}
			const connector = connectors.current.find(
				c => c.startNode.toString() === index && c.endNode === node.skill
			)
			if (!connector) continue
			if (otherNode.allocated && connector.state !== State.ACTIVE) {
				connector.state = State.ACTIVE
			} else if (!otherNode.allocated && connector.state === State.DEFAULT) {
				connector.state = State.INTERMEDIATE
			}
			if (!connector.sprite) continue
			redrawConnector(connector)
		}
	}

	function unallocateNode(node: TreeNode): void {
		node.allocated = 0
		node.state = State.DEFAULT
		node.isDependencyOf = []
		for (const o of node.out) {
			const otherNode = nodes.current[Number.parseInt(o, 10)]
			if (!otherNode.allocated) {
				otherNode.canAllocate = false
				otherNode.state = State.DEFAULT
			}
			const connector = connectors.current.find(
				c => c.startNode === node.skill && c.endNode.toString() === o
			)
			if (!connector) continue
			connector.state =
				otherNode.allocated && connector.state === State.ACTIVE
					? State.INTERMEDIATE
					: State.DEFAULT
			redrawConnector(connector)
		}
		for (const index of node.in) {
			const otherNode = nodes.current[Number.parseInt(index, 10)]
			if (!otherNode.allocated) {
				otherNode.canAllocate = false
				otherNode.state = State.DEFAULT
			}
			const connector = connectors.current.find(
				c => c.endNode === node.skill && c.startNode.toString() === index
			)
			if (!connector) continue
			connector.state =
				otherNode.allocated && connector.state === State.ACTIVE
					? State.INTERMEDIATE
					: State.DEFAULT
			redrawConnector(connector)
		}

		if (
			!Object.values(nodes.current).some(
				x => x.group === node.group && x.isNotable && x.allocated
			)
		) {
			const masteryNode = Object.values(nodes.current).find(
				x => x.isMastery && x.group === node.group
			)
			if (!masteryNode) return
			masteryNode.state = State.DEFAULT
		}
	}

	function findConnectorFromNodes(
		from: TreeNode,
		to: TreeNode
	): Connector | undefined {
		return connectors.current.find(
			x =>
				(x.startNode === from.skill && x.endNode === to.skill) ||
				(x.startNode === to.skill && x.endNode === from.skill)
		)
	}

	function buildTooltips(): void {
		if (!appInstance) return
		// Just in case someday we'll edit them
		const updatedTooltips = { ...tooltips.current }
		for (const node of Object.values(nodes.current)) {
			const nodeName = new Text(`${node.name} (${node.skill})`, {
				fontSize: 32,
				fontWeight: 'bold',
				fill: 0xdc_cb_b2
			})
			nodeName.position.set(15, 15)
			const stats = new Text(node.stats.join('\n'), {
				fontSize: 20,
				fill: 0x73_73_d7
			})
			stats.position.set(15, 15 + nodeName.height + 15)
			const tooltipWidth = Math.max(nodeName.width, stats.width) + 30
			const tooltipHeight = nodeName.height + 15 + stats.height + 30

			const tooltipBg = new Graphics()
			tooltipBg.beginFill(0x00_00_00, 0.85)
			tooltipBg.drawRect(0, 0, tooltipWidth, tooltipHeight)
			tooltipBg.endFill()
			const tooltipContainer = new Container()
			tooltipContainer.addChild(tooltipBg, nodeName, stats)
			tooltipContainer.position.set(node.extra.posX, node.extra.posY)
			tooltipContainer.visible = false
			tooltipContainer.interactive = true
			appInstance.stage.addChild(tooltipContainer)
			updatedTooltips[node.skill] = tooltipContainer
		}
		tooltips.current = updatedTooltips
	}

	function addNodesToViewport(): void {
		if (!appInstance) return
		for (const node of Object.values(nodes.current)) {
			if (node.hidden) continue
			if (node.isMastery) {
				const container = new Container()
				container.scale.set(2.5, 2.5)
				container.x = node.extra.posX
				container.y = node.extra.posY
				const spriteAtlas = new Sprite(textureManager.getTexture('masteries'))
				const coords = jsonTree.skillSprites.mastery
					.filter(x => typeof x.coords === 'object')
					.at(-1)?.coords as SkillAtlas['coords']
				if (!(node.icon in coords)) {
					continue
				}
				const mask = new Graphics()
				const frameSize = {
					w: coords[node.icon].w,
					h: coords[node.icon].h
				}
				mask.beginFill(0x00_00_00)
				mask.drawCircle(
					coords[node.icon].x + frameSize.w / 2,
					coords[node.icon].y + frameSize.h / 2,
					frameSize.w / 2
				)
				mask.endFill()
				spriteAtlas.position.set(
					-coords[node.icon].x - frameSize.w / 2,
					-coords[node.icon].y - frameSize.h / 2
				)
				spriteAtlas.mask = mask
				spriteAtlas.addChild(mask)
				container.addChild(spriteAtlas)
				node.spriteContainer = container
				viewport.current.addChild(container)
				continue
			}
			const container = new Container()
			container.scale.set(2.5, 2.5)
			container.x = node.extra.posX
			container.y = node.extra.posY
			const spriteAtlas = new Sprite(textureManager.getTexture('skills'))
			const coords: SkillAtlas['coords'] = node.isNotable
				? (jsonTree.skillSprites.notableInactive
						.filter(x => typeof x.coords === 'object')
						.at(-1)?.coords as SkillAtlas['coords'])
				: (jsonTree.skillSprites.normalInactive
						.filter(x => typeof x.coords === 'object')
						.at(-1)?.coords as SkillAtlas['coords'])
			if (!(node.icon in coords)) {
				continue
			}
			const mask = new Graphics()
			const frameSize = {
				w: node.isNotable
					? NOTABLE_FRAME_INNER_RADIUS
					: SKILL_FRAME_INNER_RADIUS,
				h: node.isNotable
					? NOTABLE_FRAME_INNER_RADIUS
					: SKILL_FRAME_INNER_RADIUS
			}
			mask.beginFill(0x00_00_00)
			mask.drawCircle(
				coords[node.icon].x + frameSize.w / 2,
				coords[node.icon].y + frameSize.h / 2,
				frameSize.w / 2
			)
			mask.endFill()
			spriteAtlas.position.set(
				-coords[node.icon].x - frameSize.w / 2,
				-coords[node.icon].y - frameSize.h / 2
			)
			spriteAtlas.mask = mask
			spriteAtlas.addChild(mask)
			container.addChild(spriteAtlas)
			// === Frame Rendering === //
			const sprite = new Sprite(getNodeFrameTexture(node))
			sprite.anchor.set(0.5, 0.5)
			sprite.interactive = true
			sprite.name = `Node{${node.skill}}`

			sprite.on('mouseover', () => {
				const n = nodes.current[node.skill]
				// Todo handle hovers better
				if (n.skill in tooltips.current) {
					tooltips.current[n.skill].visible = true
				}
				if (n.allocated) return
				n.state = State.INTERMEDIATE
				sprite.texture = getNodeFrameTexture(n)
				for (let index = 1; index < n.path.length; index += 1) {
					const from = nodes.current[n.path[index - 1]]
					const to = nodes.current[n.path[index]]

					from.state =
						from.state === State.DEFAULT ? State.INTERMEDIATE : from.state
					if (from.spriteContainer)
						(from.spriteContainer.children[1] as Sprite).texture =
							getNodeFrameTexture(from)
					to.state = to.state === State.DEFAULT ? State.INTERMEDIATE : to.state
					if (to.spriteContainer)
						(to.spriteContainer.children[1] as Sprite).texture =
							getNodeFrameTexture(to)

					const c = findConnectorFromNodes(from, to)
					if (!c) continue
					if (c.state === State.ACTIVE) continue
					c.state = State.INTERMEDIATE
					redrawConnector(c)
				}
			})

			sprite.on('mouseout', () => {
				const n = nodes.current[node.skill]
				if (n.skill in tooltips.current) {
					tooltips.current[n.skill].visible = false
				}
				if (n.allocated) return
				n.state = State.DEFAULT
				sprite.texture = getNodeFrameTexture(n)
				for (let index = 1; index < n.path.length; index += 1) {
					const from = nodes.current[n.path[index - 1]]
					const to = nodes.current[n.path[index]]
					from.state =
						from.state === State.INTERMEDIATE ? State.DEFAULT : from.state
					if (from.spriteContainer)
						(from.spriteContainer.children[1] as Sprite).texture =
							getNodeFrameTexture(from)
					to.state = to.allocated
						? State.ACTIVE
						: from.state === State.ACTIVE
						? State.INTERMEDIATE
						: State.DEFAULT
					if (to.spriteContainer)
						(to.spriteContainer.children[1] as Sprite).texture =
							getNodeFrameTexture(to)
					const c = findConnectorFromNodes(from, to)
					if (!c) continue
					if (c.state === State.ACTIVE) continue
					c.state = from.allocated ? State.INTERMEDIATE : State.DEFAULT
					redrawConnector(c)
				}
			})

			sprite.on('click', () => {
				if (viewport.current.moving) return
				const n = nodes.current[node.skill]
				n.allocated = node.allocated ? 0 : 1
				if (n.allocated) {
					const updatedAllocated = [...allocatedNodes.current]
					for (const childNode of n.path) {
						const other = nodes.current[childNode]
						if (!updatedAllocated.includes(other.skill))
							updatedAllocated.push(other.skill)
						other.allocated = 1
						allocateNode(other)
					}
					allocateNode(n)
					updatedAllocated.push(n.skill)
					allocatedNodes.current = [...new Set(updatedAllocated)]
					sprite.texture = getNodeFrameTexture(n)
				} else {
					const toUnallocate = Object.values(nodes.current)
						.filter(x => n.isDependencyOf.includes(x.skill))
						.sort((a, b) => b.distanceToStart - a.distanceToStart)
					for (const x of toUnallocate) unallocateNode(x)
					allocatedNodes.current = allocatedNodes.current.filter(
						x => toUnallocate.findIndex(x2 => x === x2.skill) === -1
					)
				}
				emitEvent('allocated-changed', allocatedNodes.current)
				buildAllNodesPaths()
			})

			container.addChild(sprite)
			node.spriteContainer = container

			viewport.current.addChild(container)
		}
	}

	function addConnectorsToViewport(): void {
		if (!appInstance) return
		for (const c of connectors.current) {
			if (c.hidden) return
			const startNode = nodes.current[c.startNode]
			const endNode = nodes.current[c.endNode]
			if (
				startNode.group === endNode.group &&
				startNode.orbit === endNode.orbit &&
				startNode.group &&
				startNode.orbit
			) {
				const group = groups.find(x =>
					x.nodes.includes(startNode.skill.toString())
				)
				if (!group) return
				if (
					(startNode.extra.angle - endNode.extra.angle > 0 &&
						startNode.extra.angle - endNode.extra.angle < Math.PI) ||
					startNode.extra.angle - endNode.extra.angle < -Math.PI
				) {
					const arc = new Graphics()
					arc.lineStyle({
						color: getConnectorStrokeColor(c),
						width: 10
					})
					arc.arc(
						group.x,
						group.y,
						orbitRadii[startNode.orbit],
						endNode.extra.angle - Math.PI / 2,
						startNode.extra.angle - Math.PI / 2
					)
					arc.interactive = true
					viewport.current.addChild(arc)
					c.sprite = arc
				} else {
					const arc = new Graphics()
					arc.lineStyle({
						color: getConnectorStrokeColor(c),
						width: 10
					})
					arc.arc(
						group.x,
						group.y,
						orbitRadii[startNode.orbit],
						startNode.extra.angle - Math.PI / 2,
						endNode.extra.angle - Math.PI / 2
					)
					arc.interactive = true
					viewport.current.addChild(arc)
					c.sprite = arc
				}
				return
			}

			const graphics = new Graphics()
			graphics.lineStyle({
				color: getConnectorStrokeColor(c),
				width: 10
			})
			graphics.moveTo(startNode.extra.posX, startNode.extra.posY)
			graphics.lineTo(endNode.extra.posX, endNode.extra.posY)
			graphics.interactive = true
			viewport.current.addChild(graphics)
			c.sprite = graphics
		}
	}

	function addGroupsToViewport(): void {
		for (const [id, g] of Object.entries(groups)) {
			if (g.orbits.length === 0 || g.isProxy) continue

			const maxOrbit = Math.max(...g.orbits)
			if (maxOrbit === 0 || maxOrbit >= 4) continue
			const sprite = new Sprite(
				textureManager.getTexture(`group-bg-${maxOrbit}`)
			)
			sprite.name = `OrbitGroup{${id}}`
			sprite.position.set(g.x, g.y)
			sprite.anchor.set(0.5, 0.5)
			sprite.scale.set(2, 2)

			viewport.current.addChild(sprite)
		}
	}

	// == Canvas setup

	function tickNodes(): void {
		for (const node of Object.values(nodes.current)) {
			if (!node.spriteContainer) continue
			if (node.isMastery) {
				const [skill] = node.spriteContainer.children
				const skillSprite = skill as Sprite
				skillSprite.texture =
					node.state === State.ACTIVE
						? textureManager.getTexture('masteries-active')
						: textureManager.getTexture('masteries')
			} else {
				const [skill, frame] = node.spriteContainer.children
				const skillSprite = skill as Sprite
				const frameSprite = frame as Sprite
				frameSprite.texture = getNodeFrameTexture(node)
				skillSprite.texture =
					node.state === State.ACTIVE
						? textureManager.getTexture('skills-active')
						: textureManager.getTexture('skills')
			}
		}
	}

	useEffect(() => {
		if (!domElement.current || !isReady) return
		const app = new Application({
			width: domElement.current.clientWidth,
			height: domElement.current.clientHeight,
			backgroundColor: 0x08_0d_12,
			resizeTo: window
		})

		domElement.current.append(app.view)

		viewport.current = new Viewport({
			worldWidth: 8000, // arbritrary
			worldHeight: 8000,
			divWheel: domElement.current
		})

		textureManager.initialize()
		viewport.current.clampZoom({ minScale: 0.1, maxScale: 0.5 })
		viewport.current.setZoom(0.25, true)
		viewport.current.wheel({ smooth: 5 }).drag()
		viewport.current.on('mousemove', event => {
			const object = app.renderer.plugins.interaction.hitTest(event.data.global)
			if (object instanceof Sprite) {
				if (!object.name) return
				const match = object.name.match(/Node{(\d+)}/)
				if (match) {
					const skill = Number.parseInt(match[1], 10)
					const localPos: Point = new Point(
						event.data.global.x,
						event.data.global.y
					)
					if (
						localPos.x + tooltips.current[skill].width + 20 >
						app.screen.width
					) {
						localPos.x = app.screen.width - tooltips.current[skill].width - 20
					}
					if (
						localPos.y + tooltips.current[skill].height + 20 >
						app.screen.height
					) {
						localPos.y =
							app.screen.height -
							tooltips.current[skill].height -
							object.height / 2.5 -
							20
					}
					tooltips.current[skill].position.set(localPos.x + 20, localPos.y + 20)
				}
			}
		})
		app.stage.addChild(viewport.current)
		const bgTexture = textureManager.getTexture('bg-image')
		const backgroundSprite = new Sprite(bgTexture)
		backgroundSprite.alpha = 0.5

		// This atlas background calculation is messy and arbitrary
		const atlasSize = {
			min_x: -4856,
			min_y: -10_023,
			max_x: 4854,
			max_y: 0
		}

		const xSize = atlasSize.max_x - atlasSize.min_x + 1870
		const ySize = atlasSize.max_y - atlasSize.min_y + 1100
		backgroundSprite.width = xSize
		backgroundSprite.height = ySize
		backgroundSprite.position.set(atlasSize.min_x - 1000, atlasSize.min_y - 200)
		viewport.current.addChild(backgroundSprite)
		viewport.current.moveCenter(
			(atlasSize.min_x + atlasSize.max_x) / 2,
			(atlasSize.min_y + atlasSize.max_y) / 6
		)

		app.ticker.add(tickNodes)

		setAppInstance(app)

		// Cleanup function
		return () => {
			app.destroy(true, true)
		}
	}, [isReady, textureManager])

	useEffect(() => {
		if (!appInstance) return
		addGroupsToViewport()
		addConnectorsToViewport()
		addNodesToViewport()
		const sprite = new Sprite(textureManager.getTexture('atlas-start'))
		sprite.anchor.set(0.5, 0.5)
		sprite.scale.set(2, 2)
		viewport.current.addChild(sprite)
		buildTooltips()
	}, [appInstance, viewport])

	useEffect(() => {
		const startingNode = Object.values(nodes.current).find(
			x => x.isStartPoint
		) as TreeNode
		allocatedNodes.current = [startingNode.skill]
		buildAllNodesPaths()
		for (const x of Object.values(nodes.current)) {
			x.distanceToStart = x.pathDistance
		}
		setReady(true)
	}, [buildAllNodesPaths])

	useEffect(() => {
		const resize = (): void =>
			viewport.current.resize(window.innerWidth, window.innerHeight)
		window.addEventListener('resize', resize)
		return () => window.removeEventListener('resize', resize)
	})

	useEffect(() => {
		if (searchQuery === undefined || !isReady || !appInstance) return
		const filteredObjects: DisplayObject[] = viewport.current.children.filter(
			x => (x as Container).children.some(x2 => x2.name.startsWith('Node'))
		)
		for (const c of filteredObjects) {
			;((c as Container).children[1] as Sprite).tint = 0xff_ff_ff
		}
		const cleanQuery = searchQuery
			.split(' ')
			.filter((q: string) => q.length >= 3)
		if (cleanQuery.length === 0) return
		const matchedNodes = Object.values(nodes.current).filter(x =>
			cleanQuery.some(
				q =>
					x.name.toLowerCase().includes(q.toLowerCase()) ||
					q === x.skill.toString() ||
					x.stats.some(s => s.toLowerCase().includes(q.toLowerCase()))
			)
		)

		for (const c of viewport.current.children.filter(
			x =>
				x instanceof Container &&
				x.children.some(
					x2 =>
						x2.name && matchedNodes.some(n => x2.name.includes(`{${n.skill}}`))
				)
		)) {
			;((c as Container).children[1] as Sprite).tint = 0xff_00_00
		}
	}, [searchQuery, appInstance, isReady])

	const onHandleSearch = (event: React.FormEvent<HTMLInputElement>): void => {
		setSearchQuery(event.currentTarget.value)
	}

	function resetTree(): void {
		for (const x of allocatedNodes.current) {
			unallocateNode(nodes.current[x])
			nodes.current[x].path = []
			nodes.current[x].pathDistance = 1000
		}
		const startingNode = Object.values(nodes.current).find(
			x => x.isStartPoint
		) as TreeNode
		allocatedNodes.current = [startingNode.skill]
		allocateNode(startingNode)
		buildAllNodesPaths()
		for (const value of Object.values(nodes.current)) {
			nodes.current[value.skill].distanceToStart =
				nodes.current[value.skill].pathDistance
		}
		forceUpdate()
	}

	useEventListener('import-tree', (tree: number[]) => {
		resetTree()
		for (const x of tree) {
			allocateNode(nodes.current[x])
		}
		allocatedNodes.current = [...allocatedNodes.current, ...tree]
		emitEvent('allocated-changed', allocatedNodes.current)
		buildAllNodesPaths()
		forceUpdate()
	})

	useEventListener('reset-tree', resetTree)

	return (
		<div className='relative -z-0 flex h-full flex-auto flex-col'>
			<div className='atlas h-full w-full' ref={domElement} />
			<div className='absolute bottom-0 right-0 flex w-1/4 min-w-fit flex-col justify-center rounded-tl-2xl bg-zinc-900 px-4 py-2 shadow-md'>
				<h3 className='mb-2 flex w-full items-center justify-center text-center text-sm font-bold uppercase text-orange-400 text-opacity-70'>
					Points:{' '}
					<span
						className={
							allocatedNodes.current.length - 1 < jsonTree.points.totalPoints
								? 'mx-1 text-sky-400'
								: 'mx-1 text-red-400'
						}
					>
						{allocatedNodes.current.length - 1}
					</span>{' '}
					/ {jsonTree.points.totalPoints}
				</h3>
				<form className='flex w-full justify-center'>
					<label htmlFor='search' className='relative block w-full'>
						<span className='absolute inset-y-0 flex items-center pl-2'>
							<FaSearch className='text-zinc-700' />
						</span>
						<input
							type='text'
							name='search'
							className='w-full rounded bg-zinc-800 py-2 px-3 pl-9 pr-3 text-zinc-100 placeholder:italic placeholder:text-zinc-500 focus:outline-none'
							placeholder='Search for a node...'
							onChange={onHandleSearch}
						/>
					</label>
				</form>
			</div>
		</div>
	)
}

export default PassiveTreeRenderer
