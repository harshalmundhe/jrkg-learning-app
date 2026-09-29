import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { TabGrid } from "../components/TabGrid";
import { InstructionBanner } from "../components/InstructionBanner";
import { useSoundFeedback } from "../hooks/useSoundFeedback";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { DEFAULT_SETTINGS, type AppSettings } from "./settings";

const SETTINGS_KEY = "jrkg_settings";
const { width } = Dimensions.get("window");
const CARD_SIZE = (width - 20 * 2 - 12 * 2) / 3;
const DOT_RADIUS = 12;
const MIN_DIST_SQ = 64;

// Primary letter data (Learn + Trace)
const LETTER_DATA: Record<string, { word: string; emoji: string }> = {
  A: { word: "Apple", emoji: "🍎" },
  B: { word: "Ball", emoji: "⚽" },
  C: { word: "Cat", emoji: "🐱" },
  D: { word: "Dog", emoji: "🐶" },
  E: { word: "Elephant", emoji: "🐘" },
  F: { word: "Fish", emoji: "🐟" },
  G: { word: "Goat", emoji: "🐐" },
  H: { word: "House", emoji: "🏠" },
  I: { word: "Ice Cream", emoji: "🍦" },
  J: { word: "Jar", emoji: "🫙" },
  K: { word: "Kite", emoji: "🪁" },
  L: { word: "Lion", emoji: "🦁" },
  M: { word: "Monkey", emoji: "🐒" },
  N: { word: "Nest", emoji: "🪺" },
  O: { word: "Orange", emoji: "🍊" },
  P: { word: "Parrot", emoji: "🦜" },
  Q: { word: "Queen", emoji: "👸" },
  R: { word: "Rabbit", emoji: "🐰" },
  S: { word: "Sun", emoji: "☀️" },
  T: { word: "Tiger", emoji: "🐯" },
  U: { word: "Umbrella", emoji: "☂️" },
  V: { word: "Van", emoji: "🚐" },
  W: { word: "Whale", emoji: "🐋" },
  X: { word: "Xylophone", emoji: "🎵" },
  Y: { word: "Yacht", emoji: "⛵" },
  Z: { word: "Zebra", emoji: "🦓" },
};

// Extended word lists for variety quizzes
const LETTER_WORDS: Record<string, Array<{ word: string; emoji: string }>> = {
  A: [{ word: "Apple", emoji: "🍎" }, { word: "Ant", emoji: "🐜" }, { word: "Avocado", emoji: "🥑" }, { word: "Airplane", emoji: "✈️" }, { word: "Anchor", emoji: "⚓" }],
  B: [{ word: "Ball", emoji: "⚽" }, { word: "Bear", emoji: "🐻" }, { word: "Banana", emoji: "🍌" }, { word: "Bee", emoji: "🐝" }, { word: "Butterfly", emoji: "🦋" }],
  C: [{ word: "Cat", emoji: "🐱" }, { word: "Cake", emoji: "🎂" }, { word: "Car", emoji: "🚗" }, { word: "Cow", emoji: "🐄" }, { word: "Crown", emoji: "👑" }],
  D: [{ word: "Dog", emoji: "🐶" }, { word: "Duck", emoji: "🦆" }, { word: "Drum", emoji: "🥁" }, { word: "Diamond", emoji: "💎" }, { word: "Dinosaur", emoji: "🦕" }],
  E: [{ word: "Elephant", emoji: "🐘" }, { word: "Egg", emoji: "🥚" }, { word: "Eagle", emoji: "🦅" }, { word: "Eggplant", emoji: "🍆" }, { word: "Earth", emoji: "🌍" }],
  F: [{ word: "Fish", emoji: "🐟" }, { word: "Frog", emoji: "🐸" }, { word: "Flower", emoji: "🌸" }, { word: "Fox", emoji: "🦊" }, { word: "Fire", emoji: "🔥" }],
  G: [{ word: "Goat", emoji: "🐐" }, { word: "Grapes", emoji: "🍇" }, { word: "Gorilla", emoji: "🦍" }, { word: "Gift", emoji: "🎁" }, { word: "Giraffe", emoji: "🦒" }],
  H: [{ word: "House", emoji: "🏠" }, { word: "Horse", emoji: "🐴" }, { word: "Hat", emoji: "🎩" }, { word: "Heart", emoji: "❤️" }, { word: "Hammer", emoji: "🔨" }],
  I: [{ word: "Ice Cream", emoji: "🍦" }, { word: "Igloo", emoji: "🛖" }, { word: "Insect", emoji: "🐛" }, { word: "Island", emoji: "🏝️" }, { word: "Ivy", emoji: "🌿" }],
  J: [{ word: "Jar", emoji: "🫙" }, { word: "Jellyfish", emoji: "🪼" }, { word: "Juice", emoji: "🧃" }, { word: "Jacket", emoji: "🧥" }, { word: "Jet", emoji: "🛩️" }],
  K: [{ word: "Kite", emoji: "🪁" }, { word: "Kangaroo", emoji: "🦘" }, { word: "Key", emoji: "🔑" }, { word: "Koala", emoji: "🐨" }, { word: "King", emoji: "🤴" }],
  L: [{ word: "Lion", emoji: "🦁" }, { word: "Leaf", emoji: "🍃" }, { word: "Lemon", emoji: "🍋" }, { word: "Lamp", emoji: "💡" }, { word: "Ladybug", emoji: "🐞" }],
  M: [{ word: "Monkey", emoji: "🐒" }, { word: "Moon", emoji: "🌙" }, { word: "Mango", emoji: "🥭" }, { word: "Mouse", emoji: "🐭" }, { word: "Mushroom", emoji: "🍄" }],
  N: [{ word: "Nest", emoji: "🪺" }, { word: "Noodles", emoji: "🍜" }, { word: "Nose", emoji: "👃" }, { word: "Nut", emoji: "🥜" }, { word: "Night", emoji: "🌃" }],
  O: [{ word: "Orange", emoji: "🍊" }, { word: "Octopus", emoji: "🐙" }, { word: "Owl", emoji: "🦉" }, { word: "Olive", emoji: "🫒" }, { word: "Ox", emoji: "🐂" }],
  P: [{ word: "Parrot", emoji: "🦜" }, { word: "Panda", emoji: "🐼" }, { word: "Peach", emoji: "🍑" }, { word: "Pizza", emoji: "🍕" }, { word: "Penguin", emoji: "🐧" }],
  Q: [{ word: "Queen", emoji: "👸" }, { word: "Quail", emoji: "🐦" }, { word: "Quarter", emoji: "🪙" }, { word: "Quilt", emoji: "🛏️" }, { word: "Question", emoji: "❓" }],
  R: [{ word: "Rabbit", emoji: "🐰" }, { word: "Rainbow", emoji: "🌈" }, { word: "Rocket", emoji: "🚀" }, { word: "Rose", emoji: "🌹" }, { word: "Robot", emoji: "🤖" }],
  S: [{ word: "Sun", emoji: "☀️" }, { word: "Star", emoji: "⭐" }, { word: "Snake", emoji: "🐍" }, { word: "Sheep", emoji: "🐑" }, { word: "Strawberry", emoji: "🍓" }],
  T: [{ word: "Tiger", emoji: "🐯" }, { word: "Train", emoji: "🚂" }, { word: "Tree", emoji: "🌳" }, { word: "Turtle", emoji: "🐢" }, { word: "Tomato", emoji: "🍅" }],
  U: [{ word: "Umbrella", emoji: "☂️" }, { word: "Unicorn", emoji: "🦄" }, { word: "UFO", emoji: "🛸" }, { word: "Urn", emoji: "⚱️" }, { word: "Undershirt", emoji: "👕" }],
  V: [{ word: "Van", emoji: "🚐" }, { word: "Violin", emoji: "🎻" }, { word: "Volcano", emoji: "🌋" }, { word: "Vegetables", emoji: "🥦" }, { word: "Vase", emoji: "🏺" }],
  W: [{ word: "Whale", emoji: "🐋" }, { word: "Wolf", emoji: "🐺" }, { word: "Watermelon", emoji: "🍉" }, { word: "Watch", emoji: "⌚" }, { word: "Worm", emoji: "🪱" }],
  X: [{ word: "Xylophone", emoji: "🎵" }, { word: "X-ray", emoji: "🩻" }, { word: "Xmas Tree", emoji: "🎄" }, { word: "Xenops", emoji: "🐦" }, { word: "X-mark", emoji: "❌" }],
  Y: [{ word: "Yacht", emoji: "⛵" }, { word: "Yak", emoji: "🐮" }, { word: "Yam", emoji: "🍠" }, { word: "Yarn", emoji: "🧶" }, { word: "Yo-yo", emoji: "🪀" }],
  Z: [{ word: "Zebra", emoji: "🦓" }, { word: "Zipper", emoji: "🤐" }, { word: "Zucchini", emoji: "🥒" }, { word: "Zoo", emoji: "🦁" }, { word: "Zero", emoji: "0️⃣" }],
};

const KIDS_LOWER: Record<string, string> = {
  A: "ɑ",
  G: "ɡ",
};

function toLower(letter: string): string {
  return KIDS_LOWER[letter.toUpperCase()] ?? letter.toLowerCase();
}

const CARD_COLORS = [
  "#FFCDD2", "#F8BBD0", "#E1BEE7", "#C5CAE9",
  "#BBDEFB", "#B2EBF2", "#B2DFDB", "#C8E6C9",
  "#DCEDC8", "#FFF9C4", "#FFE0B2", "#FFCCBC",
];

const ACCENT_COLORS = [
  "#C62828", "#AD1457", "#6A1B9A", "#283593",
  "#1565C0", "#00695C", "#2E7D32", "#558B2F",
  "#33691E", "#F57F17", "#E65100", "#BF360C",
];

type Point = { x: number; y: number; id: number };
type QuizState = "idle" | "correct" | "wrong";

// ── Missing quiz ──────────────────────────────────────────────────────────────

type Question = {
  sequence: string[];
  blankIndex: number;
  answer: string;
  choices: string[];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuestion(letters: string[]): Question | null {
  if (letters.length < 3) return null;
  const winSize = Math.min(5, letters.length);
  const maxStart = Math.max(0, letters.length - winSize);
  const start = Math.floor(Math.random() * (maxStart + 1));
  const sequence = letters.slice(start, start + winSize);
  const blankIndex = Math.floor(Math.random() * sequence.length);
  const answer = sequence[blankIndex];
  const outside = letters.filter((l) => !sequence.includes(l));
  const pool = outside.length >= 2 ? outside : letters.filter((l) => l !== answer);
  const wrongs = shuffle(pool).slice(0, 2);
  return { sequence, blankIndex, answer, choices: shuffle([answer, ...wrongs]) };
}

function getLettersInRange(start: string, end: string): string[] {
  const s = start.toUpperCase().charCodeAt(0);
  const e = end.toUpperCase().charCodeAt(0);
  return Array.from({ length: Math.max(0, e - s + 1) }, (_, i) =>
    String.fromCharCode(s + i)
  );
}

// ── Before/After quiz ─────────────────────────────────────────────────────────

type Direction = "before" | "after";
type OrderQuestion = {
  letter: string;
  direction: Direction;
  answer: string;
  choices: string[];
};

function generateOrderQuestion(letters: string[]): OrderQuestion | null {
  if (letters.length < 2) return null;
  const direction: Direction = Math.random() < 0.5 ? "before" : "after";
  const eligible = direction === "before" ? letters.slice(1) : letters.slice(0, -1);
  if (eligible.length === 0) return null;
  const letter = eligible[Math.floor(Math.random() * eligible.length)];
  const letterIdx = letters.indexOf(letter);
  const answer = direction === "before" ? letters[letterIdx - 1] : letters[letterIdx + 1];
  const wrongPool = letters.filter((l) => l !== answer && l !== letter);
  const wrongs = shuffle(wrongPool).slice(0, 2);
  return { letter, direction, answer, choices: shuffle([answer, ...wrongs]) };
}

// ── Circle quiz ───────────────────────────────────────────────────────────────

type CircleItem = { word: string; emoji: string; letter: string };
type CircleQuestion = {
  targetLetter: string;
  items: CircleItem[];
  correctIndices: number[];
};

function generateCircleQuestion(letters: string[]): CircleQuestion | null {
  if (letters.length < 2) return null;
  const targetLetter = letters[Math.floor(Math.random() * letters.length)];
  const correctPool = LETTER_WORDS[targetLetter] ?? [];
  const correctCount = Math.min(2, correctPool.length);
  const correctItems: CircleItem[] = shuffle(correctPool)
    .slice(0, correctCount)
    .map((it) => ({ ...it, letter: targetLetter }));

  const distractorCount = 6 - correctCount;
  const otherLetters = shuffle(letters.filter((l) => l !== targetLetter));
  const distractors: CircleItem[] = [];
  for (const l of otherLetters) {
    if (distractors.length >= distractorCount) break;
    const opts = LETTER_WORDS[l] ?? [];
    if (opts.length === 0) continue;
    const picked = opts[Math.floor(Math.random() * opts.length)];
    distractors.push({ ...picked, letter: l });
  }

  const allItems = shuffle([...correctItems, ...distractors]);
  const correctIndices = allItems.reduce<number[]>((acc, item, i) => {
    if (item.letter === targetLetter) acc.push(i);
    return acc;
  }, []);

  return { targetLetter, items: allItems, correctIndices };
}

// ── Fill quiz ─────────────────────────────────────────────────────────────────

type FillQuestion = {
  letter: string;
  word: string;
  emoji: string;
  choices: string[];
};

function generateFillQuestion(letters: string[]): FillQuestion | null {
  if (letters.length < 1) return null;
  const targetLetter = letters[Math.floor(Math.random() * letters.length)];
  const pool = LETTER_WORDS[targetLetter] ?? [];
  if (pool.length === 0) return null;
  const item = pool[Math.floor(Math.random() * pool.length)];
  const allLetters = getLettersInRange("A", "Z");
  const otherPool = shuffle(
    letters.length >= 3
      ? letters.filter((l) => l !== targetLetter)
      : allLetters.filter((l) => l !== targetLetter)
  );
  const wrongs = otherPool.slice(0, 2);
  return { letter: targetLetter, word: item.word, emoji: item.emoji, choices: shuffle([targetLetter, ...wrongs]) };
}

// ── Odd-one-out quiz ──────────────────────────────────────────────────────────

type OddItem = { word: string; emoji: string; isOdd: boolean };
type OddQuestion = {
  targetLetter: string;
  items: OddItem[];
};

function generateOddQuestion(letters: string[]): OddQuestion | null {
  if (letters.length < 2) return null;
  const targetLetter = letters[Math.floor(Math.random() * letters.length)];
  const correctPool = LETTER_WORDS[targetLetter] ?? [];
  if (correctPool.length < 1) return null;
  const correctItems: OddItem[] = shuffle(correctPool)
    .slice(0, 3)
    .map((it) => ({ ...it, isOdd: false }));

  const otherLetters = letters.filter((l) => l !== targetLetter);
  const oddLetter = otherLetters[Math.floor(Math.random() * otherLetters.length)];
  const oddPool = LETTER_WORDS[oddLetter] ?? [];
  if (oddPool.length === 0) return null;
  const oddItem: OddItem = {
    ...oddPool[Math.floor(Math.random() * oddPool.length)],
    isOdd: true,
  };

  return { targetLetter, items: shuffle([...correctItems, oddItem]) };
}

// ── Learn: letter card ────────────────────────────────────────────────────────

function LetterCard({
  letter, index, onPress,
}: { letter: string; index: number; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const bg = CARD_COLORS[index % CARD_COLORS.length];
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];
  const { emoji } = LETTER_DATA[letter] ?? { emoji: "⭐" };

  const handlePress = () => {
    scale.value = withSpring(0.88, { damping: 6 }, () => { scale.value = withSpring(1); });
    onPress();
  };

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1}
        style={[styles.letterCard, { backgroundColor: bg, width: CARD_SIZE, height: CARD_SIZE }]}>
        <Text style={[styles.cardLetter, { color: accent }]}>{letter}</Text>
        <Text style={styles.cardEmoji}>{emoji}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Learn: detail modal ───────────────────────────────────────────────────────

function LetterModal({
  letter, index, letters, onClose, onNavigate,
}: {
  letter: string | null; index: number; letters: string[];
  onClose: () => void; onNavigate: (idx: number) => void;
}) {
  if (!letter) return null;
  const data = LETTER_DATA[letter] ?? { word: letter, emoji: "⭐" };
  const bg = CARD_COLORS[index % CARD_COLORS.length];
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View entering={FadeIn.duration(200)} style={styles.modalCenter} pointerEvents="box-none">
        <View style={[styles.modalCard, { backgroundColor: bg }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[styles.closeBtnText, { color: accent }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.modalLetter, { color: accent }]}>{letter}</Text>
          <Text style={[styles.modalLetterLower, { color: accent + "99" }]}>{toLower(letter)}</Text>
          <Text style={styles.modalEmoji}>{data.emoji}</Text>
          <Text style={[styles.modalWord, { color: accent }]}>
            {letter} is for{"\n"}<Text style={styles.modalWordBold}>{data.word}</Text>
          </Text>
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, { borderColor: accent }, index === 0 && styles.navBtnDisabled]}
              onPress={() => index > 0 && onNavigate(index - 1)}
              disabled={index === 0} activeOpacity={0.75}>
              <Text style={[styles.navBtnText, { color: accent }]}>◀ Prev</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navBtn, { borderColor: accent }, index === letters.length - 1 && styles.navBtnDisabled]}
              onPress={() => index < letters.length - 1 && onNavigate(index + 1)}
              disabled={index === letters.length - 1} activeOpacity={0.75}>
              <Text style={[styles.navBtnText, { color: accent }]}>Next ▶</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ── Trace: drawing canvas ─────────────────────────────────────────────────────

function TracingBoard({ letter, accentColor, bgColor }: { letter: string; accentColor: string; bgColor: string }) {
  const pointsRef = useRef<Point[]>([]);
  const counterRef = useRef(0);
  const [, forceUpdate] = useState(0);
  const renderPending = useRef(false);

  const scheduleRender = () => {
    if (!renderPending.current) {
      renderPending.current = true;
      setTimeout(() => { renderPending.current = false; forceUpdate((n) => n + 1); }, 16);
    }
  };

  const addPoint = (x: number, y: number) => {
    const pts = pointsRef.current;
    if (pts.length > 0) {
      const last = pts[pts.length - 1];
      const dx = x - last.x; const dy = y - last.y;
      if (dx * dx + dy * dy < MIN_DIST_SQ) return;
    }
    pts.push({ x, y, id: counterRef.current++ });
    if (pts.length > 600) pts.splice(0, 100);
    scheduleRender();
  };

  const pan = Gesture.Pan().runOnJS(true).minDistance(0)
    .onBegin((e) => addPoint(e.x, e.y))
    .onUpdate((e) => addPoint(e.x, e.y));

  const clear = () => { pointsRef.current = []; forceUpdate((n) => n + 1); };

  return (
    <GestureHandlerRootView style={[styles.tracingBoard, { backgroundColor: bgColor }]}>
      <View style={styles.guideWrap} pointerEvents="none">
        <Text style={[styles.guideUpper, { color: accentColor }]}>{letter}</Text>
        <Text style={[styles.guideLower, { color: accentColor }]}>{toLower(letter)}</Text>
      </View>
      <View style={styles.hintBorder} pointerEvents="none">
        <Text style={styles.hintText}>Trace the letter with your finger ✏️</Text>
      </View>
      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill}>
          {pointsRef.current.map((p) => (
            <View key={p.id} style={[styles.dot, { left: p.x - DOT_RADIUS, top: p.y - DOT_RADIUS, backgroundColor: accentColor }]} />
          ))}
        </View>
      </GestureDetector>
      <TouchableOpacity style={[styles.clearBtn, { backgroundColor: accentColor }]} onPress={clear} activeOpacity={0.8}>
        <Text style={styles.clearBtnText}>🗑️  Clear</Text>
      </TouchableOpacity>
    </GestureHandlerRootView>
  );
}

function TraceSection({ letters }: { letters: string[] }) {
  const [idx, setIdx] = useState(0);
  if (letters.length === 0) return null;
  const letter = letters[idx];
  const accent = ACCENT_COLORS[idx % ACCENT_COLORS.length];
  const bg = CARD_COLORS[idx % CARD_COLORS.length];

  return (
    <View style={styles.traceSection}>
      <View style={styles.traceNav}>
        <TouchableOpacity style={[styles.traceNavBtn, idx === 0 && styles.traceNavBtnDisabled]}
          onPress={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} activeOpacity={0.7}>
          <Text style={[styles.traceNavBtnText, { color: accent }]}>◀</Text>
        </TouchableOpacity>
        <View style={styles.traceLetterInfo}>
          <Text style={[styles.traceLetterLabel, { color: accent }]}>{letter}</Text>
          <Text style={styles.traceLetterWord}>{LETTER_DATA[letter]?.emoji}  {LETTER_DATA[letter]?.word}</Text>
          <Text style={styles.traceCounter}>{idx + 1} / {letters.length}</Text>
        </View>
        <TouchableOpacity style={[styles.traceNavBtn, idx === letters.length - 1 && styles.traceNavBtnDisabled]}
          onPress={() => setIdx((i) => Math.min(letters.length - 1, i + 1))} disabled={idx === letters.length - 1} activeOpacity={0.7}>
          <Text style={[styles.traceNavBtnText, { color: accent }]}>▶</Text>
        </TouchableOpacity>
      </View>
      <TracingBoard key={`${letter}-${idx}`} letter={letter} accentColor={accent} bgColor={bg} />
    </View>
  );
}

// ── Missing quiz section ──────────────────────────────────────────────────────

function MissingSection({ letters }: { letters: string[] }) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [streak, setStreak] = useState(0);
  const { playCorrect, playWrong } = useSoundFeedback();

  const nextQuestion = () => { setQuestion(generateQuestion(letters)); setSelected(null); setQuizState("idle"); };
  useEffect(() => { nextQuestion(); }, [letters]);

  const handleChoice = (choice: string) => {
    if (quizState !== "idle" || !question) return;
    setSelected(choice);
    if (choice === question.answer) {
      playCorrect(); setQuizState("correct"); setStreak((s) => s + 1); setTimeout(nextQuestion, 1400);
    } else {
      playWrong(); setQuizState("wrong"); setStreak(0);
    }
  };

  if (letters.length < 3) return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>⚙️</Text>
      <Text style={styles.emptyText}>Set at least 3 letters in Settings to play!</Text>
    </View>
  );
  if (!question) return null;

  return (
    <View style={styles.quizSection}>
      <View style={styles.streakRow}>
        <Text style={styles.streakText}>🔥 Streak: {streak}</Text>
        <TouchableOpacity onPress={nextQuestion} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>Next →</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.sequenceRow}>
        {question.sequence.map((letter, i) => {
          const isBlank = i === question.blankIndex;
          const filled = isBlank && quizState === "correct";
          return (
            <View key={i} style={[styles.seqBox, isBlank && styles.seqBoxBlank, filled && styles.seqBoxFilled]}>
              <Text style={[styles.seqLetter, isBlank && !filled && styles.seqBlankText]}>
                {isBlank ? (filled ? question.answer : "?") : letter}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.quizPrompt}>Which letter is missing?</Text>
      <View style={styles.choicesRow}>
        {question.choices.map((choice) => {
          const isSelected = selected === choice;
          const correct = quizState === "correct" && isSelected;
          const wrong = quizState === "wrong" && isSelected;
          return (
            <TouchableOpacity key={choice} onPress={() => handleChoice(choice)}
              disabled={quizState !== "idle"} activeOpacity={0.8}
              style={[styles.choiceBtn, correct && styles.choiceBtnCorrect, wrong && styles.choiceBtnWrong, quizState !== "idle" && !isSelected && styles.choiceBtnDimmed]}>
              <Text style={[styles.choiceBtnText, (correct || wrong) && { color: "#fff" }]}>
                {toLower(choice) === choice ? choice : `${choice} ${toLower(choice)}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {quizState === "correct" && <Text style={styles.feedbackCorrect}>🎉  Correct! Well done!</Text>}
      {quizState === "wrong" && (
        <View style={styles.feedbackWrongWrap}>
          <Text style={styles.feedbackWrong}>🤔  Try again!</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setSelected(null); setQuizState("idle"); }} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Before/After section ──────────────────────────────────────────────────────

function BeforeAfterSection({ letters }: { letters: string[] }) {
  const [question, setQuestion] = useState<OrderQuestion | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [streak, setStreak] = useState(0);
  const { playCorrect, playWrong } = useSoundFeedback();

  const nextQuestion = () => { setQuestion(generateOrderQuestion(letters)); setSelected(null); setQuizState("idle"); };
  useEffect(() => { nextQuestion(); }, [letters]);

  const handleChoice = (choice: string) => {
    if (quizState !== "idle" || !question) return;
    setSelected(choice);
    if (choice === question.answer) {
      playCorrect(); setQuizState("correct"); setStreak((s) => s + 1); setTimeout(nextQuestion, 1400);
    } else {
      playWrong(); setQuizState("wrong"); setStreak(0);
    }
  };

  if (letters.length < 2) return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>⚙️</Text>
      <Text style={styles.emptyText}>Set at least 2 letters in Settings to play!</Text>
    </View>
  );
  if (!question) return null;

  const isBefore = question.direction === "before";

  return (
    <View style={styles.quizSection}>
      <View style={styles.streakRow}>
        <Text style={styles.streakText}>🔥 Streak: {streak}</Text>
        <TouchableOpacity onPress={nextQuestion} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>Next →</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.orderPrompt}>{isBefore ? "What comes BEFORE?" : "What comes AFTER?"}</Text>
      <View style={styles.orderSequence}>
        <View style={[styles.orderBox, isBefore ? styles.orderBoxBlank : styles.orderBoxLetter, quizState === "correct" && isBefore && styles.seqBoxFilled]}>
          <Text style={[styles.orderBoxText, isBefore && quizState !== "correct" && styles.seqBlankText]}>
            {isBefore ? (quizState === "correct" ? question.answer : "?") : question.letter}
          </Text>
        </View>
        <Text style={styles.orderArrow}>→</Text>
        <View style={[styles.orderBox, !isBefore ? styles.orderBoxBlank : styles.orderBoxLetter, quizState === "correct" && !isBefore && styles.seqBoxFilled]}>
          <Text style={[styles.orderBoxText, !isBefore && quizState !== "correct" && styles.seqBlankText]}>
            {!isBefore ? (quizState === "correct" ? question.answer : "?") : question.letter}
          </Text>
        </View>
      </View>
      <View style={styles.choicesRow}>
        {question.choices.map((choice) => {
          const isSelected = selected === choice;
          const correct = quizState === "correct" && isSelected;
          const wrong = quizState === "wrong" && isSelected;
          return (
            <TouchableOpacity key={choice} onPress={() => handleChoice(choice)}
              disabled={quizState !== "idle"} activeOpacity={0.8}
              style={[styles.choiceBtn, correct && styles.choiceBtnCorrect, wrong && styles.choiceBtnWrong, quizState !== "idle" && !isSelected && styles.choiceBtnDimmed]}>
              <Text style={[styles.choiceBtnText, (correct || wrong) && { color: "#fff" }]}>{choice}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {quizState === "correct" && <Text style={styles.feedbackCorrect}>🎉  Correct! Well done!</Text>}
      {quizState === "wrong" && (
        <View style={styles.feedbackWrongWrap}>
          <Text style={styles.feedbackWrong}>🤔  Try again!</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setSelected(null); setQuizState("idle"); }} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Circle section ────────────────────────────────────────────────────────────

function CircleSection({ letters }: { letters: string[] }) {
  const [question, setQuestion] = useState<CircleQuestion | null>(null);
  const [tappedCorrect, setTappedCorrect] = useState<Set<number>>(new Set());
  const [tappedWrong, setTappedWrong] = useState<Set<number>>(new Set());
  const [streak, setStreak] = useState(0);
  const { playCorrect, playWrong } = useSoundFeedback();

  const nextQuestion = () => {
    setQuestion(generateCircleQuestion(letters));
    setTappedCorrect(new Set());
    setTappedWrong(new Set());
  };

  useEffect(() => { nextQuestion(); }, [letters]);

  const allFound = question !== null && tappedCorrect.size === question.correctIndices.length;

  useEffect(() => {
    if (allFound) {
      playCorrect(); setStreak((s) => s + 1);
      const t = setTimeout(nextQuestion, 1600);
      return () => clearTimeout(t);
    }
  }, [allFound]);

  const handleTap = (idx: number) => {
    if (!question || allFound) return;
    if (tappedCorrect.has(idx) || tappedWrong.has(idx)) return;
    if (question.correctIndices.includes(idx)) {
      setTappedCorrect((prev) => { const s = new Set(prev); s.add(idx); return s; });
    } else {
      playWrong(); setTappedWrong((prev) => { const s = new Set(prev); s.add(idx); return s; });
    }
  };

  if (letters.length < 2) return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>⚙️</Text>
      <Text style={styles.emptyText}>Set at least 2 letters in Settings to play!</Text>
    </View>
  );
  if (!question) return null;

  return (
    <ScrollView style={styles.circleSection} contentContainerStyle={styles.circleSectionContent} showsVerticalScrollIndicator={false}>
      <View style={styles.streakRow}>
        <Text style={styles.streakText}>🔥 Streak: {streak}</Text>
        <TouchableOpacity onPress={nextQuestion} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>Next →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.circleTargetWrap}>
        <Text style={styles.circleTargetLabel}>Find pictures that start with</Text>
        <View style={styles.circleTargetBox}>
          <Text style={styles.circleTargetLetter}>{question.targetLetter}</Text>
        </View>
      </View>

      <Text style={styles.circleInstruction}>Tap the pictures that start with  {question.targetLetter} !</Text>

      <View style={styles.circleGrid}>
        {question.items.map((item, idx) => {
          const isCorrect = tappedCorrect.has(idx);
          const isWrong = tappedWrong.has(idx);
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.circleItem, isCorrect && styles.circleItemCorrect, isWrong && styles.circleItemWrong]}
              onPress={() => handleTap(idx)}
              activeOpacity={0.75}
              disabled={isCorrect || isWrong || allFound}
            >
              <Text style={styles.circleItemEmoji}>{item.emoji}</Text>
              <Text style={styles.circleItemWord} numberOfLines={1}>{item.word}</Text>
              {isCorrect && <Text style={styles.circleItemBadge}>✓</Text>}
              {isWrong && <Text style={[styles.circleItemBadge, styles.circleItemBadgeWrong]}>✗</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {allFound && <Text style={styles.feedbackCorrect}>🎉  Great job! All found!</Text>}
    </ScrollView>
  );
}

// ── Fill section ──────────────────────────────────────────────────────────────

function FillSection({ letters }: { letters: string[] }) {
  const [question, setQuestion] = useState<FillQuestion | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [streak, setStreak] = useState(0);
  const { playCorrect, playWrong } = useSoundFeedback();

  const nextQuestion = () => { setQuestion(generateFillQuestion(letters)); setSelected(null); setQuizState("idle"); };
  useEffect(() => { nextQuestion(); }, [letters]);

  const handleChoice = (choice: string) => {
    if (quizState !== "idle" || !question) return;
    setSelected(choice);
    if (choice === question.letter) {
      playCorrect(); setQuizState("correct"); setStreak((s) => s + 1); setTimeout(nextQuestion, 1600);
    } else {
      playWrong(); setQuizState("wrong"); setStreak(0);
    }
  };

  if (letters.length < 1) return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>⚙️</Text>
      <Text style={styles.emptyText}>No letters available. Check Settings!</Text>
    </View>
  );
  if (!question) return null;

  const wordLetters = question.word.split("");
  const filled = quizState === "correct" ? question.letter : "_";

  return (
    <View style={styles.quizSection}>
      <View style={styles.streakRow}>
        <Text style={styles.streakText}>🔥 Streak: {streak}</Text>
        <TouchableOpacity onPress={nextQuestion} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>Next →</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.fillInstruction}>Look at the picture and fill the first letter!</Text>

      <Text style={styles.fillEmoji}>{question.emoji}</Text>

      <View style={styles.fillWordRow}>
        <View style={[styles.fillLetterBox, styles.fillBlankBox, quizState === "correct" && styles.seqBoxFilled]}>
          <Text style={[styles.fillLetterText, quizState !== "correct" && styles.seqBlankText]}>{filled}</Text>
        </View>
        {wordLetters.slice(1).map((ch, i) => (
          <View key={i} style={styles.fillLetterBox}>
            <Text style={styles.fillLetterText}>{ch.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      <View style={styles.choicesRow}>
        {question.choices.map((choice) => {
          const isSelected = selected === choice;
          const correct = quizState === "correct" && isSelected;
          const wrong = quizState === "wrong" && isSelected;
          return (
            <TouchableOpacity key={choice} onPress={() => handleChoice(choice)}
              disabled={quizState !== "idle"} activeOpacity={0.8}
              style={[styles.choiceBtn, correct && styles.choiceBtnCorrect, wrong && styles.choiceBtnWrong, quizState !== "idle" && !isSelected && styles.choiceBtnDimmed]}>
              <Text style={[styles.choiceBtnText, (correct || wrong) && { color: "#fff" }]}>{choice}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {quizState === "correct" && <Text style={styles.feedbackCorrect}>🎉  {question.letter} is for {question.word}!</Text>}
      {quizState === "wrong" && (
        <View style={styles.feedbackWrongWrap}>
          <Text style={styles.feedbackWrong}>🤔  Try again!</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setSelected(null); setQuizState("idle"); }} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Match section ─────────────────────────────────────────────────────────────

function MatchSection({ letters }: { letters: string[] }) {
  const PAIR_COUNT = Math.min(4, letters.length);

  const makePairs = () => {
    const selected = shuffle([...letters]).slice(0, PAIR_COUNT);
    const left = [...selected].sort();
    const right = shuffle(selected.map((l) => ({ letter: l, lower: toLower(l) })));
    return { left, right };
  };

  const [left, setLeft] = useState<string[]>([]);
  const [right, setRight] = useState<{ letter: string; lower: string }[]>([]);
  const [matchedLetters, setMatchedLetters] = useState<Set<string>>(new Set());
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [wrongRight, setWrongRight] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const { playCorrect, playWrong } = useSoundFeedback();

  const resetPairs = () => {
    const p = makePairs();
    setLeft(p.left);
    setRight(p.right);
    setMatchedLetters(new Set());
    setSelectedLeft(null);
    setWrongRight(null);
  };

  useEffect(() => { resetPairs(); }, [letters]);

  const allMatched = matchedLetters.size === left.length && left.length > 0;

  useEffect(() => {
    if (allMatched) {
      setStreak((s) => s + 1);
      const t = setTimeout(resetPairs, 1600);
      return () => clearTimeout(t);
    }
  }, [allMatched]);

  const handleLeftTap = (letter: string) => {
    if (matchedLetters.has(letter)) return;
    setSelectedLeft((prev) => (prev === letter ? null : letter));
  };

  const handleRightTap = (item: { letter: string; lower: string }) => {
    if (matchedLetters.has(item.letter)) return;
    if (!selectedLeft) return;
    if (item.letter === selectedLeft) {
      playCorrect(); setMatchedLetters((prev) => { const s = new Set(prev); s.add(item.letter); return s; });
      setSelectedLeft(null);
    } else {
      playWrong(); setWrongRight(item.letter);
      setSelectedLeft(null);
      setTimeout(() => setWrongRight(null), 600);
    }
  };

  if (letters.length < 2) return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>⚙️</Text>
      <Text style={styles.emptyText}>Set at least 2 letters in Settings to play!</Text>
    </View>
  );

  return (
    <ScrollView style={styles.matchSection} contentContainerStyle={styles.matchContent} showsVerticalScrollIndicator={false}>
      <View style={styles.streakRow}>
        <Text style={styles.streakText}>🔥 Streak: {streak}</Text>
        <TouchableOpacity onPress={resetPairs} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>New Set →</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.matchInstruction}>
        Tap a BIG letter, then find its small partner! 🔗
      </Text>

      {allMatched && <Text style={styles.feedbackCorrect}>🎉  All matched! Amazing!</Text>}

      {selectedLeft && (
        <Text style={styles.matchHint}>Now tap  {toLower(selectedLeft)}  on the right ➡️</Text>
      )}

      <View style={styles.matchColumnsRow}>
        <View style={styles.matchColumn}>
          <Text style={styles.matchColLabel}>BIG</Text>
          {left.map((letter) => {
            const isMatched = matchedLetters.has(letter);
            const isSelected = selectedLeft === letter;
            return (
              <TouchableOpacity key={letter}
                style={[styles.matchItem, styles.matchItemUpper, isSelected && styles.matchItemSelected, isMatched && styles.matchItemMatched]}
                onPress={() => handleLeftTap(letter)} activeOpacity={0.75} disabled={isMatched}>
                <Text style={[styles.matchItemText, isMatched && styles.matchItemTextMatched]}>{letter}</Text>
                {isMatched && <Text style={styles.matchTick}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.matchDivider}>
          {left.map((_, i) => <Text key={i} style={styles.matchArrow}>→</Text>)}
        </View>

        <View style={styles.matchColumn}>
          <Text style={styles.matchColLabel}>small</Text>
          {right.map((item, idx) => {
            const isMatched = matchedLetters.has(item.letter);
            const isWrong = wrongRight === item.letter;
            return (
              <TouchableOpacity key={`${item.letter}-${idx}`}
                style={[styles.matchItem, styles.matchItemLower, isMatched && styles.matchItemMatched, isWrong && styles.matchItemWrong]}
                onPress={() => handleRightTap(item)} activeOpacity={0.75} disabled={isMatched}>
                <Text style={[styles.matchItemTextLower, isMatched && styles.matchItemTextMatched]}>{item.lower}</Text>
                {isMatched && <Text style={styles.matchTick}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ── Odd-one-out section ───────────────────────────────────────────────────────

function OddSection({ letters }: { letters: string[] }) {
  const [question, setQuestion] = useState<OddQuestion | null>(null);
  const [tappedIdx, setTappedIdx] = useState<number | null>(null);
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [streak, setStreak] = useState(0);
  const { playCorrect, playWrong } = useSoundFeedback();

  const nextQuestion = () => { setQuestion(generateOddQuestion(letters)); setTappedIdx(null); setQuizState("idle"); };
  useEffect(() => { nextQuestion(); }, [letters]);

  const handleTap = (idx: number) => {
    if (quizState !== "idle" || !question) return;
    setTappedIdx(idx);
    if (question.items[idx].isOdd) {
      playCorrect(); setQuizState("correct"); setStreak((s) => s + 1); setTimeout(nextQuestion, 1600);
    } else {
      playWrong(); setQuizState("wrong"); setStreak(0);
      setTimeout(() => { setTappedIdx(null); setQuizState("idle"); }, 800);
    }
  };

  if (letters.length < 2) return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>⚙️</Text>
      <Text style={styles.emptyText}>Set at least 2 letters in Settings to play!</Text>
    </View>
  );
  if (!question) return null;

  return (
    <ScrollView style={styles.oddSection} contentContainerStyle={styles.oddSectionContent} showsVerticalScrollIndicator={false}>
      <View style={styles.streakRow}>
        <Text style={styles.streakText}>🔥 Streak: {streak}</Text>
        <TouchableOpacity onPress={nextQuestion} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>Next →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.circleTargetWrap}>
        <Text style={styles.circleTargetLabel}>Which does NOT start with</Text>
        <View style={styles.circleTargetBox}>
          <Text style={styles.circleTargetLetter}>{question.targetLetter}</Text>
        </View>
      </View>

      <Text style={styles.circleInstruction}>Tap the picture that does NOT start with  {question.targetLetter}  ❌</Text>

      <View style={styles.oddGrid}>
        {question.items.map((item, idx) => {
          const isTapped = tappedIdx === idx;
          const correct = quizState === "correct" && item.isOdd;
          const wrong = quizState === "wrong" && isTapped;
          const dimmed = quizState === "correct" && !item.isOdd;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.oddItem, correct && styles.oddItemCorrect, wrong && styles.oddItemWrong, dimmed && styles.oddItemDimmed]}
              onPress={() => handleTap(idx)}
              activeOpacity={0.75}
              disabled={quizState === "correct"}
            >
              <Text style={styles.oddItemEmoji}>{item.emoji}</Text>
              <Text style={styles.oddItemWord} numberOfLines={1}>{item.word}</Text>
              {correct && <Text style={styles.oddBadge}>✗</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {quizState === "correct" && <Text style={styles.feedbackCorrect}>🎉  You found it!</Text>}
    </ScrollView>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type Mode = "learn" | "trace" | "missing" | "order" | "circle" | "fill" | "match" | "odd";

const TABS = [
  { mode: "learn",   emoji: "📚", label: "Learn",   color: "#1565C0", instruction: "Look at each letter! Say its name out loud and find the matching picture 📖" },
  { mode: "trace",   emoji: "✏️", label: "Trace",   color: "#6A1B9A", instruction: "Trace the letter with your finger — follow the big faded guide and fill it in! ✏️" },
  { mode: "missing", emoji: "❓", label: "Missing", color: "#00695C", instruction: "A letter is hiding! Look at the letters shown and tap the one that is missing ❓" },
  { mode: "order",   emoji: "↔️", label: "Order",   color: "#E65100", instruction: "The letters are jumbled! Tap them one by one in the correct A-B-C order ↔️" },
  { mode: "circle",  emoji: "🔵", label: "Circle",  color: "#1B5E20", instruction: "Look at the letter at the top. Tap ALL pictures whose names start with that letter! 🔵" },
  { mode: "fill",    emoji: "📝", label: "Fill",    color: "#880E4F", instruction: "Look at the picture. The first letter is missing — tap the correct letter to fill it in! 📝" },
  { mode: "match",   emoji: "🔗", label: "Match",   color: "#4527A0", instruction: "Tap a BIG letter on the left, then tap its matching small letter on the right 🔗" },
  { mode: "odd",     emoji: "❌", label: "Odd Out", color: "#BF360C", instruction: "Three pictures start with the same letter. Find and tap the ONE that does NOT belong ❌" },
] as const;

export default function English() {
  const router = useRouter();
  const [letters, setLetters] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("learn");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showInstruction, setShowInstruction] = useState(true);

  useEffect(() => { setShowInstruction(true); }, [mode]);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      const settings: AppSettings = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
      setLetters(getLettersInRange(settings.english.start, settings.english.end));
    });
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowInstruction(true)} style={styles.infoBtn} activeOpacity={0.8}>
            <Text style={styles.infoBtnTxt}>ℹ️</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>📖 English</Text>
        <Text style={styles.subtitle}>
          {letters.length > 0 ? `${letters[0]} → ${letters[letters.length - 1]}  ·  ${letters.length} letters` : ""}
        </Text>
      </View>

      <TabGrid tabs={TABS} active={mode} onSelect={m => setMode(m as Mode)} />

      {showInstruction && (
        <InstructionBanner
          text={TABS.find(t => t.mode === mode)!.instruction}
          color={TABS.find(t => t.mode === mode)!.color}
          onDismiss={() => setShowInstruction(false)}
        />
      )}

      {/* Content */}
      {mode === "learn" ? (
        <FlatList
          data={letters} keyExtractor={(item) => item} numColumns={3}
          contentContainerStyle={styles.grid} columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <LetterCard letter={item} index={index} onPress={() => setSelectedIndex(index)} />
          )}
        />
      ) : mode === "trace" ? (
        <TraceSection letters={letters} />
      ) : mode === "missing" ? (
        <MissingSection letters={letters} />
      ) : mode === "order" ? (
        <BeforeAfterSection letters={letters} />
      ) : mode === "circle" ? (
        <CircleSection letters={letters} />
      ) : mode === "fill" ? (
        <FillSection letters={letters} />
      ) : mode === "match" ? (
        <MatchSection letters={letters} />
      ) : (
        <OddSection letters={letters} />
      )}

      <LetterModal
        letter={selectedIndex !== null ? letters[selectedIndex] : null}
        index={selectedIndex ?? 0}
        letters={letters}
        onClose={() => setSelectedIndex(null)}
        onNavigate={(idx) => setSelectedIndex(idx)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF9C4" },
  header:     { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 2 },
  headerRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  infoBtn:    { padding: 8, borderRadius: 14, backgroundColor: "#E8EAF6" },
  infoBtnTxt: { fontSize: 20 },
  backBtn: { alignSelf: "flex-start", paddingVertical: 4, marginBottom: 4 },
  backText: { fontSize: 18, fontWeight: "700", color: "#78909C" },
  title: { fontSize: 32, fontWeight: "900", color: "#1565C0" },
  subtitle: { fontSize: 13, fontWeight: "600", color: "#90A4AE" },


  // Learn grid
  grid: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  gridRow: { gap: 12 },
  letterCard: {
    borderRadius: 22, alignItems: "center", justifyContent: "center", gap: 4,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  cardLetter: { fontSize: 44, fontWeight: "900" },
  cardEmoji: { fontSize: 24 },

  // Learn modal
  modalBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#00000060" },
  modalCenter: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", borderRadius: 32, padding: 32, alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  closeBtn: { alignSelf: "flex-end", marginBottom: 4 },
  closeBtnText: { fontSize: 20, fontWeight: "700" },
  modalLetter: { fontSize: 110, fontWeight: "900", lineHeight: 120 },
  modalLetterLower: { fontSize: 48, fontWeight: "700", marginTop: -8 },
  modalEmoji: { fontSize: 68, marginVertical: 6 },
  modalWord: { fontSize: 19, fontWeight: "600", textAlign: "center", lineHeight: 28 },
  modalWordBold: { fontSize: 26, fontWeight: "900" },
  navRow: { flexDirection: "row", gap: 16, marginTop: 16 },
  navBtn: { flex: 1, height: 50, borderRadius: 14, borderWidth: 2.5, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff80" },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontSize: 16, fontWeight: "800" },

  // Trace section
  traceSection: { flex: 1, gap: 0 },
  traceNav: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  traceNavBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  traceNavBtnDisabled: { opacity: 0.3 },
  traceNavBtnText: { fontSize: 20, fontWeight: "900" },
  traceLetterInfo: { flex: 1, alignItems: "center", gap: 2 },
  traceLetterLabel: { fontSize: 28, fontWeight: "900" },
  traceLetterWord: { fontSize: 15, color: "#78909C", fontWeight: "600" },
  traceCounter: { fontSize: 12, color: "#B0BEC5", fontWeight: "500" },
  tracingBoard: { flex: 1, marginHorizontal: 16, marginBottom: 16, borderRadius: 28, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  guideWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 0, opacity: 0.12 },
  guideUpper: { fontSize: 200, fontWeight: "900", lineHeight: 210 },
  guideLower: { fontSize: 120, fontWeight: "900", lineHeight: 130 },
  hintBorder: { position: "absolute", bottom: 60, left: 0, right: 0, alignItems: "center" },
  hintText: { fontSize: 13, color: "#B0BEC5", fontWeight: "500" },
  dot: { position: "absolute", width: DOT_RADIUS * 2, height: DOT_RADIUS * 2, borderRadius: DOT_RADIUS, opacity: 0.85 },
  clearBtn: { position: "absolute", bottom: 16, right: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  clearBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },

  // Shared quiz layout
  quizSection: { flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 20 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#90A4AE", textAlign: "center" },
  streakRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  streakText: { fontSize: 18, fontWeight: "800", color: "#E65100" },
  skipBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#ECEFF1" },
  skipBtnText: { fontSize: 15, fontWeight: "700", color: "#78909C" },

  // Shared sequence boxes
  sequenceRow: { flexDirection: "row", justifyContent: "center", gap: 10, flexWrap: "wrap" },
  seqBox: { width: 58, height: 72, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  seqBoxBlank: { borderWidth: 3, borderStyle: "dashed", borderColor: "#90A4AE", backgroundColor: "#ECEFF1" },
  seqBoxFilled: { backgroundColor: "#C8E6C9", borderColor: "#388E3C", borderWidth: 3, borderStyle: "solid" },
  seqLetter: { fontSize: 34, fontWeight: "900", color: "#37474F" },
  seqBlankText: { color: "#90A4AE", fontSize: 28 },
  quizPrompt: { fontSize: 20, fontWeight: "700", color: "#546E7A", textAlign: "center" },

  // Shared choice buttons
  choicesRow: { flexDirection: "row", justifyContent: "center", gap: 14 },
  choiceBtn: { flex: 1, height: 80, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 2.5, borderColor: "#CFD8DC", shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  choiceBtnCorrect: { backgroundColor: "#43A047", borderColor: "#2E7D32" },
  choiceBtnWrong: { backgroundColor: "#E53935", borderColor: "#B71C1C" },
  choiceBtnDimmed: { opacity: 0.35 },
  choiceBtnText: { fontSize: 30, fontWeight: "900", color: "#37474F" },

  // Shared feedback
  feedbackCorrect: { textAlign: "center", fontSize: 24, fontWeight: "900", color: "#2E7D32" },
  feedbackWrongWrap: { alignItems: "center", gap: 12 },
  feedbackWrong: { textAlign: "center", fontSize: 22, fontWeight: "800", color: "#C62828" },
  retryBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 18, backgroundColor: "#1565C0" },
  retryBtnText: { fontSize: 18, fontWeight: "900", color: "#fff" },

  // Before/After specific
  orderPrompt: { fontSize: 22, fontWeight: "800", color: "#37474F", textAlign: "center" },
  orderSequence: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  orderBox: { width: 110, height: 110, borderRadius: 24, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  orderBoxLetter: { backgroundColor: "#BBDEFB", borderWidth: 3, borderColor: "#1565C0" },
  orderBoxBlank: { backgroundColor: "#ECEFF1", borderWidth: 3, borderStyle: "dashed", borderColor: "#90A4AE" },
  orderBoxText: { fontSize: 60, fontWeight: "900", color: "#1565C0" },
  orderArrow: { fontSize: 36, color: "#90A4AE", fontWeight: "700" },

  // Circle section
  circleSection: { flex: 1 },
  circleSectionContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 16 },
  circleTargetWrap: { alignItems: "center", gap: 6 },
  circleTargetLabel: { fontSize: 17, fontWeight: "600", color: "#546E7A" },
  circleTargetBox: { width: 100, height: 100, borderRadius: 28, backgroundColor: "#BBDEFB", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#1565C0" },
  circleTargetLetter: { fontSize: 64, fontWeight: "900", color: "#1565C0" },
  circleInstruction: { fontSize: 16, fontWeight: "700", color: "#546E7A", textAlign: "center" },
  circleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  circleItem: {
    width: (width - 40 - 24) / 3,
    aspectRatio: 1, borderRadius: 22, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", gap: 4,
    borderWidth: 3, borderColor: "#E0E0E0",
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  circleItemCorrect: { backgroundColor: "#C8E6C9", borderColor: "#388E3C" },
  circleItemWrong: { backgroundColor: "#FFCDD2", borderColor: "#E53935" },
  circleItemEmoji: { fontSize: 40 },
  circleItemWord: { fontSize: 11, fontWeight: "700", color: "#546E7A", textAlign: "center", paddingHorizontal: 4 },
  circleItemBadge: { position: "absolute", top: 4, right: 8, fontSize: 20, fontWeight: "900", color: "#2E7D32" },
  circleItemBadgeWrong: { color: "#C62828" },

  // Fill section
  fillInstruction: { fontSize: 17, fontWeight: "700", color: "#546E7A", textAlign: "center" },
  fillEmoji: { fontSize: 90, textAlign: "center" },
  fillWordRow: { flexDirection: "row", justifyContent: "center", gap: 6, flexWrap: "wrap" },
  fillLetterBox: { width: 46, height: 56, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#CFD8DC" },
  fillBlankBox: { borderStyle: "dashed", borderColor: "#90A4AE", backgroundColor: "#ECEFF1" },
  fillLetterText: { fontSize: 28, fontWeight: "900", color: "#37474F" },

  // Match section
  matchSection: { flex: 1 },
  matchContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 16 },
  matchInstruction: { fontSize: 17, fontWeight: "700", color: "#546E7A", textAlign: "center" },
  matchHint: { fontSize: 16, fontWeight: "700", color: "#1565C0", textAlign: "center", backgroundColor: "#E3F2FD", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14 },
  matchColumnsRow: { flexDirection: "row", justifyContent: "center", alignItems: "flex-start", gap: 0 },
  matchColumn: { flex: 1, alignItems: "center", gap: 12 },
  matchColLabel: { fontSize: 14, fontWeight: "800", color: "#90A4AE", letterSpacing: 1 },
  matchDivider: { width: 40, alignItems: "center", gap: 12, paddingTop: 44 },
  matchArrow: { fontSize: 22, color: "#B0BEC5", height: 72, textAlignVertical: "center", lineHeight: 72 },
  matchItem: {
    width: "90%", height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center",
    borderWidth: 3, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  matchItemUpper: { backgroundColor: "#BBDEFB", borderColor: "#1565C0" },
  matchItemLower: { backgroundColor: "#FFF9C4", borderColor: "#F57F17" },
  matchItemSelected: { backgroundColor: "#7C4DFF", borderColor: "#4527A0" },
  matchItemMatched: { backgroundColor: "#C8E6C9", borderColor: "#388E3C", opacity: 0.7 },
  matchItemWrong: { backgroundColor: "#FFCDD2", borderColor: "#E53935" },
  matchItemText: { fontSize: 38, fontWeight: "900", color: "#1565C0" },
  matchItemTextLower: { fontSize: 38, fontWeight: "900", color: "#E65100" },
  matchItemTextMatched: { color: "#2E7D32" },
  matchTick: { position: "absolute", top: 4, right: 10, fontSize: 16, color: "#2E7D32", fontWeight: "900" },

  // Odd-one-out section
  oddSection: { flex: 1 },
  oddSectionContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 16 },
  oddGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, justifyContent: "center" },
  oddItem: {
    width: (width - 40 - 16) / 2,
    aspectRatio: 1, borderRadius: 28, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 3, borderColor: "#E0E0E0",
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  oddItemCorrect: { backgroundColor: "#FFCDD2", borderColor: "#E53935" },
  oddItemWrong: { backgroundColor: "#FFF3E0", borderColor: "#E65100" },
  oddItemDimmed: { backgroundColor: "#C8E6C9", borderColor: "#388E3C", opacity: 0.75 },
  oddItemEmoji: { fontSize: 52 },
  oddItemWord: { fontSize: 14, fontWeight: "700", color: "#546E7A", textAlign: "center", paddingHorizontal: 8 },
  oddBadge: { position: "absolute", top: 8, right: 12, fontSize: 26, fontWeight: "900", color: "#C62828" },
});
