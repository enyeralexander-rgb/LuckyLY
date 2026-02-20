"use client";

import { useState } from "react";
import { getItemWithEmoji } from "@/lib/raffleEmojis";

export type SlotStatus = "available" | "selected" | "reserved" | "purchased";

function getStatusLabel(status: SlotStatus): string {
  const labels: Record<SlotStatus, string> = {
    available: "disponible",
    selected: "seleccionado",
    reserved: "reservado",
    purchased: "comprado",
  };
  return labels[status];
}

export interface SlotItem {
  value: string;
  status: SlotStatus;
}

interface SlotRouletteProps {
  slots: SlotItem[];
  raffleType: string;
  selectedValues: Set<string>;
  onToggle: (value: string) => void;
  disabled?: boolean;
}

const SIZE = 600;
const HALF = SIZE / 2;
const RADIUS = 280;
const CENTER_R = 40;

const AVAILABLE_COLOR = "#66BB5F";
const SELECTED_COLOR = "#9813E4";
const RESERVED_COLOR = "#004ECA";
const PURCHASED_COLOR = "#757575";

const LEGEND_ITEMS: { status: SlotStatus; label: string; fill: string }[] = [
  { status: "available", label: "Disponible", fill: AVAILABLE_COLOR },
  { status: "selected", label: "Seleccionado", fill: SELECTED_COLOR },
  { status: "reserved", label: "Reservado", fill: RESERVED_COLOR },
  { status: "purchased", label: "Comprado", fill: PURCHASED_COLOR },
];

function getSegmentPath(index: number, slotAngle: number, r: number): string {
  const startAngle = (index * slotAngle - 90) * (Math.PI / 180);
  const endAngle = ((index + 1) * slotAngle - 90) * (Math.PI / 180);
  const x1 = HALF + r * Math.cos(startAngle);
  const y1 = HALF + r * Math.sin(startAngle);
  const x2 = HALF + r * Math.cos(endAngle);
  const y2 = HALF + r * Math.sin(endAngle);
  const largeArc = slotAngle > 180 ? 1 : 0;
  return `M ${HALF} ${HALF} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function getTextTransform(index: number, slotAngle: number, r: number): string {
  const textR = r * 0.9;
  const segmentCenterAngle = (index * slotAngle) + (slotAngle / 2);
  const angle = segmentCenterAngle - 90;
  const rad = angle * (Math.PI / 180);
  const x = HALF + textR * Math.cos(rad);
  const y = HALF + textR * Math.sin(rad);
  return `translate(${x}, ${y}) rotate(${angle})`;
}

function getFontSize(itemCount: number, slotAngle: number, maxTextLength: number): number {
  if (itemCount === 0) return 14;
  const textRadius = RADIUS * 0.9;
  const arcLength = textRadius * (slotAngle * Math.PI / 180);
  const availableWidth = arcLength - 15;
  const charWidthRatio = 0.55;
  const calculatedSize = availableWidth / (maxTextLength * charWidthRatio);
  const increased = calculatedSize * 1.4;
  return Math.max(10, Math.min(25, Math.floor(increased)));
}

export function SlotRoulette({
  slots,
  raffleType,
  selectedValues,
  onToggle,
  disabled = false,
}: SlotRouletteProps) {
  const [pulsingSlot, setPulsingSlot] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [focusedSlot, setFocusedSlot] = useState<string | null>(null);

  if (slots.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
        No hay cupos
      </div>
    );
  }

  const slotAngle = 360 / slots.length;

  const maxTextLength = Math.max(
    ...slots.map((s) => {
      const prefix = s.status === "purchased" ? "✕ " : s.status === "reserved" ? "⏳ " : s.status === "selected" ? "✓ " : "";
      return (prefix + getItemWithEmoji(s.value, raffleType)).length;
    })
  );
  const fontSize = getFontSize(slots.length, slotAngle, maxTextLength);

  const getSegmentFill = (slot: SlotItem): string => {
    if (slot.status === "purchased") return PURCHASED_COLOR;
    if (slot.status === "reserved") return RESERVED_COLOR;
    if (slot.status === "selected") return SELECTED_COLOR;
    return AVAILABLE_COLOR;
  };

  const getSegmentOpacity = (slot: SlotItem): number => {
    if (slot.status === "purchased") return 0.8;
    if (slot.status === "reserved") return 0.6;
    return 1;
  };

  const statusCursor: Record<SlotStatus, string> = {
    available: "pointer",
    selected: "pointer",
    reserved: "not-allowed",
    purchased: "not-allowed",
  };

  const isClickable = (status: SlotStatus) =>
    !disabled && (status === "available" || status === "selected");

  const handleClick = (value: string) => {
    if (!isClickable(slots.find((s) => s.value === value)?.status ?? "purchased")) return;
    setPulsingSlot(value);
    onToggle(value);
    setTimeout(() => setPulsingSlot(null), 150);
  };

  return (
    <div className="slot-roulette-container" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "1rem" }}>
      <div
        className="slot-roulette-wrapper"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: SIZE,
          margin: "0 auto",
        }}
        role="group"
        aria-label="Ruleta de selección de cupos"
      >
        {/* Ruleta */}
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{
            maxWidth: "100%",
            height: "auto",
            display: "block",
            filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.3))",
          }}
          aria-hidden
        >
          {/* Segmentos */}
          {slots.map((slot, i) => {
            const clickable = isClickable(slot.status);
            const isHovered = hoveredSlot === slot.value && clickable;
            const isFocused = focusedSlot === slot.value && clickable;
            const isHighlighted = isHovered || isFocused;
            const isPulsing = pulsingSlot === slot.value;

            return (
              <g
                key={slot.value}
                className={`slot-roulette-segment${isPulsing ? " slot-roulette-segment-pulse" : ""}`}
                style={{
                  transformOrigin: `${HALF}px ${HALF}px`,
                  transform: isHighlighted ? "scale(1.07)" : "scale(1)",
                  transition: "transform 0.2s ease",
                }}
              >
                <path
                  d={getSegmentPath(i, slotAngle, RADIUS)}
                  fill={getSegmentFill(slot)}
                  opacity={isHighlighted ? 1 : getSegmentOpacity(slot)}
                  stroke="white"
                  strokeWidth="1"
                  cursor={statusCursor[slot.status]}
                  onClick={() => handleClick(slot.value)}
                  onMouseEnter={() => clickable && setHoveredSlot(slot.value)}
                  onMouseLeave={() => setHoveredSlot(null)}
                  onFocus={() => clickable && setFocusedSlot(slot.value)}
                  onBlur={() => setFocusedSlot(null)}
                  style={{ transition: "opacity 0.2s" }}
                  aria-label={`Cupo ${getItemWithEmoji(slot.value, raffleType)}, ${getStatusLabel(slot.status)}`}
                  aria-pressed={clickable ? slot.status === "selected" : undefined}
                  aria-disabled={!clickable ? true : undefined}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (clickable && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      handleClick(slot.value);
                    }
                  }}
                />
              </g>
            );
          })}

          {/* Texto */}
          {slots.map((slot, i) => {
            const prefix = slot.status === "purchased" ? "✕ " : slot.status === "reserved" ? "⏳ " : slot.status === "selected" ? "✓ " : "";
            const label = prefix + getItemWithEmoji(slot.value, raffleType);

            return (
              <text
                key={`text-${slot.value}`}
                transform={getTextTransform(i, slotAngle, RADIUS)}
                textAnchor="end"
                dominantBaseline="middle"
                fill="white"
                fontSize={fontSize}
                fontWeight="700"
                style={{
                  textShadow: "2px 2px 4px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.8)",
                  userSelect: "none",
                  pointerEvents: "none",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  textTransform: "uppercase",
                }}
              >
                {label.toUpperCase().trim()}
              </text>
            );
          })}

          {/* Borde exterior (invisible) */}
          <circle
            cx={HALF}
            cy={HALF}
            r={RADIUS}
            fill="none"
            stroke="#dc2626"
            strokeWidth="4"
            opacity="0"
          />

          {/* Centro: fondo blanco + borde verde + logo */}
          <circle
            cx={HALF}
            cy={HALF}
            r={CENTER_R}
            fill="#66BB5F"
            stroke="#ffffff"
            strokeWidth="20"
            style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.2))" }}
          />
          <clipPath id="center-clip">
            <circle cx={HALF} cy={HALF} r={CENTER_R} />
          </clipPath>
          <image
            href="/images/LuckyLy-Logo-BLANCO-SIN-FONDO.png"
            x={HALF - CENTER_R * 0.49}
            y={HALF - CENTER_R * 0.49}
            width={CENTER_R * 0.98}
            height={CENTER_R * 0.98}
            clipPath="url(#center-clip)"
            preserveAspectRatio="xMidYMid meet"
          />
        </svg>
      </div>

      {/* Leyenda */}
      <div
        role="list"
        aria-label="Leyenda de estados de cupos"
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "1rem",
          fontSize: "0.8rem",
          color: "#94a3b8",
        }}
      >
        {LEGEND_ITEMS.map((item) => (
          <div
            key={item.status}
            role="listitem"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            title={item.label}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: item.fill,
                border: "none",
              }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Cuadritos: misma selección que la ruleta */}
      <div
        role="group"
        aria-label="Cupos en lista"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(108px, 1fr))",
          gap: "0.7rem",
          width: "100%",
        }}
      >
        {slots.map((slot) => {
          const clickable = isClickable(slot.status);
          const isPulsing = pulsingSlot === slot.value;
          const label = getItemWithEmoji(slot.value, raffleType);
          const prefix = slot.status === "purchased" ? "✕ " : slot.status === "reserved" ? "⏳ " : slot.status === "selected" ? "✓ " : "";

          return (
            <button
              key={slot.value}
              type="button"
              onClick={() => handleClick(slot.value)}
              disabled={!clickable}
              title={`${prefix}${label} - ${getStatusLabel(slot.status)}`}
              aria-label={`Cupo ${label}, ${getStatusLabel(slot.status)}`}
              aria-pressed={clickable ? slot.status === "selected" : undefined}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 78,
                padding: "0.6rem 0.5rem",
                background: getSegmentFill(slot),
                opacity: getSegmentOpacity(slot),
                color: "white",
                border: "1px solid rgba(255,255,255,0.7)",
                borderRadius: 6,
                fontSize: "0.9rem",
                fontWeight: 700,
                textTransform: "uppercase",
                cursor: statusCursor[slot.status],
                transition: "transform 0.15s ease, opacity 0.2s ease",
                transform: isPulsing ? "scale(0.92)" : "scale(1)",
                outline: "none",
                fontFamily: "system-ui, -apple-system, sans-serif",
                lineHeight: 1.1,
                textAlign: "center",
                wordBreak: "break-word",
              }}
              onMouseEnter={(e) => clickable && (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onFocus={(e) => clickable && (e.currentTarget.style.transform = "scale(1.05)")}
              onBlur={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <span style={{ fontSize: "0.85rem", opacity: 0.9 }}>{prefix}</span>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
