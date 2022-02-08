import LoadingOrError from 'components/LoadingOrError'
import type Connector from 'models/connector'
import type TreeGroup from 'models/groups'
import { State } from 'models/misc'
import type { NodeContainer } from 'models/nodes'
import type PassiveTree from 'models/tree'
import React, { lazy, Suspense } from 'react'
import { orbitAngles, orbitRadii } from '../constants'

const PassiveTreeRenderer = lazy(
	async () => import('components/PassiveTreeRenderer')
)

const AtlasSkillTree: React.FC = () => {
	const [connectors, setConnectors] = React.useState<Connector[]>([])
	const [groups, setGroups] = React.useState<TreeGroup[]>([])
	const [nodes, setNodes] = React.useState<NodeContainer>({})
	const [passiveTree, setPassiveTree] = React.useState<PassiveTree>()

	React.useEffect(() => {
		async function loadJSONTree(): Promise<void> {
			const tree = await import('data/tree.json')
			const data = tree as PassiveTree
			const filteredNodes = Object.fromEntries(
				Object.entries(data.nodes).filter(
					([, value]) => value.group && value.skill && !value.isProxy
				)
			) as NodeContainer

			// Nodes
			for (const node of Object.values(filteredNodes)) {
				const group = data.groups[node.group.toString()]
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const extra: any = {}
				node.path = []
				node.pathDistance = 0
				node.isDependencyOf = []
				node.allocated = 0
				extra.angle = (orbitAngles[node.orbit][node.orbitIndex] * Math.PI) / 180
				extra.posX = group.x - orbitRadii[node.orbit] * Math.sin(-extra.angle)
				extra.posY = group.y - orbitRadii[node.orbit] * Math.cos(-extra.angle)

				if (node.group === 0) {
					extra.posX = 0
					extra.posY = 0
				}
				node.extra = extra
				node.state = State.DEFAULT
				if (node.skill === 29_045) {
					node.isStartPoint = true
					node.allocated = 1
					node.hidden = true
					node.state = State.ACTIVE
				}
			}

			// Connectors
			const initConnectors: Connector[] = []
			for (const node of Object.values(filteredNodes)) {
				for (const nodeString of node.out) {
					const otherNode = filteredNodes[Number.parseInt(nodeString, 10)]
					if (
						initConnectors.findIndex(
							c =>
								(c.startNode === node.skill && c.endNode === otherNode.skill) ||
								(c.endNode === node.skill && c.startNode === otherNode.skill)
						) !== -1
					)
						continue
					const type =
						node.group === otherNode.group && node.orbit === otherNode.orbit
							? 'circle'
							: 'line'
					const connector = {
						id: `${node.skill}/${otherNode.skill}`,
						endNode: otherNode.skill,
						startNode: node.skill,
						type,
						state: node.allocated
							? otherNode.allocated
								? State.ACTIVE
								: State.INTERMEDIATE
							: State.DEFAULT
					}
					initConnectors.push(connector)
				}
			}

			// Final tweaks: default allocated, etc...
			for (const n of Object.values(filteredNodes).filter(x1 =>
				data.nodes.root.out?.some(x2 => x2 === x1.skill.toString())
			)) {
				n.allocated = 1
				n.state = State.ACTIVE
				for (const n1 of Object.values(filteredNodes).filter(n2 =>
					n.out.includes(n2.skill.toString())
				)) {
					n1.canAllocate = true
					n1.state = State.INTERMEDIATE
				}
			}

			setPassiveTree(data)
			setGroups(Object.values(data.groups))
			setNodes(filteredNodes)
			setConnectors(initConnectors)
		}

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		loadJSONTree()
	})

	const isAppReady = (): boolean =>
		Object.values(nodes).length > 0 &&
		connectors.length > 0 &&
		groups.length > 0

	return (
		<Suspense fallback={<LoadingOrError />}>
			{isAppReady() && passiveTree !== undefined && (
				<PassiveTreeRenderer
					nodes={nodes}
					connectors={connectors}
					groups={groups}
					jsonTree={passiveTree}
				/>
			)}
		</Suspense>
	)
}

export default AtlasSkillTree
