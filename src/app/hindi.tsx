import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { TabGrid } from "../components/TabGrid";
import { InstructionBanner } from "../components/InstructionBanner";
import { useSoundFeedback } from "../hooks/useSoundFeedback";
import { useCallback, useEffect, useRef, useState } from "react";
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

// ── Alphabet data ─────────────────────────────────────────────────────────────

const ALL_HINDI = [
  "अ","आ","इ","ई","उ","ऊ","ऋ","ए","ऐ","ओ","औ",
  "क","ख","ग","घ","ङ",
  "च","छ","ज","झ","ञ",
  "ट","ठ","ड","ढ","ण",
  "त","थ","द","ध","न",
  "प","फ","ब","भ","म",
  "य","र","ल","व",
  "श","ष","स","ह",
];

const HINDI_DATA: Record<string, { word: string; emoji: string }> = {
  "अ":{ word:"अनार",    emoji:"🍎" }, "आ":{ word:"आम",      emoji:"🥭" },
  "इ":{ word:"इमली",    emoji:"🌿" }, "ई":{ word:"ईख",      emoji:"🎋" },
  "उ":{ word:"उल्लू",   emoji:"🦉" }, "ऊ":{ word:"ऊन",      emoji:"🧶" },
  "ऋ":{ word:"ऋषि",    emoji:"🧘" }, "ए":{ word:"एड़ी",    emoji:"🦶" },
  "ऐ":{ word:"ऐनक",    emoji:"👓" }, "ओ":{ word:"ओस",      emoji:"💧" },
  "औ":{ word:"औजार",   emoji:"🔧" }, "क":{ word:"कबूतर",   emoji:"🕊️" },
  "ख":{ word:"खरगोश",  emoji:"🐰" }, "ग":{ word:"गाय",     emoji:"🐄" },
  "घ":{ word:"घड़ी",   emoji:"⏰" }, "ङ":{ word:"ङ",       emoji:"🔤" },
  "च":{ word:"चिड़िया", emoji:"🐦" }, "छ":{ word:"छाता",    emoji:"☂️" },
  "ज":{ word:"जहाज",   emoji:"✈️" }, "झ":{ word:"झंडा",    emoji:"🚩" },
  "ञ":{ word:"ञ",      emoji:"🔤" }, "ट":{ word:"टमाटर",   emoji:"🍅" },
  "ठ":{ word:"ठंड",    emoji:"❄️" }, "ड":{ word:"डमरू",    emoji:"🥁" },
  "ढ":{ word:"ढोल",    emoji:"🪘" }, "ण":{ word:"ण",       emoji:"🔤" },
  "त":{ word:"तितली",  emoji:"🦋" }, "थ":{ word:"थाली",    emoji:"🍽️" },
  "द":{ word:"दीपक",   emoji:"🕯️" }, "ध":{ word:"धनुष",    emoji:"🏹" },
  "न":{ word:"नाव",    emoji:"⛵" }, "प":{ word:"पंखा",    emoji:"🌀" },
  "फ":{ word:"फूल",    emoji:"🌸" }, "ब":{ word:"बकरी",    emoji:"🐐" },
  "भ":{ word:"भालू",   emoji:"🐻" }, "म":{ word:"मछली",    emoji:"🐟" },
  "य":{ word:"यात्रा", emoji:"🚗" }, "र":{ word:"रेल",     emoji:"🚂" },
  "ल":{ word:"लड्डू",  emoji:"🍡" }, "व":{ word:"वर्षा",   emoji:"🌧️" },
  "श":{ word:"शेर",    emoji:"🦁" }, "ष":{ word:"षट्कोण",  emoji:"🔷" },
  "स":{ word:"सूरज",   emoji:"☀️" }, "ह":{ word:"हाथी",    emoji:"🐘" },
};

const HINDI_WORDS: Record<string, Array<{ word: string; emoji: string }>> = {
  "अ":[{word:"अनार",emoji:"🍎"},{word:"अंगूर",emoji:"🍇"},{word:"अंडा",emoji:"🥚"},{word:"अश्व",emoji:"🐴"}],
  "आ":[{word:"आम",emoji:"🥭"},{word:"आग",emoji:"🔥"},{word:"आसमान",emoji:"☁️"}],
  "इ":[{word:"इमली",emoji:"🌿"},{word:"इंद्रधनुष",emoji:"🌈"},{word:"इमारत",emoji:"🏢"}],
  "ई":[{word:"ईख",emoji:"🎋"},{word:"ईंट",emoji:"🧱"},{word:"ईनाम",emoji:"🏆"}],
  "उ":[{word:"उल्लू",emoji:"🦉"},{word:"उंगली",emoji:"☝️"},{word:"उपहार",emoji:"🎁"}],
  "ऊ":[{word:"ऊन",emoji:"🧶"},{word:"ऊँट",emoji:"🐪"},{word:"ऊर्जा",emoji:"⚡"}],
  "ऋ":[{word:"ऋषि",emoji:"🧘"},{word:"ऋतु",emoji:"🌸"}],
  "ए":[{word:"एड़ी",emoji:"🦶"},{word:"एक",emoji:"1️⃣"}],
  "ऐ":[{word:"ऐनक",emoji:"👓"}],
  "ओ":[{word:"ओस",emoji:"💧"}],
  "औ":[{word:"औजार",emoji:"🔧"},{word:"औरत",emoji:"👩"}],
  "क":[{word:"कबूतर",emoji:"🕊️"},{word:"केला",emoji:"🍌"},{word:"कमल",emoji:"🪷"},{word:"कुत्ता",emoji:"🐶"}],
  "ख":[{word:"खरगोश",emoji:"🐰"},{word:"खिड़की",emoji:"🪟"},{word:"खाना",emoji:"🍱"}],
  "ग":[{word:"गाय",emoji:"🐄"},{word:"गेंद",emoji:"⚽"},{word:"घोड़ा",emoji:"🐴"}],
  "घ":[{word:"घड़ी",emoji:"⏰"},{word:"घर",emoji:"🏠"}],
  "ङ":[{word:"ङ",emoji:"🔤"}],
  "च":[{word:"चिड़िया",emoji:"🐦"},{word:"चम्मच",emoji:"🥄"},{word:"चाँद",emoji:"🌙"}],
  "छ":[{word:"छाता",emoji:"☂️"},{word:"छत",emoji:"🏠"}],
  "ज":[{word:"जहाज",emoji:"✈️"},{word:"जग",emoji:"🫙"},{word:"जंगल",emoji:"🌳"}],
  "झ":[{word:"झंडा",emoji:"🚩"},{word:"झील",emoji:"🏞️"},{word:"झूला",emoji:"🎠"}],
  "ञ":[{word:"ञ",emoji:"🔤"}],
  "ट":[{word:"टमाटर",emoji:"🍅"},{word:"टोकरी",emoji:"🧺"},{word:"टेलीफोन",emoji:"📱"}],
  "ठ":[{word:"ठंड",emoji:"❄️"},{word:"ठेला",emoji:"🛒"}],
  "ड":[{word:"डमरू",emoji:"🥁"},{word:"डब्बा",emoji:"📦"}],
  "ढ":[{word:"ढोल",emoji:"🪘"}],
  "ण":[{word:"ण",emoji:"🔤"}],
  "त":[{word:"तितली",emoji:"🦋"},{word:"तरबूज",emoji:"🍉"},{word:"तारा",emoji:"⭐"}],
  "थ":[{word:"थाली",emoji:"🍽️"},{word:"थैला",emoji:"👜"}],
  "द":[{word:"दीपक",emoji:"🕯️"},{word:"दरवाजा",emoji:"🚪"},{word:"दूध",emoji:"🥛"}],
  "ध":[{word:"धनुष",emoji:"🏹"},{word:"धागा",emoji:"🪡"},{word:"धरती",emoji:"🌍"}],
  "न":[{word:"नाव",emoji:"⛵"},{word:"नल",emoji:"🚿"},{word:"नमक",emoji:"🧂"}],
  "प":[{word:"पंखा",emoji:"🌀"},{word:"पतंग",emoji:"🪁"},{word:"पानी",emoji:"💧"},{word:"पहाड़",emoji:"⛰️"}],
  "फ":[{word:"फूल",emoji:"🌸"},{word:"फल",emoji:"🍑"},{word:"फोन",emoji:"📞"}],
  "ब":[{word:"बकरी",emoji:"🐐"},{word:"बत्तख",emoji:"🦆"},{word:"बादल",emoji:"☁️"},{word:"बंदर",emoji:"🐒"}],
  "भ":[{word:"भालू",emoji:"🐻"},{word:"भेड़",emoji:"🐑"}],
  "म":[{word:"मछली",emoji:"🐟"},{word:"मोर",emoji:"🦚"},{word:"मक्का",emoji:"🌽"}],
  "य":[{word:"यात्रा",emoji:"🚗"},{word:"यंत्र",emoji:"⚙️"}],
  "र":[{word:"रेल",emoji:"🚂"},{word:"रोटी",emoji:"🫓"},{word:"राजा",emoji:"👑"},{word:"रंग",emoji:"🎨"}],
  "ल":[{word:"लड्डू",emoji:"🍡"},{word:"लोमड़ी",emoji:"🦊"},{word:"लहर",emoji:"🌊"}],
  "व":[{word:"वर्षा",emoji:"🌧️"},{word:"वानर",emoji:"🐒"},{word:"वायु",emoji:"💨"}],
  "श":[{word:"शेर",emoji:"🦁"},{word:"शंख",emoji:"🐚"},{word:"शहद",emoji:"🍯"}],
  "ष":[{word:"षट्कोण",emoji:"🔷"}],
  "स":[{word:"सूरज",emoji:"☀️"},{word:"सेब",emoji:"🍎"},{word:"सांप",emoji:"🐍"}],
  "ह":[{word:"हाथी",emoji:"🐘"},{word:"हिरण",emoji:"🦌"},{word:"हंस",emoji:"🦢"}],
};

const BG_COLORS  = ["#FFF3E0","#FBE9E7","#FCE4EC","#FFF8E1","#F3E5F5","#E8EAF6","#E0F7FA","#E8F5E9","#FFFDE7","#F9FBE7"];
const ACC_COLORS = ["#E65100","#BF360C","#880E4F","#F57F17","#6A1B9A","#283593","#006064","#1B5E20","#F9A825","#33691E"];

type Point    = { x: number; y: number; id: number };
type QuizState = "idle" | "correct" | "wrong";
type PicQ      = { letter: string; word: string; emoji: string; choices: string[] };
type MatchPair = { letter: string; word: string; emoji: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

function getHindiRange(start: string, end: string): string[] {
  const si = ALL_HINDI.indexOf(start);
  const ei = ALL_HINDI.indexOf(end);
  if (si === -1 || ei === -1) return ALL_HINDI.slice(0, 11);
  return ALL_HINDI.slice(Math.min(si, ei), Math.max(si, ei) + 1);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function validLetters(letters: string[]): string[] {
  return letters.filter(l => (HINDI_WORDS[l] ?? []).some(w => w.emoji !== "🔤"));
}

function pickWord(letter: string): { word: string; emoji: string } | null {
  const list = (HINDI_WORDS[letter] ?? []).filter(w => w.emoji !== "🔤");
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

function genPicQ(letters: string[], numChoices: number): PicQ | null {
  const valid = validLetters(letters);
  if (valid.length < 2) return null;
  const letter = valid[Math.floor(Math.random() * valid.length)];
  const w = pickWord(letter);
  if (!w) return null;
  const allValid = validLetters(ALL_HINDI);
  const wrongs   = shuffle(allValid.filter(l => l !== letter)).slice(0, numChoices - 1);
  return { letter, word: w.word, emoji: w.emoji, choices: shuffle([letter, ...wrongs]) };
}

// ── Tracing board ─────────────────────────────────────────────────────────────

function TracingBoard({ char, bg, accent }: { char: string; bg: string; accent: string }) {
  const pts     = useRef<Point[]>([]);
  const ctr     = useRef(0);
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
  const pan   = Gesture.Pan().runOnJS(true).minDistance(0).onBegin(e => addPt(e.x, e.y)).onUpdate(e => addPt(e.x, e.y));
  const clear = () => { pts.current = []; upd(n => n + 1); };

  return (
    <GestureHandlerRootView style={[styles.board, { backgroundColor: bg }]}>
      <View style={styles.guideWrap} pointerEvents="none">
        <Text style={[styles.guideChar, { color: accent }]}>{char}</Text>
      </View>
      <View style={styles.hintRow} pointerEvents="none">
        <Text style={styles.hintTxt}>अक्षर पर उंगली चलाओ ✏️</Text>
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

// ── 1. Trace section ──────────────────────────────────────────────────────────

function TraceSection({ letters }: { letters: string[] }) {
  const [idx, setIdx] = useState(0);
  if (!letters.length) return <Empty text="No letters in range. Check Settings!" />;
  const letter = letters[idx];
  const data   = HINDI_DATA[letter] ?? { word: letter, emoji: "🔤" };
  const accent = ACC_COLORS[idx % ACC_COLORS.length];
  const bg     = BG_COLORS[idx % BG_COLORS.length];

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.traceNav}>
        <TouchableOpacity style={[styles.navBtn, idx === 0 && styles.navOff]}
          onPress={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} activeOpacity={0.7}>
          <Text style={[styles.navTxt, { color: accent }]}>◀</Text>
        </TouchableOpacity>
        <View style={styles.traceInfo}>
          <Text style={[styles.traceLetter, { color: accent }]}>{letter}</Text>
          <Text style={styles.traceWord}>{data.emoji}  {data.word}</Text>
          <Text style={styles.traceCtr}>{idx + 1} / {letters.length}</Text>
        </View>
        <TouchableOpacity style={[styles.navBtn, idx === letters.length - 1 && styles.navOff]}
          onPress={() => setIdx(i => Math.min(letters.length - 1, i + 1))} disabled={idx === letters.length - 1} activeOpacity={0.7}>
          <Text style={[styles.navTxt, { color: accent }]}>▶</Text>
        </TouchableOpacity>
      </View>
      <TracingBoard key={`${letter}-${idx}`} char={letter} accent={accent} bg={bg} />
    </View>
  );
}

// ── 2. Match section (letter ↔ picture) ───────────────────────────────────────

function MatchSection({ letters }: { letters: string[] }) {
  const PAIR = Math.min(4, validLetters(letters).length);

  const makePairs = () => {
    const chosen = shuffle(validLetters(letters)).slice(0, PAIR);
    const left   = [...chosen].sort((a, b) => ALL_HINDI.indexOf(a) - ALL_HINDI.indexOf(b));
    const right: MatchPair[] = shuffle(chosen.map(l => {
      const w = pickWord(l) ?? { word: l, emoji: "🔤" };
      return { letter: l, ...w };
    }));
    return { left, right };
  };

  const [left,    setLeft]    = useState<string[]>([]);
  const [right,   setRight]   = useState<MatchPair[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selLeft, setSelLeft] = useState<string | null>(null);
  const [wrongR,  setWrongR]  = useState<string | null>(null);
  const [streak,  setStreak]  = useState(0);
  const { playCorrect, playWrong } = useSoundFeedback();

  const reset = () => {
    const p = makePairs();
    setLeft(p.left); setRight(p.right); setMatched(new Set()); setSelLeft(null); setWrongR(null);
  };
  useEffect(() => { reset(); }, [letters]);

  const allDone = matched.size === left.length && left.length > 0;
  useEffect(() => {
    if (allDone) { playCorrect(); setStreak(s => s + 1); const t = setTimeout(reset, 1600); return () => clearTimeout(t); }
  }, [allDone]);

  const tapLeft = (l: string) => {
    if (matched.has(l)) return;
    setSelLeft(prev => (prev === l ? null : l));
  };
  const tapRight = (item: MatchPair) => {
    if (matched.has(item.letter) || !selLeft) return;
    if (item.letter === selLeft) {
      setMatched(prev => { const s = new Set(prev); s.add(item.letter); return s; });
      setSelLeft(null);
    } else {
      playWrong(); setWrongR(item.letter); setSelLeft(null);
      setTimeout(() => setWrongR(null), 600);
    }
  };

  if (validLetters(letters).length < 2) return <Empty text="Set at least 2 letters in Settings!" />;

  return (
    <ScrollView contentContainerStyle={styles.sc} showsVerticalScrollIndicator={false}>
      <View style={styles.streakRow}>
        <Text style={styles.streak}>🔥 Streak: {streak}</Text>
        <TouchableOpacity style={styles.skipBtn} onPress={reset} activeOpacity={0.7}><Text style={styles.skipTxt}>New Set →</Text></TouchableOpacity>
      </View>
      <Text style={styles.prompt}>अक्षर को चित्र से मिलाओ! 🔗</Text>
      {allDone && <Text style={styles.fbCorrect}>🎉  शाबाश! सब मिला!</Text>}
      {selLeft && (
        <Text style={styles.matchHint}>अब  {selLeft}  का चित्र छुओ ➡️</Text>
      )}
      <View style={styles.matchCols}>
        {/* Left: letters */}
        <View style={styles.col}>
          <Text style={styles.colLabel}>अक्षर</Text>
          {left.map(l => {
            const isM = matched.has(l); const isSel = selLeft === l;
            return (
              <TouchableOpacity key={l} onPress={() => tapLeft(l)} disabled={isM} activeOpacity={0.75}
                style={[styles.matchItem, styles.matchLeft, isSel && styles.matchSel, isM && styles.matchDone]}>
                <Text style={[styles.matchLetTxt, isM && styles.doneTxt]}>{l}</Text>
                {isM && <Text style={styles.tick}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
        {/* Divider */}
        <View style={styles.divider}>
          {left.map((_, i) => <Text key={i} style={styles.arrow}>→</Text>)}
        </View>
        {/* Right: pictures */}
        <View style={styles.col}>
          <Text style={styles.colLabel}>चित्र</Text>
          {right.map((item, i) => {
            const isM = matched.has(item.letter); const isW = wrongR === item.letter;
            return (
              <TouchableOpacity key={`${item.letter}-${i}`} onPress={() => tapRight(item)} disabled={isM} activeOpacity={0.75}
                style={[styles.matchItem, styles.matchRight, isM && styles.matchDone, isW && styles.matchWrong]}>
                <Text style={styles.matchEmoji}>{item.emoji}</Text>
                <Text style={[styles.matchWord, isM && styles.doneTxt]} numberOfLines={1}>{item.word}</Text>
                {isM && <Text style={styles.tick}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ── 3. Write section (picture → 1st letter, 3 buttons) ───────────────────────

function WriteSection({ letters }: { letters: string[] }) {
  const [q, setQ]         = useState<PicQ | null>(null);
  const [sel, setSel]     = useState<string | null>(null);
  const [state, setState] = useState<QuizState>("idle");
  const [streak, setStreak] = useState(0);
  const { playCorrect, playWrong } = useSoundFeedback();

  const next  = () => { setQ(genPicQ(letters, 3)); setSel(null); setState("idle"); };
  const retry = () => { setSel(null); setState("idle"); };
  useEffect(() => { next(); }, [letters]);

  const tap = (ch: string) => {
    if (state !== "idle" || !q) return;
    setSel(ch);
    if (ch === q.letter) { playCorrect(); setState("correct"); setStreak(s => s + 1); setTimeout(next, 1500); }
    else { playWrong(); setState("wrong"); setStreak(0); }
  };

  if (validLetters(letters).length < 2) return <Empty text="Set at least 2 letters in Settings!" />;
  if (!q) return null;

  return (
    <ScrollView contentContainerStyle={styles.sc} showsVerticalScrollIndicator={false}>
      <View style={styles.streakRow}>
        <Text style={styles.streak}>🔥 Streak: {streak}</Text>
        <TouchableOpacity style={styles.skipBtn} onPress={next} activeOpacity={0.7}><Text style={styles.skipTxt}>Next →</Text></TouchableOpacity>
      </View>
      <Text style={styles.prompt}>पहला अक्षर लिखो! ✍️</Text>
      <Text style={styles.bigEmoji}>{q.emoji}</Text>
      <View style={styles.wordRow}>
        <View style={[styles.blankBox, state === "correct" && styles.boxFilled]}>
          <Text style={[styles.blankBoxTxt, state !== "correct" && styles.blankPlaceholder]}>
            {state === "correct" ? q.letter : "_"}
          </Text>
        </View>
        <Text style={styles.wordRest}>{q.word.slice(q.letter.length)}</Text>
      </View>
      <View style={styles.choicesRow}>
        {q.choices.map(ch => {
          const isSel = sel === ch; const ok = state === "correct" && isSel; const bad = state === "wrong" && isSel;
          return (
            <TouchableOpacity key={ch} onPress={() => tap(ch)} disabled={state !== "idle"} activeOpacity={0.8}
              style={[styles.letterBtn, ok && styles.btnOk, bad && styles.btnBad, state !== "idle" && !isSel && styles.dimmed]}>
              <Text style={[styles.letterBtnTxt, (ok || bad) && { color: "#fff" }]}>{ch}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {state === "correct" && <Text style={styles.fbCorrect}>🎉  {q.letter} से {q.word}!</Text>}
      {state === "wrong" && (
        <View style={styles.fbWrongWrap}>
          <Text style={styles.fbWrong}>🤔  फिर कोशिश करो!</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={retry} activeOpacity={0.8}>
            <Text style={styles.retryTxt}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// ── 4. Circle section (picture → 1st letter, 4 bubbles) ──────────────────────

function CircleSection({ letters }: { letters: string[] }) {
  const [q, setQ]         = useState<PicQ | null>(null);
  const [sel, setSel]     = useState<string | null>(null);
  const [state, setState] = useState<QuizState>("idle");
  const [streak, setStreak] = useState(0);
  const { playCorrect, playWrong } = useSoundFeedback();

  const next  = () => { setQ(genPicQ(letters, 4)); setSel(null); setState("idle"); };
  const retry = () => { setSel(null); setState("idle"); };
  useEffect(() => { next(); }, [letters]);

  const tap = (ch: string) => {
    if (state !== "idle" || !q) return;
    setSel(ch);
    if (ch === q.letter) { playCorrect(); setState("correct"); setStreak(s => s + 1); setTimeout(next, 1500); }
    else { playWrong(); setState("wrong"); setStreak(0); }
  };

  if (validLetters(letters).length < 3) return <Empty text="Set at least 3 letters in Settings!" />;
  if (!q) return null;

  return (
    <ScrollView contentContainerStyle={styles.sc} showsVerticalScrollIndicator={false}>
      <View style={styles.streakRow}>
        <Text style={styles.streak}>🔥 Streak: {streak}</Text>
        <TouchableOpacity style={styles.skipBtn} onPress={next} activeOpacity={0.7}><Text style={styles.skipTxt}>Next →</Text></TouchableOpacity>
      </View>
      <Text style={styles.prompt}>सही पहला अक्षर गोल करो! 🔵</Text>
      <View style={styles.picCard}>
        <Text style={styles.bigEmoji}>{q.emoji}</Text>
        <Text style={styles.picWord}>{q.word}</Text>
      </View>
      <View style={styles.bubblesGrid}>
        {q.choices.map(ch => {
          const isSel = sel === ch; const ok = state === "correct" && isSel; const bad = state === "wrong" && isSel;
          return (
            <TouchableOpacity key={ch} onPress={() => tap(ch)} disabled={state !== "idle"} activeOpacity={0.8}
              style={[styles.bubble, ok && styles.bubbleOk, bad && styles.bubbleBad, state !== "idle" && !isSel && styles.dimmed]}>
              <Text style={[styles.bubbleTxt, (ok || bad) && { color: "#fff" }]}>{ch}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {state === "correct" && <Text style={styles.fbCorrect}>🎉  {q.letter} से {q.word}!</Text>}
      {state === "wrong" && (
        <View style={styles.fbWrongWrap}>
          <Text style={styles.fbWrong}>🤔  फिर कोशिश करो!</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={retry} activeOpacity={0.8}>
            <Text style={styles.retryTxt}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 48 }}>⚙️</Text>
      <Text style={styles.emptyTxt}>{text}</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type Mode = "trace" | "match" | "write" | "circle";
const TABS = [
  { mode: "trace",  emoji: "✏️", label: "Trace",  color: "#BF360C", instruction: "अक्षर पर उंगली घुमाओ! Trace the letter with your finger by following the big faded guide ✏️" },
  { mode: "match",  emoji: "🔗", label: "Match",  color: "#1565C0", instruction: "अक्षर को उसके चित्र से मिलाओ! Tap a letter on the left, then tap its matching picture on the right 🔗" },
  { mode: "write",  emoji: "✍️", label: "Write",  color: "#2E7D32", instruction: "चित्र देखो! Look at the picture — which letter does its name begin with? Tap the correct letter ✍️" },
  { mode: "circle", emoji: "🔵", label: "Circle", color: "#6A1B9A", instruction: "चित्र देखो! Look at the picture and find the correct first letter. Tap the right bubble 🔵" },
] as const;

export default function Hindi() {
  const router  = useRouter();
  const [letters, setLetters] = useState<string[]>([]);
  const [mode, setMode]       = useState<Mode>("trace");
  const [showInstruction, setShowInstruction] = useState(true);

  useEffect(() => { setShowInstruction(true); }, [mode]);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(SETTINGS_KEY).then(raw => {
        const s: AppSettings = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
        setLetters(getHindiRange(s.hindi.start, s.hindi.end));
      });
    }, [])
  );

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
        <Text style={styles.title}>🕉️ हिंदी</Text>
        {letters.length > 0 && (
          <Text style={styles.subtitle}>{letters[0]} → {letters[letters.length - 1]}  ·  {letters.length} अक्षर</Text>
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

      {mode === "trace"  ? <TraceSection  letters={letters} /> :
       mode === "match"  ? <MatchSection  letters={letters} /> :
       mode === "write"  ? <WriteSection  letters={letters} /> :
                           <CircleSection letters={letters} />}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const BUBBLE_SZ = (width - 40 - 48) / 2;

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: "#FFF3E0" },
  header:     { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 2 },
  headerRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  infoBtn:    { padding: 8, borderRadius: 14, backgroundColor: "#FBE9E7" },
  infoBtnTxt: { fontSize: 20 },
  backBtn: { alignSelf: "flex-start", paddingVertical: 4, marginBottom: 4 },
  backTxt: { fontSize: 18, fontWeight: "700", color: "#78909C" },
  title:   { fontSize: 32, fontWeight: "900", color: "#BF360C" },
  subtitle:{ fontSize: 13, fontWeight: "600", color: "#E64A19" },


  sc: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 20 },

  empty:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyTxt: { fontSize: 18, fontWeight: "600", color: "#90A4AE", textAlign: "center" },

  streakRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  streak:    { fontSize: 18, fontWeight: "800", color: "#E65100" },
  skipBtn:   { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#FBE9E7" },
  skipTxt:   { fontSize: 15, fontWeight: "700", color: "#78909C" },

  prompt: { fontSize: 18, fontWeight: "700", color: "#546E7A", textAlign: "center" },

  // Tracing board
  board:    { flex: 1, marginHorizontal: 16, marginBottom: 16, borderRadius: 28, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  guideWrap:{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", opacity: 0.13 },
  guideChar:{ fontSize: 190, fontWeight: "900", lineHeight: 230 },
  hintRow:  { position: "absolute", bottom: 60, left: 0, right: 0, alignItems: "center" },
  hintTxt:  { fontSize: 13, color: "#B0BEC5", fontWeight: "500" },
  dot:      { position: "absolute", width: DOT_RADIUS * 2, height: DOT_RADIUS * 2, borderRadius: DOT_RADIUS, opacity: 0.85 },
  clearBtn: { position: "absolute", bottom: 16, right: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  clearBtnTxt: { fontSize: 15, fontWeight: "800", color: "#fff" },

  // Trace nav
  traceNav:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  navBtn:     { width: 48, height: 48, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  navOff:     { opacity: 0.3 },
  navTxt:     { fontSize: 20, fontWeight: "900" },
  traceInfo:  { flex: 1, alignItems: "center", gap: 2 },
  traceLetter:{ fontSize: 40, fontWeight: "900" },
  traceWord:  { fontSize: 15, color: "#78909C", fontWeight: "600" },
  traceCtr:   { fontSize: 12, color: "#B0BEC5", fontWeight: "500" },

  // Match section
  matchCols: { flexDirection: "row", justifyContent: "center", alignItems: "flex-start", gap: 0 },
  col:       { flex: 1, alignItems: "center", gap: 10 },
  colLabel:  { fontSize: 13, fontWeight: "800", color: "#90A4AE", letterSpacing: 0.5 },
  divider:   { width: 36, alignItems: "center", gap: 10, paddingTop: 38 },
  arrow:     { fontSize: 20, color: "#B0BEC5", height: 72, textAlignVertical: "center", lineHeight: 72 },
  matchItem: { width: "90%", height: 72, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 2.5, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3, flexDirection: "row", gap: 6, paddingHorizontal: 8 },
  matchLeft: { backgroundColor: "#FFF3E0", borderColor: "#E65100" },
  matchRight:{ backgroundColor: "#FFF8E1", borderColor: "#F57F17" },
  matchSel:  { backgroundColor: "#7C4DFF", borderColor: "#4527A0" },
  matchDone: { backgroundColor: "#C8E6C9", borderColor: "#388E3C", opacity: 0.8 },
  matchWrong:{ backgroundColor: "#FFCDD2", borderColor: "#E53935" },
  matchLetTxt:{ fontSize: 32, fontWeight: "900", color: "#BF360C" },
  matchEmoji: { fontSize: 28 },
  matchWord:  { fontSize: 13, fontWeight: "700", color: "#546E7A", flexShrink: 1 },
  doneTxt:    { color: "#2E7D32" },
  tick:       { fontSize: 14, color: "#2E7D32", fontWeight: "900" },
  matchHint:  { fontSize: 16, fontWeight: "700", color: "#BF360C", textAlign: "center", backgroundColor: "#FBE9E7", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14 },

  // Write section
  bigEmoji: { fontSize: 90, textAlign: "center" },
  wordRow:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  blankBox: { width: 56, height: 68, borderRadius: 14, backgroundColor: "#ECEFF1", alignItems: "center", justifyContent: "center", borderWidth: 3, borderStyle: "dashed", borderColor: "#90A4AE" },
  boxFilled:{ backgroundColor: "#C8E6C9", borderColor: "#388E3C", borderStyle: "solid" },
  blankBoxTxt: { fontSize: 32, fontWeight: "900", color: "#BF360C" },
  blankPlaceholder: { color: "#90A4AE" },
  wordRest: { fontSize: 36, fontWeight: "800", color: "#37474F" },
  choicesRow: { flexDirection: "row", justifyContent: "center", gap: 14 },
  letterBtn:  { flex: 1, height: 80, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 2.5, borderColor: "#FFCCBC", shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  letterBtnTxt: { fontSize: 32, fontWeight: "900", color: "#BF360C" },
  btnOk:  { backgroundColor: "#43A047", borderColor: "#2E7D32" },
  btnBad: { backgroundColor: "#E53935", borderColor: "#B71C1C" },
  dimmed: { opacity: 0.35 },

  // Circle section
  picCard:    { alignItems: "center", backgroundColor: "#fff", borderRadius: 24, padding: 20, gap: 8, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  picWord:    { fontSize: 24, fontWeight: "800", color: "#37474F" },
  bubblesGrid:{ flexDirection: "row", flexWrap: "wrap", gap: 16, justifyContent: "center" },
  bubble:     { width: BUBBLE_SZ, height: BUBBLE_SZ, borderRadius: BUBBLE_SZ / 2, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#FFCCBC", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  bubbleOk:   { backgroundColor: "#43A047", borderColor: "#2E7D32" },
  bubbleBad:  { backgroundColor: "#E53935", borderColor: "#B71C1C" },
  bubbleTxt:  { fontSize: 44, fontWeight: "900", color: "#BF360C" },

  // Feedback
  fbCorrect:   { textAlign: "center", fontSize: 24, fontWeight: "900", color: "#2E7D32" },
  fbWrongWrap: { alignItems: "center", gap: 12 },
  fbWrong:     { textAlign: "center", fontSize: 22, fontWeight: "800", color: "#C62828" },
  retryBtn:    { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 18, backgroundColor: "#BF360C" },
  retryTxt:    { fontSize: 18, fontWeight: "900", color: "#fff" },
});
