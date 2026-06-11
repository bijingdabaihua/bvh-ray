import type { Vec3 } from "./types";

/** Create a Vec3 */
export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

/** Add two vectors */
export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/** Subtract b from a */
export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/** Scale a vector by a scalar */
export function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

/** Dot product */
export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Cross product */
export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/** Vector length */
export function length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/** Squared length (avoids sqrt) */
export function lengthSq(v: Vec3): number {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

/** Normalize a vector (returns zero vector if input is zero-length) */
export function normalize(v: Vec3): Vec3 {
  const len = length(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return scale(v, 1 / len);
}

/** Component-wise min */
export function min(a: Vec3, b: Vec3): Vec3 {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    z: Math.min(a.z, b.z),
  };
}

/** Component-wise max */
export function max(a: Vec3, b: Vec3): Vec3 {
  return {
    x: Math.max(a.x, b.x),
    y: Math.max(a.y, b.y),
    z: Math.max(a.z, b.z),
  };
}

/** Absolute value of each component */
export function abs(v: Vec3): Vec3 {
  return {
    x: Math.abs(v.x),
    y: Math.abs(v.y),
    z: Math.abs(v.z),
  };
}

/** Negate a vector */
export function neg(v: Vec3): Vec3 {
  return { x: -v.x, y: -v.y, z: -v.z };
}

/** Linear interpolate between a and b by t */
export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return add(a, scale(sub(b, a), t));
}

/** Distance between two points */
export function distance(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}

/** Component-wise multiply (Hadamard product) */
export function mul(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x * b.x, y: a.y * b.y, z: a.z * b.z };
}

/** Component-wise divide */
export function div(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x / b.x, y: a.y / b.y, z: a.z / b.z };
}

/** Index a component by axis (0=x, 1=y, 2=z) */
export function getComponent(v: Vec3, axis: number): number {
  if (axis === 0) return v.x;
  if (axis === 1) return v.y;
  return v.z;
}

/** Set a component by axis (0=x, 1=y, 2=z) */
export function setComponent(v: Vec3, axis: number, val: number): Vec3 {
  if (axis === 0) return { x: val, y: v.y, z: v.z };
  if (axis === 1) return { x: v.x, y: val, z: v.z };
  return { x: v.x, y: v.y, z: val };
}
