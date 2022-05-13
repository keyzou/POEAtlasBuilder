import { AccessibilityManager } from '@pixi/accessibility'
import { Application } from '@pixi/app'
import {
  CompressedTextureLoader,
  DDSLoader,
  KTXLoader
} from '@pixi/compressed-textures'
import type { Texture } from '@pixi/core'
import { BatchRenderer, Renderer } from '@pixi/core'
import type { DisplayObject } from '@pixi/display'
import { Container } from '@pixi/display'
import { Extract } from '@pixi/extract'
import { SmoothGraphics as Graphics } from '@pixi/graphics-smooth'
import { InteractionManager } from '@pixi/interaction'
import { AppLoaderPlugin, Loader } from '@pixi/loaders'
import { Point } from '@pixi/math'
import '@pixi/mixin-get-child-by-name'
import { ParticleRenderer } from '@pixi/particle-container'
import { Prepare } from '@pixi/prepare'
import { Sprite } from '@pixi/sprite'
import { TilingSprite, TilingSpriteRenderer } from '@pixi/sprite-tiling'
import { SpritesheetLoader } from '@pixi/spritesheet'
import { Text } from '@pixi/text'
import { BitmapFontLoader } from '@pixi/text-bitmap'
import { TickerPlugin } from '@pixi/ticker'
import { useSkillTreeManager } from 'data/skillTreeManager'
import { useTextureManager } from 'data/textureManager'
import type Connector from 'models/connector'
import type TreeGroup from 'models/groups'
import { State } from 'models/misc'
import type TreeNode from 'models/nodes'
import type { NodeContainer } from 'models/nodes'
import type SkillAtlas from 'models/sprite'
import type PassiveTree from 'models/tree'
import { SkillTreeContext } from 'pages/AtlasSkillTree'
import { Viewport } from 'pixi-viewport'
import React, { useCallback, useEffect, useRef } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { FaSearch } from 'react-icons/fa'
import { useParams } from 'react-router'
import {
  addToHistory as pushToHistory,
  emitEvent,
  findStartFromNode,
  importTree,
  redoHistory,
  stateToString,
  undoHistory,
  useEventListener,
  useForceUpdate
} from 'utils'
import {
  getNodeFrameInfo,
  orbitRadii,
  TOOLTIP_HEADER_HEIGHT
} from '../constants'
import LoadingOrError from './LoadingOrError'

interface Properties {
  connectors: Connector[]
  groups: Record<string, TreeGroup>
  jsonTree: PassiveTree
}

const PassiveTreeRenderer: React.FC<Properties> = ({
  connectors: baseConnectors,
  groups,
  jsonTree
}) => {
  const domElement = useRef<HTMLDivElement>(null)
  const searchElement = useRef<HTMLInputElement>(null)
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
  const skillTreeManager = React.useContext(SkillTreeContext)
  const connectors = React.useRef<Connector[]>(baseConnectors)
  const tooltips = React.useRef<Record<number, Container>>({})

  const [isReady, setReady] = React.useState<boolean>(false)

  // == Assets Fetching
  function getNodeFrameTexture(node: TreeNode): Texture {
    if (node.isKeystone) {
      return textureManager.getTexture(
        `skill-keystone-${stateToString(node.state)}`
      )
    }
    if (node.isNotable)
      return textureManager.getTexture(
        `skill-notable-${stateToString(node.state)}`
      )
    return textureManager.getTexture(
      `skill-frame-${stateToString(node.state, node.canAllocate)}`
    )
  }

  function getConnectorStrokeColor(connector: Connector): number {
    if (
      skillTreeManager.getAllocatedSkills().length - 1 >
      jsonTree.points.totalPoints
    ) {
      if (connector.state === State.ACTIVE) return 0xe0_6c_6e
      if (connector.state === State.INTERMEDIATE) return 0x7d_37_38
    }
    if (connector.state === State.ACTIVE) return 0x76_a6_fb
    if (connector.state === State.INTERMEDIATE) return 0x7a_6e_62
    return 0x3d_3a_2e
  }

  // === Path finding ===

  /**
   * Curtosy of Path of Building again, they're insane
   * @param nodes Nodes to explore
   * @returns For each node, which nodes depends on it
   */
  const buildDependencies = useCallback((): void => {
    const visited = new Set<number>()
    const toVisit = Object.fromEntries(
      Object.entries(skillTreeManager.getNodes())
        .filter(([, value]) => value.allocated === 1)
        .sort(
          ([, aValue], [, bValue]) =>
            aValue.distanceToStart - bValue.distanceToStart
        )
    )
    for (const node of Object.values(toVisit)) {
      node.visited = true
      const linked = [...node.out, ...node.in].map(o =>
        skillTreeManager.getNode(Number.parseInt(o, 10))
      )
      for (const other of linked) {
        if (other.visited) continue
        if (!other.allocated) continue
        if (node.isDependencyOf.includes(other.skill)) continue
        if (findStartFromNode(other.skill, toVisit, visited)) {
          // We found the starting point, so they're not dependent on this node
          for (const x of visited) {
            skillTreeManager.updateNode(x, { visited: false })
          }
          visited.clear()
        } else {
          // No path found, they must depend on this node
          for (const x of visited) {
            node.isDependencyOf.push(x)
            skillTreeManager.updateNode(x, { visited: false })
          }
          visited.clear()
        }
      }
      node.visited = false
    }
  }, [skillTreeManager])

  const BFS = useCallback(
    (node: number): void => {
      const startNode = skillTreeManager.getNode(node)
      const queue = []
      startNode.pathDistance = 0
      startNode.path = []
      queue.push(startNode)
      while (queue.length > 0) {
        const n = queue.shift()
        if (!n) continue
        const currentDistance = n.pathDistance + 1
        const linked: TreeNode[] = [...n.out, ...n.in].map(o =>
          skillTreeManager.getNode(Number.parseInt(o, 10))
        )
        for (const other of linked) {
          if (other.pathDistance > currentDistance && !other.isMastery) {
            other.pathDistance = currentDistance
            other.path = [other.skill, ...n.path]
            queue.push(other)
          }
        }
      }
    },
    [skillTreeManager]
  )

  const buildAllNodesPaths = useCallback(() => {
    for (const n of skillTreeManager.toArray()) {
      const resetNode: Partial<TreeNode> = {
        pathDistance: 1000,
        path: [],
        isDependencyOf: []
      }
      if (skillTreeManager.getAllocatedSkills().includes(n.skill)) {
        resetNode.pathDistance = 0
        resetNode.isDependencyOf = [n.skill]
      }
      skillTreeManager.updateNode(n.skill, resetNode)
    }
    buildDependencies()
    for (const skill of skillTreeManager.getAllocatedSkills()) {
      BFS(skill)
    }
  }, [BFS, buildDependencies, skillTreeManager])
  // === === === === ===

  // === Canvas rendering

  function redrawConnector(c: Connector): void {
    if (c.hidden) return
    if (!c.sprite) return
    c.sprite.clear()
    const startNode = skillTreeManager.getNode(c.startNode)
    const endNode = skillTreeManager.getNode(c.endNode)
    if (
      startNode.group === endNode.group &&
      startNode.orbit === endNode.orbit &&
      startNode.group &&
      startNode.orbit
    ) {
      const group = Object.values(groups).find(x =>
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
    skillTreeManager.updateNode(node.skill, {
      allocated: 1,
      state: State.ACTIVE
    })
    if (node.isNotable) {
      const masteryNode = skillTreeManager.findNode(
        x => x.isMastery && x.group === node.group
      )
      if (!masteryNode) return
      skillTreeManager.updateNode(masteryNode.skill, { state: State.ACTIVE })
    }
    for (const o of node.out) {
      const otherNode = skillTreeManager.getNode(Number.parseInt(o, 10))
      if (!otherNode.allocated) {
        skillTreeManager.updateNode(otherNode.skill, {
          canAllocate: true,
          state: State.INTERMEDIATE
        })
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
      const otherNode = skillTreeManager.getNode(Number.parseInt(index, 10))
      if (!otherNode.allocated) {
        skillTreeManager.updateNode(otherNode.skill, {
          canAllocate: true,
          state: State.INTERMEDIATE
        })
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
    skillTreeManager.updateNode(node.skill, {
      allocated: 0,
      state: State.DEFAULT,
      isDependencyOf: []
    })
    if (
      node.isNotable &&
      skillTreeManager.filterNodes(
        x =>
          x.group === node.group &&
          x.skill !== node.skill &&
          x.isNotable &&
          x.allocated
      ).length === 0
    ) {
      const masteryNode = skillTreeManager.findNode(
        x => x.isMastery && x.group === node.group
      )
      if (!masteryNode) return
      skillTreeManager.updateNode(masteryNode.skill, { state: State.DEFAULT })
    }
    for (const o of node.out) {
      const otherNode = skillTreeManager.getNode(Number.parseInt(o, 10))
      if (!otherNode.allocated) {
        skillTreeManager.updateNode(otherNode.skill, {
          canAllocate: false,
          state: State.DEFAULT
        })
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
      const otherNode = skillTreeManager.getNode(Number.parseInt(index, 10))
      if (!otherNode.allocated) {
        skillTreeManager.updateNode(otherNode.skill, {
          canAllocate: false,
          state: State.DEFAULT
        })
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
      skillTreeManager.anyNode(
        x => x.group === node.group && x.isNotable && x.allocated
      )
    ) {
      const masteryNode = skillTreeManager.findNode(
        x => x.isMastery && x.group === node.group
      )
      if (!masteryNode) return
      skillTreeManager.updateNode(masteryNode.skill, { state: State.DEFAULT })
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
    for (const node of skillTreeManager.toArray()) {
      const spriteScale = 0.75
      const nodeName = new Text(`${node.name}`, {
        fontSize: 24,
        fontWeight: 'bold',
        fill: 0xf1_de_c3
      })
      const stats = new Text(`${node.stats.join('\n')}`, {
        fontSize: 20,
        lineHeight: 30,
        fill: 0x84_84_f0
      })
      stats.position.set(15, 15 + TOOLTIP_HEADER_HEIGHT * spriteScale)
      const tooltipWidth =
        Math.max(nodeName.width + 78 * spriteScale * 2, stats.width) + 30
      const tooltipHeight = stats.height + 30

      nodeName.position.set(
        tooltipWidth / 2,
        (TOOLTIP_HEADER_HEIGHT * spriteScale) / 2
      )
      nodeName.anchor.set(0.5, 0.5)
      const headerBg = new Container()
      headerBg.scale.set(spriteScale, spriteScale)
      const headerStartBg = new Sprite(
        textureManager.getTexture(
          `tooltip-header-start${node.isNotable ? '-notable' : ''}`
        )
      )
      const headerEndBg = new Sprite(
        textureManager.getTexture(
          `tooltip-header-end${node.isNotable ? '-notable' : ''}`
        )
      )

      const headerPatternBg = new TilingSprite(
        textureManager.getTexture(
          `tooltip-header-pattern${node.isNotable ? '-notable' : ''}`
        ),
        tooltipWidth / spriteScale,
        TOOLTIP_HEADER_HEIGHT
      )
      headerEndBg.anchor.set(1, 0)
      headerEndBg.position.set(tooltipWidth / spriteScale, 0)

      headerBg.addChild(headerPatternBg)
      headerBg.addChild(headerStartBg)
      headerBg.addChild(headerEndBg)

      const tooltipBg = new Graphics()
      tooltipBg.beginFill(0x00_00_00, 0.9)
      tooltipBg.drawRect(
        0,
        TOOLTIP_HEADER_HEIGHT * spriteScale,
        tooltipWidth,
        tooltipHeight
      )
      tooltipBg.endFill()
      const tooltipContainer = new Container()
      tooltipContainer.addChild(headerBg)
      tooltipContainer.addChild(tooltipBg, nodeName, stats)
      tooltipContainer.position.set(node.extra.posX, node.extra.posY)
      tooltipContainer.visible = false
      tooltipContainer.interactive = true
      appInstance.stage.addChild(tooltipContainer)
      updatedTooltips[node.skill] = tooltipContainer
    }
    tooltips.current = updatedTooltips
  }

  const getMasteries = React.useCallback(
    (node: string) =>
      viewport.current.children
        .filter(x => x && x.name && x.name.startsWith(`Mastery/${node}/`))
        .map(x => x as Container),
    [viewport]
  )

  function addNodesToViewport(): void {
    if (!appInstance) return
    for (const node of skillTreeManager.toArray()) {
      if (node.hidden) continue
      if (node.isMastery) {
        const container = new Container()
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
          w: coords[node.icon].w * 3,
          h: coords[node.icon].h * 3
        }
        mask.beginFill(0x00_00_00)
        mask.drawCircle(
          coords[node.icon].x * 3 + frameSize.w / 2,
          coords[node.icon].y * 3 + frameSize.h / 2,
          frameSize.w / 2
        )
        mask.endFill()
        spriteAtlas.position.set(
          -coords[node.icon].x * 3 - frameSize.w / 2,
          -coords[node.icon].y * 3 - frameSize.h / 2
        )
        spriteAtlas.mask = mask
        spriteAtlas.addChild(mask)
        container.addChild(spriteAtlas)
        container.interactive = true
        container.name = `Mastery/${node.name}/${node.skill}`
        container.on('mouseover', () => {
          for (const mastery of getMasteries(node.name)) {
            mastery.scale.set(1.5, 1.5)
          }
        })
        container.on('mouseout', () => {
          for (const mastery of getMasteries(node.name)) {
            mastery.scale.set(1, 1)
          }
        })
        node.spriteContainer = container
        viewport.current.addChild(container)
        continue
      }
      const container = new Container()
      container.x = node.extra.posX
      container.y = node.extra.posY
      const spriteAtlas = new Sprite(textureManager.getTexture('skills'))
      spriteAtlas.scale.set(3, 3)
      const frameInfo = getNodeFrameInfo(node, jsonTree)
      const coords: SkillAtlas['coords'] = frameInfo.skillAtlas
        .filter(x => typeof x.coords === 'object')
        .at(-1)?.coords as SkillAtlas['coords']
      if (!(node.icon in coords)) {
        continue
      }
      const mask = new Graphics()
      const frameSize = {
        w: frameInfo.innerRadius,
        h: frameInfo.innerRadius
      }
      mask.beginFill(0x00_00_00)
      mask.drawCircle(
        coords[node.icon].x + frameSize.w / 2,
        coords[node.icon].y + frameSize.h / 2,
        frameSize.w / 2
      )
      mask.endFill()
      spriteAtlas.position.set(
        (-coords[node.icon].x - frameSize.w / 2) * 3,
        (-coords[node.icon].y - frameSize.h / 2) * 3
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
        const n = skillTreeManager.getNode(node.skill)
        // Todo handle hovers better
        if (n.skill in tooltips.current) {
          tooltips.current[n.skill].visible = true
        }
        if (n.allocated) return
        n.state = State.INTERMEDIATE
        sprite.texture = getNodeFrameTexture(n)
        for (let index = 1; index < n.path.length; index += 1) {
          const from = skillTreeManager.getNode(n.path[index - 1])
          const to = skillTreeManager.getNode(n.path[index])

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
        const n = skillTreeManager.getNode(node.skill)
        if (n.skill in tooltips.current) {
          tooltips.current[n.skill].visible = false
        }
        if (n.allocated) return
        n.state = State.DEFAULT
        sprite.texture = getNodeFrameTexture(n)
        for (let index = 1; index < n.path.length; index += 1) {
          const from = skillTreeManager.getNode(n.path[index - 1])
          const to = skillTreeManager.getNode(n.path[index])
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
        const n = skillTreeManager.getNode(node.skill)
        n.allocated = node.allocated ? 0 : 1
        if (n.allocated) {
          for (const childNode of n.path) {
            const other = skillTreeManager.getNode(childNode)
            allocateNode(other)
          }
          sprite.texture = getNodeFrameTexture(n)
        } else {
          const toUnallocate = skillTreeManager
            .filterNodes(x => n.isDependencyOf.includes(x.skill))
            .sort((a, b) => b.distanceToStart - a.distanceToStart)
          for (const x of toUnallocate) unallocateNode(x)
        }
        const allocatedSnapshot = skillTreeManager.getAllocatedSkills()
        pushToHistory(allocatedSnapshot)
        emitEvent('allocated-changed', allocatedSnapshot)
        buildAllNodesPaths()
        forceUpdate()
      })

      container.addChild(sprite)
      node.spriteContainer = container

      viewport.current.addChild(container)
    }
  }

  function addConnectorsToViewport(): void {
    if (!appInstance) return
    for (const c of connectors.current) {
      if (c.hidden) continue
      const startNode = skillTreeManager.getNode(c.startNode)
      const endNode = skillTreeManager.getNode(c.endNode)
      if (
        startNode.group === endNode.group &&
        startNode.orbit === endNode.orbit &&
        startNode.group &&
        startNode.orbit
      ) {
        const group = Object.values(groups).find(x =>
          x.nodes.includes(startNode.skill.toString())
        )
        if (!group) continue
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
        continue
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
    if (!appInstance) return
    for (const [id, g] of Object.entries(groups)) {
      if (g.orbits.length === 0 || g.isProxy) continue
      let maxOrbit = Math.max(...g.orbits.filter(o => o <= 3))
      if (g.backgroundOverride) {
        maxOrbit = g.backgroundOverride
      }
      if (maxOrbit === 0 || (maxOrbit > 3 && !['17', '161'].includes(id)))
        continue
      let texture
      if (id === '17') texture = textureManager.getTexture('group-bg-exarch')
      else if (id === '161')
        texture = textureManager.getTexture('group-bg-eater')
      else texture = textureManager.getTexture(`group-bg-${maxOrbit}`)
      const sprite = new Sprite(texture)
      sprite.name = `OrbitGroup{${id}}`
      sprite.position.set(g.x, g.y)
      sprite.anchor.set(0.5, 0.5)
      sprite.scale.set(2.5, 2.5)

      if (id === '17') sprite.position.set(g.x + 1, g.y - 17)
      if (id === '161') sprite.position.set(g.x - 7, g.y - 67)

      viewport.current.addChild(sprite)
    }
  }

  // == Canvas setup

  function tick(): void {
    for (const node of skillTreeManager.toArray()) {
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
    if (!domElement.current || !isReady || appInstance) return
    // Install renderer plugins
    Renderer.registerPlugin('accessibility', AccessibilityManager)
    Renderer.registerPlugin('extract', Extract)
    Renderer.registerPlugin('interaction', InteractionManager)
    Renderer.registerPlugin('particle', ParticleRenderer)
    Renderer.registerPlugin('prepare', Prepare)
    Renderer.registerPlugin('batch', BatchRenderer)
    Renderer.registerPlugin('tilingSprite', TilingSpriteRenderer)

    // Install loader plugins
    Loader.registerPlugin(BitmapFontLoader)
    Loader.registerPlugin(CompressedTextureLoader)
    Loader.registerPlugin(DDSLoader)
    Loader.registerPlugin(KTXLoader)
    Loader.registerPlugin(SpritesheetLoader)

    // Install application plugins
    Application.registerPlugin(TickerPlugin)
    Application.registerPlugin(AppLoaderPlugin)
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

    app.ticker.add(tick)

    setAppInstance(app)

    // Cleanup function
    return () => {
      app.destroy(true, true)
    }
  }, [isReady, textureManager])

  useEffect(() => {
    if (!appInstance) return
    if (!textureManager.ready) return
    addGroupsToViewport()
    addConnectorsToViewport()
    addNodesToViewport()
    const sprite = new Sprite(textureManager.getTexture('atlas-start'))
    sprite.anchor.set(0.5, 0.5)
    sprite.scale.set(2, 2)
    viewport.current.addChild(sprite)
    buildTooltips()
  }, [appInstance, viewport, textureManager])

  useEffect(() => {
    const startingNode = skillTreeManager.findNode(
      x => x.isStartPoint
    ) as TreeNode
    skillTreeManager.updateNode(startingNode.skill, { allocated: 1 })
    buildAllNodesPaths()
    for (const x of skillTreeManager.toArray()) {
      skillTreeManager.updateNode(x.skill, { distanceToStart: x.pathDistance })
    }
    setReady(true)
  }, [buildAllNodesPaths, skillTreeManager])

  useEffect(() => {
    const resize = (): void =>
      viewport.current.resize(window.innerWidth, window.innerHeight)
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    if (searchQuery === undefined || !isReady || !appInstance) return
    const filteredObjects: DisplayObject[] = viewport.current.children.filter(
      x =>
        (x as Container).children
          .filter(x2 => x2.name)
          .some(x2 => x2.name.startsWith('Node'))
    )
    for (const c of filteredObjects) {
      ;((c as Container).children[1] as Sprite).tint = 0xff_ff_ff
    }
    const cleanQuery = searchQuery
      .split(' ')
      .filter((q: string) => q.length >= 3)
    if (cleanQuery.length === 0) return
    const matchedNodes = skillTreeManager.filterNodes(x =>
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
  }, [searchQuery, appInstance, isReady, skillTreeManager])

  const onHandleSearch = (event: React.FormEvent<HTMLInputElement>): void => {
    setSearchQuery(event.currentTarget.value)
  }

  function resetTree(): void {
    for (const x of skillTreeManager.getAllocatedSkills()) {
      unallocateNode(skillTreeManager.getNode(x))
      skillTreeManager.updateNode(x, { path: [], pathDistance: 1000 })
    }
    const startingNode = skillTreeManager.findNode(
      x => x.isStartPoint
    ) as TreeNode
    skillTreeManager.updateNode(startingNode.skill, { allocated: 1 })
    allocateNode(startingNode)
    buildAllNodesPaths()
    for (const x of skillTreeManager.toArray()) {
      skillTreeManager.updateNode(x.skill, { distanceToStart: x.pathDistance })
    }
    forceUpdate()
  }

  useEventListener('import-tree', (tree: number[]) => {
    resetTree()
    for (const x of tree) {
      allocateNode(skillTreeManager.getNode(x))
    }
    emitEvent('allocated-changed', skillTreeManager.getAllocatedSkills())
    buildAllNodesPaths()
    forceUpdate()
  })

  useEventListener('reset-tree', resetTree)

  const { tree } = useParams()

  React.useEffect(() => {
    if (!tree) return
    importTree(tree)
  }, [tree, isReady])

  useHotkeys('ctrl+f', event => {
    event.stopPropagation()
    event.preventDefault()
    searchElement.current?.focus()
  })

  useHotkeys('ctrl+z', event => {
    event.stopPropagation()
    event.preventDefault()
    const allocated = undoHistory()
    resetTree()
    if (allocated.length === 0) {
      return
    }
    for (const x of allocated) {
      allocateNode(skillTreeManager.getNode(x))
    }
    emitEvent('allocated-changed', skillTreeManager.getAllocatedSkills())
    buildAllNodesPaths()
    forceUpdate()
  })

  useHotkeys('ctrl+shift+z', event => {
    event.stopPropagation()
    event.preventDefault()
    const allocated = redoHistory()
    if (allocated.length === 0) {
      return
    }
    resetTree()
    for (const x of allocated) {
      allocateNode(skillTreeManager.getNode(x))
    }
    emitEvent('allocated-changed', skillTreeManager.getAllocatedSkills())
    buildAllNodesPaths()
    forceUpdate()
  })

  return (
    <div className='relative -z-0 flex h-full flex-auto flex-col'>
      {(!isReady || !viewport.current) && <LoadingOrError />}
      <div className='atlas h-full w-full' ref={domElement} />
      <div className='absolute bottom-0 right-0 flex w-1/4 min-w-fit flex-col justify-center rounded-tl-2xl bg-zinc-900 px-4 py-2 shadow-md'>
        <h3 className='mb-2 flex w-full items-center justify-center text-center text-sm font-bold uppercase text-orange-400 text-opacity-70'>
          Points:{' '}
          <span
            className={
              skillTreeManager.getAllocatedSkills().length - 1 <
              jsonTree.points.totalPoints
                ? 'mx-1 text-sky-400'
                : 'mx-1 text-red-500'
            }
          >
            {skillTreeManager.getAllocatedSkills().length - 1}
          </span>{' '}
          / {jsonTree.points.totalPoints}
        </h3>
        <form className='flex w-full justify-center'>
          <label htmlFor='search' className='relative mb-3 block w-full'>
            <span className='absolute inset-y-0 flex items-center pl-2'>
              <FaSearch className='text-zinc-700' />
            </span>
            <input
              type='text'
              name='search'
              ref={searchElement}
              className='w-full rounded border-none bg-zinc-800 py-2 px-3 pl-9 pr-3 text-zinc-100 placeholder:italic placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-70'
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
