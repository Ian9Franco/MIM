/**
 * SAGE 2.0 — Semantic Knowledge Retriever (RAG Layer)
 * ─────────────────────────────────────────────────────────────────────────────
 * Offline-first high-speed semantic retrieval engine.
 * Computes cosine/BM25 similarity between structured crash evidence and the
 * curated compatibility knowledge base to extract relevant contextual articles.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { COMPATIBILITY_KNOWLEDGE_BASE, KnowledgeArticle } from "./knowledgeBase";
import { StructuredCrashReport } from "./types";

export interface RetrievedContext {
  article: KnowledgeArticle;
  relevanceScore: number; // 0.0 to 1.0
  matchedSignals: string[];
}

export class SageRetriever {
  /**
   * Retrieves Top-K most relevant knowledge articles for a given crash report.
   */
  public static retrieve(
    report: StructuredCrashReport,
    topK: number = 3,
    minThreshold: number = 0.25
  ): RetrievedContext[] {
    const scoredArticles: RetrievedContext[] = [];

    // 1. Build Query Token Set from Diagnostic Report
    const queryTokens = new Set<string>();
    const addTokens = (str?: string) => {
      if (!str) return;
      const cleaned = str.toLowerCase().replace(/[^a-z0-9_.-]/g, " ");
      for (const t of cleaned.split(/\s+/)) {
        if (t.length >= 3) queryTokens.add(t);
      }
    };

    addTokens(report.rootCause);
    addTokens(report.culpritMod);
    for (const s of report.suspectedMods) addTokens(s);
    for (const e of report.evidence) {
      addTokens(e.description);
      addTokens(e.snippet);
    }
    for (const f of report.normalizedStack.slice(0, 10)) {
      addTokens(f.className);
      addTokens(f.methodName);
      addTokens(f.mixinTarget);
    }

    // 2. Score each knowledge article
    for (const article of COMPATIBILITY_KNOWLEDGE_BASE) {
      let score = 0;
      const matchedSignals: string[] = [];

      // A. Category Alignment Bonus
      if (article.category === report.category) {
        score += 0.35;
        matchedSignals.push(`Category match: ${article.category}`);
      }

      // B. Affected Mod Exact Match
      if (report.culpritMod) {
        const cleanCulprit = report.culpritMod.toLowerCase();
        if (article.affectedMods.some(m => m.toLowerCase() === cleanCulprit)) {
          score += 0.45;
          matchedSignals.push(`Culprit mod affected: ${report.culpritMod}`);
        }
      }

      // Suspected mods secondary match
      for (const sus of report.suspectedMods) {
        const cleanSus = sus.toLowerCase();
        if (article.affectedMods.some(m => m.toLowerCase() === cleanSus)) {
          score += 0.20;
          matchedSignals.push(`Suspect mod match: ${sus}`);
          break;
        }
      }

      // C. Keyword & Symptom Overlap (Token Frequency)
      let keywordMatches = 0;
      for (const kw of article.keywords) {
        if (queryTokens.has(kw.toLowerCase())) {
          keywordMatches++;
        }
      }

      if (keywordMatches > 0) {
        const keywordScore = Math.min(0.35, (keywordMatches / article.keywords.length) * 0.5);
        score += keywordScore;
        matchedSignals.push(`${keywordMatches} keyword signal(s)`);
      }

      const normalizedScore = Math.min(1.0, Math.round(score * 100) / 100);

      if (normalizedScore >= minThreshold) {
        scoredArticles.push({
          article,
          relevanceScore: normalizedScore,
          matchedSignals
        });
      }
    }

    // 3. Sort by relevance descending and take Top-K
    scoredArticles.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return scoredArticles.slice(0, topK);
  }
}
