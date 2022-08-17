import { TreeRenderer } from 'atlas'
import Dropdown from 'components/Dropdown'
import TreeSummary from 'components/TreeSummary'
import SkillTreeManager from 'data/skillTreeManager'
import tree from 'data/tree.json'
import type Connector from 'models/connector'
import type TreeGroup from 'models/groups'
import { State } from 'models/misc'
import type { NodeContainer } from 'models/nodes'
import type PassiveTree from 'models/tree'
import React, { lazy } from 'react'
import { importTree } from 'utils'
import { orbitAngles, orbitRadii } from '../constants'

export const SkillTreeContext = React.createContext<TreeRenderer | undefined>(
  undefined
)

const AtlasSkillTree: React.FC = () => {
  const [treeRenderer, setTreeRenderer] = React.useState<TreeRenderer>()
  const treeContainer = React.useRef<HTMLDivElement>(null)
  const [isAppReady, setAppReady] = React.useState<boolean>(false)

  React.useEffect(() => {
    if (!treeContainer.current) return
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
      node.visited = false
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

    const renderer = new TreeRenderer(
      filteredNodes,
      data.groups,
      initConnectors,
      data
    )
    setTreeRenderer(renderer)
    renderer.setup(treeContainer.current).then(() => {
      setAppReady(true)
      window.addEventListener('resize', renderer.resizeCanvas)
    })

    return () => {
      window.removeEventListener('resize', renderer.resizeCanvas)
    }
  }, [])

  const dropdownActions = React.useMemo(() => {
    if (!treeRenderer) return []
    return [
      [
        {
          name: '15 points',
          onClick: () => {
            const skills = importTree(
              'AAAABgAADQMUMiRf62zUhcSRfbH7x7PS9N9e6Nrx3vdPAAA='
            )
            treeRenderer.getSkillManager().setAllocatedSkills(skills)
          }
        }
      ]
    ]
  }, [treeRenderer])

  React.useEffect(() => {
    if (!isAppReady || !treeRenderer) return
    if (!treeRenderer.isReady()) return
    treeRenderer.start()
  }, [isAppReady, treeRenderer])

  return (
    <SkillTreeContext.Provider value={treeRenderer}>
      <div className='flex items-stretch'>
        <TreeSummary />
        <div className='flex h-screen flex-1 flex-col items-stretch'>
          <div className='flex-1' ref={treeContainer} id='tree-container' />
          <div className='flex h-8 flex-none items-stretch bg-zinc-900'>
            <Dropdown />
          </div>
        </div>
      </div>
    </SkillTreeContext.Provider>
  )
}

export default AtlasSkillTree
