type TreeClass = {
  name: string;
  base_str: number;
  base_dex: number;
  base_int: number;
  ascendancies: TreeAscendancy[];
};

export type TreeAscendancy = {
  id: string;
  name: string;
  flavourText?: string;
  flavourColour?: string;
  flavourTextRect?: { x: number; y: number; width: number; height: number };
};

export default TreeClass;
