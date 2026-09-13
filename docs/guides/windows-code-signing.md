# Firma Authenticode de MIM Desktop (Windows)

SmartScreen muestra **“Editor desconocido”** cuando el instalable no está firmado. No es un virus: Windows no confía en el publicador. La descarga funciona; el aviso aparece al ejecutar.

Esta guía prepara la firma en el workflow de release **sin obligar un bump de versión**. El próximo tag (`v11.4.8+` o el que corresponda) saldrá firmado si los secrets están cargados.

---

## Qué hace falta

1. Un certificado **Code Signing** para Windows (PFX/PKCS#12).
   - **OV**: firma válida; SmartScreen puede tardar en confiar.
   - **EV** (recomendado): mejor reputación inmediata con SmartScreen.
2. Dos secrets en el repo GitHub (`Settings → Secrets and variables → Actions`):

| Secret | Contenido |
| :--- | :--- |
| `WIN_CSC_LINK` | PFX en **base64** (una sola línea), o URL HTTPS al PFX |
| `WIN_CSC_KEY_PASSWORD` | Contraseña del PFX |

El workflow `Release MIM Desktop` ya pasa esos valores a electron-builder como `CSC_LINK` / `CSC_KEY_PASSWORD`. Si faltan, el build sigue siendo **unsigned** (mismo aviso de SmartScreen).

---

## Generar el base64 del PFX (local)

```powershell
# PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\mim-codesign.pfx")) | Set-Clipboard
```

```bash
# macOS / Linux
base64 -w0 mim-codesign.pfx | pbcopy   # o xclip / wl-copy
```

Pegá el resultado en `WIN_CSC_LINK`. **No** subas el PFX al repo.

---

## Verificar en un release

1. Cargá los secrets.
2. Publicá el próximo tag de release (o `workflow_dispatch` del release existente).
3. En el job **Package Windows Standalone**, el log de electron-builder debe mencionar signing / certificate.
4. En el `.exe` descargado: propiedades → **Firmas digitales** → debería aparecer tu organización, no “Editor desconocido”.

---

## Notas

- `forceCodeSigning` está en `false` a propósito: sin secrets el CI no debe romper.
- No hace falta sacar una versión solo para cablear la firma; alcanza con tener los secrets listos antes del próximo release real.
- Proveedores habituales: DigiCert, Sectigo, SSL.com; también hay opciones cloud (Azure Trusted Signing, DigiCert KeyLocker) si preferís no manejar el PFX en CI.
