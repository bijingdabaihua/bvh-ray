import type { Vec3, AABB } from "./types";
import { min, max, getComponent } from "./math";

/** Create an empty (inverted) AABB — useful for incremental expansion */
export function emptyAABB(): AABB {
  return {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity },
  };
}

/** Create an AABB from min/max coordinates */
export function aabb(min: Vec3, max: Vec3): AABB {
  return { min, max };
}

/** Expand an AABB to include a point */
export function expandPoint(box: AABB, p: Vec3): AABB {
  return {
    min: min(box.min, p),
    max: max(box.max, p),
  };
}

/** Expand an AABB to encompass another AABB */
export function union(a: AABB, b: AABB): AABB {
  return {
    min: min(a.min, b.min),
    max: max(a.max, b.max),
  };
}

/** Surface area of an AABB (used in SAH cost calculation) */
export function surfaceArea(box: AABB): number {
  const d = {
    x: box.max.x - box.min.x,
    y: box.max.y - box.min.y,
    z: box.max.z - box.min.z,
  };
  // Handle degenerate boxes
  if (d.x < 0 || d.y < 0 || d.z < 0) return 0;
  // 2*(dx*dy + dx*dz + dy*dz)
  return 2 * (d.x * d.y + d.x * d.z + d.y * d.z);
}

/** Volume of an AABB */
export function volume(box: AABB): number {
  const d = {
    x: box.max.x - box.min.x,
    y: box.max.y - box.min.y,
    z: box.max.z - box.min.z,
  };
  if (d.x < 0 || d.y < 0 || d.z < 0) return 0;
  return d.x * d.y * d.z;
}

/** Centroid of the AABB */
export function centroid(box: AABB): Vec3 {
  return {
    x: (box.min.x + box.max.x) * 0.5,
    y: (box.min.y + box.max.y) * 0.5,
    z: (box.min.z + box.max.z) * 0.5,
  };
}

/** Get the extent (size) of the AABB along each axis */
export function extent(box: AABB): Vec3 {
  return {
    x: box.max.x - box.min.x,
    y: box.max.y - box.min.y,
    z: box.max.z - box.min.z,
  };
}

/** Find the axis with the largest extent (0=x, 1=y, 2=z) */
export function longestAxis(box: AABB): number {
  const ex = box.max.x - box.min.x;
  const ey = box.max.y - box.min.y;
  const ez = box.max.z - box.min.z;
  if (ex >= ey && ex >= ez) return 0;
  if (ey >= ez) return 1;
  return 2;
}

/** Check if a ray intersects an AABB; returns tNear, tFar or null */
export function intersectAABB(
  box: AABB,
  rayOrigin: Vec3,
  rayDir: Vec3,
  tMin: number,
  tMax: number,
): [number, number] | null {
  let tNear = tMin;
  let tFar = tMax;

  for (let axis = 0; axis < 3; axis++) {
    const invDir = 1 / getComponent(rayDir, axis);
    const origin = getComponent(rayOrigin, axis);
    const bMin = getComponent(box.min, axis);
    const bMax = getComponent(box.max, axis);

    let t0 = (bMin - origin) * invDir;
    let t1 = (bMax - origin) * invDir;

    if (invDir < 0) [t0, t1] = [t1, t0];

    tNear = tNear > t0 ? tNear : t0;
    tFar = tFar < t1 ? tFar : t1;

    if (tNear > tFar) return null;
  }

  return [tNear, tFar];
}

/** Precomputed ray data for faster slab-based AABB intersection */
export interface RaySlabData {
  invDir: Vec3;
  negDir: [boolean, boolean, boolean];
}

/** Precompute inverse direction and sign flags for a ray direction */
export function prepareRaySlab(dir: Vec3): RaySlabData {
  return {
    invDir: {
      x: 1 / dir.x,
      y: 1 / dir.y,
      z: 1 / dir.z,
    },
    negDir: [dir.x < 0, dir.y < 0, dir.z < 0],
  };
}

/**
 * Faster AABB intersection using precomputed slab data.
 * See "A Fast and Robust Ray-Box Intersection Algorithm" (Williams et al.)
 */
export function intersectAABBPrecomputed(
  box: AABB,
  rayOrigin: Vec3,
  slab: RaySlabData,
  tMin: number,
  tMax: number,
): boolean {
  // For each axis, pick near/far slabs based on direction sign
  let tNear = tMin;
  let tFar = tMax;

  // X axis
  {
    const t0 = (box.min.x - rayOrigin.x) * slab.invDir.x;
    const t1 = (box.max.x - rayOrigin.x) * slab.invDir.x;
    const near = slab.negDir[0] ? t1 : t0;
    const far = slab.negDir[0] ? t0 : t1;
    if (near > tNear) tNear = near;
    if (far < tFar) tFar = far;
    if (tNear > tFar) return false;
  }

  // Y axis
  {
    const t0 = (box.min.y - rayOrigin.y) * slab.invDir.y;
    const t1 = (box.max.y - rayOrigin.y) * slab.invDir.y;
    const near = slab.negDir[1] ? t1 : t0;
    const far = slab.negDir[1] ? t0 : t1;
    if (near > tNear) tNear = near;
    if (far < tFar) tFar = far;
    if (tNear > tFar) return false;
  }

  // Z axis
  {
    const t0 = (box.min.z - rayOrigin.z) * slab.invDir.z;
    const t1 = (box.max.z - rayOrigin.z) * slab.invDir.z;
    const near = slab.negDir[2] ? t1 : t0;
    const far = slab.negDir[2] ? t0 : t1;
    if (near > tNear) tNear = near;
    if (far < tFar) tFar = far;
    if (tNear > tFar) return false;
  }

  return true;
}
