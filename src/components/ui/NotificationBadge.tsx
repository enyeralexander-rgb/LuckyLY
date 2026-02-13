"use client";

import { useEffect, useState } from "react";

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export function NotificationBadge({ count, className = "" }: NotificationBadgeProps) {
  const [playScale, setPlayScale] = useState(false);

  useEffect(() => {
    if (count <= 0) return;
    setPlayScale(true);
    const t = setTimeout(() => setPlayScale(false), 250);
    return () => clearTimeout(t);
  }, [count]);

  if (count <= 0) return null;

  const content = count > 99 ? "99+" : String(count);

  return (
    <span
      className={className}
      style={{
        position: "absolute",
        top: "-6px",
        right: "-6px",
        minWidth: "20px",
        height: "20px",
        padding: "0 5px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        backgroundColor: "#dc2626",
        color: "#ffffff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontWeight: 700,
        fontSize: "11px",
        lineHeight: 1,
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        outline: "2px solid var(--card-bg, #fff)",
        transform: playScale ? "scale(1.2)" : "scale(1)",
        transition: "transform 0.2s ease-out",
      }}
    >
      {content}
    </span>
  );
}
