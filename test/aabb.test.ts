import { describe, it, expect } from "vitest";
import {
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
  vec3,
} from "../src/index";

describe("AABB", () => {
  it("emptyAABB has inverted bounds", () => {
    const b = emptyAABB();
    expect(b.min.x).toBe(Infinity);
    expect(b.max.x).toBe(-Infinity);
  });

  it("expandPoint grows the AABB to include a point", () => {
    const b = expandPoint(emptyAABB(), vec3(1, 2, 3));
    expect(b.min).toEqual({ x: 1, y: 2, z: 3 });
    expect(b.max).toEqual({ x: 1, y: 2, z: 3 });

    const b2 = expandPoint(b, vec3(-1, 5, 0));
    expect(b2.min).toEqual({ x: -1, y: 2, z: 0 });
    expect(b2.max).toEqual({ x: 1, y: 5, z: 3 });
  });

  it("union combines two AABBs", () => {
    const a = aabb(vec3(0, 0, 0), vec3(2, 2, 2));
    const b = aabb(vec3(1, 1, 1), vec3(3, 3, 3));
    const u = union(a, b);
    expect(u.min).toEqual({ x: 0, y: 0, z: 0 });
    expect(u.max).toEqual({ x: 3, y: 3, z: 3 });
  });

  it("surfaceArea calculates correctly", () => {
    const b = aabb(vec3(0, 0, 0), vec3(2, 3, 4));
    // 2*(2*3 + 2*4 + 3*4) = 2*(6+8+12) = 52
    expect(surfaceArea(b)).toBe(52);
  });

  it("surfaceArea of degenerate box is 0", () => {
    const b = aabb(vec3(0, 0, 0), vec3(-1, -1, -1));
    expect(surfaceArea(b)).toBe(0);
  });

  it("volume calculates correctly", () => {
    const b = aabb(vec3(0, 0, 0), vec3(2, 3, 4));
    expect(volume(b)).toBe(24);
  });

  it("centroid is at the middle", () => {
    const b = aabb(vec3(1, 2, 3), vec3(5, 6, 7));
    expect(centroid(b)).toEqual({ x: 3, y: 4, z: 5 });
  });

  it("extent returns size along each axis", () => {
    const b = aabb(vec3(1, 2, 3), vec3(5, 8, 4));
    expect(extent(b)).toEqual({ x: 4, y: 6, z: 1 });
  });

  it("longestAxis finds the longest extent", () => {
    expect(longestAxis(aabb(vec3(0, 0, 0), vec3(5, 1, 1)))).toBe(0);
    expect(longestAxis(aabb(vec3(0, 0, 0), vec3(1, 5, 1)))).toBe(1);
    expect(longestAxis(aabb(vec3(0, 0, 0), vec3(1, 1, 5)))).toBe(2);
  });

  it("intersectAABB hits a box from the front", () => {
    const box = aabb(vec3(-1, -1, -1), vec3(1, 1, 1));
    const result = intersectAABB(box, vec3(0, 0, -5), vec3(0, 0, 1), 0, Infinity);
    expect(result).not.toBeNull();
    if (result) {
      expect(result[0]).toBeCloseTo(4);
      expect(result[1]).toBeCloseTo(6);
    }
  });

  it("intersectAABB misses a box", () => {
    const box = aabb(vec3(-1, -1, -1), vec3(1, 1, 1));
    const result = intersectAABB(box, vec3(10, 0, 0), vec3(0, 0, 1), 0, Infinity);
    expect(result).toBeNull();
  });

  it("intersectAABB handles ray inside the box", () => {
    const box = aabb(vec3(-1, -1, -1), vec3(1, 1, 1));
    const result = intersectAABB(box, vec3(0, 0, 0), vec3(0, 0, 1), 0, Infinity);
    expect(result).not.toBeNull();
    if (result) {
      expect(result[0]).toBeCloseTo(0);
      expect(result[1]).toBeCloseTo(1);
    }
  });

  it("intersectAABBPrecomputed matches intersectAABB", () => {
    const box = aabb(vec3(-2, -2, -2), vec3(2, 2, 2));
    const dir = vec3(1, 2, 3);
    const slab = prepareRaySlab(dir);

    const result1 = intersectAABB(box, vec3(-5, -5, -5), dir, 0, Infinity);
    const result2 = intersectAABBPrecomputed(
      box,
      vec3(-5, -5, -5),
      slab,
      0,
      Infinity,
    );

    // Both should report a hit (or both miss)
    expect(result1 !== null).toBe(result2);
  });

  it("prepareRaySlab stores correct sign flags", () => {
    const slab1 = prepareRaySlab(vec3(1, -2, 3));
    expect(slab1.negDir).toEqual([false, true, false]);

    const slab2 = prepareRaySlab(vec3(-1, 2, -3));
    expect(slab2.negDir).toEqual([true, false, true]);
  });
});
