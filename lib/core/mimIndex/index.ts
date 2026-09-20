export {
  LEGACY_INDEX_RELOCATIONS,
  SINCERAMIENTO_01_ID,
  ensureDirForWrite,
  isEmptyDir,
  mimIndexLayout,
  samePath,
  type MimIndexLayout,
} from "./layout";

export {
  readSinceramientoMarker,
  runSinceramiento01,
  type SinceramientoInput,
  type SinceramientoReport,
} from "./sinceramiento01";

export { _resetSinceramientoGuardForTests, ensureSinceramiento01 } from "./runMigrations";
export { currentMimIndexLayout } from "./current";

