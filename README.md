# bvh-ray

[![npm version](https://img.shields.io/npm/v/bvh-ray)](https://www.npmjs.com/package/bvh-ray)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A fast, TypeScript-first **Bounding Volume Hierarchy (BVH)** library for ray tracing — build acceleration structures, traverse them, and find ray-triangle intersections.

## Features

- **SAH (Surface Area Heuristic)** builder — high-quality BVH construction with configurable binning
- **Multiple build strategies** — SAH, median split, and equal-count split
- **Fast traversal** — iterative stack-based traversal with precomputed slab intersection
- **Möller–Trumbore** ray-triangle intersection
- **All-hit queries** — find all primitives along a ray (for shadow rays, transparency, etc.)
- **Tiny & dependency-free** — zero runtime dependencies
- **Tree-shakeable** — import only what you use

## Install

```bash
npm install bvh-ray
```

## Quick Start

```typescript
import { buildBVH, intersectBVH, vec3, ray, type Triangle } from "bvh-ray";

// Define some triangles
const triangles: Triangle[] = [
  { a: vec3(-1, 0, 0), b: vec3(1, 0, 0), c: vec3(0, 1, 0) },
  { a: vec3(0, -1, -5), b: vec3(2, -1, -5), c: vec3(1, 1, -5) },
];

// Build the BVH
const bvh = buildBVH(triangles, {
  strategy: "sah",       // Surface Area Heuristic (default)
  maxPrimsPerLeaf: 4,    // Max triangles per leaf (default: 4)
  numBins: 32,           // SAH bins (default: 32)
});

// Cast a ray
const r = ray(
  vec3(0, 0, 0),             // origin
  vec3(0, 0, -1),            // direction
  1e-6,                      // tMin
  Infinity,                  // tMax
);

const hit = intersectBVH(bvh, r);
if (hit) {
  console.log(`Hit at t=${hit.t}`);
  console.log(`Triangle index: ${hit.primitiveIndex}`);
  console.log(`Barycentric: u=${hit.u}, v=${hit.v}`);
}
```

## API

### Building

| Function | Description |
|---|---|
| `buildBVH(triangles, options?)` | Build a BVH from an array of triangles |
| `buildBVH(triangles, { strategy: "median" })` | Faster build, lower quality |
| `buildBVH(triangles, { strategy: "equal" })` | Medium build speed |
| `buildBVH(triangles, { maxPrimsPerLeaf: 2 })` | Tighter leaves, larger tree |

### Traversal

| Function | Description |
|---|---|
| `intersectBVH(bvh, ray)` | Find the closest intersection |
| `intersectBVHAll(bvh, ray)` | Find all intersecting primitive indices |

### Ray

| Function | Description |
|---|---|
| `ray(origin, direction, tMin?, tMax?)` | Create a ray |
| `at(r, t)` | Evaluate ray at parameter t |
| `intersectTriangle(ray, triangle, index)` | Direct ray-triangle test |

### AABB

| Function | Description |
|---|---|
| `intersectAABB(box, origin, dir, tMin, tMax)` | Ray-AABB intersection |
| `intersectAABBPrecomputed(box, origin, slab, tMin, tMax)` | Faster with precomputed slab data |
| `prepareRaySlab(dir)` | Precompute traversal data for a direction |
| `union(a, b)` | Merge two AABBs |
| `surfaceArea(box)` | Surface area (SAH cost) |

### Math

All standard vector operations: `vec3`, `add`, `sub`, `scale`, `dot`, `cross`, `normalize`, `length`, `lerp`, `min`, `max`, `abs`, `neg`, `distance`, `mul`, `div`, `getComponent`, `setComponent`.

## Build Strategies

| Strategy | Build Time | Ray Tracing Performance | Use Case |
|---|---|---|---|
| `sah` (default) | Slowest | Best | Production rendering |
| `median` | Fastest | Good | Real-time / dynamic scenes |
| `equal` | Medium | Good | General purpose |

## Performance Tips

1. **Reuse `prepareRaySlab`** when testing many AABBs with the same ray direction
2. **Use `intersectBVHAll`** for shadow rays (early exit on any hit)
3. **Prefer fewer SAH bins** (16–32) for dynamic scenes; more bins (64–128) for static quality builds

## License

MIT
