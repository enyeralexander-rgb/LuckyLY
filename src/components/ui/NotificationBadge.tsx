"use client";

import { useEffect, useState } from "react";

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export function NotificationBadge({ count, className = "" }: NotificationBadgeProps) {
  const [visible, setVisible] = useState(false);
  const [displayCount, setDisplayCount] = useState(count);

  useEffect(() => {
    if (count > 0) {
      setVisible(true);
      setDisplayCount(count);
    } else {
      setVisible(false);
    }
  }, [count]);

  if (!visible) return null;

  const content = count > 99 ? "+99" : count.toString();

  return (
    <span
      className={`
        absolute -top-2 -right-2 
        flex h-5 w-5 items-center justify-center 
        rounded-full bg-red-600 text-[10px] font-bold text-white 
        shadow-sm outline outline-2 outline-white
        transition-transform duration-200 ease-in-out hover:scale-110
        animate-in zoom-in-50
        ${className}
      `}
    >
      {content}
    </span>
  );
}
