import React from 'react';

import db from '@/data/db';
import TreeNode from '@/models/nodes';
/* eslint-disable import/no-unresolved */
// @ts-ignore
import workerCreator from 'comlink:./worker';
/* eslint-enable import/no-unresolved */
import PassiveTreeRenderer from './components/PassiveTreeRenderer';
import AppBar from './AppBar';
import Connector from './models/connector';
import TreeGroup from './models/groups';
import TreeSummary from './components/TreeSummary';
import { State } from './models/misc';

const App: React.FC = () => {
  const [connectors, setConnectors] = React.useState<Connector[]>([]);
  const [groups, setGroups] = React.useState<TreeGroup[]>([]);
  const [nodes, setNodes] = React.useState<TreeNode[]>([]);

  const handleNodesChange = (newNodes: TreeNode[]) => {
    setNodes(newNodes);
  };

  const handleImport = (allocatedNodes: number[]) => {
    (async () => {
      const worker = workerCreator();
      await worker.computeTree();
      const dbConnectors = await db.connectors.toArray();
      const dbNodes = await db.nodes.toArray();
      const dbGroups = await db.groups.toArray();
      allocatedNodes.forEach((a) => {
        const index = dbNodes.findIndex((x) => x.skill === a);
        if (index === -1) return;
        dbNodes[index].allocated = 1;
        dbNodes[index].state = State.ACTIVE;
      });
      setConnectors(dbConnectors);
      setNodes(dbNodes);
      setGroups(dbGroups);
    })();
  };

  const [isAppReady, setAppReady] = React.useState<boolean>(false);

  React.useEffect(() => {
    (async () => {
      const worker = workerCreator();
      await worker.computeTree();
      const dbConnectors = await db.connectors.toArray();
      const dbNodes = await db.nodes.toArray();
      const dbGroups = await db.groups.toArray();
      setConnectors(dbConnectors);
      setNodes(dbNodes);
      setGroups(dbGroups);
      setAppReady(true);
    })();
  }, []);

  return (
    <div className="relative h-screen box-border overflow-hidden bg-gray-800">
      {window.Main && <AppBar />}
      <div className="flex box-border h-full items-stretch pt-8">
        <TreeSummary nodes={nodes} onImport={handleImport} />
        {isAppReady && (
          <PassiveTreeRenderer
            show
            connectors={connectors}
            onNodesChange={handleNodesChange}
            nodes={nodes}
            groups={groups}
          />
        )}
      </div>
    </div>
  );
};

export default App;
