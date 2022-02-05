import { SmoothGraphics } from '@pixi/graphics-smooth';
import { State } from './misc';

type Connector = {
  id?: string;
  startNode: number;
  endNode: number;
  state?: State;
  type?: string;
  hidden?: boolean;
  sprite?: SmoothGraphics;
};

export default Connector;
