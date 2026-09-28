import assert from "node:assert/strict";
import {
  childCategoryId,
  defaultCategoryPosition,
  mergeMapLayout,
  parseChildCategoryId,
  parseMapLayout,
  relocateCategoryLayout,
  removeMapChild,
  reparentMapChild,
  resolveCategoryPositions,
  resolveItemChildId,
  sortItemsInCategory,
  withCategoryLabel,
  withItemsAssignedToCategory,
} from "../../lib/fomo/draftMapLayout";
import {
  roundedOrthogonalD,
  routeOrthogonalPath,
  segmentHitsRect,
} from "../../lib/fomo/draftMapEdges";
import {
  chaptersFromYtDlp,
  mergeTimelineMarkers,
  parseClockToSeconds,
  parseDescriptionTimestamps,
} from "../../lib/fomo/videoTimelineMarkers";

async function run() {
  const parsed = parseMapLayout({
    categories: { core: { x: 10, y: 20 } },
    labels: { core: "Libs" },
  });
  assert.equal(parsed.categories.core.x, 10);
  assert.equal(parsed.labels.core, "Libs");
  assert.ok(parsed.categories.client);
  assert.ok(parsed.categories.server);
  assert.ok(parsed.categories.both);
  assert.equal(parsed.children.filter((child) => child.slug === "other").length, 3);

  const fromGraph = parseMapLayout({
    nodes: [
      { id: "client", x: 1, y: 2, label: "Cliente" },
      { id: "perf", parent: "client", x: 30, y: 40, label: "Rendimiento" },
    ],
    edges: [{ from: "client", to: "perf" }],
  });
  assert.equal(fromGraph.labels.client, "Cliente");
  assert.equal(fromGraph.categories.perf.x, 30);
  assert.ok(fromGraph.children.some((child) => child.id === "client:perf" && child.parent === "client"));

  assert.equal(childCategoryId("client", "performance"), "client:performance");
  assert.deepEqual(parseChildCategoryId("server:world"), { parent: "server", slug: "world" });
  assert.equal(resolveItemChildId({ side: "client", category: "performance" }), "client:performance");
  assert.equal(resolveItemChildId({ side: "both", category: "core" }), "both:core");

  const first = defaultCategoryPosition(0);
  const fifth = defaultCategoryPosition(4);
  assert.equal(first.x, 24);
  assert.ok(fifth.y > first.y);

  const positions = resolveCategoryPositions(["core", "world"], parseMapLayout({}));
  assert.ok(positions.core);
  assert.ok(positions.world);

  const labeled = withCategoryLabel(parsed, "core", "Bibliotecas");
  assert.equal(labeled.labels.core, "Bibliotecas");
  const moved = relocateCategoryLayout(
    { categories: { vehiculos: { x: 5, y: 6 } }, labels: { vehiculos: "Cars" }, children: [] },
    "vehiculos",
    "autos",
  );
  assert.equal(moved.categories.autos.x, 5);
  assert.equal(moved.labels.autos, "Cars");
  assert.equal(moved.categories.vehiculos, undefined);

  const reparented = reparentMapChild(parseMapLayout({
    children: [{ id: "client:mobs", parent: "client", slug: "mobs", label: "Fauna" }],
  }), "client:mobs", "server");
  assert.equal(reparented.ok, true);
  if (reparented.ok) {
    assert.equal(reparented.toId, "server:mobs");
    assert.ok(reparented.layout.children.some((child) => child.id === "server:mobs" && child.parent === "server"));
  }

  const mergedLayout = mergeMapLayout(parseMapLayout({}), {
    categories: { "both:core": { x: 99, y: 88 } },
    labels: {},
    children: [],
    itemOrder: { "both:core": ["a", "b"] },
  });
  assert.equal(mergedLayout.categories["both:core"].x, 99);
  assert.deepEqual(mergedLayout.itemOrder?.["both:core"], ["a", "b"]);

  const ordered = sortItemsInCategory(
    [
      { id: "b", mod_name: "Beta" },
      { id: "a", mod_name: "Alpha" },
      { id: "c", mod_name: "Gamma" },
    ],
    "both:core",
    { categories: {}, labels: {}, children: [], itemOrder: { "both:core": ["c", "a"] } },
  );
  assert.deepEqual(ordered.map((item) => item.id), ["c", "a", "b"]);

  const assigned = withItemsAssignedToCategory(
    { categories: {}, labels: {}, children: [], itemOrder: { "client:other": ["x"] } },
    "both:utility",
    ["y", "z"],
  );
  assert.deepEqual(assigned.itemOrder?.["both:utility"], ["y", "z"]);
  assert.deepEqual(assigned.itemOrder?.["client:other"], ["x"]);

  const withItems = parseMapLayout({
    children: [{ id: "client:performance", parent: "client", slug: "performance", label: "Rendimiento" }],
    itemOrder: { "client:performance": ["mod-a", "mod-b"] },
  });
  const removed = removeMapChild(withItems, "client:performance");
  assert.equal(removed.ok, true);
  if (removed.ok) {
    assert.equal(removed.otherId, "client:other");
    assert.deepEqual(removed.layout.itemOrder?.["client:other"]?.slice(-2), ["mod-a", "mod-b"]);
    assert.equal(removed.layout.children.some((child) => child.id === "client:performance"), false);
    assert.equal(removed.layout.children.some((child) => child.id === "client:other"), true);
  }
  const protectedOther = removeMapChild(withItems, "client:other");
  assert.equal(protectedOther.ok, false);
  if (!protectedOther.ok) assert.equal(protectedOther.reason, "protected");

  const renamedPreset = withCategoryLabel(withItems, "client:performance", "FPS");
  assert.equal(renamedPreset.labels["client:performance"], "FPS");
  assert.equal(renamedPreset.children.find((child) => child.id === "client:performance")?.id, "client:performance");
  assert.equal(renamedPreset.children.find((child) => child.id === "client:performance")?.label, "FPS");

  const clearPath = routeOrthogonalPath({ x: 50, y: 0 }, { x: 50, y: 120 }, []);
  assert.equal(clearPath.length, 2);
  const around = routeOrthogonalPath(
    { x: 40, y: 0 },
    { x: 40, y: 200 },
    [{ id: "block", x: 20, y: 60, w: 40, h: 40 }],
  );
  const svg = roundedOrthogonalD(around);
  assert.match(svg, /[MLQ]/);
  assert.equal(/C /.test(svg), false);
  assert.ok(around.some((point) => point.x < 20 || point.x > 60));
  const midHit = around.some((point, index) => {
    if (index === around.length - 1) return false;
    return segmentHitsRect(point, around[index + 1], { x: 20, y: 60, w: 40, h: 40 });
  });
  assert.equal(midHit, false);

  assert.equal(parseClockToSeconds("1", "02", "03"), 3723);
  const cuts = parseDescriptionTimestamps("0:45 - Sodium\n1:10 Spoiler: End fight\nnot a stamp");
  assert.equal(cuts[0].t, 45);
  assert.equal(cuts[0].kind, "cut");
  assert.equal(cuts[1].spoiler, true);

  const chapters = chaptersFromYtDlp([{ start_time: 0, title: "Intro" }, { start_time: 45, title: "Sodium" }]);
  const merged = mergeTimelineMarkers(chapters, cuts);
  assert.equal(merged.some((m) => m.kind === "chapter" && m.label === "Intro"), true);
  assert.equal(merged.filter((m) => m.t === 45).length, 1);
  assert.equal(merged.some((m) => m.label.includes("End fight")), true);

  console.log("✓ Draft map layout + video timeline markers");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
