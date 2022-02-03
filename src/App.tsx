import React from 'react';

import db from '@/data/db';
import TreeNode from '@/models/nodes';
import PassiveTreeRenderer from './components/PassiveTreeRenderer';
import AppBar from './AppBar';
import { useWorker } from './utils';

const App: React.FC = () => {
  // const [connectors, setConnectors] = React.useState<Connector[]>([]);
  // const [groups, setGroups] = React.useState<TreeGroup[]>([]);
  const [nodes, setNodes] = React.useState<TreeNode[]>([]);

  const [isAppReady, setAppReady] = React.useState<boolean>(false);

  const { workerApi } = useWorker();

  React.useEffect(() => {
    (async () => {
      await workerApi.computeTree();
      // const dbConnectors = await db.connectors.toArray();
      const dbNodes = await db.nodes.toArray();
      // const dbGroups = await db.groups.toArray();
      // setConnectors(dbConnectors);
      setNodes(dbNodes);
      // setGroups(dbGroups);
      setAppReady(true);
    })();
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {window.Main && (
        <div className="flex-none">
          <AppBar />
        </div>
      )}
      <div className="flex-auto bg-gray-800">{isAppReady && <PassiveTreeRenderer nodes={nodes} />}</div>
    </div>
  );
};

export default App;
