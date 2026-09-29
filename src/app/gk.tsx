import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { InstructionBanner } from "../components/InstructionBanner";
import { TabGrid, type TabDef } from "../components/TabGrid";
import { useSoundFeedback } from "../hooks/useSoundFeedback";

const { width } = Dimensions.get("window");

// ─── Data ─────────────────────────────────────────────────────────────────────

const BIRDS = [
  { emoji: "🦅", name: "Eagle" }, { emoji: "🦜", name: "Parrot" },
  { emoji: "🦚", name: "Peacock" }, { emoji: "🦢", name: "Swan" },
  { emoji: "🦆", name: "Duck" }, { emoji: "🦉", name: "Owl" },
  { emoji: "🐧", name: "Penguin" }, { emoji: "🦩", name: "Flamingo" },
  { emoji: "🦃", name: "Turkey" }, { emoji: "🕊️", name: "Dove" },
];

const NON_BIRDS = [
  { emoji: "🐶", name: "Dog" }, { emoji: "🐱", name: "Cat" },
  { emoji: "🐟", name: "Fish" }, { emoji: "🐘", name: "Elephant" },
  { emoji: "🦁", name: "Lion" }, { emoji: "🐸", name: "Frog" },
  { emoji: "🦊", name: "Fox" }, { emoji: "🐻", name: "Bear" },
  { emoji: "🐬", name: "Dolphin" }, { emoji: "🐒", name: "Monkey" },
];

const LIVING_THINGS = [
  { emoji: "🌸", name: "Flower", isLiving: true },
  { emoji: "🐶", name: "Dog", isLiving: true },
  { emoji: "🌳", name: "Tree", isLiving: true },
  { emoji: "🐟", name: "Fish", isLiving: true },
  { emoji: "🌵", name: "Cactus", isLiving: true },
  { emoji: "🐝", name: "Bee", isLiving: true },
  { emoji: "🌱", name: "Plant", isLiving: true },
  { emoji: "🦋", name: "Butterfly", isLiving: true },
  { emoji: "🐸", name: "Frog", isLiving: true },
  { emoji: "🌾", name: "Grass", isLiving: true },
  { emoji: "🪑", name: "Chair", isLiving: false },
  { emoji: "🚗", name: "Car", isLiving: false },
  { emoji: "📱", name: "Phone", isLiving: false },
  { emoji: "✏️", name: "Pencil", isLiving: false },
  { emoji: "🏠", name: "House", isLiving: false },
  { emoji: "⌚", name: "Watch", isLiving: false },
  { emoji: "📚", name: "Book", isLiving: false },
  { emoji: "🎒", name: "Bag", isLiving: false },
  { emoji: "🔑", name: "Key", isLiving: false },
  { emoji: "🪣", name: "Bucket", isLiving: false },
];

const ANIMAL_PRODUCTS = [
  { animal: { emoji: "🐄", name: "Cow" },  product: { emoji: "🥛", name: "Milk" } },
  { animal: { emoji: "🐝", name: "Bee" },  product: { emoji: "🍯", name: "Honey" } },
  { animal: { emoji: "🐔", name: "Hen" },  product: { emoji: "🥚", name: "Egg" } },
  { animal: { emoji: "🐑", name: "Sheep" }, product: { emoji: "🧶", name: "Wool" } },
];

const FRUITS = [
  { emoji: "🍎", name: "Apple", letter: "A" },
  { emoji: "🍌", name: "Banana", letter: "B" },
  { emoji: "🍊", name: "Orange", letter: "O" },
  { emoji: "🍇", name: "Grapes", letter: "G" },
  { emoji: "🍓", name: "Strawberry", letter: "S" },
  { emoji: "🍑", name: "Peach", letter: "P" },
  { emoji: "🍋", name: "Lemon", letter: "L" },
  { emoji: "🥭", name: "Mango", letter: "M" },
  { emoji: "🍍", name: "Pineapple", letter: "P" },
  { emoji: "🥝", name: "Kiwi", letter: "K" },
  { emoji: "🍒", name: "Cherry", letter: "C" },
  { emoji: "🍉", name: "Watermelon", letter: "W" },
  { emoji: "🫐", name: "Blueberry", letter: "B" },
];

const EVERYDAY_POOL = [
  { emoji: "🪥", name: "Toothbrush", isEveryday: true },
  { emoji: "🧼", name: "Soap", isEveryday: true },
  { emoji: "🎒", name: "School Bag", isEveryday: true },
  { emoji: "✏️", name: "Pencil", isEveryday: true },
  { emoji: "🥄", name: "Spoon", isEveryday: true },
  { emoji: "🍽️", name: "Plate", isEveryday: true },
  { emoji: "🚿", name: "Shower", isEveryday: true },
  { emoji: "📚", name: "Book", isEveryday: true },
];
const NOT_EVERYDAY_POOL = [
  { emoji: "🚀", name: "Rocket", isEveryday: false },
  { emoji: "👑", name: "Crown", isEveryday: false },
  { emoji: "🎭", name: "Mask", isEveryday: false },
  { emoji: "🛸", name: "UFO", isEveryday: false },
  { emoji: "🏆", name: "Trophy", isEveryday: false },
  { emoji: "🗿", name: "Statue", isEveryday: false },
  { emoji: "🎪", name: "Circus", isEveryday: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// ─── Tab definitions ───────────────────────────────────────────────────────────

const ACCENT = "#00695C";
const BG     = "#E0F7FA";

const TABS: readonly TabDef[] = [
  { mode: "birds",   emoji: "🐦", label: "Birds",   color: "#43A047" },
  { mode: "living",  emoji: "🌱", label: "Living",  color: "#1E88E5" },
  { mode: "match",   emoji: "🤝", label: "Match",   color: "#FB8C00" },
  { mode: "fruit",   emoji: "🍎", label: "Fruit",   color: "#E53935" },
  { mode: "daily",   emoji: "🏠", label: "Daily",   color: "#8E24AA" },
];

const INSTRUCTIONS: Record<string, string> = {
  birds:  "Dekho in sab janwaron ko! Sirf BIRDS ko tap karo, phir CHECK karo! 🐦 Chalo, try karo!",
  living: "Bolo — kya yeh cheez ZINDA hai? Agar haan, tap karo LIVING! Agar nahi, tap karo NOT LIVING! 🌱",
  match:  "Pehle LEFT mein janwar tap karo, phir RIGHT mein uski cheez tap karo! Saare 4 match karo! 🤝",
  fruit:  "Yeh kaun sa fruit hai? Iska PEHLA LETTER tap karo! 🍎 Socho socho!",
  daily:  "Kin cheezon ka hum roz istemaal karte hain? Unhe tap karo, phir CHECK karo! 🏠",
};

// ─── Activity: Birds ──────────────────────────────────────────────────────────

function BirdsMode() {
  const { playCorrect, playWrong } = useSoundFeedback();
  const makePuzzle = () => shuffle([...pick(BIRDS, 2), ...pick(NON_BIRDS, 2)]);
  const [pool,     setPool]     = useState(makePuzzle);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checked,  setChecked]  = useState(false);
  const [streak,   setStreak]   = useState(0);

  const birdNames = new Set(BIRDS.map(b => b.name));

  const toggle = (name: string) => {
    if (checked) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const check = () => {
    setChecked(true);
    const correctBirds = pool.filter(p => birdNames.has(p.name)).map(p => p.name);
    const allCorrect =
      correctBirds.length === selected.size &&
      correctBirds.every(n => selected.has(n));
    if (allCorrect) { playCorrect(); setStreak(s => s + 1); }
    else            { playWrong();  setStreak(0); }
    setTimeout(next, 1400);
  };

  const next = () => {
    setPool(makePuzzle());
    setSelected(new Set());
    setChecked(false);
  };

  const birdInPool = pool.filter(p => birdNames.has(p.name)).map(p => p.name);

  return (
    <ScrollView contentContainerStyle={styles.activityWrap} showsVerticalScrollIndicator={false}>
      <StreakBadge streak={streak} color={TABS[0].color} />
      <Text style={[styles.questionTxt, { color: TABS[0].color }]}>
        Tap all the BIRDS! 🐦
      </Text>
      <View style={styles.grid2x2}>
        {pool.map(item => {
          const isSelected = selected.has(item.name);
          const isBird = birdNames.has(item.name);
          let borderColor = isSelected ? TABS[0].color : "#E0E0E0";
          let bg = isSelected ? "#E8F5E9" : "#fff";
          if (checked) {
            if (isBird)  { borderColor = "#43A047"; bg = "#E8F5E9"; }
            else if (isSelected) { borderColor = "#E53935"; bg = "#FFEBEE"; }
          }
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.animalCard, { borderColor, backgroundColor: bg }]}
              onPress={() => toggle(item.name)}
              activeOpacity={0.8}
            >
              <Text style={styles.animalEmoji}>{item.emoji}</Text>
              <Text style={styles.animalName}>{item.name}</Text>
              {checked && isBird && <Text style={styles.tick}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        style={[styles.checkBtn, { backgroundColor: checked ? "#9E9E9E" : TABS[0].color }]}
        onPress={check}
        disabled={checked || selected.size === 0}
        activeOpacity={0.85}
      >
        <Text style={styles.checkBtnTxt}>{checked ? "Next! →" : "✓  Check!"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Activity: Living / Non-living ────────────────────────────────────────────

function LivingMode() {
  const { playCorrect, playWrong } = useSoundFeedback();
  const shuffled = shuffle(LIVING_THINGS);
  const [pool]   = useState(shuffled);
  const [idx,    setIdx]    = useState(0);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [streak, setStreak] = useState(0);
  const scale = useSharedValue(1);

  const item = pool[idx % pool.length];

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const answer = (isLiving: boolean) => {
    if (result) return;
    const correct = isLiving === item.isLiving;
    scale.value = withSequence(withSpring(1.15, { damping: 5 }), withSpring(1));
    if (correct) { playCorrect(); setStreak(s => s + 1); setResult("correct"); }
    else         { playWrong();  setStreak(0);           setResult("wrong"); }
    setTimeout(() => { setIdx(i => i + 1); setResult(null); }, 1000);
  };

  const bg = result === "correct" ? "#E8F5E9" : result === "wrong" ? "#FFEBEE" : "#fff";

  return (
    <ScrollView contentContainerStyle={styles.activityWrap} showsVerticalScrollIndicator={false}>
      <StreakBadge streak={streak} color={TABS[1].color} />
      <Text style={[styles.questionTxt, { color: TABS[1].color }]}>
        Is it LIVING or NOT LIVING?
      </Text>
      <Animated.View style={[styles.bigCard, { backgroundColor: bg }, animStyle]}>
        <Text style={styles.bigEmoji}>{item.emoji}</Text>
        <Text style={styles.bigName}>{item.name}</Text>
        {result && (
          <Text style={{ fontSize: 28 }}>
            {result === "correct" ? "✅ Correct!" : "❌ Try again!"}
          </Text>
        )}
      </Animated.View>
      <View style={styles.row2}>
        <TouchableOpacity
          style={[styles.choiceBtn, { backgroundColor: "#43A047" }]}
          onPress={() => answer(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.choiceBtnEmoji}>🌱</Text>
          <Text style={styles.choiceBtnTxt}>LIVING</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.choiceBtn, { backgroundColor: "#78909C" }]}
          onPress={() => answer(false)}
          activeOpacity={0.85}
        >
          <Text style={styles.choiceBtnEmoji}>🧊</Text>
          <Text style={styles.choiceBtnTxt}>NOT LIVING</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Activity: Animal-Product Match ───────────────────────────────────────────

type MatchItem = { emoji: string; name: string };
type MatchPair = { animal: MatchItem; product: MatchItem };

function MatchMode() {
  const { playCorrect, playWrong } = useSoundFeedback();
  const makeRound = (): { pairs: MatchPair[]; products: MatchItem[] } => ({
    pairs: ANIMAL_PRODUCTS,
    products: shuffle(ANIMAL_PRODUCTS.map(p => p.product)),
  });

  const [{ pairs, products }, setRound] = useState(makeRound);
  const [matched,  setMatched]  = useState<Set<string>>(new Set());
  const [selLeft,  setSelLeft]  = useState<string | null>(null);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [streak,   setStreak]   = useState(0);

  const allDone = matched.size === pairs.length;

  const tapAnimal = (name: string) => {
    if (matched.has(name)) return;
    setSelLeft(name);
  };

  const tapProduct = (productName: string) => {
    if (!selLeft) return;
    const pair = pairs.find(p => p.animal.name === selLeft);
    if (pair?.product.name === productName) {
      playCorrect();
      setMatched(prev => new Set([...prev, selLeft]));
      setSelLeft(null);
      setStreak(s => s + 1);
    } else {
      playWrong();
      setWrongKey(`${selLeft}-${productName}`);
      setTimeout(() => { setWrongKey(null); setSelLeft(null); }, 700);
    }
  };

  const nextRound = () => {
    setRound(makeRound());
    setMatched(new Set());
    setSelLeft(null);
  };

  if (allDone) {
    return (
      <View style={[styles.activityWrap, styles.center]}>
        <Text style={{ fontSize: 72 }}>🎉</Text>
        <Text style={[styles.questionTxt, { color: TABS[2].color }]}>
          All matched! Amazing!
        </Text>
        <StreakBadge streak={streak} color={TABS[2].color} />
        <TouchableOpacity
          style={[styles.checkBtn, { backgroundColor: TABS[2].color }]}
          onPress={nextRound}
          activeOpacity={0.85}
        >
          <Text style={styles.checkBtnTxt}>Play Again 🔄</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.activityWrap} showsVerticalScrollIndicator={false}>
      <StreakBadge streak={streak} color={TABS[2].color} />
      <Text style={[styles.questionTxt, { color: TABS[2].color }]}>
        {selLeft ? `Now tap what ${selLeft} gives us!` : "Tap an animal to start!"}
      </Text>
      <View style={styles.matchGrid}>
        {/* Animals column */}
        <View style={styles.matchCol}>
          <Text style={styles.matchColLabel}>Animals</Text>
          {pairs.map(({ animal }) => {
            const isMatched  = matched.has(animal.name);
            const isSelected = selLeft === animal.name;
            return (
              <TouchableOpacity
                key={animal.name}
                style={[
                  styles.matchCard,
                  { backgroundColor: isMatched ? "#E8F5E9" : isSelected ? "#FFF3E0" : "#fff" },
                  { borderColor: isMatched ? "#43A047" : isSelected ? TABS[2].color : "#E0E0E0" },
                  isMatched && { opacity: 0.6 },
                ]}
                onPress={() => !isMatched && tapAnimal(animal.name)}
                activeOpacity={0.8}
              >
                <Text style={styles.matchEmoji}>{animal.emoji}</Text>
                <Text style={styles.matchName}>{animal.name}</Text>
                {isMatched && <Text style={styles.matchTick}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Products column */}
        <View style={styles.matchCol}>
          <Text style={styles.matchColLabel}>Gives Us</Text>
          {products.map((product) => {
            const pairForProduct = pairs.find(p => p.product.name === product.name);
            const isMatched = pairForProduct ? matched.has(pairForProduct.animal.name) : false;
            const isWrong   = wrongKey?.endsWith(product.name) ?? false;
            return (
              <TouchableOpacity
                key={product.name}
                style={[
                  styles.matchCard,
                  { backgroundColor: isMatched ? "#E8F5E9" : isWrong ? "#FFEBEE" : "#fff" },
                  { borderColor: isMatched ? "#43A047" : isWrong ? "#E53935" : "#E0E0E0" },
                  isMatched && { opacity: 0.6 },
                ]}
                onPress={() => !isMatched && tapProduct(product.name)}
                activeOpacity={0.8}
              >
                <Text style={styles.matchEmoji}>{product.emoji}</Text>
                <Text style={styles.matchName}>{product.name}</Text>
                {isMatched && <Text style={styles.matchTick}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Activity: Fruit First Letter ─────────────────────────────────────────────

function FruitMode() {
  const { playCorrect, playWrong } = useSoundFeedback();
  const shuffled = shuffle(FRUITS);
  const [pool]   = useState(shuffled);
  const [idx,    setIdx]     = useState(0);
  const [picked, setPicked]  = useState<string | null>(null);
  const [streak, setStreak]  = useState(0);

  const fruit   = pool[idx % pool.length];
  const correct = fruit.letter;

  const initOptions = () => {
    const wrong = shuffle(ALPHABET.filter(l => l !== correct)).slice(0, 2);
    return shuffle([correct, ...wrong]);
  };
  const [options, setOptions] = useState(initOptions);

  const choose = (letter: string) => {
    if (picked) return;
    setPicked(letter);
    if (letter === correct) { playCorrect(); setStreak(s => s + 1); }
    else                    { playWrong();  setStreak(0); }
    setTimeout(() => {
      const newIdx    = idx + 1;
      const nextFruit = pool[newIdx % pool.length];
      const nextLetter = nextFruit.letter;
      const wrong     = shuffle(ALPHABET.filter(l => l !== nextLetter)).slice(0, 2);
      setIdx(newIdx);
      setPicked(null);
      setOptions(shuffle([nextLetter, ...wrong]));
    }, 1000);
  };

  return (
    <ScrollView contentContainerStyle={styles.activityWrap} showsVerticalScrollIndicator={false}>
      <StreakBadge streak={streak} color={TABS[3].color} />
      <Text style={[styles.questionTxt, { color: TABS[3].color }]}>
        What letter does it start with?
      </Text>
      <View style={styles.bigCard}>
        <Text style={styles.fruitEmoji}>{fruit.emoji}</Text>
        <Text style={[styles.fruitName, { color: TABS[3].color }]}>{fruit.name}</Text>
      </View>
      <View style={styles.letterRow}>
        {options.map(letter => {
          let bg   = TABS[3].color;
          let border = "transparent";
          if (picked === letter) {
            bg     = letter === correct ? "#43A047" : "#E53935";
            border = bg;
          } else if (picked && letter === correct) {
            bg = "#43A047";
          }
          return (
            <TouchableOpacity
              key={letter}
              style={[styles.letterBtn, { backgroundColor: bg, borderColor: border }]}
              onPress={() => choose(letter)}
              activeOpacity={0.85}
            >
              <Text style={styles.letterBtnTxt}>{letter}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Activity: Things We Use Every Day ────────────────────────────────────────

function DailyMode() {
  const { playCorrect, playWrong } = useSoundFeedback();
  const makePuzzle = () => shuffle([...pick(EVERYDAY_POOL, 3), ...pick(NOT_EVERYDAY_POOL, 3)]);
  const [pool,     setPool]     = useState(makePuzzle);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checked,  setChecked]  = useState(false);
  const [streak,   setStreak]   = useState(0);

  const everydayNames = new Set(EVERYDAY_POOL.map(i => i.name));

  const toggle = (name: string) => {
    if (checked) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const check = () => {
    setChecked(true);
    const correctSet = new Set(pool.filter(i => i.isEveryday).map(i => i.name));
    const allCorrect =
      correctSet.size === selected.size &&
      [...correctSet].every(n => selected.has(n));
    if (allCorrect) { playCorrect(); setStreak(s => s + 1); }
    else            { playWrong();  setStreak(0); }
    setTimeout(next, 1500);
  };

  const next = () => {
    setPool(makePuzzle());
    setSelected(new Set());
    setChecked(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.activityWrap} showsVerticalScrollIndicator={false}>
      <StreakBadge streak={streak} color={TABS[4].color} />
      <Text style={[styles.questionTxt, { color: TABS[4].color }]}>
        Tap things we use EVERY DAY! 🏠
      </Text>
      <View style={styles.grid3x2}>
        {pool.map(item => {
          const isSelected = selected.has(item.name);
          const isCorrect  = item.isEveryday;
          let bg     = isSelected ? "#EDE7F6" : "#fff";
          let border = isSelected ? TABS[4].color : "#E0E0E0";
          if (checked) {
            if (isCorrect)   { bg = "#E8F5E9"; border = "#43A047"; }
            else if (isSelected) { bg = "#FFEBEE"; border = "#E53935"; }
          }
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.dailyCard, { backgroundColor: bg, borderColor: border }]}
              onPress={() => toggle(item.name)}
              activeOpacity={0.8}
            >
              <Text style={styles.dailyEmoji}>{item.emoji}</Text>
              <Text style={styles.dailyName}>{item.name}</Text>
              {checked && isCorrect && <Text style={styles.tick}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        style={[styles.checkBtn, { backgroundColor: checked ? "#9E9E9E" : TABS[4].color }]}
        onPress={check}
        disabled={checked || selected.size === 0}
        activeOpacity={0.85}
      >
        <Text style={styles.checkBtnTxt}>{checked ? "Next! →" : "✓  Check!"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Shared: Streak Badge ─────────────────────────────────────────────────────

function StreakBadge({ streak, color }: { streak: number; color: string }) {
  return (
    <View style={[styles.streakBadge, { backgroundColor: color + "22", borderColor: color }]}>
      <Text style={[styles.streakTxt, { color }]}>
        🔥 Streak: {streak}
      </Text>
    </View>
  );
}

// ─── Main GK Screen ───────────────────────────────────────────────────────────

export default function GK() {
  const router = useRouter();
  const [mode,       setMode]       = useState<string>("birds");
  const [showBanner, setShowBanner] = useState(true);

  const tab = TABS.find(t => t.mode === mode) ?? TABS[0];

  const handleTabChange = (m: string) => {
    setMode(m);
    setShowBanner(true);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG }]}>
      {/* Header */}
      <LinearGradient
        colors={[tab.color, tab.color + "CC"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🌍  General Knowledge</Text>
        <TouchableOpacity onPress={() => setShowBanner(true)} style={styles.infoBtn}>
          <Text style={styles.infoTxt}>ℹ️</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Tab row */}
      <TabGrid tabs={TABS} active={mode} onSelect={handleTabChange} />

      {/* Activity */}
      <Animated.View key={mode} entering={FadeIn.duration(300)} style={{ flex: 1 }}>
        {mode === "birds"  && <BirdsMode />}
        {mode === "living" && <LivingMode />}
        {mode === "match"  && <MatchMode />}
        {mode === "fruit"  && <FruitMode />}
        {mode === "daily"  && <DailyMode />}
      </Animated.View>

      {/* Instruction overlay */}
      {showBanner && (
        <InstructionBanner
          text={INSTRUCTIONS[mode]}
          color={tab.color}
          onDismiss={() => setShowBanner(false)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ITEM_W = (width - 32 - 12) / 2;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  backBtn: { padding: 4 },
  backTxt: { fontSize: 32, color: "#fff", fontFamily: "Nunito_900Black", lineHeight: 36 },
  infoBtn: { marginLeft: "auto" as any, padding: 4 },
  infoTxt: { fontSize: 22 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: "Nunito_800ExtraBold",
    color: "#fff",
    textAlign: "center",
  },

  activityWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 18,
    alignItems: "center",
  },

  questionTxt: {
    fontSize: 20,
    fontFamily: "Nunito_800ExtraBold",
    textAlign: "center",
  },

  streakBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  streakTxt: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
  },

  // 2×2 grid for birds
  grid2x2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  animalCard: {
    width: ITEM_W,
    height: ITEM_W,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  animalEmoji: { fontSize: 52 },
  animalName:  { fontSize: 14, fontFamily: "Nunito_700Bold", color: "#37474F" },
  tick:        { position: "absolute", top: 8, right: 10, fontSize: 18, color: "#43A047" },

  checkBtn: {
    width: "100%",
    height: 60,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  checkBtnTxt: { fontSize: 22, fontFamily: "Nunito_900Black", color: "#fff" },

  // Living mode
  bigCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  bigEmoji: { fontSize: 80 },
  bigName:  { fontSize: 26, fontFamily: "Nunito_900Black", color: "#37474F" },

  row2: {
    flexDirection: "row",
    gap: 14,
    width: "100%",
  },
  choiceBtn: {
    flex: 1,
    height: 90,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  choiceBtnEmoji: { fontSize: 32 },
  choiceBtnTxt:   { fontSize: 16, fontFamily: "Nunito_900Black", color: "#fff" },

  // Match mode
  matchGrid: { flexDirection: "row", gap: 12, width: "100%" },
  matchCol:  { flex: 1, gap: 10 },
  matchColLabel: {
    fontSize: 14,
    fontFamily: "Nunito_800ExtraBold",
    color: "#90A4AE",
    textAlign: "center",
    marginBottom: 2,
  },
  matchCard: {
    borderRadius: 20,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  matchEmoji: { fontSize: 36 },
  matchName:  { fontSize: 13, fontFamily: "Nunito_700Bold", color: "#37474F" },
  matchTick:  { fontSize: 16, color: "#43A047" },

  // Fruit mode
  fruitEmoji: { fontSize: 90 },
  fruitName:  { fontSize: 24, fontFamily: "Nunito_900Black" },

  letterRow: { flexDirection: "row", gap: 14 },
  letterBtn: {
    width: 86,
    height: 86,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  letterBtnTxt: { fontSize: 40, fontFamily: "Nunito_900Black", color: "#fff" },

  // Daily mode - 3×2 grid
  grid3x2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  dailyCard: {
    width: ITEM_W,
    height: 110,
    borderRadius: 22,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  dailyEmoji: { fontSize: 40 },
  dailyName:  { fontSize: 12, fontFamily: "Nunito_700Bold", color: "#37474F", textAlign: "center" },
});
