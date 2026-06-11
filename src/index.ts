// BVH — Bounding Volume Hierarchy for ray tracing
// Only the BVH builder and intersection functions are public.

export type {
  Vec3,
  Ray,
  AABB,
  Triangle,
  BVHNode,
  HitInfo,
  SplitStrategy,
  BVHBuildOptions,
} from "./types";

export type { FlatBVH, BVHTraversalStats } from "./bvh";
export { buildBVH, intersectBVH, intersectBVHAll } from "./bvh";
