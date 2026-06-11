// ---- Types ----
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

// ---- Math ----
export {
  vec3,
  add,
  sub,
  scale,
  dot,
  cross,
  length,
  lengthSq,
  normalize,
  min,
  max,
  abs,
  neg,
  lerp,
  distance,
  mul,
  div,
  getComponent,
  setComponent,
} from "./math";

// ---- AABB ----
export {
  emptyAABB,
  aabb,
  expandPoint,
  union,
  surfaceArea,
  volume,
  centroid,
  extent,
  longestAxis,
  intersectAABB,
  prepareRaySlab,
  intersectAABBPrecomputed,
} from "./aabb";
export type { RaySlabData } from "./aabb";

// ---- Ray ----
export { ray, at, intersectTriangle } from "./ray";

// ---- BVH ----
export {
  buildBVH,
  intersectBVH,
  intersectBVHAll,
} from "./bvh";
export type { FlatBVH, BVHTraversalStats } from "./bvh";
