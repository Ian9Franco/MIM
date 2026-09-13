const path = require("path");
const fs = require("fs");

function formatTimestamp(now) {
  const pad = (n) => String(n).padStart(2, "0");
  return {
    file: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`,
    human: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  };
}

function buildHeader(sections) {
  return [
    "================================================================================",
    "MIM — INFORME DE FALLO DE COMPUERTA DE CALIDAD",
    "================================================================================",
    ...sections.flatMap(([label, value]) => [`${label}:`.padEnd(22) + value, ""]),
  ].join("\n");
}

function buildSection(title, content) {
  return [
    "",
    "────────────────────────────────────────────────────────────────────────────────",
    `${title}:`,
    "────────────────────────────────────────────────────────────────────────────────",
    content || "(vacío)",
  ].join("\n");
}

function saveGateFailureLog(repoRoot, options) {
  const {
    logSubdir = "gate-failures",
    filePrefix = "gate-failed",
    target = "local",
    branchName = "unknown",
    failedGate = "unknown",
    failedGateId,
    ciJob,
    reason = "Unknown",
    output = "",
    extraSections = [],
  } = options;

  const logDir = path.join(repoRoot, "logs", logSubdir);
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const now = new Date();
  const { file: timestamp, human: humanTime } = formatTimestamp(now);
  const sanitizedTarget = String(target).replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePath = path.join(logDir, `${filePrefix}-${sanitizedTarget}-${timestamp}.log`);

  const sections = [
    ["Fecha y Hora", humanTime],
    ["Objetivo", target],
    ["Rama", branchName],
    ["Compuerta fallida", failedGate],
    ...(failedGateId ? [["Gate ID", failedGateId]] : []),
    ...(ciJob ? [["Job CI equivalente", ciJob]] : []),
    ["Motivo", reason],
  ];

  let content = buildHeader(sections);
  for (const section of extraSections) content += buildSection(section.title, section.content);
  content += buildSection("SALIDA DE LA COMPUERTA FALLIDA:", output || "(Sin salida capturada)");
  content += "================================================================================\n";

  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

module.exports = { saveGateFailureLog };
