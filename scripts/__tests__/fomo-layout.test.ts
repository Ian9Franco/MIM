import assert from "node:assert/strict";
import {
  FOMO_MAIN_WIDTH_CLOSED,
  fomoMainWidthWhenDetailsOpen,
  evaluateFomoLayoutWidth,
} from "../../lib/fomo/fomoLayout";

function assertOpenNeverWiderThanClosed(viewport: number) {
  const closed = evaluateFomoLayoutWidth(FOMO_MAIN_WIDTH_CLOSED, viewport);
  const open = evaluateFomoLayoutWidth(fomoMainWidthWhenDetailsOpen(), viewport);
  assert.ok(closed > 0 && open > 0, `invalid widths at ${viewport}px`);
  assert.ok(open <= closed, `open (${open}) must be <= closed (${closed}) at ${viewport}px`);
}

assertOpenNeverWiderThanClosed(1920);
assertOpenNeverWiderThanClosed(2560);
assertOpenNeverWiderThanClosed(3840);

console.log("✓ FOMO layout: details-open width never exceeds closed width at 1920/2560/3840");
