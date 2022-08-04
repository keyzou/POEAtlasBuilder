import {
  CompressedTextureLoader,
  DDSLoader,
  KTXLoader
} from '@pixi/compressed-textures'
import skillFrameActive from 'assets/icons/Skill_Frame_Active.png'
import {
  AbstractRenderer,
  autoDetectRenderer,
  BatchRenderer,
  Renderer,
  Texture
} from '@pixi/core'
import { extensions } from '@pixi/extensions'
import { Container } from '@pixi/display'
import { Extract } from '@pixi/extract'
import '@pixi/mixin-get-child-by-name'
import GameStats from 'gamestats.js'
import {
  CircleBuilder,
  SmoothGraphics as Graphics
} from '@pixi/graphics-smooth'
import { InteractionManager } from '@pixi/interaction'
import { Point } from '@pixi/math'
import { ParticleRenderer } from '@pixi/particle-container'
import { Prepare } from '@pixi/prepare'
import { TilingSprite, TilingSpriteRenderer } from '@pixi/sprite-tiling'
import { SpritesheetLoader } from '@pixi/spritesheet'
import { BitmapFontLoader } from '@pixi/text-bitmap'
import {
  getNodeFrameInfo,
  orbitRadii,
  TOOLTIP_HEADER_HEIGHT
} from '../constants'
import SkillTreeManager from 'data/skillTreeManager'
import TextureManager from 'data/textureManager'
import Connector from 'models/connector'
import TreeGroup from 'models/groups'
import { State } from 'models/misc'
import TreeNode, { NodeContainer } from 'models/nodes'
import SkillAtlas from 'models/sprite'
import PassiveTree from 'models/tree'
import { Viewport } from 'pixi-viewport'
import { findStartFromNode, stateToString } from 'utils'
import { Text } from '@pixi/text'
import { Sprite } from '@pixi/sprite'
import { Application } from '@pixi/app'
import { TickerPlugin } from '@pixi/ticker'
import { Group, Layer } from '@pixi/layers'
import { group } from 'console'
import { AppLoaderPlugin } from '@pixi/loaders'
import { Simple } from 'pixi-cull'

export class TreeRenderer {
  private _element: HTMLElement
  private _viewport: Viewport
  private _textureManager: TextureManager
  private _passiveTree: PassiveTree

  private _skillTreeManager: SkillTreeManager
  private _app: Application

  private _nodes: NodeContainer
  private _connectors: Connector[]
  private _groups: Record<string, TreeGroup>

  private _tooltips: Record<string, Container> = {}

  private _dirty: boolean = true
  private _layers: Layer[]

  private _cull: Simple

  constructor(
    nodes: NodeContainer,
    groups: Record<string, TreeGroup>,
    connectors: Connector[],
    passiveTree: PassiveTree
  ) {
    // Install application plugins
    document.addEventListener('resize', () => this.resizeCanvas())

    this._textureManager = TextureManager.getInstance()

    this._skillTreeManager = new SkillTreeManager(nodes)
    this._passiveTree = passiveTree

    this._nodes = nodes
    this._connectors = connectors
    this._groups = groups
  }

  public resizeCanvas = () => {
    this._app.resize()
    this.setDirty()
  }

  public isReady = () => this._app.stage.children.every(o => o.renderable)

  public async setup(element: HTMLElement) {
    extensions.add(
      // Install renderer plugins
      Extract,
      InteractionManager,
      Prepare,
      BatchRenderer,
      TilingSpriteRenderer,

      // Install loader plugins
      BitmapFontLoader,
      CompressedTextureLoader
    )

    this._element = element
    this._app = new Application({
      width: element.clientWidth,
      height: element.clientHeight,
      backgroundColor: 0x08_0d_12,
      resizeTo: window
    })

    this._element.innerHTML = ''
    this._element.appendChild(this._app.view)
    this._viewport = new Viewport({
      worldWidth: 8000, // arbritrary
      worldHeight: 8000,
      divWheel: this._element,
      noTicker: true,
      interaction: this._app.renderer.plugins.interaction
    })
    await this._textureManager.initialize(this._app)

    this._cull = new Simple()
    this._viewport.clampZoom({ minScale: 0.1, maxScale: 0.5 })
    this._viewport.setZoom(0.25, true)
    this._viewport.wheel({ smooth: 5 }).drag()

    const backgroundLayer = new Group(-1, false)
    const groupsLayer = new Group(0, false)
    const connectorsLayer = new Group(1, false)
    const nodesLayer = new Group(2, false)
    const tooltipLayer = new Group(3, false)

    this._layers = [
      new Layer(backgroundLayer),
      new Layer(groupsLayer),
      new Layer(connectorsLayer),
      new Layer(nodesLayer),
      new Layer(tooltipLayer)
    ]
    this._viewport.addChild(...this._layers)
    this._app.stage.addChild(this._viewport)
    const bgTexture = this._textureManager.getTexture('bg-image')
    const backgroundSprite = new Sprite(bgTexture)
    backgroundSprite.alpha = 0.5
    backgroundSprite.parentGroup = backgroundLayer

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
    this._viewport.addChild(backgroundSprite)
    this._viewport.moveCenter(
      (atlasSize.min_x + atlasSize.max_x) / 2,
      (atlasSize.min_y + atlasSize.max_y) / 6
    )

    this.addGroupsToViewport(groupsLayer)
    this.addConnectorsToViewport(connectorsLayer)
    this.addNodesToViewport(nodesLayer)

    const sprite = new Sprite(this._textureManager.getTexture('atlas-start'))
    sprite.anchor.set(0.5, 0.5)
    sprite.scale.set(2, 2)
    this._viewport.addChild(sprite)
    this.buildTooltips(tooltipLayer)
    this._viewport.on('mousemove', event => {
      const object = this._app.renderer.plugins.interaction.hitTest(
        event.data.global
      )
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
            localPos.x + this._tooltips[skill].width + 20 >
            this._app.screen.width
          ) {
            localPos.x =
              this._app.screen.width - this._tooltips[skill].width - 20
          }
          if (
            localPos.y + this._tooltips[skill].height + 20 >
            this._app.screen.height
          ) {
            localPos.y =
              this._app.screen.height -
              this._tooltips[skill].height -
              object.height / 2.5 -
              20
          }
          this._tooltips[skill].position.set(localPos.x + 20, localPos.y + 20)
        }
      }
    })

    const startingNode = this._skillTreeManager.findNode(
      x => x.isStartPoint
    ) as TreeNode
    this._skillTreeManager.updateNode(startingNode.skill, { allocated: 1 })
    this.buildAllNodesPaths()
    for (const x of this._skillTreeManager.toArray()) {
      this._skillTreeManager.updateNode(x.skill, {
        distanceToStart: x.pathDistance
      })
    }
  }

  private _stats: GameStats = new GameStats()
  public start(): void {
    this._cull.addList(this._viewport.children)
    this._cull.cull(this._viewport.getVisibleBounds())
    this._stats.dom.style.left = '90%'
    this._stats.dom.style.top = '20px'
    this._stats.dom.style.right = '20px'
    let _lastTick = Date.now()
    const loop = () => {
      this._stats.begin()
      const newTime = Date.now()
      let deltaTime = newTime - _lastTick
      _lastTick = newTime
      if (deltaTime < 0) {
        deltaTime = 0
      }
      if (deltaTime > 1000) {
        deltaTime = 1000
      }

      for (const node of this._skillTreeManager.toArray()) {
        if (!node.spriteContainer) continue
        if (node.isMastery) {
          const [skill] = node.spriteContainer.children
          const skillSprite = skill as Sprite
          const oldTexture = skillSprite.texture
          skillSprite.texture =
            node.state === State.ACTIVE
              ? this._textureManager.getTexture('masteries-active')
              : this._textureManager.getTexture('masteries')
          if (oldTexture !== skillSprite.texture) this.setDirty()
        } else {
          const [skill, frame] = node.spriteContainer.children
          const skillSprite = skill as Sprite
          const frameSprite = frame as Sprite
          const oldSkillTexture = skillSprite.texture
          const oldFrameTexture = frameSprite.texture
          frameSprite.texture = this.getNodeFrameTexture(node)
          skillSprite.texture =
            node.state === State.ACTIVE
              ? this._textureManager.getTexture('skills-active')
              : this._textureManager.getTexture('skills')
          if (oldSkillTexture !== skillSprite.texture) this.setDirty()
          if (oldFrameTexture !== frameSprite.texture) this.setDirty()
        }
      }

      this._viewport.update(deltaTime)
      this._viewport.updateTransform()
      if (this._dirty || this._viewport.dirty) {
        this._cull.cull(this._viewport.getVisibleBounds())
        this._app.render()
        this._dirty = this._viewport.dirty = false
      }
      this._stats.end()
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    this.resizeCanvas()
    console.log(this._dirty, this._viewport.dirty)
  }

  private addNodesToViewport(group: Group): void {
    for (const node of this._skillTreeManager.toArray()) {
      if (node.hidden) continue
      if (node.isMastery) {
        const container = new Container()
        container.x = node.extra.posX
        container.y = node.extra.posY
        const spriteAtlas = new Sprite(
          this._textureManager.getTexture('masteries')
        )
        const coords = this._passiveTree.skillSprites.mastery
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
          for (const mastery of this.getMasteries(node.name)) {
            mastery.scale.set(1.5, 1.5)
          }
          this.setDirty()
        })
        container.on('mouseout', () => {
          for (const mastery of this.getMasteries(node.name)) {
            mastery.scale.set(1, 1)
          }
          this.setDirty()
        })
        node.spriteContainer = container
        this._viewport.addChild(container)
        continue
      }
      const container = new Container()
      container.x = node.extra.posX
      container.y = node.extra.posY
      const spriteAtlas = new Sprite(this._textureManager.getTexture('skills'))
      spriteAtlas.interactive = false
      spriteAtlas.scale.set(3, 3)
      const frameInfo = getNodeFrameInfo(node, this._passiveTree)
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
      const sprite = new Sprite(this.getNodeFrameTexture(node))
      sprite.anchor.set(0.5, 0.5)
      sprite.interactive = true
      sprite.name = `Node{${node.skill}}`

      sprite.on('mouseover', () => {
        const n = this._skillTreeManager.getNode(node.skill)
        // Todo handle hovers better
        if (n.skill in this._tooltips) {
          this._tooltips[n.skill].visible = true
        }
        this.setDirty()
        if (n.allocated) return
        n.state = State.INTERMEDIATE
        sprite.texture = this.getNodeFrameTexture(n)
        for (let index = 1; index < n.path.length; index += 1) {
          const from = this._skillTreeManager.getNode(n.path[index - 1])
          const to = this._skillTreeManager.getNode(n.path[index])

          from.state =
            from.state === State.DEFAULT ? State.INTERMEDIATE : from.state
          if (from.spriteContainer)
            (from.spriteContainer.children[1] as Sprite).texture =
              this.getNodeFrameTexture(from)
          to.state = to.state === State.DEFAULT ? State.INTERMEDIATE : to.state
          if (to.spriteContainer)
            (to.spriteContainer.children[1] as Sprite).texture =
              this.getNodeFrameTexture(to)

          this.setDirty()

          const c = this.findConnectorFromNodes(from, to)
          if (!c) continue
          if (c.state === State.ACTIVE) continue
          c.state = State.INTERMEDIATE
          this.redrawConnector(c)
        }
      })

      sprite.on('mouseout', () => {
        console.log('out')
        const n = this._skillTreeManager.getNode(node.skill)
        if (n.skill in this._tooltips) {
          this._tooltips[n.skill].visible = false
        }
        this.setDirty()
        if (n.allocated) return
        n.state = n.path.length === 1 ? State.INTERMEDIATE : State.DEFAULT
        sprite.texture = this.getNodeFrameTexture(n)
        for (let index = 1; index < n.path.length; index += 1) {
          const from = this._skillTreeManager.getNode(n.path[index - 1])
          const to = this._skillTreeManager.getNode(n.path[index])
          from.state =
            from.state === State.INTERMEDIATE ? State.DEFAULT : from.state
          if (from.spriteContainer)
            (from.spriteContainer.children[1] as Sprite).texture =
              this.getNodeFrameTexture(from)
          to.state = to.allocated
            ? State.ACTIVE
            : from.state === State.ACTIVE
            ? State.INTERMEDIATE
            : State.DEFAULT
          console.log(
            `{${from.skill}: ${from.state}} => {${to.skill}: ${to.state}}`
          )
          if (to.spriteContainer)
            (to.spriteContainer.children[1] as Sprite).texture =
              this.getNodeFrameTexture(to)
          const c = this.findConnectorFromNodes(from, to)
          this.setDirty()
          if (!c) continue
          if (c.state === State.ACTIVE) continue
          c.state = from.allocated ? State.INTERMEDIATE : State.DEFAULT
          this.redrawConnector(c)
        }
      })

      sprite.on('click', () => {
        if (this._viewport.moving) return
        const n = this._skillTreeManager.getNode(node.skill)
        n.allocated = node.allocated ? 0 : 1
        if (n.allocated) {
          for (const childNode of n.path) {
            const other = this._skillTreeManager.getNode(childNode)
            this.allocateNode(other)
          }
          sprite.texture = this.getNodeFrameTexture(n)
        } else {
          const toUnallocate = this._skillTreeManager
            .filterNodes(x => n.isDependencyOf.includes(x.skill))
            .sort((a, b) => b.distanceToStart - a.distanceToStart)
          for (const x of toUnallocate) this.unallocateNode(x)
        }
        const allocatedSnapshot = this._skillTreeManager.getAllocatedSkills()
        // pushToHistory(allocatedSnapshot)
        this.buildAllNodesPaths()
        this.setDirty()
      })
      container.addChild(sprite)
      node.spriteContainer = container
      container.parentGroup = group
      this._viewport.addChild(container)
    }
    this.setDirty()
  }

  private setDirty() {
    this._dirty = true
  }

  public getSkillManager(): SkillTreeManager {
    return this._skillTreeManager
  }

  private allocateNode(node: TreeNode): void {
    this._skillTreeManager.updateNode(node.skill, {
      allocated: 1,
      state: State.ACTIVE
    })
    if (node.isNotable) {
      const masteryNode = this._skillTreeManager.findNode(
        x => x.isMastery && x.group === node.group
      )
      if (!masteryNode) return
      this._skillTreeManager.updateNode(masteryNode.skill, {
        state: State.ACTIVE
      })
    }
    for (const o of node.out) {
      const otherNode = this._skillTreeManager.getNode(Number.parseInt(o, 10))
      if (!otherNode.allocated) {
        this._skillTreeManager.updateNode(otherNode.skill, {
          canAllocate: true,
          state: State.INTERMEDIATE
        })
      }
      const connector = this._connectors.find(
        c => c.startNode === node.skill && c.endNode.toString() === o
      )
      if (!connector) continue
      if (otherNode.allocated && connector.state !== State.ACTIVE) {
        connector.state = State.ACTIVE
      } else if (!otherNode.allocated && connector.state === State.DEFAULT) {
        connector.state = State.INTERMEDIATE
      }
      if (!connector.sprite) continue
      this.redrawConnector(connector)
    }

    for (const index of node.in) {
      const otherNode = this._skillTreeManager.getNode(
        Number.parseInt(index, 10)
      )
      if (!otherNode.allocated) {
        this._skillTreeManager.updateNode(otherNode.skill, {
          canAllocate: true,
          state: State.INTERMEDIATE
        })
      }
      const connector = this._connectors.find(
        c => c.startNode.toString() === index && c.endNode === node.skill
      )
      if (!connector) continue
      if (otherNode.allocated && connector.state !== State.ACTIVE) {
        connector.state = State.ACTIVE
      } else if (!otherNode.allocated && connector.state === State.DEFAULT) {
        connector.state = State.INTERMEDIATE
      }
      if (!connector.sprite) continue
      this.redrawConnector(connector)
    }
    this.setDirty()
  }

  private redrawConnector(c: Connector): void {
    if (c.hidden) return
    if (!c.sprite) return
    c.sprite.clear()
    const startNode = this._skillTreeManager.getNode(c.startNode)
    const endNode = this._skillTreeManager.getNode(c.endNode)
    if (
      startNode.group === endNode.group &&
      startNode.orbit === endNode.orbit &&
      startNode.group &&
      startNode.orbit
    ) {
      const group = Object.values(this._groups).find(x =>
        x.nodes.includes(startNode.skill.toString())
      )
      if (!group) return
      if (
        (startNode.extra.angle - endNode.extra.angle > 0 &&
          startNode.extra.angle - endNode.extra.angle < Math.PI) ||
        startNode.extra.angle - endNode.extra.angle < -Math.PI
      ) {
        c.sprite.lineStyle({
          color: this.getConnectorStrokeColor(c),
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
          color: this.getConnectorStrokeColor(c),
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
      color: this.getConnectorStrokeColor(c),
      width: 10
    })
    c.sprite.moveTo(startNode.extra.posX, startNode.extra.posY)
    c.sprite.lineTo(endNode.extra.posX, endNode.extra.posY)
    c.sprite.interactive = true
  }

  private unallocateNode(node: TreeNode): void {
    this._skillTreeManager.updateNode(node.skill, {
      allocated: 0,
      state: State.DEFAULT,
      isDependencyOf: []
    })
    if (
      node.isNotable &&
      this._skillTreeManager.filterNodes(
        x =>
          x.group === node.group &&
          x.skill !== node.skill &&
          x.isNotable &&
          x.allocated
      ).length === 0
    ) {
      const masteryNode = this._skillTreeManager.findNode(
        x => x.isMastery && x.group === node.group
      )
      if (!masteryNode) return
      this._skillTreeManager.updateNode(masteryNode.skill, {
        state: State.DEFAULT
      })
    }
    for (const o of node.out) {
      const otherNode = this._skillTreeManager.getNode(Number.parseInt(o, 10))
      if (!otherNode.allocated) {
        this._skillTreeManager.updateNode(otherNode.skill, {
          canAllocate: false,
          state: State.DEFAULT
        })
      }
      const connector = this._connectors.find(
        c => c.startNode === node.skill && c.endNode.toString() === o
      )
      if (!connector) continue
      connector.state =
        otherNode.allocated && connector.state === State.ACTIVE
          ? State.INTERMEDIATE
          : State.DEFAULT
      this.redrawConnector(connector)
    }
    for (const index of node.in) {
      const otherNode = this._skillTreeManager.getNode(
        Number.parseInt(index, 10)
      )
      if (!otherNode.allocated) {
        this._skillTreeManager.updateNode(otherNode.skill, {
          canAllocate: false,
          state: State.DEFAULT
        })
      }
      const connector = this._connectors.find(
        c => c.endNode === node.skill && c.startNode.toString() === index
      )
      if (!connector) continue
      connector.state =
        otherNode.allocated && connector.state === State.ACTIVE
          ? State.INTERMEDIATE
          : State.DEFAULT
      this.redrawConnector(connector)
    }

    if (
      this._skillTreeManager.anyNode(
        x => x.group === node.group && x.isNotable && x.allocated
      )
    ) {
      const masteryNode = this._skillTreeManager.findNode(
        x => x.isMastery && x.group === node.group
      )
      if (!masteryNode) return
      this._skillTreeManager.updateNode(masteryNode.skill, {
        state: State.DEFAULT
      })
    }
  }

  private findConnectorFromNodes(
    from: TreeNode,
    to: TreeNode
  ): Connector | undefined {
    return this._connectors.find(
      x =>
        (x.startNode === from.skill && x.endNode === to.skill) ||
        (x.startNode === to.skill && x.endNode === from.skill)
    )
  }

  private buildTooltips(group: Group): void {
    // Just in case someday we'll edit them
    const tooltipsContainer = new Container()
    const updatedTooltips = { ...this._tooltips }
    for (const node of this._skillTreeManager.toArray()) {
      const spriteScale = 0.66
      const nodeName = new Text(`${node.name}`, {
        fontSize: 20,
        fill: 0xf1dec3,
        fontFamily: 'Fontin Regular'
      })
      const stats = new Text(`${node.stats.join('\n')}`, {
        fontSize: 16,
        lineHeight: 24,
        fill: 0x9292f7,
        fontFamily: 'Fontin Regular'
      })
      stats.position.set(15, 15 + TOOLTIP_HEADER_HEIGHT * spriteScale)
      const tooltipWidth =
        Math.max(nodeName.width + 78 * spriteScale * 2, stats.width) + 30
      const tooltipHeight = stats.height + 20

      nodeName.position.set(
        tooltipWidth / 2,
        (TOOLTIP_HEADER_HEIGHT * spriteScale) / 2
      )
      nodeName.anchor.set(0.5, 0.5)
      const headerBg = new Container()
      headerBg.scale.set(spriteScale, spriteScale)
      const headerStartBg = new Sprite(
        this._textureManager.getTexture(
          `tooltip-header-start${node.isNotable ? '-notable' : ''}`
        )
      )
      const headerEndBg = new Sprite(
        this._textureManager.getTexture(
          `tooltip-header-end${node.isNotable ? '-notable' : ''}`
        )
      )

      const headerPatternBg = new TilingSprite(
        this._textureManager.getTexture(
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
      tooltipContainer.interactive = false
      tooltipContainer.interactiveChildren = false
      tooltipContainer.parentGroup = group
      tooltipsContainer.addChild(tooltipContainer)
      updatedTooltips[node.skill] = tooltipContainer
    }
    this._app.stage.addChild(tooltipsContainer)
    this._tooltips = updatedTooltips
  }

  private getMasteries = (node: string) =>
    this._viewport.children
      .filter(x => x && x.name && x.name.startsWith(`Mastery/${node}/`))
      .map(x => x as Container)

  private addConnectorsToViewport(layer: Group): void {
    for (const c of this._connectors) {
      if (c.hidden) continue
      const startNode = this._skillTreeManager.getNode(c.startNode)
      const endNode = this._skillTreeManager.getNode(c.endNode)
      if (
        startNode.group === endNode.group &&
        startNode.orbit === endNode.orbit &&
        startNode.group &&
        startNode.orbit
      ) {
        const group = Object.values(this._groups).find(x =>
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
            color: this.getConnectorStrokeColor(c),
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
          this._viewport.addChild(arc)
          c.sprite = arc
        } else {
          const arc = new Graphics()
          arc.lineStyle({
            color: this.getConnectorStrokeColor(c),
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
          arc.parentGroup = layer
          this._viewport.addChild(arc)
          c.sprite = arc
        }
        continue
      }

      const graphics = new Graphics()
      graphics.lineStyle({
        color: this.getConnectorStrokeColor(c),
        width: 10
      })
      graphics.moveTo(startNode.extra.posX, startNode.extra.posY)
      graphics.lineTo(endNode.extra.posX, endNode.extra.posY)
      graphics.interactive = false
      graphics.interactiveChildren = false
      graphics.parentGroup = layer
      this._viewport.addChild(graphics)
      c.sprite = graphics
    }
    this.setDirty()
  }

  private addGroupsToViewport(group: Group): void {
    for (const [id, g] of Object.entries(this._groups)) {
      if (g.orbits.length === 0 || g.isProxy) continue
      let maxOrbit = Math.max(...g.orbits.filter(o => o <= 3))
      if (g.backgroundOverride) {
        maxOrbit = g.backgroundOverride
      }
      if (maxOrbit === 0 || (maxOrbit > 3 && !['17', '161'].includes(id)))
        continue
      let texture
      if (id === '17')
        texture = this._textureManager.getTexture('group-bg-exarch')
      else if (id === '161')
        texture = this._textureManager.getTexture('group-bg-eater')
      else texture = this._textureManager.getTexture(`group-bg-${maxOrbit}`)
      const sprite = new Sprite(texture)
      sprite.name = `OrbitGroup{${id}}`
      sprite.interactive = false
      sprite.interactiveChildren = false
      sprite.position.set(g.x, g.y)
      sprite.anchor.set(0.5, 0.5)
      sprite.scale.set(2.5, 2.5)
      sprite.parentGroup = group

      if (id === '17') sprite.position.set(g.x + 1, g.y - 17)
      if (id === '161') sprite.position.set(g.x - 7, g.y - 67)

      this._viewport.addChild(sprite)
    }
    this.setDirty()
  }

  public getConnectorStrokeColor(connector: Connector): number {
    if (
      this._skillTreeManager.getAllocatedSkills().length - 1 >
      this._passiveTree.points.totalPoints
    ) {
      if (connector.state === State.ACTIVE) return 0xe0_6c_6e
      if (connector.state === State.INTERMEDIATE) return 0x7d_37_38
    }
    if (connector.state === State.ACTIVE) return 0x76_a6_fb
    if (connector.state === State.INTERMEDIATE) return 0x7a_6e_62
    return 0x3d_3a_2e
  }

  public getNodeFrameTexture(node: TreeNode): Texture {
    if (node.isKeystone) {
      return this._textureManager.getTexture(
        `skill-keystone-${stateToString(node.state)}`
      )
    }
    if (node.isNotable)
      return this._textureManager.getTexture(
        `skill-notable-${stateToString(node.state)}`
      )
    return this._textureManager.getTexture(
      `skill-frame-${stateToString(node.state, node.canAllocate)}`
    )
  }

  private buildAllNodesPaths = () => {
    for (const n of this._skillTreeManager.toArray()) {
      const resetNode: Partial<TreeNode> = {
        pathDistance: 1000,
        path: [],
        isDependencyOf: []
      }
      if (this._skillTreeManager.getAllocatedSkills().includes(n.skill)) {
        resetNode.pathDistance = 0
        resetNode.isDependencyOf = [n.skill]
      }
      this._skillTreeManager.updateNode(n.skill, resetNode)
    }
    this.buildDependencies()
    for (const skill of this._skillTreeManager.getAllocatedSkills()) {
      this.BFS(skill)
    }
  }

  private BFS = (node: number): void => {
    const startNode = this._skillTreeManager.getNode(node)
    const queue = []
    startNode.pathDistance = 0
    startNode.path = []
    queue.push(startNode)
    while (queue.length > 0) {
      const n = queue.shift()
      if (!n) continue
      const currentDistance = n.pathDistance + 1
      const linked: TreeNode[] = [...n.out, ...n.in].map(o =>
        this._skillTreeManager.getNode(Number.parseInt(o, 10))
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

  private buildDependencies = (): void => {
    const visited = new Set<number>()
    const toVisit = Object.fromEntries(
      Object.entries(this._skillTreeManager.getNodes())
        .filter(([, value]) => value.allocated === 1)
        .sort(
          ([, aValue], [, bValue]) =>
            aValue.distanceToStart - bValue.distanceToStart
        )
    )
    for (const node of Object.values(toVisit)) {
      node.visited = true
      const linked = [...node.out, ...node.in].map(o =>
        this._skillTreeManager.getNode(Number.parseInt(o, 10))
      )
      for (const other of linked) {
        if (other.visited) continue
        if (!other.allocated) continue
        if (node.isDependencyOf.includes(other.skill)) continue
        if (findStartFromNode(other.skill, toVisit, visited)) {
          // We found the starting point, so they're not dependent on this node
          for (const x of visited) {
            this._skillTreeManager.updateNode(x, { visited: false })
          }
          visited.clear()
        } else {
          // No path found, they must depend on this node
          for (const x of visited) {
            node.isDependencyOf.push(x)
            this._skillTreeManager.updateNode(x, { visited: false })
          }
          visited.clear()
        }
      }
      node.visited = false
    }
  }

  public resetTree(): void {
    for (const x of this._skillTreeManager.getAllocatedSkills()) {
      this.unallocateNode(this._skillTreeManager.getNode(x))
      this._skillTreeManager.updateNode(x, { path: [], pathDistance: 1000 })
    }
    const startingNode = this._skillTreeManager.findNode(
      x => x.isStartPoint
    ) as TreeNode
    this._skillTreeManager.updateNode(startingNode.skill, { allocated: 1 })
    this.allocateNode(startingNode)
    this.buildAllNodesPaths()
    for (const x of this._skillTreeManager.toArray()) {
      this._skillTreeManager.updateNode(x.skill, {
        distanceToStart: x.pathDistance
      })
    }
    this.setDirty()
  }
}
