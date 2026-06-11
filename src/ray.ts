import type { Vec3, Ray, Triangle, HitInfo } from "./types";
import { sub, dot, cross, normalize } from "./math";

/** Create a ray */
export function ray(
  origin: Vec3,
  direction: Vec3,
  tMin = 1e-6,
  tMax = Infinity,
): Ray {
  return { origin, direction, tMin, tMax };
}

/** Evaluate the ray at parameter t: O + t*D */
export function at(r: Ray, t: number): Vec3 {
  return {
    x: r.origin.x + r.direction.x * t,
    y: r.origin.y + r.direction.y * t,
    z: r.origin.z + r.direction.z * t,
  };
}

/**
 * Möller–Trumbore ray-triangle intersection algorithm.
 *
 * Returns HitInfo on success, or null if no intersection within [ray.tMin, ray.tMax].
 */
export function intersectTriangle(
  ray: Ray,
  tri: Triangle,
  primitiveIndex: number,
): HitInfo | null {
  const edge1 = sub(tri.b, tri.a);
  const edge2 = sub(tri.c, tri.a);

  const pVec = cross(ray.direction, edge2);
  const det = dot(edge1, pVec);

  // If determinant is near-zero, the ray is parallel to the triangle
  if (Math.abs(det) < 1e-12) return null;

  const invDet = 1 / det;
  const tVec = sub(ray.origin, tri.a);
  const u = dot(tVec, pVec) * invDet;

  if (u < 0 || u > 1) return null;

  const qVec = cross(tVec, edge1);
  const v = dot(ray.direction, qVec) * invDet;

  if (v < 0 || u + v > 1) return null;

  const t = dot(edge2, qVec) * invDet;

  if (t < ray.tMin || t > ray.tMax) return null;

  // Compute the geometric normal
  const normal = normalize(cross(edge1, edge2));

  return {
    t,
    primitiveIndex,
    u,
    v,
    normal,
  };
}
