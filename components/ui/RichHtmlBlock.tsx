"use client";

import type { MouseEventHandler } from "react";
import { sanitizeHtml } from "@/utils/sanitizeHtml";

type RichHtmlBlockProps = {
  html: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
};

/** Single audited render path for sanitized rich HTML in Desktop UI. */
export function RichHtmlBlock({ html, className, onClick }: RichHtmlBlockProps) {
  const safeHtml = sanitizeHtml(html);

  return (
    <div
      className={className}
      onClick={onClick}
      suppressHydrationWarning
      // deepcode ignore XSS: content is sanitized via allowlisted tags/attrs
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
