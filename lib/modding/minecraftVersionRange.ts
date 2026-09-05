/** Numeric Minecraft releases plus explicit wildcards, bounds and inclusive ranges.
 * Snapshots/pre-releases match only by exact name; unknown syntax fails closed.
 */
export function matchesMinecraftVersion(requirement: string, version: string): boolean {
  const range = requirement.trim();
  const active = version.trim();
  if (!range || range === "unknown" || range === "*" || range === active) return true;
  if (!/^\d+\.\d+(?:\.\d+)?$/.test(active)) return false;
  const compare = (left: string, right: string) => {
    const a = left.split(".").map(Number), b = right.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      const difference = (a[i] ?? 0) - (b[i] ?? 0);
      if (difference) return Math.sign(difference);
    }
    return 0;
  };
  if (range.includes("||")) return range.split("||").every(r => r.trim()) && range.split("||").some(r => matchesMinecraftVersion(r, active));
  const hyphen = range.match(/^(\d+\.\d+(?:\.\d+)?)\s+-\s+(\d+\.\d+(?:\.\d+)?)$/);
  if (hyphen) return compare(active, hyphen[1]) >= 0 && compare(active, hyphen[2]) <= 0;
  const interval = range.match(/^([[(])(\d+\.\d+(?:\.\d+)?)?,\s*(\d+\.\d+(?:\.\d+)?)?([)\]])$/);
  if (interval) return (!interval[2] || compare(active, interval[2]) >= (interval[1] === "[" ? 0 : 1)) &&
    (!interval[3] || compare(active, interval[3]) <= (interval[4] === "]" ? 0 : -1));
  const plus = range.match(/^(\d+\.\d+(?:\.\d+)?)\+$/);
  if (plus) return compare(active, plus[1]) >= 0;
  if (/^[<>]=?/.test(range)) {
    const bounds = range.match(/[<>]=?\s*\d+\.\d+(?:\.\d+)?/g);
    if (!bounds || bounds.join("").replace(/\s/g, "") !== range.replace(/\s/g, "")) return false;
    return bounds.every(bound => {
      const [, op, release] = bound.match(/^([<>]=?)\s*(.*)$/)!;
      const c = compare(active, release);
      return op === ">=" ? c >= 0 : op === ">" ? c > 0 : op === "<=" ? c <= 0 : c < 0;
    });
  }
  // A two-component release denotes its patch family; three components are exact.
  if (/^\d+\.\d+$/.test(range)) return active === range || active.startsWith(`${range}.`);
  if (/^\d+(?:\.\d+)?\.(?:x|\*)$/i.test(range)) {
    const family = range.slice(0, -2);
    return active === family || active.startsWith(`${family}.`);
  }
  return false;
}
