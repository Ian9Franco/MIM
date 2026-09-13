function printRequestChanges(log, gateResult, logPath) {
  log("\n─────────────────────────────────────────────────────────────────────────────", "red");
  log("🚨 VEREDICTO: [REQUEST_CHANGES] — CONTROL DE CALIDAD NO SUPERADO", "red");
  log(`Compuerta fallida: ${gateResult.gateTitle}`, "red");
  log(`Motivo:            ${gateResult.reason}`, "red");
  log(`\n📄 Reporte detallado del fallo guardado en:\n   ${logPath}`, "yellow");
}

function printHold(log, branchToCheckout, behindCount, target) {
  log("\n─────────────────────────────────────────────────────────────────────────────", "yellow");
  log("⏸️  VEREDICTO: [HOLD] — COMPUERTAS APROBADAS PERO RAMA DESACTUALIZADA", "yellow");
  log(`• La rama '${branchToCheckout}' superó el 100% de las compuertas de calidad.`);
  log(`• Está ${behindCount} commit(s) por detrás de 'origin/main'.`, "yellow");
  log(`\nAcción: git merge origin/main y npm run pr:audit ${target}\n`);
}

function printReady(log, branchToCheckout) {
  log("\n─────────────────────────────────────────────────────────────────────────────", "green");
  log("✅ VEREDICTO: [READY] — LISTO PARA PROMOCIÓN MANUAL A MAIN", "green");
  log(`• La rama '${branchToCheckout}' superó el 100% de las compuertas de calidad.`);
  log(`• Está al día con 'origin/main'. Corré: npm run pr:promote\n`);
}

module.exports = { printRequestChanges, printHold, printReady };
