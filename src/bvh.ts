import type { Vec3, AABB, BVHNode, Triangle, BVHBuildOptions, HitInfo } from "./types";
import { emptyAABB, expandPoint, centroid, union, longestAxis, intersectAABBPrecomputed, surfaceArea, prepareRaySlab } from "./aabb";
import { intersectTriangle } from "./ray";
import { getComponent } from "./math";

// ---- Flat BVH (the public result type) ----

export interface FlatBVH {
  /** Flat array of nodes; node 0 is the root */
  nodes: BVHNode[];
  /** Primitives indexed by the leaf nodes */
  primitives: Triangle[];
}

// ---- Internal builder structures ----

interface BuildPrimitive {
  /** Index into the original primitive array */
  idx: number;
  /** Centroid of the primitive's AABB */
  centroid: Vec3;
  /** The primitive's full AABB */
  aabb: AABB;
}

interface Bin {
  count: number;
  aabb: AABB;
}

/** Default build options */
const DEFAULTS: Required<BVHBuildOptions> = {
  maxPrimsPerLeaf: 4,
  strategy: "sah",
  numBins: 32,
};

/**
 * Build a flat BVH from an array of triangles.
 * Returns a FlatBVH with a contiguous node array (node 0 = root) and primitives.
 */
export function buildBVH(triangles: Triangle[], options?: BVHBuildOptions): FlatBVH {
  const opts: Required<BVHBuildOptions> = { ...DEFAULTS, ...options };
  const numPrims = triangles.length;

  if (numPrims === 0) {
    return { nodes: [], primitives: [] };
  }

  // Precompute per-primitive AABBs and centroids
  const prims: BuildPrimitive[] = [];
  for (let i = 0; i < numPrims; i++) {
    const tri = triangles[i];
    const bb = emptyAABB();
    const aabb = expandPoint(expandPoint(expandPoint(bb, tri.a), tri.b), tri.c);
    prims.push({
      idx: i,
      centroid: centroid(aabb),
      aabb,
    });
  }

  const nodes: BVHNode[] = [];
  // The builder mutates a working array of indices into `prims`
  const indices = prims.map((_, i) => i);

  buildRecursive(prims, indices, 0, numPrims, nodes, opts);

  return {
    nodes,
    primitives: triangles,
  };
}

/**
 * Recursive BVH construction.
 * `indices[start..end)` is the current span of primitive indices to partition.
 */
function buildRecursive(
  prims: BuildPrimitive[],
  indices: number[],
  start: number,
  end: number,
  nodes: BVHNode[],
  opts: Required<BVHBuildOptions>,
): number {
  const count = end - start;
  const nodeIdx = nodes.length;
  nodes.push({ leftOrPrimCount: 0, rightOrPrimOffset: 0, aabb: emptyAABB() });

  // Compute the AABB of all primitives in this range
  let box = emptyAABB();
  for (let i = start; i < end; i++) {
    box = union(box, prims[indices[i]].aabb);
  }
  nodes[nodeIdx].aabb = box;

  // Leaf: few enough primitives
  if (count <= opts.maxPrimsPerLeaf) {
    nodes[nodeIdx].leftOrPrimCount = start;
    nodes[nodeIdx].rightOrPrimOffset = count;
    return nodeIdx;
  }

  // Find split axis (largest extent)
  const axis = longestAxis(box);
  const splitPos = findSplit(prims, indices, start, end, axis, box, opts);

  if (splitPos <= start || splitPos >= end) {
    // Split failed; fall back to leaf
    nodes[nodeIdx].leftOrPrimCount = start;
    nodes[nodeIdx].rightOrPrimOffset = count;
    return nodeIdx;
  }

  // Partition primitives around the split position
  partitionByAxis(prims, indices, start, end, splitPos, axis);

  // Recurse
  const leftIdx = buildRecursive(prims, indices, start, splitPos, nodes, opts);
  const rightIdx = buildRecursive(prims, indices, splitPos, end, nodes, opts);

  // Store negative indices for internal nodes (offset from this node)
  nodes[nodeIdx].leftOrPrimCount = -(leftIdx - nodeIdx);
  nodes[nodeIdx].rightOrPrimOffset = rightIdx - nodeIdx;

  return nodeIdx;
}

/**
 * Find the best split position using the selected strategy.
 * Returns the index in `indices` where the right partition begins.
 */
function findSplit(
  prims: BuildPrimitive[],
  indices: number[],
  start: number,
  end: number,
  axis: number,
  box: AABB,
  opts: Required<BVHBuildOptions>,
): number {
  switch (opts.strategy) {
    case "sah":
      return findSplitSAH(prims, indices, start, end, axis, box, opts.numBins);
    case "median":
      return findSplitMedian(start, end);
    case "equal":
      return findSplitEqual(start, end);
    default:
      return findSplitSAH(prims, indices, start, end, axis, box, opts.numBins);
  }
}

/** Median split — fastest (O(n)), but lowest quality */
function findSplitMedian(_start: number, end: number): number {
  return Math.floor((0 + end) / 2);
}

/** Equal-count split — simple midpoint of the index range */
function findSplitEqual(start: number, end: number): number {
  return Math.floor((start + end) / 2);
}

/**
 * SAH binning — evaluates `numBins` candidate splits along the chosen axis.
 * Returns the split position (index into `indices`).
 */
function findSplitSAH(
  prims: BuildPrimitive[],
  indices: number[],
  start: number,
  end: number,
  axis: number,
  box: AABB,
  numBins: number,
): number {
  const count = end - start;
  const minC = getComponent(box.min, axis);
  const maxC = getComponent(box.max, axis);
  const range = maxC - minC;

  // Avoid division by zero for degenerate cases
  if (range <= 1e-12) {
    return Math.floor((start + end) / 2);
  }

  const invRange = 1 / range;

  // Initialize bins
  const bins: Bin[] = [];
  for (let i = 0; i < numBins; i++) {
    bins.push({ count: 0, aabb: emptyAABB() });
  }

  // Populate bins
  for (let i = start; i < end; i++) {
    const c = getComponent(prims[indices[i]].centroid, axis);
    let binIdx = Math.floor((c - minC) * invRange * numBins);
    if (binIdx >= numBins) binIdx = numBins - 1;
    if (binIdx < 0) binIdx = 0;
    bins[binIdx].count++;
    bins[binIdx].aabb = union(bins[binIdx].aabb, prims[indices[i]].aabb);
  }

  // Sweep from left to right and compute costs
  const parentSA = surfaceArea(box);
  let bestSplit = Math.floor((start + end) / 2);

  // Prefix-sweep arrays
  const leftCount: number[] = new Array(numBins - 1);
  const leftAABB: AABB[] = new Array(numBins - 1);
  let runningCount = 0;
  let runningBox = emptyAABB();

  for (let i = 0; i < numBins - 1; i++) {
    runningCount += bins[i].count;
    runningBox = union(runningBox, bins[i].aabb);
    leftCount[i] = runningCount;
    leftAABB[i] = runningBox;
  }

  let bestCostFound = Infinity;

  for (let i = 0; i < numBins - 1; i++) {
    const rightCount = count - leftCount[i];
    if (leftCount[i] === 0 || rightCount === 0) continue;

    // Compute right-side AABB by sweeping from right
    let rightBox = emptyAABB();
    for (let j = i + 1; j < numBins; j++) {
      rightBox = union(rightBox, bins[j].aabb);
    }

    const leftSA = surfaceArea(leftAABB[i]);
    const rightSA = surfaceArea(rightBox);

    // SAH cost: C_trav + C_isect * (NL * SA_L/SA_P + NR * SA_R/SA_P)
    const cost =
      1.0 + (leftCount[i] * leftSA + rightCount * rightSA) / parentSA;

    if (cost < bestCostFound) {
      bestCostFound = cost;
      // Map the bin boundary back to a split position in the index array
      // The split goes at the end of the bin group.
      // We approximate by evenly distributing primitives across bins.
      bestSplit = start + Math.floor((count * (i + 1)) / numBins);
    }
  }

  // Clamp bestSplit to valid range
  if (bestSplit <= start) bestSplit = start + 1;
  if (bestSplit >= end) bestSplit = end - 1;

  return bestSplit;
}

/**
 * Partition `indices[start..end)` so that primitives with centroid
 * component < a threshold go to the left.
 *
 * Uses the SAH best-split position computed above — we find the actual
 * centroid value at that split and do a two-way partition.
 */
function partitionByAxis(
  prims: BuildPrimitive[],
  indices: number[],
  start: number,
  end: number,
  splitPos: number,
  axis: number,
): void {
  // The splitPos was approximated from binning. We use an nth-element
  // style partition: find the centroid value at position splitPos.
  // Since the binning already gave us a good guess, we do a simple
  // median-of-three pivot around that position.

  // Collect centroids to find a pivot
  const pivotIdx = Math.min(splitPos, end - 1);
  const pivot = getComponent(prims[indices[pivotIdx]].centroid, axis);

  // Two-way partition
  let i = start;
  let j = end - 1;

  while (i <= j) {
    while (i <= j && getComponent(prims[indices[i]].centroid, axis) < pivot) {
      i++;
    }
    while (i <= j && getComponent(prims[indices[j]].centroid, axis) >= pivot) {
      j--;
    }
    if (i < j) {
      [indices[i], indices[j]] = [indices[j], indices[i]];
      i++;
      j--;
    }
  }

  // If partitioning failed (all on one side), fall back to equal split
  if (i <= start || i >= end) {
    const mid = Math.floor((start + end) / 2);
    // Just do a simple sort on centroid values... this is rare
    // We'll use the original quickselect approach
    quickSelectByAxis(prims, indices, start, end - 1, mid, axis);
    return;
  }
}

/**
 * Quickselect: partition so element at `k` is the k-th smallest by centroid[axis],
 * and elements [start, k) <= element[k] <= elements (k, end).
 */
function quickSelectByAxis(
  prims: BuildPrimitive[],
  indices: number[],
  left: number,
  right: number,
  k: number,
  axis: number,
): void {
  while (left < right) {
    const p = partitionQuick(prims, indices, left, right, axis);
    if (k <= p) {
      right = p;
    } else {
      left = p + 1;
    }
  }
}

function partitionQuick(
  prims: BuildPrimitive[],
  indices: number[],
  left: number,
  right: number,
  axis: number,
): number {
  // Median-of-three pivot
  const mid = left + ((right - left) >> 1);
  const a = getComponent(prims[indices[left]].centroid, axis);
  const b = getComponent(prims[indices[mid]].centroid, axis);
  const c = getComponent(prims[indices[right]].centroid, axis);

  let pivotIdx: number;
  if (a > b) {
    pivotIdx = a > c ? (b > c ? mid : left) : right;
  } else {
    pivotIdx = b > c ? (a > c ? mid : right) : left;
  }

  const pivotVal = getComponent(prims[indices[pivotIdx]].centroid, axis);

  // Swap pivot to end
  [indices[pivotIdx], indices[right]] = [indices[right], indices[pivotIdx]];

  let store = left;
  for (let i = left; i < right; i++) {
    if (getComponent(prims[indices[i]].centroid, axis) < pivotVal) {
      [indices[store], indices[i]] = [indices[i], indices[store]];
      store++;
    }
  }
  [indices[store], indices[right]] = [indices[right], indices[store]];

  return store;
}

// ---- Traversal ----

export interface BVHTraversalStats {
  /** Number of AABB intersection tests performed */
  nodeTests: number;
  /** Number of triangle intersection tests performed */
  triTests: number;
  /** Time spent in traversal (ms) */
  timeMs: number;
}

/**
 * Traverse the BVH and find the closest intersection with the given ray.
 * Returns HitInfo on success, or null if no intersection is found.
 */
export function intersectBVH(
  bvh: FlatBVH,
  ray: { origin: Vec3; direction: Vec3; tMin: number; tMax: number },
): HitInfo | null {
  const { nodes, primitives } = bvh;
  if (nodes.length === 0) return null;

  const slab = prepareRaySlab(ray.direction);
  const stack: number[] = [];
  let closestHit: HitInfo | null = null;
  let tFar = ray.tMax;

  // Iterative stack-based traversal
  let nodeIdx = 0;
  let recurse = true;

  while (recurse) {
    recurse = false;

    while (true) {
      const node = nodes[nodeIdx];

      // Check AABB intersection
      const hit = intersectAABBPrecomputed(
        node.aabb,
        ray.origin,
        slab,
        ray.tMin,
        tFar,
      );

      if (!hit) {
        // Miss: pop from stack or bail
        if (stack.length === 0) break;
        nodeIdx = stack.pop()!;
        continue;
      }

      if (node.leftOrPrimCount >= 0) {
        // Leaf node
        const primStart = node.leftOrPrimCount;
        const primCount = node.rightOrPrimOffset;

        for (let i = 0; i < primCount; i++) {
          const triIdx = primStart + i;
          if (triIdx >= primitives.length) break;

          // Mutate tFar for the ray for subsequent tests
          const hitInfo = intersectTriangle(
            { ...ray, tMax: tFar },
            primitives[triIdx],
            triIdx,
          );

          if (hitInfo) {
            tFar = hitInfo.t;
            closestHit = hitInfo;
          }
        }

        // Pop from stack or bail
        if (stack.length === 0) break;
        nodeIdx = stack.pop()!;
        continue;
      }

      // Internal node: traverse children. Use ray direction to pick near/far.
      const leftIdx = nodeIdx - node.leftOrPrimCount;
      const rightIdx = nodeIdx + node.rightOrPrimOffset;

      // Push the farther child, traverse the nearer one
      const distLeft = nodeDistance(nodes[leftIdx], ray.origin);
      const distRight = nodeDistance(nodes[rightIdx], ray.origin);

      if (distLeft <= distRight) {
        stack.push(rightIdx);
        nodeIdx = leftIdx;
      } else {
        stack.push(leftIdx);
        nodeIdx = rightIdx;
      }
    }

    break;
  }

  return closestHit;
}

/** Heuristic distance from ray origin to node center for traversal ordering */
function nodeDistance(node: BVHNode, origin: Vec3): number {
  const cx = (node.aabb.min.x + node.aabb.max.x) * 0.5;
  const cy = (node.aabb.min.y + node.aabb.max.y) * 0.5;
  const cz = (node.aabb.min.z + node.aabb.max.z) * 0.5;
  const dx = cx - origin.x;
  const dy = cy - origin.y;
  const dz = cz - origin.z;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Collect all primitive indices that intersect the given ray.
 * Useful for shadow rays (any-hit) or multi-hit queries.
 */
export function intersectBVHAll(
  bvh: FlatBVH,
  ray: { origin: Vec3; direction: Vec3; tMin: number; tMax: number },
): number[] {
  const { nodes, primitives } = bvh;
  if (nodes.length === 0) return [];

  const slab = prepareRaySlab(ray.direction);
  const stack: number[] = [];
  const hits: number[] = [];
  let tFar = ray.tMax;

  let nodeIdx = 0;
  const { tMin } = ray;

  while (true) {
    const node = nodes[nodeIdx];

    const hit = intersectAABBPrecomputed(node.aabb, ray.origin, slab, tMin, tFar);
    if (!hit) {
      if (stack.length === 0) break;
      nodeIdx = stack.pop()!;
      continue;
    }

    if (node.leftOrPrimCount >= 0) {
      const primStart = node.leftOrPrimCount;
      const primCount = node.rightOrPrimOffset;

      for (let i = 0; i < primCount; i++) {
        const triIdx = primStart + i;
        if (triIdx >= primitives.length) break;

        const hitInfo = intersectTriangle(
          { ...ray, tMax: tFar },
          primitives[triIdx],
          triIdx,
        );

        if (hitInfo) {
          tFar = hitInfo.t;
          hits.push(triIdx);
        }
      }

      if (stack.length === 0) break;
      nodeIdx = stack.pop()!;
      continue;
    }

    // Internal node
    const leftIdx = nodeIdx - node.leftOrPrimCount;
    const rightIdx = nodeIdx + node.rightOrPrimOffset;

    const distLeft = nodeDistance(nodes[leftIdx], ray.origin);
    const distRight = nodeDistance(nodes[rightIdx], ray.origin);

    if (distLeft <= distRight) {
      stack.push(rightIdx);
      nodeIdx = leftIdx;
    } else {
      stack.push(leftIdx);
      nodeIdx = rightIdx;
    }
  }

  return hits;
}
