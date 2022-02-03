import TreeClass from './classes';
import TreeGroup from './groups';
import TreeNode from './nodes';
import SkillAtlas from './sprite';

type PassiveTree = {
  tree: string;
  groups: { [key: string]: TreeGroup };
  nodes: { [key: string]: TreeNode };
  classes: TreeClass[];
  extraImages: { [key: string]: { x: number; y: number; image: string } };
  jewelSlots: number[];
  min_x: number;
  max_x: number;
  min_y: number;
  max_y: number;
  assets: { [key: string]: { [assKey: number | string]: string } };
  skillSprites: { [key: string]: SkillAtlas[] };
  points: {
    totalPoints: number;
  };
};

export default PassiveTree;
