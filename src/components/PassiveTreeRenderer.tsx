import React, { useEffect, useRef } from 'react';
import TreeNode, { NodeContainer } from '@/models/nodes';
/* eslint-disable import/no-unresolved */
// @ts-ignore
/* eslint-enable import/no-unresolved */
import { State } from '@/models/misc';
import { SmoothGraphics as Graphics } from '@pixi/graphics-smooth';
import jsonTree from '@/data/tree.json';
import { Application, Container, Sprite, Text } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { useTextureManager } from '@/data/textureManager';
import Connector from '@/models/connector';
import { NOTABLE_FRAME_INNER_RADIUS, orbitRadii, SKILL_FRAME_INNER_RADIUS } from '@/constants';
import TreeGroup from '@/models/groups';
import SkillAtlas from '@/models/sprite';
import { FaSearch } from 'react-icons/fa';
import { emitCustomEvent, useCustomEventListener } from 'react-custom-events';
import { useForceUpdate } from '@/utils';

interface Props {
  connectors: Connector[];
  nodes: NodeContainer;
  groups: TreeGroup[];
  show: boolean;
}

const PassiveTreeRenderer: React.FC<Props> = ({ show, connectors: baseConnectors, nodes: baseNodes, groups }) => {
  const domElement = useRef<HTMLDivElement>(null);
  const [appInstance, setAppInstance] = React.useState<Application>();
  const viewport = React.useRef<Viewport>(
    new Viewport({
      worldWidth: 8000,
      worldHeight: 8000
    })
  );

  const forceUpdate = useForceUpdate();

  useCustomEventListener('import-tree', (tree: number[]) => {
    resetTree();
    tree.forEach((x) => {
      allocateNode(nodes.current[x]);
    });
    allocatedNodes.current = allocatedNodes.current.concat(tree);
    emitCustomEvent('allocated-changed', allocatedNodes.current);
    buildAllNodesPaths();
    forceUpdate();
  });

  useCustomEventListener('reset-tree', resetTree);

  const [searchQuery, setSearchQuery] = React.useState<string>();

  const textureManager = useTextureManager();

  const nodes = useRef<NodeContainer>(baseNodes);
  const connectors = React.useRef<Connector[]>(baseConnectors);
  const tooltips = React.useRef<{ [key: number]: Container }>({});

  const allocatedNodes = useRef<number[]>([]);

  const [isReady, setReady] = React.useState<boolean>(false);

  function resetTree() {
    allocatedNodes.current.forEach((x) => {
      unallocateNode(nodes.current[x]);
      nodes.current[x].path = [];
      nodes.current[x].pathDistance = 1000;
    });
    const startingNode = Object.values(nodes.current).find((x) => x.isStartPoint) as TreeNode;
    allocatedNodes.current = [startingNode.skill];
    allocateNode(startingNode);
    buildAllNodesPaths();
    Object.values(nodes.current).forEach((value) => {
      nodes.current[value.skill].distanceToStart = nodes.current[value.skill].pathDistance;
    });
    forceUpdate();
  }

  // == Assets Fetching
  function getNodeFrameTexture(node: TreeNode) {
    const stateToString = (state?: State, canAllocate?: boolean) => {
      if (state === undefined) return 'unallocated';
      if (state === State.INTERMEDIATE) return 'highlighted';
      if (state === State.ACTIVE) return 'active';
      if (canAllocate) return 'highlighted';
      return 'unallocated';
    };
    if (node.isNotable) return textureManager.getTexture(`skill-notable-${stateToString(node.state)}`);
    return textureManager.getTexture(`skill-frame-${stateToString(node.state, node.canAllocate)}`);
  }

  function getConnectorStrokeColor(connector: Connector) {
    if (allocatedNodes.current.length - 1 > jsonTree.points.totalPoints) {
      if (connector.state === State.ACTIVE) return 0xe06c6e;
      if (connector.state === State.INTERMEDIATE) return 0x7d3738;
    }
    if (connector.state === State.ACTIVE) return 0xeae3d5;
    if (connector.state === State.INTERMEDIATE) return 0x7a6e62;
    return 0x3d3a2e;
  }

  function buildAllNodesPaths() {
    Object.values(nodes.current).forEach((n) => {
      n.pathDistance = 1000;
      n.path = [];
      n.isDependencyOf = [];
      if (allocatedNodes.current.includes(n.skill)) {
        n.pathDistance = 0;
        n.isDependencyOf = [n.skill];
      }
      nodes.current[n.skill] = n;
    });
    buildDependencies();
    for (const skill of allocatedNodes.current) {
      BFS(skill);
    }
  }

  function findStartFromNode(from: number, searchIn: NodeContainer, visited: Set<number>): boolean {
    visited.add(from);
    const node = searchIn[from];
    if (!node) return false;
    node.visited = true;
    const linked = [...node.out, ...node.in].map((o) => searchIn[parseInt(o, 10)]);
    return linked.some((other) => {
      if (!other) return false;
      if (visited.has(other.skill)) return false;
      if (other.visited) return false;
      if (other.isStartPoint) return true;
      return findStartFromNode(other.skill, searchIn, visited);
    });
  }

  function BFS(node: number) {
    const startNode = nodes.current[node];
    if (!startNode) return;
    const queue = [];
    startNode.pathDistance = 0;
    startNode.path = [];
    queue.push(startNode);
    while (queue.length > 0) {
      const n = queue.shift();
      if (!n) continue;
      const currentDistance = n.pathDistance + 1;
      const linked = [...n.out, ...n.in].map((o) => nodes.current[parseInt(o, 10)]);
      linked.forEach((other) => {
        if (!other) return;
        if (other.pathDistance > currentDistance && !other.isMastery) {
          other.pathDistance = currentDistance;
          other.path = [other.skill, ...n.path];
          queue.push(other);
        }
      });
    }
  }

  /**
   * Curtosy of Path of Building again, they're insane
   * @param nodes Nodes to explore
   * @returns For each node, which nodes depends on it
   */
  function buildDependencies() {
    const visited = new Set<number>();
    Object.values(nodes.current).forEach((node) => {
      node.visited = true;
      const linked = [...node.out, ...node.in].map((o) => nodes.current[parseInt(o, 10)]);
      linked.forEach((other) => {
        if (!other) return;
        if (other.visited) return;
        if (!other.allocated) return;
        if (node.isDependencyOf.includes(other.skill)) return;
        if (findStartFromNode(other.skill, nodes.current, visited)) {
          // We found the starting point, so they're not dependent on this node
          visited.forEach((x) => {
            const n = nodes.current[x];
            if (!n) return;
            n.visited = false;
          });
          visited.clear();
        } else {
          // No path found, they must depend on this node
          visited.forEach((x) => {
            node.isDependencyOf.push(x);
            const n = nodes.current[x];
            if (!n) return;
            n.visited = false;
          });
          visited.clear();
        }
      });
      node.visited = false;
    });
  }

  function allocateNode(node: TreeNode) {
    node.allocated = 1;
    node.state = State.ACTIVE;
    if (node.isNotable) {
      const masteryNode = Object.values(nodes.current).find((x) => x.isMastery && x.group === node.group);
      if (!masteryNode) return;
      masteryNode.state = State.ACTIVE;
    }
    node.out.forEach((o) => {
      const otherNode = nodes.current[parseInt(o, 10)];
      if (!otherNode) return;
      if (!otherNode.allocated) {
        otherNode.canAllocate = true;
        otherNode.state = State.INTERMEDIATE;
      }
      const connector = connectors.current.find((c) => c.startNode === node.skill && c.endNode.toString() === o);
      if (!connector) return;
      if (otherNode.allocated && connector.state !== State.ACTIVE) {
        connector.state = State.ACTIVE;
      } else if (!otherNode.allocated && connector.state === State.DEFAULT) {
        connector.state = State.INTERMEDIATE;
      }
      if (!connector.sprite) return;
      redrawConnector(connector);
    });

    node.in.forEach((i) => {
      const otherNode = nodes.current[parseInt(i, 10)];
      if (!otherNode) return;
      if (!otherNode.allocated) {
        otherNode.canAllocate = true;
        otherNode.state = State.INTERMEDIATE;
      }
      const connector = connectors.current.find((c) => c.startNode.toString() === i && c.endNode === node.skill);
      if (!connector) return;
      if (otherNode.allocated && connector.state !== State.ACTIVE) {
        connector.state = State.ACTIVE;
      } else if (!otherNode.allocated && connector.state === State.DEFAULT) {
        connector.state = State.INTERMEDIATE;
      }
      if (!connector.sprite) return;
      redrawConnector(connector);
    });
  }

  function unallocateNode(node: TreeNode) {
    node.allocated = 0;
    node.state = State.DEFAULT;
    node.isDependencyOf = [];
    node.out.forEach((o) => {
      const otherNode = nodes.current[parseInt(o, 10)];
      if (!otherNode) return;
      if (!otherNode.allocated) {
        otherNode.canAllocate = false;
        otherNode.state = State.DEFAULT;
      }
      const connector = connectors.current.find((c) => c.startNode === node.skill && c.endNode.toString() === o);
      if (!connector) return;
      if (otherNode.allocated && connector.state === State.ACTIVE) {
        connector.state = State.INTERMEDIATE;
      } else {
        connector.state = State.DEFAULT;
      }
      redrawConnector(connector);
    });
    node.in.forEach((i) => {
      const otherNode = nodes.current[parseInt(i, 10)];
      if (!otherNode) return;
      if (!otherNode.allocated) {
        otherNode.canAllocate = false;
        otherNode.state = State.DEFAULT;
      }
      const connector = connectors.current.find((c) => c.endNode === node.skill && c.startNode.toString() === i);
      if (!connector) return;
      if (otherNode.allocated && connector.state === State.ACTIVE) {
        connector.state = State.INTERMEDIATE;
      } else {
        connector.state = State.DEFAULT;
      }
      redrawConnector(connector);
    });

    if (!Object.values(nodes.current).some((x) => x.group === node.group && x.isNotable && x.allocated)) {
      const masteryNode = Object.values(nodes.current).find((x) => x.isMastery && x.group === node.group);
      if (!masteryNode) return;
      masteryNode.state = State.DEFAULT;
    }
  }

  // // == Canvas rendering

  function redrawConnector(c: Connector) {
    if (!viewport.current) return;
    if (c.hidden) return;
    if (!c.sprite) return;
    c.sprite.clear();
    const startNode = nodes.current[c.startNode];
    const endNode = nodes.current[c.endNode];
    if (!startNode || !endNode) return;
    if (startNode.group === endNode.group && startNode.orbit === endNode.orbit && startNode.group && startNode.orbit) {
      const group = groups.find((x) => x.nodes.includes(startNode.skill.toString()));
      if (!group) return;
      if (
        (startNode.extra.angle - endNode.extra.angle > 0 && startNode.extra.angle - endNode.extra.angle < Math.PI) ||
        startNode.extra.angle - endNode.extra.angle < -Math.PI
      ) {
        c.sprite.lineStyle({
          color: getConnectorStrokeColor(c),
          width: 10
        });
        c.sprite.arc(
          group.x,
          group.y,
          orbitRadii[startNode.orbit],
          endNode.extra.angle - Math.PI / 2,
          startNode.extra.angle - Math.PI / 2
        );
        c.sprite.interactive = true;
      } else {
        c.sprite.lineStyle({
          color: getConnectorStrokeColor(c),
          width: 10
        });
        c.sprite.arc(
          group.x,
          group.y,
          orbitRadii[startNode.orbit],
          startNode.extra.angle - Math.PI / 2,
          endNode.extra.angle - Math.PI / 2
        );
        c.sprite.interactive = true;
      }
      return;
    }

    c.sprite.lineStyle({
      color: getConnectorStrokeColor(c),
      width: 10
    });
    c.sprite.moveTo(startNode.extra.posX, startNode.extra.posY);
    c.sprite.lineTo(endNode.extra.posX, endNode.extra.posY);
    c.sprite.interactive = true;
  }

  function findConnectorFromNodes(from: TreeNode, to: TreeNode) {
    return connectors.current.find(
      (x) =>
        (x.startNode === from.skill && x.endNode === to.skill) || (x.startNode === to.skill && x.endNode === from.skill)
    );
  }

  function buildTooltips() {
    if (!appInstance || !appInstance.stage) return;
    // Just in case someday we'll edit them
    const newTooltips = { ...tooltips.current };
    Object.values(nodes.current).forEach((node) => {
      if (!appInstance) return;
      const nodeName = new Text(`${node.name} (${node.skill})`, { fontSize: 32, fontWeight: 'bold', fill: 0xdccbb2 });
      nodeName.position.set(15, 15);
      const stats = new Text(node.stats.join('\n'), { fontSize: 20, fill: 0x7373d7 });
      stats.position.set(15, 15 + nodeName.height + 15);
      const tooltipWidth = Math.max(nodeName.width, stats.width) + 30;
      const tooltipHeight = nodeName.height + 15 + stats.height + 30;

      const tooltipBg = new Graphics();
      tooltipBg.beginFill(0x000000, 0.85);
      tooltipBg.drawRect(0, 0, tooltipWidth, tooltipHeight);
      tooltipBg.endFill();
      const tooltipContainer = new Container();
      tooltipContainer.addChild(tooltipBg, nodeName, stats);
      tooltipContainer.position.set(node.extra?.posX, node.extra?.posY);
      tooltipContainer.visible = false;
      tooltipContainer.interactive = true;
      appInstance.stage.addChild(tooltipContainer);
      newTooltips[node.skill] = tooltipContainer;
    });
    tooltips.current = newTooltips;
  }

  function addNodesToViewport() {
    if (!appInstance) return;
    Object.values(nodes.current).forEach((node) => {
      if (!viewport.current) return;
      if (node.hidden) return;
      if (node.isMastery) {
        const container = new Container();
        container.scale.set(2.5, 2.5);
        container.x = node.extra?.posX;
        container.y = node.extra?.posY;
        const spriteAtlas = new Sprite(textureManager.getTexture('masteries'));
        const coords = jsonTree.skillSprites.mastery
          .filter((x) => typeof x.coords === 'object')
          .slice(-1)
          .find((x) => x.coords)?.coords as SkillAtlas['coords'];
        if (!coords) {
          return;
        }
        if (!(node.icon in coords)) {
          return;
        }
        const mask = new Graphics();
        const frameSize = {
          w: coords[node.icon].w,
          h: coords[node.icon].h
        };
        mask.beginFill(0x000000);
        mask.drawCircle(coords[node.icon].x + frameSize.w / 2, coords[node.icon].y + frameSize.h / 2, frameSize.w / 2);
        mask.endFill();
        spriteAtlas.position.set(-coords[node.icon].x - frameSize.w / 2, -coords[node.icon].y - frameSize.h / 2);
        spriteAtlas.mask = mask;
        spriteAtlas.addChild(mask);
        container.addChild(spriteAtlas);
        node.spriteContainer = container;
        viewport.current.addChild(container);
        return;
      }
      const container = new Container();
      container.scale.set(2.5, 2.5);
      container.x = node.extra?.posX;
      container.y = node.extra?.posY;
      const spriteAtlas = new Sprite(textureManager.getTexture('skills'));
      let coords: SkillAtlas['coords'];
      if (node.isNotable)
        coords = jsonTree.skillSprites.notableInactive
          .filter((x) => typeof x.coords === 'object')
          .slice(-1)
          .find((x) => x.coords)?.coords as SkillAtlas['coords'];
      else
        coords = jsonTree.skillSprites.normalInactive
          .filter((x) => typeof x.coords === 'object')
          .slice(-1)
          .find((x) => x.coords)?.coords as SkillAtlas['coords'];
      if (!coords) {
        return;
      }
      if (!(node.icon in coords)) {
        return;
      }
      const mask = new Graphics();
      const frameSize = {
        w: node.isNotable ? NOTABLE_FRAME_INNER_RADIUS : SKILL_FRAME_INNER_RADIUS,
        h: node.isNotable ? NOTABLE_FRAME_INNER_RADIUS : SKILL_FRAME_INNER_RADIUS
      };
      mask.beginFill(0x000000);
      mask.drawCircle(coords[node.icon].x + frameSize.w / 2, coords[node.icon].y + frameSize.h / 2, frameSize.w / 2);
      mask.endFill();
      spriteAtlas.position.set(-coords[node.icon].x - frameSize.w / 2, -coords[node.icon].y - frameSize.h / 2);
      spriteAtlas.mask = mask;
      spriteAtlas.addChild(mask);
      container.addChild(spriteAtlas);
      // === Frame Rendering === //
      const sprite = new Sprite(getNodeFrameTexture(node));
      sprite.anchor.set(0.5, 0.5);
      sprite.interactive = true;
      sprite.name = `Node{${node.skill}}`;

      sprite.on('mouseover', () => {
        const n = nodes.current[node.skill];
        if (!n) return;
        // Todo handle hovers better
        if (n.skill in tooltips.current) {
          tooltips.current[n.skill].visible = true;
        }
        if (n.allocated) return;
        n.state = State.INTERMEDIATE;
        sprite.texture = getNodeFrameTexture(n);
        for (let i = 1; i < n.path.length; i += 1) {
          const from = nodes.current[n.path[i - 1]];
          const to = nodes.current[n.path[i]];

          if (!from || !to) continue;
          from.state = from.state === State.DEFAULT ? State.INTERMEDIATE : from.state;
          if (from.spriteContainer) (from.spriteContainer.children[1] as Sprite).texture = getNodeFrameTexture(from);
          to.state = to.state === State.DEFAULT ? State.INTERMEDIATE : to.state;
          if (to.spriteContainer) (to.spriteContainer.children[1] as Sprite).texture = getNodeFrameTexture(to);

          const c = findConnectorFromNodes(from, to);
          if (!c) continue;
          if (c.state === State.ACTIVE) continue;
          c.state = State.INTERMEDIATE;
          redrawConnector(c);
        }
      });

      sprite.on('mouseout', () => {
        const n = nodes.current[node.skill];
        if (!n) return;
        if (n.skill in tooltips.current) {
          tooltips.current[n.skill].visible = false;
        }
        if (n.allocated) return;
        n.state = State.DEFAULT;
        sprite.texture = getNodeFrameTexture(n);
        for (let i = 1; i < n.path.length; i += 1) {
          const from = nodes.current[n.path[i - 1]];
          const to = nodes.current[n.path[i]];
          if (!from || !to) continue;
          from.state = from.state === State.INTERMEDIATE ? State.DEFAULT : from.state;
          if (from.spriteContainer) (from.spriteContainer.children[1] as Sprite).texture = getNodeFrameTexture(from);
          to.state = to.allocated ? State.ACTIVE : from.state === State.ACTIVE ? State.INTERMEDIATE : State.DEFAULT;
          if (to.spriteContainer) (to.spriteContainer.children[1] as Sprite).texture = getNodeFrameTexture(to);
          const c = findConnectorFromNodes(from, to);
          if (!c) continue;
          if (c.state === State.ACTIVE) continue;
          if (from.allocated) c.state = State.INTERMEDIATE;
          else c.state = State.DEFAULT;
          redrawConnector(c);
        }
      });

      sprite.on('click', async () => {
        if (!viewport.current) return;
        if (viewport.current.moving) return;
        const n = nodes.current[node.skill];
        if (!n) return;
        n.allocated = node.allocated ?? 0 ? 0 : 1;
        if (n.allocated) {
          const newAllocated = [...(allocatedNodes.current ?? [])];
          n.path.forEach((childNode) => {
            const other = nodes.current[childNode];
            if (!other) return;
            if (!newAllocated.includes(other.skill)) newAllocated.push(other.skill);
            other.allocated = 1;
            allocateNode(other);
          });
          allocateNode(n);
          newAllocated.push(n.skill);
          allocatedNodes.current = [...new Set(newAllocated)];
          sprite.texture = getNodeFrameTexture(n);
        } else {
          const toUnallocate = Object.values(nodes.current)
            .filter((x) => n.isDependencyOf.includes(x.skill))
            .sort((a, b) => b.distanceToStart - a.distanceToStart);
          toUnallocate.forEach((x) => unallocateNode(x));
          allocatedNodes.current = allocatedNodes.current.filter(
            (x) => toUnallocate.findIndex((x2) => x === x2.skill) === -1
          );
        }
        emitCustomEvent('allocated-changed', allocatedNodes.current);
        buildAllNodesPaths();
      });

      container.addChild(sprite);
      node.spriteContainer = container;

      viewport.current.addChild(container);
    });
  }

  function addConnectorsToViewport() {
    if (!appInstance) return;
    connectors.current.forEach((c, i, a) => {
      if (!viewport.current) return;
      if (c.hidden) return;
      const startNode = nodes.current[c.startNode];
      const endNode = nodes.current[c.endNode];
      if (!startNode || !endNode) return;
      if (
        startNode.group === endNode.group &&
        startNode.orbit === endNode.orbit &&
        startNode.group &&
        startNode.orbit
      ) {
        const group = groups.find((x) => x.nodes.includes(startNode.skill.toString()));
        if (!group) return;
        if (
          (startNode.extra.angle - endNode.extra.angle > 0 && startNode.extra.angle - endNode.extra.angle < Math.PI) ||
          startNode.extra.angle - endNode.extra.angle < -Math.PI
        ) {
          const arc = new Graphics();
          arc.lineStyle({
            color: getConnectorStrokeColor(c),
            width: 10
          });
          arc.arc(
            group.x,
            group.y,
            orbitRadii[startNode.orbit],
            endNode.extra.angle - Math.PI / 2,
            startNode.extra.angle - Math.PI / 2
          );
          arc.interactive = true;
          viewport.current.addChild(arc);
          c.sprite = arc;
        } else {
          const arc = new Graphics();
          arc.lineStyle({
            color: getConnectorStrokeColor(c),
            width: 10
          });
          arc.arc(
            group.x,
            group.y,
            orbitRadii[startNode.orbit],
            startNode.extra.angle - Math.PI / 2,
            endNode.extra.angle - Math.PI / 2
          );
          arc.interactive = true;
          viewport.current.addChild(arc);
          c.sprite = arc;
        }
        a[i] = c;
        return;
      }

      const graphics = new Graphics();
      graphics.lineStyle({
        color: getConnectorStrokeColor(c),
        width: 10
      });
      graphics.moveTo(startNode.extra.posX, startNode.extra.posY);
      graphics.lineTo(endNode.extra.posX, endNode.extra.posY);
      graphics.interactive = true;
      viewport.current.addChild(graphics);
      c.sprite = graphics;
      a[i] = c;
    });
  }

  function addGroupsToViewport() {
    Object.entries(groups).forEach(([id, g]) => {
      if (!viewport.current) return;
      if (!g.orbits || g.orbits.length === 0 || g.isProxy) return;

      const maxOrbit = Math.max(...g.orbits);
      if (maxOrbit === 0 || maxOrbit >= 4) return;
      const sprite = new Sprite(textureManager.getTexture(`group-bg-${maxOrbit}`));
      sprite.name = `OrbitGroup{${id}}`;
      sprite.position.set(g.x, g.y);
      sprite.anchor.set(0.5, 0.5);
      sprite.scale.set(2, 2);

      viewport.current.addChild(sprite);
    });
  }

  // == Canvas setup

  function tickNodes() {
    Object.values(nodes.current).forEach((node) => {
      if (!node.spriteContainer) return;
      if (node.isMastery) {
        const [skill] = node.spriteContainer.children;
        const skillSprite = skill as Sprite;
        if (node.state === State.ACTIVE) {
          skillSprite.texture = textureManager.getTexture('masteries-active');
        } else {
          skillSprite.texture = textureManager.getTexture('masteries');
        }
        return;
      }
      const [skill, frame] = node.spriteContainer.children;
      const skillSprite = skill as Sprite;
      const frameSprite = frame as Sprite;
      frameSprite.texture = getNodeFrameTexture(node);
      if (node.state === State.ACTIVE) {
        skillSprite.texture = textureManager.getTexture('skills-active');
      } else {
        skillSprite.texture = textureManager.getTexture('skills');
      }
    });
  }

  function setupCanvas() {
    if (!domElement.current) return;

    const app = new Application({
      width: domElement.current.clientWidth,
      height: domElement.current.clientHeight,
      backgroundColor: 0x080d12,
      resizeTo: window
    });

    domElement.current.appendChild(app.view);

    viewport.current = new Viewport({
      worldWidth: 8000, // arbritrary
      worldHeight: 8000,
      divWheel: domElement.current
    });

    textureManager.initialize();
    viewport.current.clampZoom({ minScale: 0.1, maxScale: 0.5 });
    viewport.current.setZoom(0.25, true);
    viewport.current.wheel({ smooth: 5 }).drag();
    viewport.current.on('mousemove', (event) => {
      const obj = app.renderer.plugins.interaction.hitTest(event.data.global);
      if (obj instanceof Sprite) {
        if (!obj.name) return;
        const match = obj.name.match(/Node\{([0-9]+)\}/);
        if (match) {
          const skill = parseInt(match[1], 10);
          const localPos = { x: event.data.global.x, y: event.data.global.y };
          if (localPos.x + tooltips.current[skill].width + 20 > app.screen.width) {
            localPos.x = app.screen.width - tooltips.current[skill].width - 20;
          }
          if (localPos.y + tooltips.current[skill].height + 20 > app.screen.height) {
            localPos.y = app.screen.height - tooltips.current[skill].height - obj.height / 2.5 - 20;
          }
          tooltips.current[skill].position.set(localPos.x + 20, localPos.y + 20);
        }
      }
    });
    app.stage.addChild(viewport.current);
    const bgTexture = textureManager.getTexture('bg-image');
    const backgroundSprite = new Sprite(bgTexture);
    backgroundSprite.alpha = 0.5;

    // This atlas background calculation is messy and arbitrary
    const atlasSize = {
      min_x: -4856,
      min_y: -10023,
      max_x: 4854,
      max_y: 0
    };

    const xSize = atlasSize.max_x - atlasSize.min_x + 1870;
    const ySize = atlasSize.max_y - atlasSize.min_y + 1100;
    backgroundSprite.width = xSize;
    backgroundSprite.height = ySize;
    backgroundSprite.position.set(atlasSize.min_x - 1000, atlasSize.min_y - 200);
    viewport.current.addChild(backgroundSprite);
    viewport.current.moveCenter((atlasSize.min_x + atlasSize.max_x) / 2, (atlasSize.min_y + atlasSize.max_y) / 6);

    app.ticker.add(tickNodes);

    setAppInstance(app);

    // Cleanup function
    return () => {
      app.destroy(true, true);
    };
  }

  useEffect(() => {
    if (!domElement.current || !isReady) return;
    return setupCanvas();
  }, [domElement.current, isReady]);

  useEffect(() => {
    if (!appInstance || !viewport) return;
    addGroupsToViewport();
    addConnectorsToViewport();
    addNodesToViewport();
    const sprite = new Sprite(textureManager.getTexture('atlas-start'));
    sprite.anchor.set(0.5, 0.5);
    sprite.scale.set(2, 2);
    viewport.current.addChild(sprite);
    buildTooltips();
  }, [appInstance, viewport]);

  useEffect(() => {
    if (!nodes.current) return;
    const startingNode = Object.values(nodes.current).find((x) => x.isStartPoint) as TreeNode;
    allocatedNodes.current = [startingNode.skill];
    buildAllNodesPaths();
    Object.values(nodes.current).forEach((x) => {
      x.distanceToStart = x.pathDistance;
    });
    setReady(true);
  }, []);

  useEffect(() => {
    const resize = () => {
      viewport.current.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resize);

    return () => window.removeEventListener('resize', resize);
  });

  useEffect(() => {
    if (searchQuery === undefined || !isReady || !appInstance || !viewport) return;
    viewport.current.children
      .filter(
        (x) => x instanceof Container && (x as Container).children.some((x2) => x2.name && x2.name.startsWith('Node'))
      )
      .forEach((c) => {
        ((c as Container).children[1] as Sprite).tint = 0xffffff;
      });
    const cleanQuery = searchQuery.split(' ').filter((q: string) => q.length >= 3);
    if (cleanQuery.length === 0) return;
    const matchedNodes = Object.values(nodes.current).filter((x) =>
      cleanQuery.some(
        (q) =>
          x.name.toLowerCase().includes(q.toLowerCase()) ||
          q === x.skill.toString() ||
          x.stats.some((s) => s.toLowerCase().includes(q.toLowerCase()))
      )
    );

    viewport.current.children
      .filter(
        (x) =>
          x instanceof Container &&
          (x as Container).children.some((x2) => x2.name && matchedNodes.some((n) => x2.name.includes(`{${n.skill}}`)))
      )
      .forEach((c) => {
        ((c as Container).children[1] as Sprite).tint = 0xff0000;
      });
  }, [searchQuery]);

  const handleSearch = (event: React.FormEvent<HTMLInputElement>) => {
    setSearchQuery(event.currentTarget.value);
  };

  return (
    <div className={`relative -z-0 h-full flex-auto flex flex-col ${show ? 'block' : 'hidden'}`}>
      <div className="w-full h-full atlas" ref={domElement} />
      <div className="absolute min-w-fit w-1/4 px-4 py-2 bg-zinc-900 bottom-0 right-0 rounded-tl-2xl flex flex-col justify-center shadow-md">
        <h3 className="uppercase w-full mb-2 text-center text-orange-400 text-opacity-70 text-sm font-bold flex items-center justify-center">
          Points:{' '}
          <span
            className={
              allocatedNodes.current.length - 1 < jsonTree.points.totalPoints
                ? 'text-sky-400 mx-1'
                : 'text-red-400 mx-1'
            }
          >
            {allocatedNodes.current.length - 1}
          </span>{' '}
          / {jsonTree.points.totalPoints}
        </h3>
        <form className="w-full flex justify-center">
          <label htmlFor="search" className="block relative w-full">
            <span className="absolute inset-y-0 flex items-center pl-2">
              <FaSearch className="text-zinc-700" />
            </span>
            <input
              type="text"
              name="search"
              className="bg-zinc-800 w-full focus:outline-none text-zinc-100 py-2 pl-9 pr-3 rounded px-3 placeholder:italic placeholder:text-zinc-500"
              placeholder="Search for a node..."
              onChange={handleSearch}
            />
          </label>
        </form>
      </div>
    </div>
  );
};

export default PassiveTreeRenderer;
