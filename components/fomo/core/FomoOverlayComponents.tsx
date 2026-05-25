import React from "react";
import { ListTree, Download, ExternalLink, Loader2, CheckCircle2, ChevronDown, ChevronUp, Package, Workflow, Search, Heart, Layers, Sparkles, Database, Archive, LayoutGrid, Puzzle, Glasses, CircleFadingPlus, Globe, X, FlaskConical, FlaskConicalOff } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { formatSize, openExternal } from "@/utils/format";
import { supabase } from "@/lib/core/supabaseClient";
import { buildShareMetaFromMod } from "@/lib/fomo/communityShareMeta";
import { useActiveDraft } from "@/hooks/fomo/useActiveDraft";
import {
  communityTypeToBannerType,
  getBannerFallbackStyle,
  inferPrimaryProjectType,
} from "@/lib/fomo/fomoModBanner";

export { TabButton } from "../details/TabButton";
export { DependencyCard } from "../details/DependencyCard";
export { VersionCard } from "../details/VersionCard";
export { CompatibilitySection } from "../details/CompatibilitySection";
export { ModHeader } from "../details/ModHeader";

export function StatsGrid({ mod }: { mod: any }) {
  return null; // Compacted into CompatibilitySection
}

