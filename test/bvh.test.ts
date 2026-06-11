import { describe, it, expect } from "vitest";
import {
  buildBVH,
  vec3,
  ray,
  intersectTriangle,
  intersectBVH,
} from "../src/index";
import type { Triangle } from "../src/index";

function makeTri(a: number[], b: number[], c: number[]): Triangle {
  return {
    a: vec3(a[0], a[1], a[2]),
    b: vec3(b[0], b[1], b[2]),
    c: vec3(c[0], c[1], c[2]),
  };
}

describe("BVH", () => {
  it("builds an empty BVH for no triangles", () => {
    const bvh = buildBVH([]);
    expect(bvh.nodes).toHaveLength(0);
    expect(bvh.primitives).toHaveLength(0);
  });

  it("builds a BVH with a single triangle", () => {
    const tri = makeTri([0, 0, 0], [1, 0, 0], [0, 1, 0]);
    const bvh = buildBVH([tri]);
    expect(bvh.nodes.length).toBeGreaterThanOrEqual(1);
    expect(bvh.primitives).toHaveLength(1);
  });

  it("builds a BVH with multiple triangles", () => {
    const triangles = [
      makeTri([0, 0, 0], [1, 0, 0], [0, 1, 0]),
      makeTri([1, 0, 0], [2, 0, 0], [1, 1, 0]),
      makeTri([2, 0, 0], [3, 0, 0], [2, 1, 0]),
      makeTri([3, 0, 0], [4, 0, 0], [3, 1, 0]),
      makeTri([4, 0, 0], [5, 0, 0], [4, 1, 0]),
    ];
    const bvh = buildBVH(triangles);
    expect(bvh.nodes.length).toBeGreaterThanOrEqual(1);
    expect(bvh.primitives).toHaveLength(5);
    // Root node's AABB should encompass all triangles
    const root = bvh.nodes[0];
    expect(root.aabb.min.x).toBeLessThanOrEqual(0);
    expect(root.aabb.max.x).toBeGreaterThanOrEqual(5);
  });

  it("builds with median split strategy", () => {
    const triangles = [
      makeTri([0, 0, 0], [1, 0, 0], [0, 1, 0]),
      makeTri([5, 0, 0], [6, 0, 0], [5, 1, 0]),
      makeTri([10, 0, 0], [11, 0, 0], [10, 1, 0]),
    ];
    const bvh = buildBVH(triangles, { strategy: "median" });
    expect(bvh.nodes.length).toBeGreaterThanOrEqual(1);
  });

  it("builds with equal split strategy", () => {
    const triangles = [
      makeTri([0, 0, 0], [1, 0, 0], [0, 1, 0]),
      makeTri([5, 0, 0], [6, 0, 0], [5, 1, 0]),
    ];
    const bvh = buildBVH(triangles, { strategy: "equal" });
    expect(bvh.nodes.length).toBeGreaterThanOrEqual(1);
  });

  it("respects maxPrimsPerLeaf option", () => {
    const triangles = Array.from({ length: 20 }, (_, i) =>
      makeTri([i, 0, 0], [i + 1, 0, 0], [i, 1, 0]),
    );
    const bvh = buildBVH(triangles, { maxPrimsPerLeaf: 2 });
    // All leaf nodes should have at most 2 primitives
    for (const node of bvh.nodes) {
      if (node.leftOrPrimCount >= 0) {
        expect(node.rightOrPrimOffset).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe("intersectTriangle", () => {
  it("hits a front-facing triangle", () => {
    const tri = makeTri([-1, 0, 0], [1, 0, 0], [0, 1, 0]);
    const r = ray(vec3(0, 0.25, -5), vec3(0, 0, 1));
    const hit = intersectTriangle(r, tri, 0);
    expect(hit).not.toBeNull();
    expect(hit!.t).toBeCloseTo(5);
  });

  it("misses a triangle behind the ray", () => {
    const tri = makeTri([-1, 0, 0], [1, 0, 0], [0, 1, 0]);
    const r = ray(vec3(0, 0.25, 5), vec3(0, 0, 1));
    const hit = intersectTriangle(r, tri, 0);
    expect(hit).toBeNull();
  });

  it("misses a triangle outside the ray path", () => {
    const tri = makeTri([-1, 0, 0], [1, 0, 0], [0, 1, 0]);
    const r = ray(vec3(5, 0, 0), vec3(0, 0, 1));
    const hit = intersectTriangle(r, tri, 0);
    expect(hit).toBeNull();
  });

  it("reports correct barycentric coordinates", () => {
    const tri = makeTri([-1, 0, 0], [1, 0, 0], [0, 1, 0]);
    // Ray hits the center of the triangle (approximately)
    const r = ray(vec3(0, 0.33, -5), vec3(0, 0, 1));
    const hit = intersectTriangle(r, tri, 0);
    expect(hit).not.toBeNull();
    if (hit) {
      expect(hit.u + hit.v).toBeLessThanOrEqual(1);
      expect(hit.u).toBeGreaterThanOrEqual(0);
      expect(hit.v).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("intersectBVH", () => {
  it("intersects a simple scene", () => {
    const triangles = [
      makeTri([-2, -1, 0], [2, -1, 0], [0, 1, 0]), // large center triangle
    ];
    const bvh = buildBVH(triangles);
    const r = ray(vec3(0, 0, -5), vec3(0, 0, 1));
    const hit = intersectBVH(bvh, r);
    expect(hit).not.toBeNull();
    if (hit) {
      expect(hit.t).toBeCloseTo(5);
      expect(hit.primitiveIndex).toBe(0);
    }
  });

  it("finds closest triangle (not the first one)", () => {
    const triangles = [
      makeTri([-10, -1, 50], [10, -1, 50], [0, 1, 50]),   // far
      makeTri([-10, -1, 5], [10, -1, 5], [0, 1, 5]),      // close
    ];
    const bvh = buildBVH(triangles);
    const r = ray(vec3(0, 0, 0), vec3(0, 0, 1));
    const hit = intersectBVH(bvh, r);
    expect(hit).not.toBeNull();
    if (hit) {
      expect(hit.primitiveIndex).toBe(1); // should hit the close one
      expect(hit.t).toBeCloseTo(5);
    }
  });

  it("misses when no triangle is in the ray path", () => {
    const triangles = [
      makeTri([-2, -1, 0], [2, -1, 0], [0, 1, 0]),
    ];
    const bvh = buildBVH(triangles);
    const r = ray(vec3(100, 0, 0), vec3(0, 0, 1));
    const hit = intersectBVH(bvh, r);
    expect(hit).toBeNull();
  });

  it("respects tMin and tMax", () => {
    const triangles = [
      makeTri([-2, -1, 5], [2, -1, 5], [0, 1, 5]),
    ];
    const bvh = buildBVH(triangles);
    // tMax too short
    const r1 = ray(vec3(0, 0, 0), vec3(0, 0, 1), 0, 3);
    expect(intersectBVH(bvh, r1)).toBeNull();

    // tMin too far
    const r2 = ray(vec3(0, 0, 0), vec3(0, 0, 1), 10, Infinity);
    expect(intersectBVH(bvh, r2)).toBeNull();
  });
});
