import { Container } from 'pixi.js';
import { State } from './misc';
import SkillAtlas from './sprite';

type TreeNode = {
  skill: number;
  name: string;
  icon: keyof SkillAtlas['coords'];
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
  distanceToStart: number;
  path: number[];
  pathDistance: number;
  dependencies: number[];
  spriteContainer?: Container;
};

export function sanitizeNode(node: TreeNode) {
  const sanitizedNode = { ...node };
  sanitizedNode.spriteContainer = undefined;
  return sanitizedNode;
}

export default TreeNode;
