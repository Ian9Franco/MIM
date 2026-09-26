export type MapPoint = { x: number; y: number };
export type MapRect = { id?: string; x: number; y: number; w: number; h: number };

export const EDGE_CORNER_R = 12;
export const EDGE_OBSTACLE_PAD = 18;
export const EDGE_STUB = 28;

function almostEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.51;
}

export function inflateRect(rect: MapRect, pad: number): MapRect {
  return { id: rect.id, x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 };
}

export function segmentHitsRect(a: MapPoint, b: MapPoint, rect: MapRect): boolean {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  const right = rect.x + rect.w;
  const bottom = rect.y + rect.h;
  if (almostEqual(a.y, b.y)) {
    if (a.y <= rect.y || a.y >= bottom) return false;
    return maxX > rect.x && minX < right;
  }
  if (almostEqual(a.x, b.x)) {
    if (a.x <= rect.x || a.x >= right) return false;
    return maxY > rect.y && minY < bottom;
  }
  return false;
}

export function simplifyOrthogonalPoints(points: MapPoint[]): MapPoint[] {
  const cleaned: MapPoint[] = [];
  for (const point of points) {
    const prev = cleaned[cleaned.length - 1];
    if (prev && almostEqual(prev.x, point.x) && almostEqual(prev.y, point.y)) continue;
    cleaned.push(point);
  }
  const next: MapPoint[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const prev = next[next.length - 1];
    const curr = cleaned[i];
    const after = cleaned[i + 1];
    if (prev && after && almostEqual(prev.x, curr.x) && almostEqual(curr.x, after.x)) continue;
    if (prev && after && almostEqual(prev.y, curr.y) && almostEqual(curr.y, after.y)) continue;
    next.push(curr);
  }
  return next;
}

function pathHits(points: MapPoint[], obstacles: MapRect[]): MapRect | null {
  for (let i = 0; i < points.length - 1; i++) {
    for (const obstacle of obstacles) {
      if (segmentHitsRect(points[i], points[i + 1], obstacle)) return obstacle;
    }
  }
  return null;
}

function elbowPath(from: MapPoint, to: MapPoint): MapPoint[] {
  if (almostEqual(from.x, to.x)) return [from, to];
  const downY = from.y + EDGE_STUB;
  const upY = to.y - EDGE_STUB;
  if (upY > downY + 8) {
    const midY = (downY + upY) / 2;
    return [from, { x: from.x, y: midY }, { x: to.x, y: midY }, to];
  }
  const laneY = Math.max(downY, upY);
  return [
    from,
    { x: from.x, y: laneY },
    { x: to.x, y: laneY },
    { x: to.x, y: upY },
    to,
  ];
}

function detourAround(points: MapPoint[], obstacle: MapRect): MapPoint[] {
  const left = obstacle.x;
  const right = obstacle.x + obstacle.w;
  const top = obstacle.y;
  const bottom = obstacle.y + obstacle.h;
  const cx = obstacle.x + obstacle.w / 2;
  const cy = obstacle.y + obstacle.h / 2;
  const result: MapPoint[] = [points[0]];

  for (let i = 0; i < points.length - 1; i++) {
    const a = result[result.length - 1];
    const b = points[i + 1];
    if (!segmentHitsRect(a, b, obstacle)) {
      result.push(b);
      continue;
    }
    if (almostEqual(a.x, b.x)) {
      const sideX = a.x <= cx ? left : right;
      result.push({ x: sideX, y: a.y });
      result.push({ x: sideX, y: b.y });
      result.push(b);
      continue;
    }
    const sideY = a.y <= cy ? top : bottom;
    result.push({ x: a.x, y: sideY });
    result.push({ x: b.x, y: sideY });
    result.push(b);
  }
  return simplifyOrthogonalPoints(result);
}

export function routeOrthogonalPath(
  from: MapPoint,
  to: MapPoint,
  obstacles: MapRect[],
  skipIds: string[] = [],
): MapPoint[] {
  const skip = new Set(skipIds);
  const inflated = obstacles
    .filter((rect) => !rect.id || !skip.has(rect.id))
    .map((rect) => inflateRect(rect, EDGE_OBSTACLE_PAD));
  let points = simplifyOrthogonalPoints(elbowPath(from, to));
  for (let i = 0; i < 8; i++) {
    const hit = pathHits(points, inflated);
    if (!hit) break;
    const next = detourAround(points, hit);
    if (next.length === points.length && next.every((p, idx) => almostEqual(p.x, points[idx].x) && almostEqual(p.y, points[idx].y))) {
      break;
    }
    points = next;
  }
  return points;
}

export function roundedOrthogonalD(points: MapPoint[], radius = EDGE_CORNER_R): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const inDx = curr.x - prev.x;
    const inDy = curr.y - prev.y;
    const outDx = next.x - curr.x;
    const outDy = next.y - curr.y;
    const inLen = Math.hypot(inDx, inDy) || 1;
    const outLen = Math.hypot(outDx, outDy) || 1;
    const rr = Math.min(radius, inLen / 2, outLen / 2);
    const p1 = { x: curr.x - (inDx / inLen) * rr, y: curr.y - (inDy / inLen) * rr };
    const p2 = { x: curr.x + (outDx / outLen) * rr, y: curr.y + (outDy / outLen) * rr };
    d += ` L ${p1.x} ${p1.y} Q ${curr.x} ${curr.y} ${p2.x} ${p2.y}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}
