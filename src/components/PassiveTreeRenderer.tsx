import React, { useEffect, useRef } from 'react';
import TreeNode from '@/models/nodes';
import { State } from '@/models/misc';
import { useWorker } from '@/utils';
import { Application, Graphics, SCALE_MODES, settings, Sprite } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { useTextureManager } from '@/data/textureManager';
import Connector from '@/models/connector';
import { orbitRadii } from '@/constants';
import TreeGroup from '@/models/groups';
/**
 * TODO:
 * - Node / Connector selected
 */

// type NodeEvent = {
//   node: number;
// };

// type ConnectorEvent = {
//   connector: string;
// };

interface Props {
  connectors: Connector[];
  nodes: TreeNode[];
  groups: TreeGroup[];
}

const PassiveTreeRenderer: React.FC<Props> = ({ connectors: baseConnectors, nodes: baseNodes, groups }) => {
  const domElement = useRef<HTMLDivElement>(null);
  const [appInstance, setAppInstance] = React.useState<Application>();
  const [viewport, setViewport] = React.useState<Viewport>();

  const textureManager = useTextureManager();

  const nodes = React.useRef<TreeNode[]>(baseNodes);
  const connectors = React.useRef<Connector[]>(baseConnectors);

  const allocatedNodes = React.useRef<TreeNode[]>([]);

  const [isReady, setReady] = React.useState<boolean>(false);
  const { workerApi } = useWorker();

  // == Assets Fetching
  function getNodeTexture(node: TreeNode) {
    const stateToString = (state?: State, canAllocate?: boolean) => {
      if (state === undefined) return 'unallocated';
      if (state === State.INTERMEDIATE) return 'highlighted';
      if (state === State.ACTIVE) return 'active';
      if (canAllocate) return 'intermediate';
      return 'unallocated';
    };
    if (node.isNotable) return textureManager.getTexture(`skill-notable-${stateToString(node.state)}`);
    return textureManager.getTexture(`skill-frame-${stateToString(node.state, node.canAllocate)}`);
  }

  // function getGroupBackgroundPath(groupIndex: number) {
  //   return `/assets/icons/Group_Background_${groupIndex}.png`;
  // }

  // function allocateNode(node: TreeNode, canvas = canvasInstance) {
  //   node.allocated = 1;
  //   node.state = State.ACTIVE;
  //   canvas?.fire('node:updated', { node: node.skill });
  //   node.out.forEach((o) => {
  //     const otherNode = nodes.current.find((n2) => n2.skill.toString() === o);
  //     if (!otherNode) return;
  //     if (!otherNode.allocated) {
  //       otherNode.canAllocate = true;
  //       otherNode.state = State.INTERMEDIATE;
  //     }
  //     canvas?.fire('node:updated', { node: otherNode.skill });
  //     const connector = connectors.current.find((c) => c.startNode === node.skill && c.endNode.toString() === o);
  //     if (!connector) return;
  //     if (otherNode.allocated && connector.state !== State.ACTIVE) {
  //       connector.state = State.ACTIVE;
  //     } else if (!otherNode.allocated && connector.state === State.DEFAULT) {
  //       connector.state = State.INTERMEDIATE;
  //     }
  //     canvas?.fire('connector:updated', { connector: connector.id });
  //   });

  //   node.in.forEach((i) => {
  //     const otherNode = nodes.current.find((x) => x.skill.toString() === i);
  //     if (!otherNode) return;
  //     if (!otherNode.allocated) {
  //       otherNode.canAllocate = true;
  //       otherNode.state = State.INTERMEDIATE;
  //     }
  //     canvas?.fire('node:updated', { node: otherNode.skill });
  //     const connector = connectors.current.find((c) => c.startNode.toString() === i && c.endNode === node.skill);
  //     if (!connector) return;
  //     if (otherNode.allocated && connector.state !== State.ACTIVE) {
  //       connector.state = State.ACTIVE;
  //     } else if (!otherNode.allocated && connector.state === State.DEFAULT) {
  //       connector.state = State.INTERMEDIATE;
  //     }
  //     canvas?.fire('connector:updated', { connector: connector.id });
  //   });
  // }

  // function isOnMainBranch(node: TreeNode, prevNode: TreeNode) {
  //   if (node.classStartIndex) return true;
  //   if (!node.allocated) return false;
  //   const anyOutOnMainBranch = node.out.some((x) => {
  //     const other = nodes.current.find((x2) => x === x2.skill.toString() && x2.allocated);
  //     if (!other) return;
  //     if (other.skill === prevNode.skill) return false;
  //     return isOnMainBranch(other, node);
  //   });
  //   const anyInOnMainBranch = node.in.some((x) => {
  //     const other = nodes.current.find((x2) => x === x2.skill.toString() && x2.allocated);
  //     if (!other) return;
  //     if (other.skill === prevNode.skill) return false;
  //     return isOnMainBranch(other, node);
  //   });
  //   return anyOutOnMainBranch || anyInOnMainBranch;
  // }

  // function unallocateNode(node: TreeNode, canvas = canvasInstance) {
  //   node.allocated = 0;
  //   node.state = State.DEFAULT;
  //   canvas?.fire('node:updated', { node: node.skill });
  //   node.out.forEach((o) => {
  //     const otherNode = nodes.current.find((n2) => n2.skill.toString() === o);
  //     if (!otherNode) return;
  //     if (!otherNode.allocated) {
  //       otherNode.canAllocate = false;
  //       otherNode.state = State.DEFAULT;
  //     } else if (!isOnMainBranch(otherNode, node)) {
  //       unallocateNode(otherNode, canvas);
  //     }
  //     canvas?.fire('node:updated', { node: otherNode.skill });
  //     const connector = connectors.current.find((c) => c.startNode === node.skill && c.endNode.toString() === o);
  //     if (!connector) return;
  //     if (otherNode.allocated && connector.state === State.ACTIVE) {
  //       connector.state = State.INTERMEDIATE;
  //     } else {
  //       connector.state = State.DEFAULT;
  //     }
  //     canvas?.fire('connector:updated', { connector: connector.id });
  //   });

  //   node.in.forEach((i) => {
  //     const otherNode = nodes.current.find((n2) => n2.skill.toString() === i);
  //     if (!otherNode) return;
  //     if (!otherNode.allocated) {
  //       otherNode.canAllocate = false;
  //       otherNode.state = State.DEFAULT;
  //     } else if (!isOnMainBranch(otherNode, node)) {
  //       unallocateNode(otherNode, canvas);
  //     }
  //     canvas?.fire('node:updated', { node: otherNode.skill });
  //     const connector = connectors.current.find((c) => c.endNode === node.skill && c.startNode.toString() === i);
  //     if (!connector) return;
  //     if (otherNode.allocated && connector.state === State.ACTIVE) {
  //       connector.state = State.INTERMEDIATE;
  //     } else {
  //       connector.state = State.DEFAULT;
  //     }
  //     canvas?.fire('connector:updated', { connector: connector.id });
  //   });
  // }

  function getConnectorStrokeColor(connector: Connector) {
    if (connector.state === State.ACTIVE) return 0xeae3d5;
    if (connector.state === State.INTERMEDIATE) return 0x7a6e62;
    return 0x3d3a2e;
  }

  // // == Canvas rendering

  function addNodesToViewport() {
    if (!appInstance) return;
    nodes.current.forEach((node) => {
      if (node.hidden) return;
      const sprite = new Sprite(getNodeTexture(node));
      sprite.anchor.set(0.5, 0.5);
      sprite.scale.set(2, 2);
      sprite.x = node.extra?.posX;
      sprite.y = node.extra?.posY;
      sprite.interactive = true;

      sprite.on('mouseover', () => {
        if (node.allocated) return;
        // Todo handle hovers better
        node.state = State.INTERMEDIATE;
        sprite.texture = getNodeTexture(node);
      });

      sprite.on('mouseout', () => {
        if (node.allocated) return;
        node.state = State.DEFAULT;
        sprite.texture = getNodeTexture(node);
      });

      viewport?.addChild(sprite);
    });
  }

  function addConnectorsToViewport() {
    if (!appInstance || !viewport) return;
    connectors.current.forEach((c) => {
      if (c.hidden) return;
      const startNode = nodes.current.find((x) => x.skill === c.startNode);
      const endNode = nodes.current.find((x) => x.skill === c.endNode);
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
          viewport.addChild(arc);
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
          viewport.addChild(arc);
        }
        return;
      }

      const graphics = new Graphics();
      graphics.lineStyle({
        color: getConnectorStrokeColor(c),
        width: 10
      });
      graphics.moveTo(startNode.extra.posX, startNode.extra.posY);
      graphics.lineTo(endNode.extra.posX, endNode.extra.posY);
      viewport.addChild(graphics);
    });
  }

  // function addGroupOrbitToCanvas() {
  //   if (!canvasInstance) return;
  //   Object.entries(groups).forEach(([id, g]) => {
  //     // Skip ascendancies
  //     if (
  //       !g.orbits ||
  //       g.orbits.length === 0 ||
  //       g.isProxy ||
  //       g.nodes.some((n) => nodes.current.find((n2) => n2.skill === parseInt(n, 10))?.ascendancyName)
  //     )
  //       return;

  //     const maxOrbit = Math.max(...g.orbits);
  //     if (maxOrbit === 0 || maxOrbit >= 4) return;

  //     if (maxOrbit === 3) {
  //       fabric.Image.fromURL(
  //         getGroupBackgroundPath(maxOrbit),
  //         (img) => {
  //           canvasInstance.add(img);
  //           canvasInstance.sendToBack(img);
  //           canvasInstance.bringForward(img);
  //           canvasInstance.bringForward(img);
  //         },
  //         {
  //           name: `OrbitBg{${id}/1}`,
  //           left: g.x,
  //           top: g.y,
  //           scaleX: 2,
  //           scaleY: 2,
  //           originX: 'center',
  //           originY: 'bottom',
  //           selectable: false
  //         }
  //       );
  //       fabric.Image.fromURL(
  //         getGroupBackgroundPath(maxOrbit),
  //         (img) => {
  //           canvasInstance.add(img);
  //           canvasInstance.sendToBack(img);
  //           canvasInstance.bringForward(img);
  //           canvasInstance.bringForward(img);
  //           canvasInstance.bringForward(img);
  //         },
  //         {
  //           name: `OrbitBg{${id}/2}`,
  //           left: g.x,
  //           top: g.y,
  //           scaleX: 2,
  //           scaleY: 2,
  //           flipY: true,
  //           originX: 'center',
  //           originY: 'top',
  //           selectable: false
  //         }
  //       );
  //     } else {
  //       fabric.Image.fromURL(
  //         getGroupBackgroundPath(maxOrbit),
  //         (img) => {
  //           canvasInstance.add(img);
  //           canvasInstance.sendToBack(img);
  //         },
  //         {
  //           name: `OrbitBg{${id}}`,
  //           left: g.x,
  //           top: g.y,
  //           scaleX: 2,
  //           scaleY: 2,
  //           originX: 'center',
  //           originY: 'center',
  //           selectable: false
  //         }
  //       );
  //     }
  //   });
  // }

  // == Canvas setup

  function setupCanvas() {
    if (!domElement.current) return;
    settings.SCALE_MODE = SCALE_MODES.NEAREST;
    // const canvas = new fabric.Canvas(domElement.current, {
    //   width: domElement.current.parentElement?.clientWidth,
    //   height: domElement.current.parentElement?.clientHeight,
    //   interactive: false,
    //   selection: false,
    //   skipOffscreen: true,
    //   hoverCursor: 'default'
    // });
    // canvas.setBackgroundImage('/assets/AtlasPassiveBackground.png', canvas.renderAll.bind(canvas), {
    //   originX: 'center',
    //   originY: 'center',
    //   scaleX: 5,
    //   scaleY: 5,
    //   opacity: 0.5
    // });
    // canvas.setZoom(0.25);

    const app = new Application({
      width: domElement.current.parentElement?.clientWidth,
      height: domElement.current.parentElement?.clientHeight
    });

    domElement.current.appendChild(app.view);

    textureManager.registerTexture('skill-frame-unallocated', 'assets/icons/Skill_Frame_Unallocated.png');
    textureManager.registerTexture('skill-frame-highlighted', 'assets/icons/Skill_Frame_Intermediate.png');
    textureManager.registerTexture('skill-frame-active', 'assets/icons/Skill_Frame_Active.png');
    textureManager.registerTexture('skill-notable-unallocated', 'assets/icons/NotableFrameUnallocated.png');
    textureManager.registerTexture('skill-notable-highlighted', 'assets/icons/NotableFrameIntermediate.png');
    textureManager.registerTexture('skill-notable-active', 'assets/icons/NotableFrameActive.png');

    const appViewport = new Viewport({
      worldWidth: 8000,
      worldHeight: 8000
    });
    appViewport.clampZoom({ minScale: 0.25, maxScale: 0.5 });

    appViewport.wheel({ smooth: 20 }).drag();
    appViewport.interactive = true;
    appViewport.interactiveChildren = true;
    app.stage.addChild(appViewport);

    // let mouseDown = false;
    // let isDragging = false;
    // let lastClientX: number;
    // let lastClientY: number;
    // let vpt: number[];
    // canvas.on('mouse:wheel', (opt) => {
    //   const delta = opt.e.deltaY;
    //   let zoom = canvas.getZoom();
    //   zoom *= 0.999 ** delta;
    //   if (zoom > 20) zoom = 20;
    //   if (zoom < 0.01) zoom = 0.01;
    //   canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    //   opt.e.preventDefault();
    //   opt.e.stopPropagation();
    // });

    // canvas.on('mouse:down', (opt) => {
    //   mouseDown = true;
    //   lastClientX = opt.e.clientX;
    //   lastClientY = opt.e.clientY;
    // });
    // canvas.on('mouse:move', (opt) => {
    //   if (mouseDown) {
    //     isDragging = true;
    //     const { e } = opt;
    //     if (!canvas.viewportTransform) return;
    //     vpt = canvas.viewportTransform;
    //     vpt[4] += e.clientX - lastClientX;
    //     vpt[5] += e.clientY - lastClientY;
    //     canvas.requestRenderAll();
    //     lastClientX = e.clientX;
    //     lastClientY = e.clientY;
    //   }
    // });
    // canvas.on('mouse:up', () => {
    //   mouseDown = false;
    //   if (isDragging) {
    //     isDragging = false;
    //     if (!vpt) return;
    //     canvas.setViewportTransform(vpt);
    //   }
    //   canvas.requestRenderAll();
    // });
    // canvas.on('node:hovered:start', (opt) => {
    //   const event = opt as NodeEvent;
    //   const node = nodes.current.find((x) => x.skill === event.node);
    //   if (!node) return;
    //   if (node.state === State.DEFAULT && !node.canAllocate) {
    //     node.state = State.INTERMEDIATE;
    //     (event.target as fabric.Image).setSrc(getNodeSpritePath(node), () => canvas.requestRenderAll());
    //   }
    // });

    // canvas.on('node:hovered:end', (opt) => {
    //   const event = opt as NodeEvent;
    //   const node = nodes.current.find((x) => x.skill === event.node);
    //   if (!node) return;
    //   if (node.state === State.INTERMEDIATE && !node.canAllocate) {
    //     node.state = State.DEFAULT;
    //     (event.target as fabric.Image).setSrc(getNodeSpritePath(node), () => canvas.requestRenderAll());
    //   }
    // });

    // canvas.on('node:updated', (opt) => {
    //   // Event used to refresh a node (image, etc...)
    //   const event = opt as NodeEvent;
    //   const node = nodes.current.find((x) => x.skill === event.node);
    //   if (!node) return;
    //   const targetSprite = canvas.getObjects('image').find((o) => o.name && o.name === `Node{${node.skill}}`);
    //   if (!targetSprite) return;
    //   (targetSprite as fabric.Image).setSrc(getNodeSpritePath(node), () => canvas.requestRenderAll());
    // });

    // canvas.on('node:pressed', async (opt) => {
    //   // If we're dragging sometimes we can have nodes accidentally allocate, so let's not do that
    //   if (isDragging) return;
    //   const event = opt as NodeEvent;
    //   const node = nodes.current.find((x) => x.skill === event.node);
    //   if (!node) return;
    //   console.log(node.path);
    //   // TODO: might be good to fire another event "node:allocated" if we want to do something else here
    //   node.allocated = node.allocated ?? 0 ? 0 : 1;
    //   if (node.allocated) {
    //     const newAllocated = [...(allocatedNodes.current ?? [])];
    //     allocateNode(node, canvas);
    //     node.path.forEach((n) => {
    //       const other = nodes.current.find((x) => x.skill === n);
    //       if (!other) return;
    //       other.allocated = 1;
    //       if (!newAllocated.includes(other)) newAllocated.push(other);
    //       allocateNode(other, canvas);
    //     });
    //     newAllocated.push(node);
    //     await buildAllNodesPaths(newAllocated);
    //     allocatedNodes.current = newAllocated;
    //     console.log(allocatedNodes.current[allocatedNodes.current.length - 1]);
    //   } else {
    //     unallocateNode(node, canvas);
    //   }
    // });

    // canvas.on('connector:updated', (opt) => {
    //   const event = opt as ConnectorEvent;
    //   const connector = connectors.current.find((x) => x.id === event.connector);
    //   if (!connector) return;
    //   if (!connector.type) return;
    //   const connectorObj = canvas
    //     .getObjects(connector.type)
    //     .find((o) => o.name && o.name === `Connector{${connector.startNode}/${connector.endNode}}`);
    //   if (!connectorObj) return;
    //   connectorObj.set('stroke', getConnectorStrokeColor(connector));
    //   canvas.requestRenderAll();
    // });

    // setCanvasInstance(canvas);
    setViewport(appViewport);
    setAppInstance(app);

    // Cleanup function
    return () => {
      app.destroy(true, true);
    };
  }

  async function buildAllNodesPaths(allocated: TreeNode[]) {
    nodes.current.forEach((n, i, a) => {
      n.path = [];
      n.pathDistance = n.allocated ? 0 : 1000;
      a[i] = n;
    });

    const results = await Promise.all(
      allocated.map((n) => {
        return workerApi.BFS(n, nodes.current);
      })
    );
    results.forEach((r) => {
      const index = nodes.current.findIndex((x) => x.skill === r.node.skill);
      nodes.current = r.nodes;
      nodes.current[index] = r.node;
    });
  }

  useEffect(() => {
    if (!domElement.current || !isReady) return;
    return setupCanvas();
  }, [domElement.current, isReady]);

  useEffect(() => {
    if (!appInstance || !viewport) return;
    addConnectorsToViewport();
    addNodesToViewport();
  }, [appInstance, viewport]);

  useEffect(() => {
    (async () => {
      // const startingNode = nodes.current.find((x) => x.isStartPoint) as TreeNode;
      // allocatedNodes.current = [startingNode];
      // await buildAllNodesPaths(allocatedNodes.current);
      setReady(true);
    })();
  }, []);

  return <div className="h-full w-full atlas" ref={domElement} />;
};

export default PassiveTreeRenderer;
