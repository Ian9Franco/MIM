#!/usr/bin/env node

/**
 * MIM — API Guard structural enforcement
 *
 * Every Next.js App Router HTTP handler exported from API route modules under
 * app/api or web/app/api must be provably wrapped by the real withApiGuard.
 *
 * This verifier intentionally fails closed: comments, strings, imports alone,
 * direct function exports, unknown aliases, and re-exports do not count as
 * protection.
 */

import fs from "fs";
import path from "path";
import ts from "typescript";

const HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

export interface HandlerViolation {
  method: string;
  reason: string;
}

export interface RouteAnalysis {
  handlers: string[];
  guardedHandlers: string[];
  violations: HandlerViolation[];
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return Boolean(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === kind));
}

function isTrustedApiGuardModule(moduleName: string): boolean {
  const normalized = moduleName.replace(/\\/g, "/").replace(/\.(?:[cm]?ts|[cm]?js)$/, "");
  return normalized === "@/lib/apiGuard" || /(?:^|\/)lib\/apiGuard$/.test(normalized);
}

function collectImportedGuardNames(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!isTrustedApiGuardModule(statement.moduleSpecifier.text)) continue;

    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;

    for (const element of bindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (importedName === "withApiGuard") {
        names.add(element.name.text);
      }
    }
  }

  return names;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;

  while (true) {
    if (ts.isParenthesizedExpression(current)) {
      current = current.expression;
      continue;
    }
    if (ts.isAsExpression(current) || ts.isTypeAssertionExpression(current)) {
      current = current.expression;
      continue;
    }
    if (ts.isNonNullExpression(current)) {
      current = current.expression;
      continue;
    }
    if (ts.isSatisfiesExpression(current)) {
      current = current.expression;
      continue;
    }
    return current;
  }
}

interface LocalBinding {
  initializer?: ts.Expression;
  immutable: boolean;
}

function collectLocalBindings(sourceFile: ts.SourceFile): Map<string, LocalBinding> {
  const bindings = new Map<string, LocalBinding>();

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;

    const immutable = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      bindings.set(declaration.name.text, {
        initializer: declaration.initializer,
        immutable,
      });
    }
  }

  return bindings;
}

function isGuardedExpression(
  expression: ts.Expression | undefined,
  importedGuardNames: Set<string>,
  localBindings: Map<string, LocalBinding>,
  visited = new Set<string>()
): boolean {
  if (!expression) return false;

  const current = unwrapExpression(expression);

  if (ts.isCallExpression(current)) {
    const callee = unwrapExpression(current.expression);
    return ts.isIdentifier(callee) && importedGuardNames.has(callee.text);
  }

  if (ts.isIdentifier(current)) {
    if (visited.has(current.text)) return false;
    visited.add(current.text);

    const binding = localBindings.get(current.text);
    if (!binding?.immutable) return false;
    return isGuardedExpression(binding.initializer, importedGuardNames, localBindings, visited);
  }

  return false;
}

function recordHandler(
  analysis: RouteAnalysis,
  method: string,
  protectedByGuard: boolean,
  reason: string
): void {
  analysis.handlers.push(method);
  if (protectedByGuard) {
    analysis.guardedHandlers.push(method);
  } else {
    analysis.violations.push({ method, reason });
  }
}

/**
 * Analyze one route module without executing it. Exported HTTP handlers are
 * accepted only when their value can be traced structurally to a call to an
 * imported withApiGuard from a trusted apiGuard module.
 */
export function analyzeRouteSource(sourceText: string, fileName = "route.ts"): RouteAnalysis {
  const sourceFile = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const importedGuardNames = collectImportedGuardNames(sourceFile);
  const localBindings = collectLocalBindings(sourceFile);

  const analysis: RouteAnalysis = {
    handlers: [],
    guardedHandlers: [],
    violations: [],
  };

  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement) && hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
      const declarationIsConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;

      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !HTTP_METHODS.has(declaration.name.text)) continue;

        const method = declaration.name.text;
        const guarded = declarationIsConst && isGuardedExpression(
          declaration.initializer,
          importedGuardNames,
          localBindings
        );
        recordHandler(
          analysis,
          method,
          guarded,
          declarationIsConst
            ? "exported handler is not structurally wrapped by withApiGuard"
            : "exported handler must be an immutable const wrapped by withApiGuard"
        );
      }
      continue;
    }

    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name &&
      HTTP_METHODS.has(statement.name.text) &&
      hasModifier(statement, ts.SyntaxKind.ExportKeyword)
    ) {
      recordHandler(
        analysis,
        statement.name.text,
        false,
        "direct exported function cannot prove withApiGuard enforcement"
      );
      continue;
    }

    if (ts.isExportDeclaration(statement)) {
      if (!statement.exportClause) {
        analysis.violations.push({
          method: "*",
          reason: "wildcard re-export is unsupported in an API route because HTTP handlers cannot be proven guarded",
        });
        continue;
      }

      if (!ts.isNamedExports(statement.exportClause)) continue;

      for (const element of statement.exportClause.elements) {
        const exportedName = element.name.text;
        if (!HTTP_METHODS.has(exportedName)) continue;

        if (statement.moduleSpecifier) {
          recordHandler(
            analysis,
            exportedName,
            false,
            "HTTP handler re-export from another module cannot be proven wrapped by withApiGuard"
          );
          continue;
        }

        const localName = element.propertyName?.text ?? element.name.text;
        const binding = localBindings.get(localName);
        const guarded = Boolean(
          binding?.immutable &&
          isGuardedExpression(binding.initializer, importedGuardNames, localBindings)
        );
        recordHandler(
          analysis,
          exportedName,
          guarded,
          "exported handler alias cannot be traced to withApiGuard"
        );
      }
    }
  }

  if (analysis.handlers.length === 0) {
    analysis.violations.push({
      method: "(route)",
      reason: "route.ts exports no recognized HTTP handler; enforcement fails closed",
    });
  }

  return analysis;
}

function findRouteFiles(dir: string, rootDir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRouteFiles(fullPath, rootDir));
    } else if (entry.isFile() && entry.name === "route.ts") {
      results.push(path.relative(rootDir, fullPath).replace(/\\/g, "/"));
    }
  }

  return results;
}

export interface ApiGuardAllowlistEntry {
  reason: string;
  methods?: string[];
}

export const API_GUARD_ALLOWLIST: Record<string, ApiGuardAllowlistEntry> = {
  // Any explicitly exempted routes must be declared here with a documented reason.
};

export function auditApiGuard(
  rootDir = process.cwd(),
  allowlist: Record<string, ApiGuardAllowlistEntry> = API_GUARD_ALLOWLIST
): {
  totalRoutes: number;
  totalHandlers: number;
  guardedHandlers: number;
  violations: string[];
  coveragePercent: number;
} {
  const routeRoots = [
    path.join(rootDir, "app", "api"),
    path.join(rootDir, "web", "app", "api"),
  ];

  const allRoutes = routeRoots
    .flatMap((routeRoot) => findRouteFiles(routeRoot, rootDir))
    .sort();

  const violations: string[] = [];
  let totalHandlers = 0;
  let guardedHandlers = 0;

  console.log(
    `\n${colors.cyan}${colors.bold}🔍 Auditing structural API Guard enforcement (${allRoutes.length} routes found)...${colors.reset}`
  );

  for (const route of allRoutes) {
    const absolutePath = path.join(rootDir, route);
    const sourceText = fs.readFileSync(absolutePath, "utf-8");
    const analysis = analyzeRouteSource(sourceText, route);

    totalHandlers += analysis.handlers.length;
    guardedHandlers += analysis.guardedHandlers.length;

    for (const violation of analysis.violations) {
      const exemption = allowlist[route];
      const isExempt = Boolean(
        exemption &&
        (!exemption.methods || exemption.methods.includes(violation.method))
      );
      if (!isExempt) {
        violations.push(`${route} [${violation.method}] — ${violation.reason}`);
      }
    }
  }

  const coveragePercent = totalHandlers > 0
    ? Math.round((guardedHandlers / totalHandlers) * 100)
    : allRoutes.length === 0
      ? 100
      : 0;

  console.log("\n─────────────────────────────────────────────────────────────────────────────");
  console.log(`${colors.bold}API Guard Structural Verification Summary:${colors.reset}`);
  console.log(`  • API route modules discovered:        ${allRoutes.length}`);
  console.log(`  • Exported HTTP handlers discovered:   ${totalHandlers}`);
  console.log(`  • Structurally guarded handlers:       ${guardedHandlers} / ${totalHandlers} (${coveragePercent}%)`);
  console.log("─────────────────────────────────────────────────────────────────────────────");

  if (violations.length > 0) {
    console.error(
      `\n${colors.red}${colors.bold}🚨 VIOLATION: ${violations.length} API guard enforcement failure(s):${colors.reset}`
    );
    for (const violation of violations) {
      console.error(`  ${colors.red}✗${colors.reset} ${violation}`);
    }
    console.error(
      `\n${colors.yellow}Policy: every exported HTTP handler in every app/api route must be structurally traceable to withApiGuard.${colors.reset}\n`
    );
  } else {
    console.log(
      `\n${colors.green}${colors.bold}✓ Every discovered HTTP handler is structurally protected by withApiGuard.${colors.reset}\n`
    );
  }

  return {
    totalRoutes: allRoutes.length,
    totalHandlers,
    guardedHandlers,
    violations,
    coveragePercent,
  };
}

if (require.main === module) {
  const result = auditApiGuard();
  process.exit(result.violations.length > 0 ? 1 : 0);
}
