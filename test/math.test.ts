import { describe, it, expect } from "vitest";
import {
  vec3,
  add,
  sub,
  dot,
  cross,
  length,
  lengthSq,
  normalize,
  scale,
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
} from "../src/index";

describe("math", () => {
  it("vec3 creates a vector", () => {
    const v = vec3(1, 2, 3);
    expect(v).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("add adds two vectors", () => {
    expect(add(vec3(1, 2, 3), vec3(4, 5, 6))).toEqual({ x: 5, y: 7, z: 9 });
  });

  it("sub subtracts vectors", () => {
    expect(sub(vec3(5, 5, 5), vec3(1, 2, 3))).toEqual({ x: 4, y: 3, z: 2 });
  });

  it("dot calculates dot product", () => {
    expect(dot(vec3(1, 0, 0), vec3(1, 0, 0))).toBe(1);
    expect(dot(vec3(1, 0, 0), vec3(0, 1, 0))).toBe(0);
  });

  it("cross calculates cross product", () => {
    expect(cross(vec3(1, 0, 0), vec3(0, 1, 0))).toEqual({ x: 0, y: 0, z: 1 });
  });

  it("length calculates magnitude", () => {
    expect(length(vec3(1, 0, 0))).toBe(1);
    expect(length(vec3(3, 4, 0))).toBe(5);
  });

  it("lengthSq calculates squared magnitude", () => {
    expect(lengthSq(vec3(3, 4, 0))).toBe(25);
  });

  it("normalize returns unit vector", () => {
    const n = normalize(vec3(3, 4, 0));
    expect(Math.abs(n.x - 0.6)).toBeLessThan(1e-10);
    expect(Math.abs(n.y - 0.8)).toBeLessThan(1e-10);
    expect(Math.abs(length(n) - 1)).toBeLessThan(1e-10);
  });

  it("normalize handles zero vector", () => {
    expect(normalize(vec3(0, 0, 0))).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("scale multiplies by scalar", () => {
    expect(scale(vec3(2, 3, 4), 2)).toEqual({ x: 4, y: 6, z: 8 });
  });

  it("min/max work component-wise", () => {
    expect(min(vec3(1, 5, 2), vec3(3, 2, 4))).toEqual({ x: 1, y: 2, z: 2 });
    expect(max(vec3(1, 5, 2), vec3(3, 2, 4))).toEqual({ x: 3, y: 5, z: 4 });
  });

  it("abs negates negative components", () => {
    expect(abs(vec3(-1, 2, -3))).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("neg negates all components", () => {
    expect(neg(vec3(1, -2, 3))).toEqual({ x: -1, y: 2, z: -3 });
  });

  it("lerp interpolates correctly", () => {
    expect(lerp(vec3(0, 0, 0), vec3(10, 10, 10), 0.5)).toEqual({
      x: 5,
      y: 5,
      z: 5,
    });
  });

  it("distance between two points", () => {
    expect(distance(vec3(0, 0, 0), vec3(3, 4, 0))).toBe(5);
  });

  it("mul/div work component-wise", () => {
    expect(mul(vec3(2, 3, 4), vec3(5, 6, 7))).toEqual({ x: 10, y: 18, z: 28 });
    expect(div(vec3(10, 18, 28), vec3(5, 6, 7))).toEqual({ x: 2, y: 3, z: 4 });
  });

  it("getComponent/setComponent by axis index", () => {
    const v = vec3(1, 2, 3);
    expect(getComponent(v, 0)).toBe(1);
    expect(getComponent(v, 1)).toBe(2);
    expect(getComponent(v, 2)).toBe(3);
    expect(setComponent(v, 0, 10)).toEqual({ x: 10, y: 2, z: 3 });
    expect(setComponent(v, 1, 20)).toEqual({ x: 1, y: 20, z: 3 });
    expect(setComponent(v, 2, 30)).toEqual({ x: 1, y: 2, z: 30 });
  });
});
