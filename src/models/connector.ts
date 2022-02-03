import { State } from './misc';

type Connector = {
  id?: string;
  startNode: number;
  endNode: number;
  state?: State;
  type?: string;
  hidden?: boolean;
};

export default Connector;
