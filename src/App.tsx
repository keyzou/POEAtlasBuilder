import React from 'react';

import { NodeContainer } from '@/models/nodes';
import jsonTree from '@/data/tree.json';
import PassiveTreeRenderer from './components/PassiveTreeRenderer';
import AppBar from './AppBar';
import Connector from './models/connector';
import TreeGroup from './models/groups';
import PassiveTree from './models/tree';
import TreeSummary from './components/TreeSummary';
import { orbitAngles, orbitRadii } from './constants';
import { State } from './models/misc';

const App: React.FC = () => {
  const [connectors, setConnectors] = React.useState<Connector[]>([]);
  const [groups, setGroups] = React.useState<TreeGroup[]>([]);
  const [nodes, setNodes] = React.useState<NodeContainer>({});

  const [isAppReady, setAppReady] = React.useState<boolean>(false);

  React.useEffect(() => {
    const data = jsonTree as PassiveTree;
    const filteredNodes = Object.fromEntries(
      Object.entries(data.nodes).filter(([, value]) => value.group && value.skill && !value.isProxy)
    ) as NodeContainer;

    // Nodes
    Object.values(filteredNodes).forEach((node) => {
      if (!node.in || !node.out || node.orbit === undefined || node.orbitIndex === undefined) return;
      // skill == null ? indexeddb
      const group = data.groups[node.group.toString()];
      const extra: any = {};
      node.path = [];
      node.pathDistance = 0;
      node.isDependencyOf = [];
      node.allocated = 0;
      extra.angle = (orbitAngles[node.orbit][node.orbitIndex] * Math.PI) / 180;
      extra.posX = group.x - orbitRadii[node.orbit] * Math.sin(-extra.angle);
      extra.posY = group.y - orbitRadii[node.orbit] * Math.cos(-extra.angle);

      if (node.group === 0) {
        extra.posX = 0;
        extra.posY = 0;
      }
      node.extra = extra;
      node.state = State.DEFAULT;
      if (node.skill === 29045) {
        node.isStartPoint = true;
        node.allocated = 1;
        node.hidden = true;
        node.state = State.ACTIVE;
      }
    });

    // Connectors
    const initConnectors: Connector[] = [];
    Object.values(filteredNodes).forEach((node) => {
      node.out?.forEach((nodeStr) => {
        const otherNode = filteredNodes[parseInt(nodeStr, 10)];
        if (!otherNode) return;
        if (
          initConnectors.findIndex(
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
        initConnectors.push(connector);
      });
    });

    // Final tweaks: default allocated, etc...
    Object.values(filteredNodes)
      .filter((x1) => data.nodes.root.out?.some((x2) => x2 === x1.skill.toString()))
      .forEach((n) => {
        n.allocated = 1;
        n.state = State.ACTIVE;
        Object.values(filteredNodes)
          .filter((n1) => n.out.includes(n1.skill.toString()))
          .forEach((n1) => {
            n1.canAllocate = true;
            n1.state = State.INTERMEDIATE;
          });
      });

    setGroups(Object.values(data.groups));
    setNodes(filteredNodes);
    setConnectors(initConnectors);
    setAppReady(true);
  }, []);

  return (
    <div className="relative h-screen box-border overflow-hidden bg-gray-800">
      {window.Main && <AppBar />}
      <div className="flex box-border h-full items-stretch pt-8">
        <TreeSummary nodes={nodes} />
        {isAppReady && <PassiveTreeRenderer show connectors={connectors} nodes={nodes} groups={groups} />}
      </div>
    </div>
  );
};

export default App;
