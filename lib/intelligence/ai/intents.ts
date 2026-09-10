/** High-level MIMbot request intents used by the model router (BOT-GW). */
export type AIIntent =
  | "sage-chat"
  | "sage-diagnosis"
  | "mim-bot-chat"
  | "mod-explain-text"
  | "mod-explain-multimodal"
  | "dependency-explain";

export function classifyModExplainIntent(options: {
  imageCount: number;
  wantsSearchGrounding?: boolean;
}): AIIntent {
  if (options.imageCount > 0) return "mod-explain-multimodal";
  if (options.wantsSearchGrounding) return "mod-explain-text";
  return "mod-explain-text";
}
