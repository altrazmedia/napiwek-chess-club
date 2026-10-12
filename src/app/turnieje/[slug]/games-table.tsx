"use client";

import { ChessPawn } from "lucide-react";
import { cn } from "cn";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { GameCard, type GameCardPlayer } from "@/components/game-card";
import type { TournamentGame, TournamentPlayer } from "@/lib/db/queries/tournaments";
import { routes } from "@/lib/routes";
import { TournamentSection } from "./tournament-section";

const COMMIT_PX = 48;
const DRAG_START_PX = 8;
const SLIDE_MS = 300;
const PANEL_GAP_PX = 12;

type RoundGroup = {
  round: number;
  games: TournamentGame[];
};

type AdjacentLayout = {
  type: "adjacent";
  hasPrev: boolean;
  hasNext: boolean;
};

type JumpLayout = {
  type: "jump";
  direction: "forward" | "back";
  targetIndex: number;
};

type Layout = { type: "single" } | AdjacentLayout | JumpLayout;

type Motion =
  | { kind: "rest" }
  | { kind: "drag"; x: number; width: number; layout: AdjacentLayout }
  | {
    kind: "anim";
    from: number;
    to: number;
    width: number;
    commitIndex: number;
    layout: AdjacentLayout | JumpLayout;
  };

type DragSession = {
  pointerId: number;
  startX: number;
  startY: number;
  originIndex: number;
  dragging: boolean;
  rawX: number;
  x: number;
  width: number;
  layout: AdjacentLayout | null;
};

export function GamesTable({ games }: { games: TournamentGame[] }) {
  const rounds = groupByRound(games);
  const baseId = useId();
  const [index, setIndex] = useState(() => Math.max(rounds.length - 1, 0));
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [motion, setMotion] = useState<Motion>({ kind: "rest" });
  const [frameHeight, setFrameHeight] = useState<number | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const suppressClick = useRef(false);
  const selected = pendingIndex ?? index;
  const anim = motion.kind === "anim" ? motion : null;

  useLayoutEffect(() => {
    const list = tabListRef.current;
    const pill = list?.querySelector<HTMLButtonElement>("[aria-selected='true']");
    if (!list || !pill) {
      return;
    }

    const left = pill.offsetLeft;
    const right = left + pill.offsetWidth;
    const viewRight = list.scrollLeft + list.clientWidth;
    if (left < list.scrollLeft) {
      list.scrollLeft = left;
    } else if (right > viewRight) {
      list.scrollLeft = right - list.clientWidth;
    }
  }, [selected]);

  useEffect(() => {
    if (!anim) {
      return;
    }

    const track = trackRef.current;
    if (!track) {
      return;
    }

    let settled = false;
    const commitIndex = anim.commitIndex;
    const animation = track.animate(
      [{ transform: `translateX(${anim.from}px)` }, { transform: `translateX(${anim.to}px)` }],
      { duration: SLIDE_MS, easing: "ease-out", fill: "forwards" },
    );
    const complete = () => {
      if (settled) {
        return;
      }
      settled = true;
      setIndex(commitIndex);
      setPendingIndex(null);
      setMotion({ kind: "rest" });
      setFrameHeight(null);
    };
    animation.onfinish = complete;
    const timeout = window.setTimeout(complete, SLIDE_MS + 50);

    return () => {
      settled = true;
      window.clearTimeout(timeout);
      animation.cancel();
    };
  }, [anim]);

  if (rounds.length === 0) {
    return null;
  }

  const activeRound = rounds[index] ?? rounds[rounds.length - 1];
  const layout: Layout = motion.kind === "rest" ? { type: "single" } : motion.layout;
  const panelWidth = motion.kind === "rest" ? undefined : motion.width;
  const panels = panelsFor(layout, rounds, index);

  function select(next: number) {
    if (motion.kind !== "rest" || next === index) {
      return false;
    }
    if (prefersReducedMotion() || viewportWidth(viewportRef.current) === 0) {
      setIndex(next);
      return true;
    }

    const width = viewportWidth(viewportRef.current);
    const height = panelRef.current?.offsetHeight;
    const direction = next > index ? "forward" : "back";
    if (height) {
      setFrameHeight(height);
    }
    setPendingIndex(next);
    const stride = panelStride(width);
    setMotion({
      kind: "anim",
      layout: { type: "jump", direction, targetIndex: next },
      from: direction === "forward" ? 0 : -stride,
      to: direction === "forward" ? -stride : 0,
      commitIndex: next,
      width,
    });
    return true;
  }

  function onTabsKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const count = rounds.length;
    let next = selected;
    if (event.key === "ArrowRight") {
      next = Math.min(selected + 1, count - 1);
    } else if (event.key === "ArrowLeft") {
      next = Math.max(selected - 1, 0);
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = count - 1;
    } else {
      return;
    }

    event.preventDefault();
    if (!select(next)) {
      return;
    }
    tabListRef.current?.querySelector<HTMLButtonElement>(`[data-round-index="${next}"]`)?.focus();
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || motion.kind !== "rest" || rounds.length < 2) {
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originIndex: index,
      dragging: false,
      rawX: 0,
      x: 0,
      width: 0,
      layout: null,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId || motion.kind === "anim") {
      return;
    }

    const rawX = event.clientX - session.startX;
    const rawY = event.clientY - session.startY;
    session.rawX = rawX;

    if (!session.dragging) {
      if (Math.abs(rawX) < DRAG_START_PX && Math.abs(rawY) < DRAG_START_PX) {
        return;
      }
      if (Math.abs(rawY) > Math.abs(rawX)) {
        dragRef.current = null;
        return;
      }

      session.dragging = true;
      suppressClick.current = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is unavailable for this event. The drag still tracks moves.
      }
      window.getSelection()?.removeAllRanges();

      const width = viewportWidth(viewportRef.current);
      const layout = adjacentLayout(session.originIndex, rounds.length);
      const height = panelRef.current?.offsetHeight;
      session.layout = layout;
      session.width = width;
      session.x = dragX(layout, width, resist(rawX, session.originIndex, rounds.length));
      if (prefersReducedMotion()) {
        return;
      }
      if (height) {
        setFrameHeight(height);
      }
      setMotion({ kind: "drag", x: session.x, width, layout });
      return;
    }

    if (prefersReducedMotion() || !session.layout) {
      return;
    }

    session.x = dragX(
      session.layout,
      session.width,
      resist(rawX, session.originIndex, rounds.length),
    );
    setMotion({ kind: "drag", x: session.x, width: session.width, layout: session.layout });
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!session.dragging) {
      return;
    }

    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);

    const count = rounds.length;
    const nextIndex =
      session.rawX <= -COMMIT_PX && session.originIndex < count - 1
        ? session.originIndex + 1
        : session.rawX >= COMMIT_PX && session.originIndex > 0
          ? session.originIndex - 1
          : session.originIndex;

    if (prefersReducedMotion() || !session.layout || session.width === 0) {
      setMotion({ kind: "rest" });
      setFrameHeight(null);
      setPendingIndex(null);
      setIndex(nextIndex);
      return;
    }

    const stride = panelStride(session.width);
    const origin = restingX(session.layout, session.width);
    const to =
      nextIndex === session.originIndex
        ? origin
        : nextIndex > session.originIndex
          ? origin - stride
          : origin + stride;

    if (Math.abs(session.x - to) < 1) {
      setMotion({ kind: "rest" });
      setFrameHeight(null);
      setPendingIndex(null);
      setIndex(nextIndex);
      return;
    }

    if (nextIndex !== session.originIndex) {
      setPendingIndex(nextIndex);
    }
    setMotion({
      kind: "anim",
      layout: session.layout,
      from: session.x,
      to,
      width: session.width,
      commitIndex: nextIndex,
    });
  }

  function onPointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }
    session.rawX = 0;
    onPointerUp(event);
  }

  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!suppressClick.current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    suppressClick.current = false;
  }

  return (
    <TournamentSection
      className="min-w-0 lg:flex-1"
      header={
        <>
          <ChessPawn aria-hidden="true" className="size-4.5 shrink-0 text-primary" />
          Partie
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-5">
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="Rundy"
          className="flex min-w-0 gap-1.5 overflow-x-auto overscroll-x-contain"
          onKeyDown={onTabsKeyDown}
        >
          {rounds.map((round, roundIndex) => {
            const isSelected = roundIndex === selected;
            return (
              <button
                key={round.round}
                type="button"
                role="tab"
                id={`${baseId}-tab-${round.round}`}
                data-round-index={roundIndex}
                aria-selected={isSelected}
                aria-controls={`${baseId}-panel`}
                tabIndex={isSelected ? 0 : -1}
                className={cn(
                  "shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => select(roundIndex)}
              >
                Runda {round.round}
              </button>
            );
          })}
        </div>
        <div
          ref={viewportRef}
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${rounds[selected]?.round ?? activeRound.round}`}
          className={cn(
            "w-full min-w-0 touch-pan-y overflow-hidden",
            motion.kind === "drag" && "select-none",
          )}
          style={frameHeight ? { height: frameHeight } : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClickCapture={onClickCapture}
        >
          <div
            key={motion.kind === "rest" ? `rest-${activeRound.round}` : "moving"}
            ref={trackRef}
            className="flex items-start"
            style={{
              gap: PANEL_GAP_PX,
              ...(motion.kind === "rest"
                ? {}
                : {
                  transform: `translateX(${motion.kind === "drag" ? motion.x : motion.from}px)`,
                }),
            }}
          >
            {panels.map((panel) => (
              <div
                key={panel.round}
                ref={panel.current ? panelRef : undefined}
                className={cn("shrink-0", motion.kind === "rest" && "w-full")}
                style={panelWidth ? { width: panelWidth } : undefined}
                aria-hidden={panel.hidden || undefined}
                inert={panel.hidden || undefined}
              >
                <div className="flex flex-col gap-3">
                  {panel.games.map((game) => (
                    <GameCard
                      key={game.id}
                      white={cardPlayer(game.white)}
                      black={cardPlayer(game.black)}
                      result={game.result}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TournamentSection>
  );
}

function panelsFor(layout: Layout, rounds: RoundGroup[], index: number) {
  const current = rounds[index];
  if (!current || layout.type === "single") {
    return current
      ? [{ round: current.round, games: current.games, hidden: false, current: true }]
      : [];
  }

  if (layout.type === "jump") {
    const target = rounds[layout.targetIndex];
    const outgoing = { round: current.round, games: current.games, hidden: false, current: true };
    const incoming = target
      ? { round: target.round, games: target.games, hidden: true, current: false }
      : null;
    if (!incoming) {
      return [outgoing];
    }
    return layout.direction === "forward" ? [outgoing, incoming] : [incoming, outgoing];
  }

  const panels = [];
  if (layout.hasPrev && rounds[index - 1]) {
    const previous = rounds[index - 1];
    panels.push({ round: previous.round, games: previous.games, hidden: true, current: false });
  }
  panels.push({ round: current.round, games: current.games, hidden: false, current: true });
  if (layout.hasNext && rounds[index + 1]) {
    const next = rounds[index + 1];
    panels.push({ round: next.round, games: next.games, hidden: true, current: false });
  }
  return panels;
}

function adjacentLayout(roundIndex: number, count: number): AdjacentLayout {
  return {
    type: "adjacent",
    hasPrev: roundIndex > 0,
    hasNext: roundIndex < count - 1,
  };
}

function panelStride(width: number) {
  return width + PANEL_GAP_PX;
}

function restingX(layout: AdjacentLayout, width: number) {
  return layout.hasPrev ? -panelStride(width) : 0;
}

function dragX(layout: AdjacentLayout, width: number, dx: number) {
  return restingX(layout, width) + dx;
}

function resist(dx: number, roundIndex: number, count: number) {
  if ((roundIndex <= 0 && dx > 0) || (roundIndex >= count - 1 && dx < 0)) {
    return dx * 0.3;
  }
  return dx;
}

function viewportWidth(viewport: HTMLDivElement | null) {
  return viewport?.clientWidth ?? 0;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function cardPlayer(player: TournamentPlayer | null): GameCardPlayer | null {
  if (!player) {
    return null;
  }

  return {
    firstName: player.firstName,
    lastName: player.lastName,
    href: routes.player(player.slug),
  };
}

function comparePlayers(a: TournamentPlayer, b: TournamentPlayer) {
  return (
    a.lastName.localeCompare(b.lastName, "pl") ||
    a.firstName.localeCompare(b.firstName, "pl") ||
    a.slug.localeCompare(b.slug, "pl")
  );
}

function isUnplayedPairing(game: TournamentGame) {
  return game.result === "bye" || game.result === "unplayed";
}

function leftPlayer(game: TournamentGame): TournamentPlayer | null {
  if (game.result === "bye") {
    return game.white ?? game.black;
  }
  return game.white;
}

function groupByRound(games: TournamentGame[]) {
  const byRound = new Map<number, TournamentGame[]>();
  for (const game of games) {
    const rows = byRound.get(game.round) ?? [];
    rows.push(game);
    byRound.set(game.round, rows);
  }

  return [...byRound.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, rows]) => ({
      round,
      games: rows.sort((a, b) => {
        const unplayedOrder = Number(isUnplayedPairing(a)) - Number(isUnplayedPairing(b));
        if (unplayedOrder !== 0) {
          return unplayedOrder;
        }

        const leftA = leftPlayer(a);
        const leftB = leftPlayer(b);
        if (!leftA && !leftB) {
          return 0;
        }
        if (!leftA) {
          return 1;
        }
        if (!leftB) {
          return -1;
        }
        return comparePlayers(leftA, leftB);
      }),
    }));
}
