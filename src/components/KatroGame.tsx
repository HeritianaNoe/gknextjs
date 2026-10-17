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
  "#F1E8D0",
  "#E6D3A8",
  "#D9C08A",
  "#EADFC4",
  "#CDAE70",
  "#E2C98F",
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
  const sideStroke = owner === GREEN ? "rgba(70,190,90,0.75)" : "rgba(235,80,70,0.75)";

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
            <stop offset="0%" stopColor="#3A1E0A" />
            <stop offset="100%" stopColor="#140A03" />
          </radialGradient>
          <linearGradient id={`bevel-${holeIdx}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2B1405" />
            <stop offset="100%" stopColor="#F0BE82" />
          </linearGradient>
          <filter id={`blur-${holeIdx}`}>
            <feGaussianBlur stdDeviation="2.5" />
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

        {/* Carved hole: bevel lit from top-left, deep dark interior */}
        <circle cx={cx} cy={cy + 2} r={r + 6} fill="rgba(30,12,2,0.35)" filter={`url(#blur-${holeIdx})`} />
        <circle cx={cx} cy={cy} r={r + 5} fill={`url(#bevel-${holeIdx})`} />
        <circle cx={cx} cy={cy} r={r + 4.2} fill="none" stroke={sideStroke} strokeWidth="2.4" />
        <circle cx={cx} cy={cy} r={r + 1.5} fill="#1C0D03" />
        <circle cx={cx} cy={cy} r={r} fill={`url(#holeGrad-${holeIdx})`} />
        {/* Inner shadow (top-left) and lit lip (bottom-right) */}
        <circle cx={cx} cy={cy} r={r - 2} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="5"
          strokeDasharray={`${round4(Math.PI * r * 0.9)} ${round4(Math.PI * r * 1.2)}`}
          transform={`rotate(144 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r - 1} fill="none" stroke="rgba(255,200,140,0.3)" strokeWidth="2"
          strokeDasharray={`${round4(Math.PI * r * 0.9)} ${round4(Math.PI * r * 1.2)}`}
          transform={`rotate(-36 ${cx} ${cy})`} />

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
            stroke="#FFD54A"
            strokeWidth="3"
            className="opacity-60 group-hover:opacity-100"
          />
        )}
      </svg>

      {/* Count badge */}
      {count > 0 && (
        <span
          className="absolute bottom-0 right-0 font-bold leading-none px-1.5 py-0.5 rounded-full
            pointer-events-none"
          style={{
            fontSize: Math.max(10, size * 0.16),
            background: "#F6EBD3",
            color: "#3B1F0C",
            border: "1.5px solid #4A260E",
            boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
          }}
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

  // Responsive pit size (measure the board bed)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const cs = getComputedStyle(el);
      const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 8;
      const available = el.clientWidth - pad - 8 * (board.cols - 1);
      setPitSize(Math.min(96, Math.max(40, Math.floor(available / board.cols))));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
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
        className="grid gap-2 justify-items-center"
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

  const greenTint = currentColor === GREEN && !gameOver ? "rgba(46,158,67,0.28)" : "rgba(46,158,67,0.10)";
  const redTint = currentColor === RED && !gameOver ? "rgba(211,47,47,0.28)" : "rgba(211,47,47,0.10)";

  return (
    <div className="flex flex-col items-center w-full max-w-[640px] mx-auto gap-4 py-2">
      <div className="w-full text-center">
        <h1 className="katro-title leading-none">KATRO</h1>
        <p className="text-base italic mt-1" style={{ color: "#4B3A2A" }}>
          Lalao nentim-paharazana Malagasy
        </p>
      </div>

      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <RoleChip
            color={GREEN_COLOR}
            active={!gameOver && currentColor === GREEN}
            text={roleOf(GREEN)}
            count={board.sideSum(GREEN)}
          />
          <RoleChip
            color={RED_COLOR}
            active={!gameOver && currentColor === RED}
            text={roleOf(RED)}
            count={board.sideSum(RED)}
          />
        </div>
        <div className="flex gap-2">
          <button onClick={openSettings} className="katro-btn">Settings</button>
          <button onClick={() => resetGame()} className="katro-btn">Restart</button>
        </div>
      </div>

      {gameOver && message && (
        <p className="font-semibold text-center px-4 py-2 rounded-lg" style={{ background: "#FFE9A8", color: "#4A2E05", border: "1px solid #B8860B" }}>
          {message}
        </p>
      )}

      {/* Cadre > bande sculptée > plateau */}
      <div className="katro-frame">
        <div className="katro-band">
          <div ref={containerRef} className="katro-bed">
            <div className="katro-half" style={{ background: greenTint }}>
              {renderRow(0)}
              {renderRow(1)}
            </div>
            <div className="katro-groove" />
            <div className="katro-half" style={{ background: redTint }}>
              {renderRow(2)}
              {renderRow(3)}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-center" style={{ color: "#4B3A2A" }}>
        Copyright 2026 — RASOLOMANANA Heritiana Noe
      </p>

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
  count,
}: {
  color: string;
  text: string;
  active: boolean;
  count: number;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
      style={{
        backgroundColor: active ? "#FFD54A" : "rgba(255,255,255,0.45)",
        color: "#3E2723",
        border: `1.5px solid ${active ? "#B8860B" : "rgba(109,68,37,0.4)"}`,
      }}
    >
      <span
        className="inline-block w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: color, boxShadow: "0 0 0 2px rgba(0,0,0,0.2)" }}
      />
      {text}
      <span className="font-normal opacity-70">· {count} voa</span>
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