import assert from "node:assert/strict";
import { draftDownloadRelativePath } from "../../lib/downloads/draftDownloadFolderPath";

assert.equal(
  draftDownloadRelativePath({ side: "client", category: "client:performance", content_type: "mod" }),
  "client/Rendimiento",
);

assert.equal(
  draftDownloadRelativePath(
    { side: "server", category: "server:world", content_type: "mod" },
    { categories: {}, labels: { "server:world": "Mundo custom" }, children: [] },
  ),
  "server/Mundo custom",
);

assert.equal(
  draftDownloadRelativePath({ content_type: "shader", category: "both:other" }),
  "client/Otros / Sin Asignar",
);

console.log("draft-download-folder-path.test.ts OK");
