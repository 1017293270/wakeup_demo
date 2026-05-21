import {} from 'pixi-live2d-display'

declare module 'pixi-live2d-display' {
  export class Live2DModel extends PIXI.DisplayObject {
    static from(source: string): Promise<Live2DModel>
    anchor: { set(x: number, y: number): void }
    x: number
    y: number
    scale: { set(value: number): void }
    motion(group: string, index?: number): Promise<void>
    expression(name: string): void
    internalModel?: {
      coreModel?: {
        setParameterValueById?(id: string, value: number): void
      }
      motionManager?: {
        groups?: Record<string, string>
      }
    }
  }
}

declare global {
  interface Window {
    PIXI?: unknown
    Live2DCubismCore?: unknown
  }
}
