/** 3-component vector */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Ray {
  origin: Vec3;
  direction: Vec3;
  /** Minimum valid distance along the ray (typically 0 or a small epsilon) */
  tMin: number;
  /** Maximum valid distance along the ray */
  tMax: number;
}

/** Axis-Aligned Bounding Box */
export interface AABB {
  min: Vec3;
  max: Vec3;
}

/** Triangle primitive defined by three vertices */
export interface Triangle {
  a: Vec3;
  b: Vec3;
  c: Vec3;
}

/** BVH node stored compactly in a flat array */
export interface BVHNode {
  /** If >= 0, this is a leaf node indexing into the primitive array.
   *  If < 0, this is an internal node indexing into the node array. */
  leftOrPrimCount: number;
  /** For internal nodes: index of the right child.
   *  For leaf nodes: number of primitives in this leaf. */
  rightOrPrimOffset: number;
  /** Bounding box of this node */
  aabb: AABB;
}

/** Result of a ray-primitive intersection */
export interface HitInfo {
  /** Distance along the ray at which the intersection occurred */
  t: number;
  /** Index of the intersected primitive */
  primitiveIndex: number;
  /** Barycentric coordinate u */
  u: number;
  /** Barycentric coordinate v */
  v: number;
  /** Surface normal at the intersection point */
  normal: Vec3;
}

/**
 * Splitting strategy used during BVH construction.
 * - `sah` (Surface Area Heuristic): best quality, moderately slower to build
 * - `median`: fastest build, reasonable quality
 * - `equal`: equal-count splits, medium build speed and quality
 */
export type SplitStrategy = "sah" | "median" | "equal";

/** Configuration for the BVH builder */
export interface BVHBuildOptions {
  /** Maximum number of primitives per leaf node (default: 4) */
  maxPrimsPerLeaf?: number;
  /** Splitting strategy (default: "sah") */
  strategy?: SplitStrategy;
  /** Number of SAH bins to use (default: 32, only used for "sah") */
  numBins?: number;
}
