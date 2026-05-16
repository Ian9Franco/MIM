import { ModMeta } from "../scanner";
import { gameVersionFromFilename } from "./utils";

/**
 * @fileoverview MIM Scanner Scoring Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor de decisión heurística para resolver conflictos de metadatos en mods.
 * En lugar de una prioridad lineal, evalúa múltiples "señales" (filename, 
 * dependencias, múltiples TOMLs) y asigna un puntaje de confianza.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface ScanCandidate extends Partial<ModMeta> {
    source: string; // "neoforge.mods.toml", "mods.toml", "filename", etc.
    score: number;
}

export interface ScoringVerdict {
    bestMatch: ModMeta;
    confidence: "high" | "medium" | "low";
    warnings: string[];
}

export function evaluateCandidates(candidates: ScanCandidate[], filePath: string): ScoringVerdict {
    const fileName = filePath.split(/[/\\]/).pop() || "";
    const fileMcVersion = gameVersionFromFilename(filePath);
    const warnings: string[] = [];
    
    // Si hay múltiples fuentes de metadatos contradictorias, empezamos con sospecha
    const loaders = new Set(candidates.filter(c => c.loader && c.loader !== "unknown").map(c => c.loader));
    if (loaders.size > 1) {
        warnings.push(`Conflicting loaders detected: ${Array.from(loaders).join(", ")}`);
    }

    const processedCandidates = candidates.map(c => {
        let score = 0;
        
        // SEÑAL: Metadata explícita (si viene de un archivo real dentro del JAR)
        if (c.source !== "filename" && c.source !== "unknown") {
            score += 100;
        }

        // SEÑAL: Coincidencia con nombre de archivo (Heurística de confianza)
        if (fileMcVersion && c.gameVersion === fileMcVersion) {
            score += 50;
        }

        // SEÑAL: Dependencia de Minecraft explícita
        // (Asumimos que si el parser la encontró y no es unknown, es una señal fuerte)
        if (c.gameVersion && c.gameVersion !== "unknown") {
            score += 80;
        }

        // SEÑAL: Coincidencia de Loader (Si el nombre del archivo lo menciona)
        if (c.loader && fileName.toLowerCase().includes(c.loader.toLowerCase())) {
            score += 60;
        }

        // PENALIZACIÓN: Conflicto fuerte entre metadatos y realidad del archivo
        if (fileMcVersion && c.gameVersion && c.gameVersion !== "unknown" && c.gameVersion !== fileMcVersion) {
            score -= 100;
            warnings.push(`Metadata version (${c.gameVersion}) conflicts with filename version (${fileMcVersion})`);
        }

        return { ...c, score };
    });

    // Ordenar por score descendente
    processedCandidates.sort((a, b) => b.score - a.score);
    
    const winner = processedCandidates[0];
    
    // Determinación de confianza
    let confidence: "high" | "medium" | "low" = "high";
    if (winner.score < 100) confidence = "low";
    else if (winner.score < 200 || warnings.length > 0) confidence = "medium";
    
    // Si el ganador tiene un score negativo o muy bajo, es un mod criminal
    if (winner.score < 50) {
        confidence = "low";
        warnings.push("Extremely low confidence in metadata integrity.");
    }

    return {
        bestMatch: winner as ModMeta,
        confidence,
        warnings: Array.from(new Set(warnings)) // Deduplicar avisos
    };
}
