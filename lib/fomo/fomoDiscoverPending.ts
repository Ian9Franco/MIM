import type { FomoDiscoverPendingAction } from "@/components/fomo/sidebar/fomoSidebarTypes";

let pending: FomoDiscoverPendingAction | null = null;

export function queueFomoDiscoverAction(action: FomoDiscoverPendingAction) {
  pending = action;
}

export function consumeFomoDiscoverAction(): FomoDiscoverPendingAction | null {
  const action = pending;
  pending = null;
  return action;
}
