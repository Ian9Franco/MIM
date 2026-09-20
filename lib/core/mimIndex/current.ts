import { getMimIndexPath } from "../settings";
import { mimIndexLayout, type MimIndexLayout } from "./layout";

export function currentMimIndexLayout(): MimIndexLayout {
  return mimIndexLayout(getMimIndexPath());
}
