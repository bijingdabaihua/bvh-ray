/**
 * BVH — Bounding Volume Hierarchy.
 *
 * Single export: the `BVH` class.
 * Builds a BVH from triangles. No ray-intersection logic included.
 *
 * **Input**: flat float array, every 9 numbers = one triangle
 *   `[ax, ay, az, bx, by, bz, cx, cy, cz, ...]`
 *
 * **Output**: flat node array, every 8 numbers = one node
 *   `[minX, minY, minZ, maxX, maxY, maxZ, leftOrPrimCount, rightOrPrimOffset, ...]`
 *
 *   - `leftOrPrimCount >= 0` → leaf: start index into triangles
 *   - `leftOrPrimCount < 0`  → internal: offset to left child from this node
 *   - `rightOrPrimOffset`    → leaf: primitive count; internal: offset to right child
 *
 * All data uses plain Float64Array — no custom types required.
 */

import { buildBVH } from "./bvh";

type FloatArray = Float64Array | Float32Array | number[];

// 8 floats per node (aabb min/max + 2 ints stored as floats)
const NODE_STRIDE = 8;

export class BVH {
  /** Flat node array (stride = 8 floats per node) */
  readonly nodes: Float64Array;
  /** Number of nodes */
  readonly nodeCount: number;
  /** Flat triangle array (stride = 9 floats per triangle) */
  readonly triangles: Float64Array;

  /**
   * Build a BVH from triangles.
   *
   * @param triangles — flat array of 9n numbers (3 vertices × 3 components).
   *   Accepts Float64Array, Float32Array, or plain number[].
   * @param options   — optional builder settings.
   */
  constructor(
    triangles: FloatArray,
    options?: {
      /** Max primitives per leaf node (default: 4) */
      maxPrimsPerLeaf?: number;
      /** Split strategy: "sah" | "median" | "equal" (default: "sah") */
      strategy?: "sah" | "median" | "equal";
      /** Number of SAH bins (default: 32, only used for "sah") */
      numBins?: number;
    },
  ) {
    // Normalize input to Float64Array
    const src =
      triangles instanceof Float64Array
        ? triangles
        : triangles instanceof Float32Array
          ? new Float64Array(triangles)
          : new Float64Array(triangles);

    this.triangles = src;
    const triCount = Math.floor(src.length / 9);

    // Convert flat array → internal Triangle[] for the builder
    const tris: Triangle[] = new Array(triCount);
    for (let i = 0; i < triCount; i++) {
      const o = i * 9;
      tris[i] = {
        a: { x: src[o], y: src[o + 1], z: src[o + 2] },
        b: { x: src[o + 3], y: src[o + 4], z: src[o + 5] },
        c: { x: src[o + 6], y: src[o + 7], z: src[o + 8] },
      };
    }

    // Build the BVH
    const result = buildBVH(tris, options);

    // Flatten nodes into Float64Array
    this.nodeCount = result.nodes.length;
    const flat = new Float64Array(this.nodeCount * NODE_STRIDE);
    for (let i = 0; i < this.nodeCount; i++) {
      const o = i * NODE_STRIDE;
      const n = result.nodes[i];
      flat[o] = n.aabb.min.x;
      flat[o + 1] = n.aabb.min.y;
      flat[o + 2] = n.aabb.min.z;
      flat[o + 3] = n.aabb.max.x;
      flat[o + 4] = n.aabb.max.y;
      flat[o + 5] = n.aabb.max.z;
      flat[o + 6] = n.leftOrPrimCount;
      flat[o + 7] = n.rightOrPrimOffset;
    }
    this.nodes = flat;
  }
}

// Internal type used only during construction (not exported)
interface Vec3 { x: number; y: number; z: number }
interface Triangle { a: Vec3; b: Vec3; c: Vec3 }
