/**
 * /api/settings/pick-folder — GET
 * ─────────────────────────────────────────────────────────────────────────────
 * Abre el diálogo nativo de selección de carpeta de Windows usando PowerShell.
 * Devuelve la ruta seleccionada o null si el usuario canceló.
 *
 * Solo funciona en Windows. En Linux/macOS devuelve error.
 * Respuesta: { path: string | null }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export async function GET() {
  // Script de PowerShell que abre el FolderBrowserDialog nativo de Windows
  const psScript = `
    Add-Type -AssemblyName System.windows.forms;
    $f = New-Object System.Windows.Forms.FolderBrowserDialog;
    $f.ShowNewFolderButton = $true;
    $f.RootFolder = 'MyComputer';
    if ($f.ShowDialog() -eq 'OK') {
      Write-Output $f.SelectedPath;
    }
  `;

  try {
    const { stdout } = await execPromise(`powershell -Command "${psScript.replace(/\n/g, " ")}"`);
    const selectedPath = stdout.trim();

    // stdout vacío significa que el usuario canceló el diálogo
    return NextResponse.json({ path: selectedPath || null });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/settings/pick-folder] Error:", message);
    return NextResponse.json({ error: "Error abriendo el selector" }, { status: 500 });
  }
}
