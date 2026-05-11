/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "poisson-disk-sampling" {
  type Options = {
    shape: number[];
    minDistance: number;
    maxDistance?: number;
    tries?: number;
    distanceFunction?: (point: number[]) => number;
    bias?: number;
  };

  export default class PoissonDiskSampling {
    constructor(options: Options, rng?: () => number);
    fill(): number[][];
  }
}
