import type { SmoothGraphics } from '@pixi/graphics-smooth'
import type { State } from './misc'

interface Connector {
  id?: string
  startNode: number
  endNode: number
  state?: State
  type?: string
  hidden?: boolean
  sprite?: SmoothGraphics
}

export default Connector
