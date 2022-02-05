import jsonTree from '@/data/tree.json';
import db from './data/db';
import PassiveTree from './models/tree';
import TreeNode from './models/nodes';
import { orbitAngles, orbitRadii } from './constants';
import { State } from './models/misc';
import Connector from './models/connector';

export async function computeTree() {
  const { nodes, connectors, groups } = loadFromObj(jsonTree as PassiveTree);
  await db.nodes.clear();
  await db.connectors.clear();
  await db.groups.clear();
  await db.nodes.bulkPut(nodes);
  await db.connectors.bulkPut(connectors);
  await db.groups.bulkPut(groups);
  const nodesCount = await db.nodes.count();
  const connectorsCount = await db.connectors.count();
  const groupsCount = await db.groups.count();
  return { nodes: nodesCount, connectors: connectorsCount, groups: groupsCount };
}

export async function BFS(
  node: number,
  nodes: TreeNode[]
): Promise<{ node: TreeNode; nodes: Partial<TreeNode>[] } | undefined> {
  console.time('BFS');
  const startNode = nodes.find((x) => x.skill === node);
  if (!startNode) return;
  let partialNodes: Partial<TreeNode>[];
  try {
    const cacheResult = await db.__bfs_cache.get(node);
    if (cacheResult) {
      partialNodes = cacheResult.result;
    }
  } catch {
    // Let's skip, we won't use cache
  }
  const queue = [];
  const visited = new Set<number>();
  startNode.pathDistance = 0;
  startNode.path = [];
  startNode.distanceToStart = 0;
  visited.add(startNode.skill);
  queue.push(startNode);
  while (queue.length > 0) {
    const n = queue.shift();
    if (!n) break;
    const currentDistance = n.pathDistance + 1;
    const linked = [...n.out, ...n.in].map((o) => nodes.find((x) => x.skill.toString() === o));
    linked.forEach((other) => {
      if (!other) return;
      if (
        !visited.has(other.skill) &&
        !other.isMastery &&
        other.classStartIndex === undefined &&
        (startNode.ascendancyName === other.ascendancyName || (currentDistance === 1 && !other.ascendancyName))
      ) {
        if (!other.allocated) {
          other.pathDistance = currentDistance;
          other.path = [...n.path, n.skill];
        } else {
          other.pathDistance = 0;
          other.path = [];
        }
        nodes[nodes.indexOf(other)] = other;
        queue.push(other);
        visited.add(other.skill);
      }
    });
  }
  partialNodes = nodes.map((x) => ({ skill: x.skill, path: x.path }));
  await db.__bfs_cache.put({ skill: node, result: partialNodes });
  console.timeEnd('BFS');
  return { node: startNode, nodes: partialNodes };
}

export async function findStartFromNode(skill: number, nodes: TreeNode[]) {
  const node = nodes.find((x) => x.skill === skill);
  const visited = new Set<number>();
  visited.add(skill);
  const queue = [node];
  while (queue.length > 0) {
    const n = queue.shift();
    if (!n) break;
    if (n.isStartPoint) {
      return n.dependencies;
    }
    const linked = [...n.out, ...n.in].map((o) => nodes.find((x) => x.skill.toString() === o));
    linked.forEach((other) => {
      if (!other) return;
      if (visited.has(other.skill)) return;
      other.dependencies = [...n.dependencies, n.skill];
      visited.add(other.skill);
      queue.push(other);
    });
  }
}

export function loadFromObj(data: PassiveTree) {
  const filteredNodes = Object.values(data.nodes).filter((x) => x.group && x.skill && !x.isProxy) as TreeNode[];

  // Nodes
  filteredNodes.forEach((node, index, arr) => {
    if (!node.in || !node.out || node.orbit === undefined || node.orbitIndex === undefined) return;
    // skill == null ? indexeddb
    const group = data.groups[node.group.toString()];
    const extra: any = {};
    node.path = [];
    node.pathDistance = 0;
    node.dependencies = [];
    if (node.skill === 29045) {
      node.isStartPoint = true;
      node.allocated = 1;
      node.hidden = true;
    }
    extra.angle = (orbitAngles[node.orbit][node.orbitIndex] * Math.PI) / 180;
    extra.posX = group.x - orbitRadii[node.orbit] * Math.sin(-extra.angle);
    extra.posY = group.y - orbitRadii[node.orbit] * Math.cos(-extra.angle);

    if (node.group === 0) {
      extra.posX = 0;
      extra.posY = 0;
    }
    arr[index] = { ...node, state: State.DEFAULT, extra };
  });

  // Connectors
  const connectors: Connector[] = [];
  filteredNodes.forEach((node) => {
    node.out?.forEach((nodeStr) => {
      const otherNode = filteredNodes.find((n) => n.skill === parseInt(nodeStr, 10));
      if (!otherNode) return;
      if (node.ascendancyName !== otherNode.ascendancyName) return;
      if (
        connectors.findIndex(
          (c) =>
            (c.startNode === node.skill && c.endNode === otherNode.skill) ||
            (c.endNode === node.skill && c.startNode === otherNode.skill)
        ) !== -1
      )
        return;
      const type = node.group === otherNode.group && node.orbit === otherNode.orbit ? 'circle' : 'line';
      const connector = {
        id: `${node.skill}/${otherNode.skill}`,
        endNode: otherNode.skill,
        startNode: node.skill,
        type,
        state: node.allocated ? (otherNode.allocated ? State.ACTIVE : State.INTERMEDIATE) : State.DEFAULT
      };
      connectors.push(connector);
    });
  });

  // Final tweaks: default allocated, etc...
  filteredNodes
    .filter((x1) => data.nodes.root.out?.some((x2) => x2 === x1.skill.toString()))
    .forEach((n) => {
      const index = filteredNodes.findIndex((x) => x.skill === n.skill);
      if (index === -1) return;
      n.allocated = 1;
      n.state = State.ACTIVE;
      filteredNodes
        .filter((n1) => n.out.includes(n1.skill.toString()))
        .forEach((n1) => {
          const nIndex = filteredNodes.findIndex((x) => x.skill === n1.skill);
          if (nIndex === -1) return;
          n1.canAllocate = true;
          n1.state = State.INTERMEDIATE;
          filteredNodes[nIndex] = n1;
        });
      filteredNodes[index] = n;
    });

  const groups = Object.values(data.groups);
  return {
    nodes: filteredNodes,
    groups,
    connectors
  };
}
