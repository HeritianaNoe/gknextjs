"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Board,
  GREEN,
  RED,
  LEFT,
  RIGHT,
  computerMove,
  defaultSettings,
  type GameSettings,
  type Player,
  type Direction,
} from "@/lib/katro";

const STEP_DELAY = 280;

const GREEN_COLOR = "#2E9E43";
const RED_COLOR = "#D32F2F";

const SEED_COLORS = [
  "#8E9B8A",
  "#9AA595",
  "#7E8C7B",
  "#B3AA92",
  "#A7A892",
  "#8A9684",
];

/** Deterministic pseudo-random for stable seed positions */
function seededRand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

interface SeedPos {
  x: number;
  y: number;
  rot: number;
  color: string;
  a: number;
  b: number;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function computeSeeds(count: number, holeIdx: number, r: number): SeedPos[] {
  if (count <= 0) return [];
  const sr = Math.min(0.34 * r, (0.88 * r) / (1.5 * Math.sqrt(count - 0.5) + 1));
  const spacing = 1.5 * sr;
  const seeds: SeedPos[] = [];
  for (let i = 0; i < count; i++) {
    const rnd = seededRand(holeIdx * 131 + i * 17 + 7);
    const ang = i * 2.399963 + holeIdx * 0.7;
    const rho = spacing * Math.sqrt(i + 0.5);
    const x = round4(Math.cos(ang) * rho);
    const y = round4(Math.sin(ang) * rho);
    const rot = round4(rnd * Math.PI);
    const color = SEED_COLORS[Math.floor(rnd * SEED_COLORS.length) % SEED_COLORS.length];
    seeds.push({
      x,
      y,
      rot,
      color,
      a: round4(sr * 1.25),
      b: round4(sr * 0.95),
    });
  }
  return seeds;
}

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((n >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (n & 0xff) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) * (1 - amount));
  const g = Math.max(0, ((n >> 8) & 0xff) * (1 - amount));
  const b = Math.max(0, (n & 0xff) * (1 - amount));
  return `#${((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).padStart(6, "0")}`;
}

function Pit({
  count,
  holeIdx,
  owner,
  isHighlight,
  isPlayable,
  onClick,
  size,
}: {
  count: number;
  holeIdx: number;
  owner: Player;
  isHighlight: boolean;
  isPlayable: boolean;
  onClick: () => void;
  size: number;
}) {
  const r = size * 0.42;
  const cx = size / 2;
  const cy = size / 2;
  const seeds = useMemo(() => computeSeeds(count, holeIdx, r), [count, holeIdx, r]);
  const sideTint = owner === GREEN ? "rgba(46,158,67,0.18)" : "rgba(211,47,47,0.18)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isPlayable}
      className={`
        relative flex items-center justify-center p-0 border-0 bg-transparent group
        ${isPlayable ? "cursor-pointer" : "cursor-default"}
        focus:outline-none
      `}
      style={{ width: size, height: size }}
      aria-label={`Lavaka ${holeIdx + 1}: ${count} voa`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id={`holeGrad-${holeIdx}`} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#3D2814" />
            <stop offset="55%" stopColor="#2A1A0C" />
            <stop offset="100%" stopColor="#1A1008" />
          </radialGradient>
          <filter id={`blur-${holeIdx}`}>
            <feGaussianBlur stdDeviation="2" />
          </filter>
          <filter id={`seedShadow-${holeIdx}`}>
            <feDropShadow dx="1.2" dy="1.8" stdDeviation="1.2" floodOpacity="0.4" />
          </filter>
          {seeds.map((s, i) => {
            const lighter = lighten(s.color, 0.35);
            const darker = darken(s.color, 0.3);
            return (
              <radialGradient
                key={i}
                id={`seedGrad-${holeIdx}-${i}`}
                cx="30%"
                cy="25%"
                r="75%"
              >
                <stop offset="0%" stopColor={lighter} />
                <stop offset="55%" stopColor={s.color} />
                <stop offset="100%" stopColor={darker} />
              </radialGradient>
            );
          })}
        </defs>

        {/* Outer shadow under pit */}
        <ellipse
          cx={cx}
          cy={cy + 3}
          rx={r + 2}
          ry={r + 1}
          fill="rgba(0,0,0,0.25)"
          filter={`url(#blur-${holeIdx})`}
        />

        {/* Pit outer rim (wood edge) */}
        <circle cx={cx} cy={cy} r={r + 3} fill="#5C3317" />
        <circle cx={cx} cy={cy} r={r + 1.5} fill="#7A4A22" />

        {/* Side color wash */}
        <circle cx={cx} cy={cy} r={r + 0.5} fill={sideTint} />

        {/* Inner hole (dark recessed) */}
        <circle cx={cx} cy={cy} r={r} fill={`url(#holeGrad-${holeIdx})`} />

        {/* Inner rim highlight (top-left light) */}
        <circle
          cx={cx}
          cy={cy}
          r={r - 1}
          fill="none"
          stroke="rgba(255,226,184,0.25)"
          strokeWidth="2"
          strokeDasharray={`${round4(Math.PI * r * 0.55)} ${round4(Math.PI * r * 1.5)}`}
          strokeLinecap="round"
          transform={`rotate(-30 ${cx} ${cy})`}
        />

        {/* Seeds / vato */}
        {seeds.map((s, i) => (
          <g
            key={i}
            transform={`translate(${round4(cx + s.x)}, ${round4(cy + s.y)}) rotate(${round4((s.rot * 180) / Math.PI)})`}
            filter={`url(#seedShadow-${holeIdx})`}
          >
            <ellipse
              cx={0}
              cy={0}
              rx={s.a}
              ry={s.b}
              fill={`url(#seedGrad-${holeIdx}-${i})`}
            />
          </g>
        ))}

        {/* Highlight ring */}
        {isHighlight && (
          <>
            <circle cx={cx} cy={cy} r={r} fill="rgba(255,235,59,0.27)" />
            <circle
              cx={cx}
              cy={cy}
              r={r + 3}
              fill="none"
              stroke="#FFEB3B"
              strokeWidth="4"
            />
          </>
        )}

        {/* Playable hover ring */}
        {isPlayable && !isHighlight && (
          <circle
            cx={cx}
            cy={cy}
            r={r + 2.5}
            fill="none"
            stroke="rgba(255,235,59,0.7)"
            strokeWidth="2.5"
            className="opacity-60 group-hover:opacity-100"
          />
        )}
      </svg>

      {/* Count badge */}
      {count > 0 && (
        <span
          className="absolute bottom-0.5 right-0.5 font-bold leading-none px-1 rounded
            bg-black/55 text-white/95 pointer-events-none"
          style={{ fontSize: Math.max(9, size * 0.14) }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default function KatroGame() {
  const [settings, setSettings] = useState<GameSettings>({ ...defaultSettings });
  const [board, setBoard] = useState(() => new Board(8));
  const [currentColor, setCurrentColor] = useState<Player>(RED);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState<GameSettings>({ ...defaultSettings });
  const epochRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pitSize, setPitSize] = useState(64);

  // Responsive pit size
  useEffect(() => {
    const update = () => {
      const w = containerRef.current?.clientWidth ?? 360;
      const cols = board.cols;
      const gap = 6;
      const pad = 20;
      const available = w - pad * 2 - gap * (cols - 1);
      setPitSize(Math.min(72, Math.max(44, Math.floor(available / cols))));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [board.cols]);

  const resetGame = useCallback(
    (s: GameSettings = settings) => {
      epochRef.current += 1;
      const b = new Board(s.holes);
      setBoard(b);
      setCurrentColor(s.startColor);
      setHighlight(null);
      setBusy(false);
      setGameOver(false);
      setMessage(null);
    },
    [settings]
  );

  const endTurn = useCallback(
    async (epoch: number, b: Board, nextColor: Player) => {
      if (epoch !== epochRef.current) return;

      if (b.isGameOver()) {
        setGameOver(true);
        setBusy(false);
        const greenLost = b.isGameOverFor(GREEN);
        const redLost = b.isGameOverFor(RED);
        if (greenLost && redLost) setMessage("GAME OVER! Draw / Nahitsa.");
        else if (greenLost) setMessage("GAME OVER! Red / Mena no nandresy.");
        else setMessage("GAME OVER! Green / Maitso no nandresy.");
        return;
      }

      setCurrentColor(nextColor);
      setBusy(false);

      // GREEN no Computer foana
      if (nextColor === GREEN) {
        setBusy(true);
        await new Promise((r) => setTimeout(r, 300));
        if (epoch !== epochRef.current) return;
        const idx = computerMove(b, nextColor, settings.direction, settings.level);
        if (idx >= 0) {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          await playMoveRef.current(idx, epoch, b, nextColor);
        }
      }
    },
    [settings]
  );

  // Raha ny kompiotera (GREEN) no manomboka rehefa mikitika restart na manova settings
  useEffect(() => {
    if (currentColor === GREEN && !busy && !gameOver) {
      const epoch = epochRef.current;
      const runComputerStart = async () => {
        setBusy(true);
        await new Promise((r) => setTimeout(r, 300));
        if (epoch !== epochRef.current) return;
        const idx = computerMove(board, GREEN, settings.direction, settings.level);
        if (idx >= 0) {
          await playMoveRef.current(idx, epoch, board, GREEN);
        }
      };
      runComputerStart();
    }
  }, [currentColor, board, gameOver, settings, busy]);

  const playMove = useCallback(
    async (startIndex: number, epoch: number, startBoard: Board, player: Player) => {
      if (epoch !== epochRef.current) return;
      setBusy(true);

      const b = startBoard.clone();
      let index = startIndex;
      let cap = 0;
      let laps = 0;
      const direction = settings.direction;

      while (laps++ < Board.maxLaps) {
        if (epoch !== epochRef.current) return;
        const value = b.tiles[index] + cap;
        b.tiles[index] = 0;
        setBoard(b.clone());
        setHighlight(null);

        let cur = index;
        for (let i = 0; i < value; i++) {
          if (epoch !== epochRef.current) return;
          cur = b.step(cur, player, direction);
          b.tiles[cur]++;
          setBoard(b.clone());
          setHighlight(cur);
          await new Promise((r) => setTimeout(r, STEP_DELAY));
        }
        setHighlight(null);
        index = cur;

        if (b.tiles[index] > 1 && !b.isGameOver()) {
          cap = b.isPositionFirstPlace(index, player) ? b.capture(index, player) : 0;
          setBoard(b.clone());
        } else {
          break;
        }
      }

      const next = (3 - player) as Player;
      await endTurn(epoch, b, next);
    },
    [settings.direction, endTurn]
  );

  const playMoveRef = useRef(playMove);
  useEffect(() => {
    playMoveRef.current = playMove;
  }, [playMove]);

  const onPitClick = (index: number) => {
    if (busy || gameOver) return;
    if (board.ownerOf(index) !== currentColor) return;
    if (board.tiles[index] === 0) return;
    if (currentColor === GREEN) return; // Tsy afaka kitihin'ny Olombelona ny an'ny Computer (GREEN)

    const epoch = epochRef.current;
    playMove(index, epoch, board, currentColor);
  };

  const cols = board.cols;
  const place = board.place;

  const openSettings = () => {
    setTempSettings({ ...settings });
    setShowSettings(true);
  };

  const applySettings = () => {
    setSettings(tempSettings);
    setShowSettings(false);
    resetGame(tempSettings);
  };

  const roleOf = (color: Player) => {
    return color === GREEN ? "Computer" : "Human";
  };

  const renderRow = (row: number) => {
    const owner = row < 2 ? GREEN : RED;
    return (
      <div
        className="grid gap-1.5 justify-items-center"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: cols }, (_, col) => {
          const gridIndex = row * cols + col;
          const tileIndex = place[gridIndex];
          return (
            <Pit
              key={gridIndex}
              count={board.tiles[tileIndex]}
              holeIdx={tileIndex}
              owner={owner}
              isHighlight={highlight === tileIndex}
              isPlayable={
                !busy &&
                !gameOver &&
                board.ownerOf(tileIndex) === currentColor &&
                board.tiles[tileIndex] > 0 &&
                currentColor === RED
              }
              onClick={() => onPitClick(tileIndex)}
              size={pitSize}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[600px] mx-auto gap-3 py-4">
      {/* Header — Misaraka amin'ny cadre, soratra marron maizina/mainty */}
      <div className="w-full text-center py-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-wider" style={{ color: "#3E2723" }}>
          KATRO
        </h1>
        <p className="text-md font-medium italic mt-0.5" style={{ color: "#5D4037" }}>
          Lalao nentim-paharazana Malagasy
        </p>
      </div>

      {/* Cadre misy ny lalao katro — Cream body #F1E3C8 */}
      <div
        className="w-full flex flex-col items-center gap-3 px-3 pt-3 pb-4 rounded-xl shadow-md border"
        style={{ backgroundColor: "#F1E3C8", borderColor: "rgba(109,68,37,0.2)" }}
      >
        {/* Role chips + buttons */}
        <div className="flex flex-wrap items-center justify-between w-full gap-2">
          <div className="flex flex-wrap gap-2">
            <RoleChip
              color={GREEN_COLOR}
              active={!gameOver && currentColor === GREEN}
              text={`${roleOf(GREEN)}`}
            />
            <RoleChip
              color={RED_COLOR}
              active={!gameOver && currentColor === RED}
              text={`${roleOf(RED)}`}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={openSettings}
              className="px-3 py-1.5 text-sm rounded border font-medium bg-white/60 hover:bg-white transition-colors"
              style={{ borderColor: "#6D4425", color: "#6D4425" }}
            >
              Settings
            </button>
            <button
              onClick={() => resetGame()}
              className="px-3 py-1.5 text-sm rounded border font-medium bg-white/60 hover:bg-white transition-colors"
              style={{ borderColor: "#6D4425", color: "#6D4425" }}
            >
              Restart
            </button>
          </div>
        </div>

        {gameOver && message && (
          <p className="font-semibold text-center text-amber-900 bg-amber-100 px-4 py-2 rounded-lg">
            {message}
          </p>
        )}

        {/* Wooden board */}
        <div ref={containerRef} className="w-full">
          <div
            className="relative mx-auto rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #B9743D 0%, #9C5A2B 50%, #AD6934 100%)",
              boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
              border: "3px solid #4A260E",
              padding: "12px 10px",
            }}
          >
            {/* Wood grain */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.18]"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 13px,
                  rgba(59,29,8,0.4) 13px,
                  rgba(59,29,8,0.4) 14px
                )`,
              }}
            />

            <div className="relative z-10 space-y-1">
              {/* Green half (top) */}
              <div
                className="rounded-xl px-1 py-1.5 space-y-1.5"
                style={{
                  background:
                    currentColor === GREEN && !gameOver
                      ? "rgba(46,158,67,0.22)"
                      : "rgba(46,158,67,0.08)",
                }}
              >
                {renderRow(0)}
                {renderRow(1)}
              </div>

              {/* Red half (bottom) */}
              <div
                className="rounded-xl px-1 py-1.5 space-y-1.5"
                style={{
                  background:
                    currentColor === RED && !gameOver
                      ? "rgba(211,47,47,0.22)"
                      : "rgba(211,47,47,0.08)",
                }}
              >
                {renderRow(2)}
                {renderRow(3)}
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-center" style={{ color: "#5D4037" }}>
          Copyright 2026 — RASOLOMANANA Heritiana Noe
        </p>
      </div>

      {/* Settings Dialog */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
            style={{ backgroundColor: "#F1E3C8" }}
          >
            <h2 className="text-xl font-bold" style={{ color: "#6D4425" }}>
              Settings
            </h2>

            <SettingRow label="Start color">
              <select
                value={tempSettings.startColor}
                onChange={(e) =>
                  setTempSettings({
                    ...tempSettings,
                    startColor: Number(e.target.value) as Player,
                  })
                }
                className="w-full rounded-lg border px-3 py-2"
                style={{
                  borderColor: "rgba(109,68,37,0.4)",
                  backgroundColor: "#ffffff",
                  color: "#3E2723",
                  colorScheme: "light",
                }}
              >
                <option value={GREEN} style={{ color: "#3E2723", backgroundColor: "#ffffff" }}>Green (Computer)</option>
                <option value={RED} style={{ color: "#3E2723", backgroundColor: "#ffffff" }}>Red (Human)</option>
              </select>
            </SettingRow>

            <SettingRow label="Difficulty">
              <select
                value={tempSettings.level}
                onChange={(e) =>
                  setTempSettings({
                    ...tempSettings,
                    level: Number(e.target.value) as 0 | 1 | 2,
                  })
                }
                className="w-full rounded-lg border px-3 py-2"
                style={{
                  borderColor: "rgba(109,68,37,0.4)",
                  backgroundColor: "#ffffff",
                  color: "#3E2723",
                  colorScheme: "light",
                }}
              >
                <option value={0} style={{ color: "#3E2723", backgroundColor: "#ffffff" }}>Easy</option>
                <option value={1} style={{ color: "#3E2723", backgroundColor: "#ffffff" }}>Medium</option>
                <option value={2} style={{ color: "#3E2723", backgroundColor: "#ffffff" }}>Hard</option>
              </select>
            </SettingRow>

            <SettingRow label="Direction">
              <select
                value={tempSettings.direction}
                onChange={(e) =>
                  setTempSettings({
                    ...tempSettings,
                    direction: Number(e.target.value) as Direction,
                  })
                }
                className="w-full rounded-lg border px-3 py-2"
                style={{
                  borderColor: "rgba(109,68,37,0.4)",
                  backgroundColor: "#ffffff",
                  color: "#3E2723",
                  colorScheme: "light",
                }}
              >
                <option value={LEFT} style={{ color: "#3E2723", backgroundColor: "#ffffff" }}>Left</option>
                <option value={RIGHT} style={{ color: "#3E2723", backgroundColor: "#ffffff" }}>Right</option>
              </select>
            </SettingRow>

            <SettingRow label="Holes">
              <select
                value={tempSettings.holes}
                onChange={(e) =>
                  setTempSettings({
                    ...tempSettings,
                    holes: Number(e.target.value) as 8 | 12,
                  })
                }
                className="w-full rounded-lg border px-3 py-2"
                style={{
                  borderColor: "rgba(109,68,37,0.4)",
                  backgroundColor: "#ffffff",
                  color: "#3E2723",
                  colorScheme: "light",
                }}
              >
                <option value={8} style={{ color: "#3E2723", backgroundColor: "#ffffff" }}>8</option>
                <option value={12} style={{ color: "#3E2723", backgroundColor: "#ffffff" }}>12</option>
              </select>
            </SettingRow>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-lg bg-white border"
                style={{ borderColor: "rgba(109,68,37,0.4)", color: "#6D4425" }}
              >
                Cancel
              </button>
              <button
                onClick={applySettings}
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: "#6D4425" }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleChip({
  color,
  text,
  active,
}: {
  color: string;
  text: string;
  active: boolean;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs sm:text-sm font-medium"
      style={{
        backgroundColor: active ? "#FFEB3B" : "transparent",
        color: "#3E2723",
      }}
    >
      <span
        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      {text}
    </div>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium" style={{ color: "#5D4037" }}>
        {label}
      </label>
      {children}
    </div>
  );
}