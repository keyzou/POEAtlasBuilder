import Dexie, { Table } from 'dexie';
import Connector from '@/models/connector';
import TreeGroup from '@/models/groups';
import TreeNode from '@/models/nodes';

export class AtlasDB extends Dexie {
  nodes!: Table<TreeNode>;

  connectors!: Table<Connector>;

  groups!: Table<TreeGroup>;

  __bfs_cache!: Table<{ skill: number; result: any }>;

  constructor() {
    super('atlas');
    this.version(4).stores({
      nodes:
        '++, skill, name, icon, stats, group, orbit, orbitIndex, out, in, flavourText, isNotable, isMastery, isJewelSocket, classStartIndex, ascendancyName, extra, state, allocated',
      connectors: 'id, startNode, endNode, type, state',
      groups: '++, x, y, orbits, nodes, isProxy',
      __bfs_cache: 'skill, result'
    });
  }
}

export default new AtlasDB();
