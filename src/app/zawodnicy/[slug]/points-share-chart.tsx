"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { formatHeldOn } from "@/lib/format-held-on";
import { formatPointsShare } from "@/lib/format-points";
import { routes } from "@/lib/routes";
import type { PlayerPointsSharePoint } from "@/lib/stats/player";

const Y_TICKS = [0, 25, 50, 75, 100];
const SLOT_REM = 6;

export function PointsShareChart({ points }: { points: PlayerPointsSharePoint[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ index: number; left: number; top: number } | null>(null);
  const count = points.length;
  const linePoints = points.map((point, index) => `${index + 0.5},${100 - point.share}`).join(" ");
  const areaPoints = `${linePoints} ${count - 0.5},100 0.5,100`;

  function showTooltip(index: number, anchor: HTMLAnchorElement) {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const rootBox = root.getBoundingClientRect();
    const box = anchor.getBoundingClientRect();
    setTooltip({
      index,
      left: box.left + box.width / 2 - rootBox.left,
      top: box.top - rootBox.top,
    });
  }

  const active = tooltip === null ? null : points[tooltip.index];
  const tooltipAlign =
    tooltip === null
      ? ""
      : tooltip.index === 0
        ? "translate-y-[calc(-100%-0.5rem)]"
        : tooltip.index === count - 1
          ? "-translate-x-full translate-y-[calc(-100%-0.5rem)]"
          : "-translate-x-1/2 translate-y-[calc(-100%-0.5rem)]";
  const tooltipLeft =
    tooltip === null
      ? 0
      : tooltip.index === 0
        ? tooltip.left - 12
        : tooltip.index === count - 1
          ? tooltip.left + 12
          : tooltip.left;

  return (
    <div ref={rootRef} className="relative mt-3">
      {active && tooltip ? (
        <p
          aria-hidden
          className={`pointer-events-none absolute z-10 w-max max-w-52 rounded-md bg-foreground px-2 py-1 text-center text-xs text-background ${tooltipAlign}`}
          style={{ left: tooltipLeft, top: tooltip.top }}
        >
          {active.name} — {formatPointsShare(active.points, active.rounds)}
        </p>
      ) : null}
      <div className="flex items-start">
        <div className="relative h-48 w-11 shrink-0">
          <div className="absolute inset-x-0 top-5 bottom-5">
            {Y_TICKS.map((tick) => (
              <span
                key={tick}
                className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums"
                style={{ bottom: `${tick}%` }}
              >
                {tick}%
              </span>
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto" onScroll={() => setTooltip(null)}>
          <div style={{ minWidth: `${count * SLOT_REM}rem` }}>
            <div className="relative h-48">
              <div className="absolute inset-x-0 top-5 bottom-5">
                <svg
                  aria-hidden
                  viewBox={`0 0 ${count} 100`}
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full overflow-visible"
                >
                  <defs>
                    <linearGradient
                      id="points-share-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="100"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon points={areaPoints} fill="url(#points-share-fill)" />
                  {Y_TICKS.map((tick) => (
                    <line
                      key={tick}
                      x1="0"
                      x2={count}
                      y1={100 - tick}
                      y2={100 - tick}
                      className="stroke-muted-foreground/40"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  <polyline
                    points={linePoints}
                    fill="none"
                    className="stroke-primary"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                {points.map((point, index) => {
                  const label = formatPointsShare(point.points, point.rounds);
                  return (
                    <Link
                      key={point.slug}
                      href={routes.tournament(point.slug)}
                      aria-label={`${point.name}, ${formatHeldOn(point.heldOn)}, ${label}`}
                      className="absolute size-6 -translate-x-1/2 translate-y-1/2 rounded-full focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      style={{
                        left: `${((index + 0.5) / count) * 100}%`,
                        bottom: `${point.share}%`,
                      }}
                      onMouseEnter={(event) => showTooltip(index, event.currentTarget)}
                      onMouseLeave={() => setTooltip(null)}
                      onFocus={(event) => showTooltip(index, event.currentTarget)}
                      onBlur={() => setTooltip(null)}
                    >
                      <span className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
                    </Link>
                  );
                })}
              </div>
            </div>
            <div
              className="grid"
              style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
            >
              {points.map((point) => (
                <div
                  key={point.slug}
                  className="pt-2 text-center text-xs text-muted-foreground tabular-nums"
                >
                  {formatHeldOn(point.heldOn)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
