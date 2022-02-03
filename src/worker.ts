import { expose } from 'comlink';
import jsonTree from '@/data/tree.json';
import db from './data/db';
import PassiveTree from './models/tree';
import TreeNode from './models/nodes';
import { orbitAngles, orbitRadii } from './constants';
import { State } from './models/misc';
import Connector from './models/connector';
import TreeGroup from './models/groups';

/* eslint-disable class-methods-use-this */
/* eslint-disable import/prefer-default-export */
export class TreeWorker {
  groups: TreeGroup[] = [];

  nodes: TreeNode[] = [];

  connectors: Connector[] = [];

  async computeTree() {
    this.loadFromObj(jsonTree as PassiveTree);
    await db.nodes.clear();
    await db.connectors.clear();
    await db.groups.clear();
    await db.nodes.bulkPut(this.nodes);
    await db.connectors.bulkPut(this.connectors);
    await db.groups.bulkPut(this.groups);
    const nodesCount = await db.nodes.count();
    const connectorsCount = await db.connectors.count();
    const groupsCount = await db.groups.count();
    return { nodes: nodesCount, connectors: connectorsCount, groups: groupsCount };
  }

  BFS(node: TreeNode, nodes: TreeNode[]) {
    const queue = [];
    const visited = new Set<number>();
    const startNode = node;
    startNode.pathDistance = 0;
    startNode.path = [];
    visited.add(startNode.skill);
    queue.push(startNode);
    while (queue.length > 0) {
      const n = queue.shift();
      if (!n) break;
      const currentDistance = n.pathDistance + 1;
      const linked = [...n.in, ...n.out].map((o) => nodes.find((x) => x.skill.toString() === o));
      linked.forEach((other) => {
        if (!other) return;
        if (
          !visited.has(other.skill) &&
          other.classStartIndex === undefined &&
          other.pathDistance > currentDistance &&
          (node.ascendancyName === other.ascendancyName || (currentDistance === 1 && !other.ascendancyName))
        ) {
          other.pathDistance = currentDistance;
          other.path = [...n.path, n.skill];
          nodes[nodes.indexOf(other)] = other;
          queue.push(other);
          visited.add(other.skill);
        }
      });
    }
    return { node, nodes };
  }

  loadFromObj(data: PassiveTree) {
    const filteredNodes = Object.values(data.nodes).filter((x) => x.group && x.skill && !x.isMastery && !x.isProxy);

    // Nodes
    filteredNodes.forEach((node, index, arr) => {
      if (!node.in || !node.out || node.orbit === undefined || node.orbitIndex === undefined) return;
      // skill == null ? indexeddb
      const group = data.groups[node.group.toString()];
      const extra: any = {};
      node.path = [];
      node.pathDistance = 0;
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
    this.nodes = filteredNodes;
    this.groups = groups;
    this.connectors = connectors;
  }
}

expose(new TreeWorker());
