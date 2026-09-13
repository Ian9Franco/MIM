"use client";

export function MimSlimeMascot({
  size = 88,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`mim-slime-stage ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div className="mim-slime-orb">
        <img src="/icon.png" alt="" className="mim-slime-face animate-slime" />
      </div>
    </div>
  );
}
