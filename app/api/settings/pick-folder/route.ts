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
import { withApiGuard } from "@/lib/apiGuard";

const execPromise = util.promisify(exec);

export const GET = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as Request;

  const { searchParams } = new URL(req.url);
  const initialPath = searchParams.get("initialPath");

  // Script de PowerShell que abre el OpenFileDialog nativo de Windows configurado para carpetas
  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms;
    $f = New-Object System.Windows.Forms.OpenFileDialog;
    $f.ValidateNames = $false;
    $f.CheckFileExists = $false;
    $f.CheckPathExists = $true;
    ${initialPath ? `$f.InitialDirectory = '${initialPath.replace(/'/g, "''")}';` : ""}
    $f.FileName = 'Seleccione esta carpeta';
    if ($f.ShowDialog() -eq 'OK') {
      Write-Output (Split-Path -Parent $f.FileName);
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
);
