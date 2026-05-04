import { NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export async function GET() {
  // Script de PowerShell para abrir un diálogo de selección de carpeta en Windows
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
    const { stdout } = await execPromise(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`);
    const path = stdout.trim();
    
    if (path) {
      return NextResponse.json({ path });
    } else {
      return NextResponse.json({ path: null }); // Cancelado
    }
  } catch (err) {
    console.error("Folder picker error:", err);
    return NextResponse.json({ error: "Error abriendo el selector" }, { status: 500 });
  }
}
