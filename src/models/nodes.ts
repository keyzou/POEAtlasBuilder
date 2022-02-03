import { State } from './misc';

type TreeNode = {
  skill: number;
  name: string;
  icon: string;
  stats: string[];
  group: number;
  orbit: number;
  orbitIndex: number;
  out: string[];
  in: string[];
  isProxy?: boolean;
  isKeystone?: boolean;
  flavourText?: string[];
  isNotable?: boolean;
  isMastery?: boolean;
  isJewelSocket?: boolean;
  classStartIndex?: number;
  ascendancyName?: string;
  extra: { [key: string]: any };
  state?: State;
  canAllocate?: boolean;
  allocated?: number;
  hidden?: boolean;
  isStartPoint?: boolean;
  distanceToStart?: number;
  path: number[];
  pathDistance: number;
};

export default TreeNode;
