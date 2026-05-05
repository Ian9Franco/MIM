/**
 * MIM — Security Scan API
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/security/scan
 *
 * Performs behavioral risk analysis on JAR files using the Threat Detection
 * Engine. Returns a 0-100 risk score with categorized findings.
 *
 * Body (single file):
 *   { "filePath": "D:\\.mine\\source\\...\\mod.jar" }
 *
 * Body (batch):
 *   { "filePaths": ["path1.jar", "path2.jar", ...] }
 *
 * Response:
 *   {
 *     "success": true,
 *     "result": {
 *       "riskScore": 45,
 *       "riskLevel": "caution",
 *       "sha1": "a1b2c3...",
 *       "findings": [...],
 *       "summary": "Low-risk patterns detected...",
 *       "scannedAt": "2026-05-04T..."
 *     }
 *   }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { scanSecurity, scanSecurityBatch } from "@/lib/security-scanner";
import { getSettings } from "@/lib/settings";
import path from "path";
import fs from "fs";

// ── Request Validation ──────────────────────────────────────────────────────────

interface SingleScanRequest {
  filePath: string;
}

interface BatchScanRequest {
  filePaths: string[];
}

function isValidRequest(body: unknown): body is SingleScanRequest | BatchScanRequest {
  if (typeof body !== "object" || body === null) return false;

  const b = body as Record<string, unknown>;

  // Single file scan
  if (typeof b.filePath === "string") return true;

  // Batch scan
  if (Array.isArray(b.filePaths) && b.filePaths.every(p => typeof p === "string")) {
    return true;
  }

  return false;
}

// ── Path Security ───────────────────────────────────────────────────────────────

/**
 * Validates that the requested file path is within allowed directories
 * to prevent path traversal attacks.
 */
function isAllowedPath(filePath: string): boolean {
  const settings = getSettings();
  const allowedRoots = [
    settings.sourceBase,
    settings.buildsBase,
    settings.downloadsPath,
    path.join(process.cwd(), "public"),
  ];

  const normalizedPath = path.normalize(filePath);

  return allowedRoots.some(root => {
    const normalizedRoot = path.normalize(root);
    return normalizedPath.startsWith(normalizedRoot);
  });
}

// ── API Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();

    // Validate request body
    if (!isValidRequest(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request. Provide either 'filePath' (string) or 'filePaths' (string[])",
        },
        { status: 400 }
      );
    }

    // Handle batch scan
    if ("filePaths" in body) {
      // Validate all paths
      const invalidPaths = body.filePaths.filter(p => !isAllowedPath(p));
      if (invalidPaths.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Path traversal detected",
            invalidPaths,
          },
          { status: 403 }
        );
      }

      // Check existence
      const nonExistent = body.filePaths.filter(p => !fs.existsSync(p));
      if (nonExistent.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Files not found",
            nonExistent,
          },
          { status: 404 }
        );
      }

      const batchResult = await scanSecurityBatch(body.filePaths);

      return NextResponse.json({
        success: true,
        batch: true,
        ...batchResult,
      });
    }

    // Handle single file scan
    const filePath = (body as SingleScanRequest).filePath;

    // Security: Validate path
    if (!isAllowedPath(filePath)) {
      return NextResponse.json(
        {
          success: false,
          error: "Access denied: Path outside allowed directories",
        },
        { status: 403 }
      );
    }

    // Check file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        {
          success: false,
          error: "File not found",
          path: filePath,
        },
        { status: 404 }
      );
    }

    // Check it's a JAR file
    if (!filePath.toLowerCase().endsWith(".jar")) {
      return NextResponse.json(
        {
          success: false,
          error: "Only .jar files can be scanned for security",
        },
        { status: 400 }
      );
    }

    // Perform scan
    console.log(`[/api/security/scan] Scanning: ${path.basename(filePath)}`);
    const result = await scanSecurity(filePath);
    console.log(`[/api/security/scan] Score: ${result.riskScore} (${result.riskLevel})`);

    return NextResponse.json({
      success: true,
      batch: false,
      result,
    });

  } catch (error) {
    console.error("[/api/security/scan] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error during security scan",
      },
      { status: 500 }
    );
  }
}

// ── GET Handler (Health Check) ──────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "Security Scan API ready",
    endpoints: {
      POST: "/api/security/scan - Scan single file or batch",
    },
    features: [
      "Bytecode analysis",
      "Pattern detection (network, process, reflection)",
      "Obfuscation detection",
      "Risk scoring 0-100",
      "Known malware hash checking",
    ],
  });
}
