import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { TabGrid } from "../components/TabGrid";
import { InstructionBanner } from "../components/InstructionBanner";
import { useSoundFeedback } from "../hooks/useSoundFeedback";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { DEFAULT_SETTINGS, type AppSettings } from "./settings";

const SETTINGS_KEY = "jrkg_settings";
const { width } = Dimensions.get("window");
const DOT_RADIUS = 12;
const MIN_DIST_SQ = 64;

const COUNT_EMOJIS = ["⭐", "🍎", "🌸", "🦋", "🎈", "🐟", "💎", "🍉", "🐝", "🦊", "🍕", "🌟", "🎀", "🍦"];

const BG_COLORS = [
  "#F3E5F5", "#EDE7F6", "#E8EAF6", "#E3F2FD",
  "#E0F7FA", "#E8F5E9", "#FFFDE7", "#FFF8E1", "#FBE9E7",
];
const ACC_COLORS = [
  "#8E24AA", "#5E35B1", "#3949AB", "#1E88E5",
  "#0097A7", "#43A047", "#F9A825", "#F57C00", "#E64A19",
];

type Point = { x: number; y: number; id: number };
type QuizState = "idle" | "correct" | "wrong";
type MatchQ = { target: number; options: number[]; emoji: string };
type CountQ = { count: number; emoji: string; choices: number[] };
type OrderQ = { num: number; direction: "before" | "after"; answer: number; choices: number[] };
type MissingQ = { sequence: number[]; blankIndex: number; answer: number; choices: number[] };

// ── Helpers ──────────────────────────────────────────────────────────────────

function getNumbers(start: string, end: string): number[] {
  const s = parseInt(start, 10);
  const e = parseInt(end, 10);
  if (isNaN(s) || isNaN(e) || s > e) return [];
  return Array.from({ length: e - s + 1 }, (_, i) => s + i);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickEmoji() { return COUNT_EMOJIS[Math.floor(Math.random() * COUNT_EMOJIS.length)]; }

function wrongChoices(correct: number, pool: number[], count: number): number[] {
  const others = shuffle(pool.filter(n => n !== correct));
  const close = others.filter(n => Math.abs(n - correct) <= Math.max(3, Math.ceil(correct * 0.4)));
  const far   = others.filter(n => Math.abs(n - correct) >  Math.max(3, Math.ceil(correct * 0.4)));
  return [...close, ...far].slice(0, count);
}

function genMatch(numbers: number[]): MatchQ | null {
  if (numbers.length < 2) return null;
  const target = numbers[Math.floor(Math.random() * numbers.length)];
  const wrongs = wrongChoices(target, numbers, 2);
  if (wrongs.length < 1) return null;
  return { target, options: shuffle([target, ...wrongs]), emoji: pickEmoji() };
}

function genCount(numbers: number[], extraChoices = 0): CountQ | null {
  if (numbers.length < 2) return null;
  const count  = numbers[Math.floor(Math.random() * numbers.length)];
  const wrongs = wrongChoices(count, numbers, 2 + extraChoices);
  return { count, emoji: pickEmoji(), choices: shuffle([count, ...wrongs]) };
}

function genOrder(numbers: number[]): OrderQ | null {
  if (numbers.length < 2) return null;
  const dir = Math.random() < 0.5 ? "before" : "after";
  const eligible = dir === "before" ? numbers.slice(1) : numbers.slice(0, -1);
  if (!eligible.length) return null;
  const num    = eligible[Math.floor(Math.random() * eligible.length)];
  const idx    = numbers.indexOf(num);
  const answer = dir === "before" ? numbers[idx - 1] : numbers[idx + 1];
  const wrongs = wrongChoices(answer, numbers.filter(n => n !== num), 2);
  return { num, direction: dir, answer, choices: shuffle([answer, ...wrongs]) };
}

function genMissing(numbers: number[]): MissingQ | null {
  if (numbers.length < 3) return null;
  const win   = Math.min(5, numbers.length);
  const start = Math.floor(Math.random() * Math.max(1, numbers.length - win + 1));
  const seq   = numbers.slice(start, start + win);
  const bi    = Math.floor(Math.random() * seq.length);
  const answer = seq[bi];
  const outside = numbers.filter(n => !seq.includes(n));
  const pool    = outside.length >= 2 ? outside : numbers.filter(n => n !== answer);
  const wrongs  = shuffle(pool).slice(0, 2);
  return { sequence: seq, blankIndex: bi, answer, choices: shuffle([answer, ...wrongs]) };
}

// ── Object emoji display ──────────────────────────────────────────────────────

function ObjDisplay({ count, emoji }: { count: number; emoji: string }) {
  const n  = Math.min(count, 30);
  const fs = n <= 5 ? 44 : n <= 12 ? 32 : 22;
  return (
    <View style={styles.objGrid}>
      {Array.from({ length: n }, (_, i) => (
        <Text key={i} style={{ fontSize: fs }}>{emoji}</Text>
      ))}
    </View>
  );
}

// ── Shared empty state ────────────────────────────────────────────────────────

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 48 }}>⚙️</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

// ── Shared quiz feedback ──────────────────────────────────────────────────────

function Feedback({ state, correctMsg, onRetry }: { state: QuizState; correctMsg: string; onRetry: () => void }) {
  if (state === "correct") return <Text style={styles.fbCorrect}>{correctMsg}</Text>;
  if (state === "wrong") return (
    <View style={styles.fbWrongWrap}>
      <Text style={styles.fbWrong}>🤔  Try again!</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
        <Text style={styles.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
  return null;
}

// ── Number tracing board ──────────────────────────────────────────────────────

function TracingBoard({ num, bg, accent }: { num: number; bg: string; accent: string }) {
  const pts    = useRef<Point[]>([]);
  const ctr    = useRef(0);
  const [, upd] = useState(0);
  const pending = useRef(false);

  const flush = () => {
    if (!pending.current) {
      pending.current = true;
      setTimeout(() => { pending.current = false; upd(n => n + 1); }, 16);
    }
  };
  const addPt = (x: number, y: number) => {
    const last = pts.current[pts.current.length - 1];
    if (last) { const dx = x - last.x, dy = y - last.y; if (dx*dx + dy*dy < MIN_DIST_SQ) return; }
    pts.current.push({ x, y, id: ctr.current++ });
    if (pts.current.length > 600) pts.current.splice(0, 100);
    flush();
  };

  const pan = Gesture.Pan().runOnJS(true).minDistance(0)
    .onBegin(e => addPt(e.x, e.y)).onUpdate(e => addPt(e.x, e.y));
  const clear = () => { pts.current = []; upd(n => n + 1); };

  const digits = String(num).length;
  const fs = digits === 1 ? 210 : digits === 2 ? 140 : 90;

  return (
    <GestureHandlerRootView style={[styles.board, { backgroundColor: bg }]}>
      <View style={styles.guideWrap} pointerEvents="none">
        <Text style={[styles.guideNum, { color: accent, fontSize: fs }]}>{num}</Text>
      </View>
      <View style={styles.hintRow} pointerEvents="none">
        <Text style={styles.hintTxt}>Trace the number with your finger ✏️</Text>
      </View>
      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill}>
          {pts.current.map(p => (
            <View key={p.id} style={[styles.dot, { left: p.x - DOT_RADIUS, top: p.y - DOT_RADIUS, backgroundColor: accent }]} />
          ))}
        </View>
      </GestureDetector>
      <TouchableOpacity style={[styles.clearBtn, { backgroundColor: accent }]} onPress={clear} activeOpacity={0.8}>
        <Text style={styles.clearBtnTxt}>🗑️  Clear</Text>
      </TouchableOpacity>
    </GestureHandlerRootView>
  );
}

// ── 1. Trace Section ──────────────────────────────────────────────────────────

function TraceSection({ numbers }: { numbers: number[] }) {
  const [idx, setIdx] = useState(0);
  if (!numbers.length) return <Empty text="No numbers available. Check Settings!" />;
  const num    = numbers[idx];
  const accent = ACC_COLORS[idx % ACC_COLORS.length];
  const bg     = BG_COLORS[idx % BG_COLORS.length];
  const eji    = COUNT_EMOJIS[idx % COUNT_EMOJIS.length];

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.traceNav}>
        <TouchableOpacity style={[styles.navBtn, idx === 0 && styles.navBtnOff]}
          onPress={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} activeOpacity={0.7}>
          <Text style={[styles.navBtnTxt, { color: accent }]}>◀</Text>
        </TouchableOpacity>
        <View style={styles.traceInfo}>
          <Text style={[styles.traceNum, { color: accent }]}>{num}</Text>
          <Text style={styles.traceEmoji}>{Array.from({ length: Math.min(num, 8) }, () => eji).join("")}</Text>
          <Text style={styles.traceCtr}>{idx + 1} / {numbers.length}</Text>
        </View>
        <TouchableOpacity style={[styles.navBtn, idx === numbers.length - 1 && styles.navBtnOff]}
          onPress={() => setIdx(i => Math.min(numbers.length - 1, i + 1))} disabled={idx === numbers.length - 1} activeOpacity={0.7}>
          <Text style={[styles.navBtnTxt, { color: accent }]}>▶</Text>
        </TouchableOpacity>
      </View>
      <TracingBoard key={`${num}-${idx}`} num={num} accent={accent} bg={bg} />
    </View>
  );
}

// ── 2. Match Section ──────────────────────────────────────────────────────────

function MatchSection({ numbers }: { numbers: number[] }) {
  const [q, setQ] = useState<MatchQ | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [state, setState] = useState<QuizState>("idle");
  const [streak, setStreak] = useState(0);
  const { playCorrect, playWrong } = useSoundFeedback();
  const next = () => { setQ(genMatch(numbers)); setSel(null); setState("idle"); };
  useEffect(() => { next(); }, [numbers]);

  const tap = (opt: number) => {
    if (state !== "idle" || !q) return;
    setSel(opt);
    if (opt === q.target) { playCorrect(); setState("correct"); setStreak(s => s + 1); setTimeout(next, 1600); }
    else { playWrong(); setState("wrong"); setStreak(0); }
  };

  if (numbers.length < 2) return <Empty text="Set at least 2 numbers in Settings!" />;
  if (!q) return null;

  return (
    <ScrollView contentContainerStyle={styles.sc} showsVerticalScrollIndicator={false}>
      <View style={styles.streakRow}>
        <Text style={styles.streak}>🔥 Streak: {streak}</Text>
        <TouchableOpacity style={styles.skipBtn} onPress={next} activeOpacity={0.7}>
          <Text style={styles.skipTxt}>Next →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.targetWrap}>
        <Text style={styles.prompt}>Find the group that has</Text>
        <View style={styles.targetBox}><Text style={styles.targetNum}>{q.target}</Text></View>
        <Text style={styles.prompt}>objects!</Text>
      </View>

      <View style={styles.matchRow}>
        {q.options.map((opt, i) => {
          const isSel = sel === opt;
          const ok    = state === "correct" && isSel;
          const bad   = state === "wrong"   && isSel;
          return (
            <TouchableOpacity key={`${opt}-${i}`} onPress={() => tap(opt)} disabled={state !== "idle"} activeOpacity={0.8}
              style={[styles.matchCard, ok && styles.cardOk, bad && styles.cardBad, state !== "idle" && !isSel && styles.dimmed]}>
              <ObjDisplay count={opt} emoji={q.emoji} />
              {ok  && <Text style={[styles.badge, { color: "#2E7D32" }]}>✓</Text>}
              {bad && <Text style={[styles.badge, { color: "#C62828" }]}>✗</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <Feedback state={state} correctMsg={`🎉  That's ${q.target}! Well done!`} onRetry={() => { setSel(null); setState("idle"); }} />
    </ScrollView>
  );
}

// ── 3. Count and Write Section ────────────────────────────────────────────────

function CountSection({ numbers }: { numbers: number[] }) {
  const [q, setQ] = useState<CountQ | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [state, setState] = useState<QuizState>("idle");
  const [streak, setStreak] = useState(0);
  const { playCorrect, playWrong } = useSoundFeedback();
  const next = () => { setQ(genCount(numbers, 0)); setSel(null); setState("idle"); };
  useEffect(() => { next(); }, [numbers]);

  const tap = (choice: number) => {
    if (state !== "idle" || !q) return;
    setSel(choice);
    if (choice === q.count) { playCorrect(); setState("correct"); setStreak(s => s + 1); setTimeout(next, 1500); }
    else { playWrong(); setState("wrong"); setStreak(0); }
  };

  if (numbers.length < 2) return <Empty text="Set at least 2 numbers in Settings!" />;
  if (!q) return null;

  return (
    <ScrollView contentContainerStyle={styles.sc} showsVerticalScrollIndicator={false}>
      <View style={styles.streakRow}>
        <Text style={styles.streak}>🔥 Streak: {streak}</Text>
        <TouchableOpacity style={styles.skipBtn} onPress={next} activeOpacity={0.7}><Text style={styles.skipTxt}>Next →</Text></TouchableOpacity>
      </View>
      <Text style={styles.prompt}>Count and write the number! ✏️</Text>
      <View style={styles.objWrap}><ObjDisplay count={q.count} emoji={q.emoji} /></View>
      <View style={styles.choicesRow}>
        {q.choices.map(ch => {
          const isSel = sel === ch;
          const ok = state === "correct" && isSel;
          const bad = state === "wrong" && isSel;
          return (
            <TouchableOpacity key={ch} onPress={() => tap(ch)} disabled={state !== "idle"} activeOpacity={0.8}
              style={[styles.numBtn, ok && styles.cardOk, bad && styles.cardBad, state !== "idle" && !isSel && styles.dimmed]}>
              <Text style={[styles.numBtnTxt, (ok || bad) && { color: "#fff" }]}>{ch}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Feedback state={state} correctMsg={`🎉  Yes! There are ${q.count}!`} onRetry={() => { setSel(null); setState("idle"); }} />
    </ScrollView>
  );
}

// ── 4. Count and Circle Section ───────────────────────────────────────────────

function CircleSection({ numbers }: { numbers: number[] }) {
  const [q, setQ] = useState<CountQ | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [state, setState] = useState<QuizState>("idle");
  const [streak, setStreak] = useState(0);
  const { playCorrect, playWrong } = useSoundFeedback();
  const next = () => { setQ(genCount(numbers, Math.min(1, numbers.length - 3))); setSel(null); setState("idle"); };
  useEffect(() => { next(); }, [numbers]);

  const tap = (choice: number) => {
    if (state !== "idle" || !q) return;
    setSel(choice);
    if (choice === q.count) { playCorrect(); setState("correct"); setStreak(s => s + 1); setTimeout(next, 1500); }
    else { playWrong(); setState("wrong"); setStreak(0); }
  };

  if (numbers.length < 2) return <Empty text="Set at least 2 numbers in Settings!" />;
  if (!q) return null;

  return (
    <ScrollView contentContainerStyle={styles.sc} showsVerticalScrollIndicator={false}>
      <View style={styles.streakRow}>
        <Text style={styles.streak}>🔥 Streak: {streak}</Text>
        <TouchableOpacity style={styles.skipBtn} onPress={next} activeOpacity={0.7}><Text style={styles.skipTxt}>Next →</Text></TouchableOpacity>
      </View>
      <Text style={styles.prompt}>Count and circle the correct number! 🔵</Text>
      <View style={styles.objWrap}><ObjDisplay count={q.count} emoji={q.emoji} /></View>
      <View style={styles.circleGrid}>
        {q.choices.map(ch => {
          const isSel = sel === ch;
          const ok    = state === "correct" && isSel;
          const bad   = state === "wrong"   && isSel;
          return (
            <TouchableOpacity key={ch} onPress={() => tap(ch)} disabled={state !== "idle"} activeOpacity={0.8}
              style={[styles.bubble, ok && styles.bubbleOk, bad && styles.bubbleBad, state !== "idle" && !isSel && styles.dimmed]}>
              <Text style={[styles.bubbleTxt, (ok || bad) && { color: "#fff" }]}>{ch}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Feedback state={state} correctMsg={`🎉  You circled ${q.count}! Correct!`} onRetry={() => { setSel(null); setState("idle"); }} />
    </ScrollView>
  );
}

// ── 5. Before & After Section ─────────────────────────────────────────────────

function OrderSection({ numbers }: { numbers: number[] }) {
  const [q, setQ] = useState<OrderQ | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [state, setState] = useState<QuizState>("idle");
  const [streak, setStreak] = useState(0);
  const { playCorrect, playWrong } = useSoundFeedback();
  const next = () => { setQ(genOrder(numbers)); setSel(null); setState("idle"); };
  useEffect(() => { next(); }, [numbers]);

  const tap = (choice: number) => {
    if (state !== "idle" || !q) return;
    setSel(choice);
    if (choice === q.answer) { playCorrect(); setState("correct"); setStreak(s => s + 1); setTimeout(next, 1400); }
    else { playWrong(); setState("wrong"); setStreak(0); }
  };

  if (numbers.length < 2) return <Empty text="Set at least 2 numbers in Settings!" />;
  if (!q) return null;
  const before = q.direction === "before";

  return (
    <ScrollView contentContainerStyle={styles.sc} showsVerticalScrollIndicator={false}>
      <View style={styles.streakRow}>
        <Text style={styles.streak}>🔥 Streak: {streak}</Text>
        <TouchableOpacity style={styles.skipBtn} onPress={next} activeOpacity={0.7}><Text style={styles.skipTxt}>Next →</Text></TouchableOpacity>
      </View>
      <Text style={styles.orderPrompt}>{before ? "What comes BEFORE?" : "What comes AFTER?"}</Text>
      <View style={styles.orderRow}>
        <View style={[styles.orderBox, before ? styles.orderBoxBlank : styles.orderBoxNum, state === "correct" && before && styles.orderBoxOk]}>
          <Text style={[styles.orderTxt, before && state !== "correct" && styles.blankTxt]}>
            {before ? (state === "correct" ? q.answer : "?") : q.num}
          </Text>
        </View>
        <Text style={styles.arrow}>→</Text>
        <View style={[styles.orderBox, !before ? styles.orderBoxBlank : styles.orderBoxNum, state === "correct" && !before && styles.orderBoxOk]}>
          <Text style={[styles.orderTxt, !before && state !== "correct" && styles.blankTxt]}>
            {!before ? (state === "correct" ? q.answer : "?") : q.num}
          </Text>
        </View>
      </View>
      <View style={styles.choicesRow}>
        {q.choices.map(ch => {
          const isSel = sel === ch;
          const ok = state === "correct" && isSel;
          const bad = state === "wrong" && isSel;
          return (
            <TouchableOpacity key={ch} onPress={() => tap(ch)} disabled={state !== "idle"} activeOpacity={0.8}
              style={[styles.numBtn, ok && styles.cardOk, bad && styles.cardBad, state !== "idle" && !isSel && styles.dimmed]}>
              <Text style={[styles.numBtnTxt, (ok || bad) && { color: "#fff" }]}>{ch}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Feedback state={state} correctMsg="🎉  Correct! Well done!" onRetry={() => { setSel(null); setState("idle"); }} />
    </ScrollView>
  );
}

// ── 6. Missing Numbers Section ────────────────────────────────────────────────

function MissingSection({ numbers }: { numbers: number[] }) {
  const [q, setQ] = useState<MissingQ | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [state, setState] = useState<QuizState>("idle");
  const [streak, setStreak] = useState(0);
  const { playCorrect, playWrong } = useSoundFeedback();
  const next = () => { setQ(genMissing(numbers)); setSel(null); setState("idle"); };
  useEffect(() => { next(); }, [numbers]);

  const tap = (choice: number) => {
    if (state !== "idle" || !q) return;
    setSel(choice);
    if (choice === q.answer) { playCorrect(); setState("correct"); setStreak(s => s + 1); setTimeout(next, 1400); }
    else { playWrong(); setState("wrong"); setStreak(0); }
  };

  if (numbers.length < 3) return <Empty text="Set at least 3 numbers in Settings!" />;
  if (!q) return null;

  return (
    <ScrollView contentContainerStyle={styles.sc} showsVerticalScrollIndicator={false}>
      <View style={styles.streakRow}>
        <Text style={styles.streak}>🔥 Streak: {streak}</Text>
        <TouchableOpacity style={styles.skipBtn} onPress={next} activeOpacity={0.7}><Text style={styles.skipTxt}>Next →</Text></TouchableOpacity>
      </View>
      <Text style={styles.prompt}>Fill the missing number! 🔢</Text>
      <View style={styles.seqRow}>
        {q.sequence.map((n, i) => {
          const blank  = i === q.blankIndex;
          const filled = blank && state === "correct";
          return (
            <View key={i} style={[styles.seqBox, blank && styles.seqBlank, filled && styles.seqFilled]}>
              <Text style={[styles.seqTxt, blank && !filled && styles.blankTxt]}>
                {blank ? (filled ? q.answer : "?") : n}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.choicesRow}>
        {q.choices.map(ch => {
          const isSel = sel === ch;
          const ok  = state === "correct" && isSel;
          const bad = state === "wrong"   && isSel;
          return (
            <TouchableOpacity key={ch} onPress={() => tap(ch)} disabled={state !== "idle"} activeOpacity={0.8}
              style={[styles.numBtn, ok && styles.cardOk, bad && styles.cardBad, state !== "idle" && !isSel && styles.dimmed]}>
              <Text style={[styles.numBtnTxt, (ok || bad) && { color: "#fff" }]}>{ch}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Feedback state={state} correctMsg={`🎉  Correct! It's ${q.answer}!`} onRetry={() => { setSel(null); setState("idle"); }} />
    </ScrollView>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type Mode = "trace" | "match" | "count" | "circle" | "order" | "missing";
const TABS = [
  { mode: "trace",   emoji: "✏️", label: "Trace",   color: "#1565C0", instruction: "Trace the number with your finger! Follow the big faded guide and go over every line ✏️" },
  { mode: "match",   emoji: "🔗", label: "Match",   color: "#2E7D32", instruction: "Tap a number on the left, then find the group of objects that has exactly that many! 🔗" },
  { mode: "count",   emoji: "🔢", label: "Count",   color: "#E65100", instruction: "Count all the objects you see. Then tap the correct number from the choices below 🔢" },
  { mode: "circle",  emoji: "🔵", label: "Circle",  color: "#6A1B9A", instruction: "Count the objects carefully. Then tap the circle that shows the right number 🔵" },
  { mode: "order",   emoji: "↔️", label: "Order",   color: "#00695C", instruction: "Look at the number shown. What number comes just before or just after it? Tap the right one ↔️" },
  { mode: "missing", emoji: "❓", label: "Missing", color: "#BF360C", instruction: "Numbers follow a pattern. One number is missing — find it and tap the correct answer ❓" },
] as const;

export default function Maths() {
  const router  = useRouter();
  const [numbers, setNumbers] = useState<number[]>([]);
  const [mode, setMode]       = useState<Mode>("trace");
  const [showInstruction, setShowInstruction] = useState(true);

  useEffect(() => { setShowInstruction(true); }, [mode]);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then(raw => {
      const s: AppSettings = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
      setNumbers(getNumbers(s.maths.start, s.maths.end));
    });
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backTxt}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowInstruction(true)} style={styles.infoBtn} activeOpacity={0.8}>
            <Text style={styles.infoBtnTxt}>ℹ️</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>🔢 Maths</Text>
        {numbers.length > 0 && (
          <Text style={styles.subtitle}>{numbers[0]} → {numbers[numbers.length - 1]}  ·  {numbers.length} numbers</Text>
        )}
      </View>

      <TabGrid tabs={TABS} active={mode} onSelect={m => setMode(m as Mode)} />

      {showInstruction && (
        <InstructionBanner
          text={TABS.find(t => t.mode === mode)!.instruction}
          color={TABS.find(t => t.mode === mode)!.color}
          onDismiss={() => setShowInstruction(false)}
        />
      )}

      {mode === "trace"   ? <TraceSection   numbers={numbers} /> :
       mode === "match"   ? <MatchSection   numbers={numbers} /> :
       mode === "count"   ? <CountSection   numbers={numbers} /> :
       mode === "circle"  ? <CircleSection  numbers={numbers} /> :
       mode === "order"   ? <OrderSection   numbers={numbers} /> :
                            <MissingSection numbers={numbers} />}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const BUBBLE_SIZE = (width - 40 - 48) / 2;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3E5F5" },
  header:     { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 2 },
  headerRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  infoBtn:    { padding: 8, borderRadius: 14, backgroundColor: "#EDE7F6" },
  infoBtnTxt: { fontSize: 20 },
  backBtn: { alignSelf: "flex-start", paddingVertical: 4, marginBottom: 4 },
  backTxt: { fontSize: 18, fontWeight: "700", color: "#78909C" },
  title:   { fontSize: 32, fontWeight: "900", color: "#6A1B9A" },
  subtitle: { fontSize: 13, fontWeight: "600", color: "#AB47BC" },


  // Scroll content
  sc: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 20 },

  // Empty
  empty:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#90A4AE", textAlign: "center" },

  // Streak row
  streakRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  streak:    { fontSize: 18, fontWeight: "800", color: "#E65100" },
  skipBtn:   { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#EDE7F6" },
  skipTxt:   { fontSize: 15, fontWeight: "700", color: "#78909C" },

  // Objects
  objGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", maxWidth: width - 80, gap: 4, alignSelf: "center" },
  objWrap: { alignItems: "center", backgroundColor: "#fff", borderRadius: 24, padding: 20, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3, minHeight: 100 },

  // Trace
  traceNav: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  navBtn:    { width: 48, height: 48, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  navBtnOff: { opacity: 0.3 },
  navBtnTxt: { fontSize: 20, fontWeight: "900" },
  traceInfo:  { flex: 1, alignItems: "center", gap: 2 },
  traceNum:   { fontSize: 36, fontWeight: "900" },
  traceEmoji: { fontSize: 18, letterSpacing: 2 },
  traceCtr:   { fontSize: 12, color: "#B0BEC5", fontWeight: "500" },

  // Tracing board
  board: { flex: 1, marginHorizontal: 16, marginBottom: 16, borderRadius: 28, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  guideWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", opacity: 0.12 },
  guideNum:  { fontWeight: "900", lineHeight: 260 },
  hintRow:   { position: "absolute", bottom: 60, left: 0, right: 0, alignItems: "center" },
  hintTxt:   { fontSize: 13, color: "#B0BEC5", fontWeight: "500" },
  dot:       { position: "absolute", width: DOT_RADIUS * 2, height: DOT_RADIUS * 2, borderRadius: DOT_RADIUS, opacity: 0.85 },
  clearBtn:  { position: "absolute", bottom: 16, right: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  clearBtnTxt: { fontSize: 15, fontWeight: "800", color: "#fff" },

  // Match
  targetWrap: { alignItems: "center", gap: 8 },
  targetBox:  { width: 110, height: 110, borderRadius: 28, backgroundColor: "#EDE7F6", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#8E24AA" },
  targetNum:  { fontSize: 68, fontWeight: "900", color: "#6A1B9A" },
  prompt:     { fontSize: 18, fontWeight: "700", color: "#546E7A", textAlign: "center" },
  matchRow:   { flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center" },
  matchCard:  { flex: 1, minWidth: (width - 40 - 20) / 3, backgroundColor: "#fff", borderRadius: 20, padding: 10, alignItems: "center", justifyContent: "center", borderWidth: 2.5, borderColor: "#CE93D8", minHeight: 110, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  badge:      { fontSize: 22, fontWeight: "900", marginTop: 4 },

  // Shared card states
  cardOk:  { backgroundColor: "#C8E6C9", borderColor: "#388E3C" },
  cardBad: { backgroundColor: "#FFCDD2", borderColor: "#E53935" },
  dimmed:  { opacity: 0.35 },

  // Number choice buttons (Count / Order / Missing)
  choicesRow: { flexDirection: "row", justifyContent: "center", gap: 14 },
  numBtn:     { flex: 1, height: 80, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 2.5, borderColor: "#CE93D8", shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  numBtnTxt:  { fontSize: 32, fontWeight: "900", color: "#6A1B9A" },

  // Circle bubbles
  circleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, justifyContent: "center" },
  bubble:     { width: BUBBLE_SIZE, height: BUBBLE_SIZE, borderRadius: BUBBLE_SIZE / 2, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#CE93D8", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  bubbleOk:   { backgroundColor: "#43A047", borderColor: "#2E7D32" },
  bubbleBad:  { backgroundColor: "#E53935", borderColor: "#B71C1C" },
  bubbleTxt:  { fontSize: 44, fontWeight: "900", color: "#6A1B9A" },

  // Order (before/after)
  orderPrompt: { fontSize: 22, fontWeight: "800", color: "#37474F", textAlign: "center" },
  orderRow:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  orderBox:    { width: 110, height: 110, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  orderBoxNum:   { backgroundColor: "#EDE7F6", borderWidth: 3, borderColor: "#8E24AA" },
  orderBoxBlank: { backgroundColor: "#ECEFF1", borderWidth: 3, borderStyle: "dashed", borderColor: "#90A4AE" },
  orderBoxOk:    { backgroundColor: "#C8E6C9", borderColor: "#388E3C", borderWidth: 3, borderStyle: "solid" },
  orderTxt:  { fontSize: 52, fontWeight: "900", color: "#6A1B9A" },
  arrow:     { fontSize: 36, color: "#90A4AE", fontWeight: "700" },
  blankTxt:  { color: "#90A4AE", fontSize: 44 },

  // Missing number sequence
  seqRow:    { flexDirection: "row", justifyContent: "center", gap: 8, flexWrap: "wrap" },
  seqBox:    { width: 62, height: 76, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  seqBlank:  { borderWidth: 3, borderStyle: "dashed", borderColor: "#90A4AE", backgroundColor: "#ECEFF1" },
  seqFilled: { backgroundColor: "#C8E6C9", borderColor: "#388E3C", borderWidth: 3, borderStyle: "solid" },
  seqTxt:    { fontSize: 28, fontWeight: "900", color: "#6A1B9A" },

  // Feedback
  fbCorrect:   { textAlign: "center", fontSize: 24, fontWeight: "900", color: "#2E7D32" },
  fbWrongWrap: { alignItems: "center", gap: 12 },
  fbWrong:     { textAlign: "center", fontSize: 22, fontWeight: "800", color: "#C62828" },
  retryBtn:    { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 18, backgroundColor: "#6A1B9A" },
  retryBtnText: { fontSize: 18, fontWeight: "900", color: "#fff" },
});
