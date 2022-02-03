import React, { useEffect, useRef } from 'react';
import TreeNode from '@/models/nodes';
import { State } from '@/models/misc';
import { useWorker } from '@/utils';
import { Application, Sprite } from 'pixi.js';
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
  // connectors: Connector[];
  nodes: TreeNode[];
  // groups: TreeGroup[];
}

const PassiveTreeRenderer: React.FC<Props> = ({ /* connectors: baseConnectors, */ nodes: baseNodes /* groups */ }) => {
  const domElement = useRef<HTMLCanvasElement>(null);
  // TODO: memoize

  const nodes = React.useRef<TreeNode[]>(baseNodes);
  // const connectors = React.useRef<Connector[]>(baseConnectors);

  const allocatedNodes = React.useRef<TreeNode[]>([]);

  const [isReady, setReady] = React.useState<boolean>(false);
  const { workerApi } = useWorker();

  // == Assets Fetching
  // function getNodeSpritePath(node: TreeNode) {
  //   const stateToString = (state?: State, canAllocate?: boolean) => {
  //     if (state === undefined) return 'Unallocated';
  //     if (state === State.INTERMEDIATE) return 'Intermediate';
  //     if (state === State.ACTIVE) return 'Active';
  //     if (canAllocate) return 'Intermediate';
  //     return 'Unallocated';
  //   };
  //   if (node.isNotable) return `/assets/icons/NotableFrame${stateToString(node.state)}.png`;
  //   if (node.isKeystone) return `/assets/icons/KeystoneFrame${stateToString(node.state)}.png`;
  //   if (node.isJewelSocket) return `/assets/icons/JewelFrame${stateToString(node.state)}.png`;
  //   return `/assets/icons/Skill_Frame_${stateToString(node.state, node.canAllocate)}.png`;
  // }

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

  // function getConnectorStrokeColor(connector: Connector) {
  //   if (connector.state === State.ACTIVE) return '#EAE3D5';
  //   if (connector.state === State.INTERMEDIATE) return '#7A6E62';
  //   return '#3D3A2E';
  // }

  // // == Canvas rendering

  // function addNodesToCanvas(nodes: TreeNode[]) {
  //   if (!canvasInstance) return;
  //   nodes.forEach((node) => {
  //     if (node.hidden) return;
  //     fabric.Image.fromURL(
  //       getNodeSpritePath(node),
  //       (oImg) => {
  //         oImg.on('mousemove', () => {
  //           canvasInstance.fire('node:hovered:start', { node: node.skill, target: oImg });
  //         });
  //         oImg.on('mouseout', () => {
  //           canvasInstance.fire('node:hovered:end', { node: node.skill, target: oImg });
  //         });
  //         oImg.on('mouseup', () => {
  //           canvasInstance.fire('node:pressed', { node: node.skill, target: oImg });
  //           canvasInstance.requestRenderAll();
  //         });
  //         canvasInstance.add(oImg);
  //         canvasInstance.bringToFront(oImg);
  //       },
  //       {
  //         name: `Node{${node.skill}}`,
  //         left: node.extra?.posX,
  //         top: node.extra?.posY,
  //         originX: 'center',
  //         originY: 'center',
  //         scaleX: 3,
  //         scaleY: 3,
  //         selectable: false
  //       }
  //     );
  //     // DEBUG
  //     // if (node.canAllocate) {
  //     //   canvasInstance.add(
  //     //     new fabric.Circle({
  //     //       radius: 10,
  //     //       left: node.extra.posX,
  //     //       top: node.extra.posY,
  //     //       originX: 'center',
  //     //       originY: 'center',
  //     //       scaleX: 3,
  //     //       scaleY: 3,
  //     //       selectable: false,
  //     //       stroke: '#ff0000',
  //     //       strokeWidth: 5
  //     //     })
  //     //   );
  //     // }
  //   });
  // }

  // function addConnectorsToCanvas(connectors: Connector[], nodes: TreeNode[], groups: TreeGroup[]) {
  //   if (!canvasInstance) return;
  //   connectors.forEach((c) => {
  //     if (c.hidden) return;
  //     const startNode = nodes.find((x) => x.skill === c.startNode);
  //     const endNode = nodes.find((x) => x.skill === c.endNode);
  //     if (!startNode || !endNode) return;
  //     if (
  //       startNode.group === endNode.group &&
  //       startNode.orbit === endNode.orbit &&
  //       startNode.group &&
  //       startNode.orbit
  //     ) {
  //       const group = groups.find((x) => x.nodes.includes(startNode.skill.toString()));
  //       if (!group) return;
  //       if (
  //         (startNode.extra.angle - endNode.extra.angle > 0 && startNode.extra.angle - endNode.extra.angle < Math.PI) ||
  //         startNode.extra.angle - endNode.extra.angle < -Math.PI
  //       ) {
  //         const circ = new fabric.Circle({
  //           name: `Connector{${startNode.skill}/${endNode.skill}}`,
  //           radius: orbitRadii[startNode.orbit],
  //           left: group.x,
  //           top: group.y,
  //           startAngle: endNode.extra.angle - Math.PI / 2,
  //           endAngle: startNode.extra.angle - Math.PI / 2,
  //           stroke: getConnectorStrokeColor(c),
  //           strokeWidth: 10,
  //           angle: 0,
  //           fill: '',
  //           originX: 'center',
  //           originY: 'center',
  //           selectable: false
  //         });
  //         canvasInstance.add(circ);
  //       } else {
  //         canvasInstance.add(
  //           new fabric.Circle({
  //             name: `Connector{${startNode.skill}/${endNode.skill}}`,
  //             radius: orbitRadii[startNode.orbit],
  //             left: group.x,
  //             top: group.y,
  //             startAngle: startNode.extra.angle - Math.PI / 2,
  //             endAngle: endNode.extra.angle - Math.PI / 2,
  //             stroke: getConnectorStrokeColor(c),
  //             strokeWidth: 10,
  //             angle: 0,
  //             fill: '',
  //             originX: 'center',
  //             originY: 'center',
  //             selectable: false
  //           })
  //         );
  //       }
  //       return;
  //     }
  //     canvasInstance.add(
  //       new fabric.Line([startNode.extra.posX, startNode.extra.posY, endNode.extra.posX, endNode.extra.posY], {
  //         name: `Connector{${startNode.skill}/${endNode.skill}}`,
  //         originY: 'center',
  //         originX: 'center',
  //         stroke: getConnectorStrokeColor(c),
  //         strokeWidth: 10,
  //         selectable: false
  //       })
  //     );
  //   });
  // }

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

    const sprite = Sprite.from('/assets/icons/Skill_Frame_Unallocated.png');

    app.stage.addChild(sprite);

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

    // Cleanup function
    return () => {
      app.destroy();
    };
  }

  // async function buildAllNodesPaths(allocated: TreeNode[]) {
  //   nodes.current.forEach((n, i, a) => {
  //     n.path = [];
  //     n.pathDistance = n.allocated ? 0 : 1000;
  //     a[i] = n;
  //   });

  //   const results = await Promise.all(
  //     allocated.map((n) => {
  //       return workerApi.BFS(n, nodes.current);
  //     })
  //   );
  //   results.forEach((r) => {
  //     const index = nodes.current.findIndex((x) => x.skill === r.node.skill);
  //     nodes.current = r.nodes;
  //     nodes.current[index] = r.node;
  //   });
  // }

  useEffect(() => {
    if (!domElement.current || !isReady) return;
    return setupCanvas();
  }, [domElement.current, isReady]);

  // useEffect(() => {
  //   (() => {
  //     if (!canvasInstance) return;
  //     canvasInstance.forEachObject((o) => canvasInstance.remove(o));
  //     addGroupOrbitToCanvas();
  //     addConnectorsToCanvas(connectors.current, nodes.current, groups);
  //     addNodesToCanvas(nodes.current);
  //   })();
  // }, [canvasInstance]);

  useEffect(() => {
    (async () => {
      // const startingNode = nodes.current.find((x) => x.isStartPoint) as TreeNode;
      // allocatedNodes.current = [startingNode];
      // await buildAllNodesPaths(allocatedNodes.current);
      setReady(true);
    })();
  }, []);

  return (
    <div className="h-full w-full atlas">
      <canvas ref={domElement} />
    </div>
  );
};

export default PassiveTreeRenderer;
