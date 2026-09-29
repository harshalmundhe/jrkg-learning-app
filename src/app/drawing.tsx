import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
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

// ── Colors ───────────────────────────────────────────────────────────────────

const COLORS_12 = [
  { name: "Red",    hex: "#F44336" },
  { name: "Orange", hex: "#FF9800" },
  { name: "Yellow", hex: "#FFEB3B" },
  { name: "Green",  hex: "#4CAF50" },
  { name: "Blue",   hex: "#2196F3" },
  { name: "Purple", hex: "#9C27B0" },
  { name: "Pink",   hex: "#E91E63" },
  { name: "Brown",  hex: "#795548" },
  { name: "Black",  hex: "#212121" },
  { name: "Gray",   hex: "#9E9E9E" },
  { name: "Cyan",   hex: "#00BCD4" },
  { name: "White",  hex: "#FFFFFF" },
];

const BRUSH_SIZES = [
  { label: "S", r: 6  },
  { label: "M", r: 12 },
  { label: "L", r: 20 },
];

// ── Topic emojis ──────────────────────────────────────────────────────────────

const TOPIC_EMOJIS: Record<string, string[]> = {
  "Animals":   ["🐘","🦁","🐯","🦊","🐸","🐬","🦒","🐮","🐷","🐰","🐻","🦋"],
  "Fruits":    ["🍎","🍊","🍋","🍇","🍓","🍌","🍉","🍑","🍍","🥭","🍒","🍐"],
  "Vehicles":  ["🚂","✈️","🚗","🚌","🚑","🚒","🚢","🚁","🛸","🚲","⛵","🏎️"],
  "Birds":     ["🦅","🦆","🦉","🐦","🦚","🦜","🦩","🦢","🐧","🐓","🦃","🕊️"],
  "Flowers":   ["🌸","🌺","🌻","🌹","🌷","🌼","💐","🌿","🍀","🌱","🎋","🌾"],
  "Space":     ["🚀","⭐","🌙","☀️","🪐","🌟","💫","🛸","🌍","☄️","🔭","🌌"],
  "Insects":   ["🦋","🐝","🐛","🐞","🦗","🪲","🐜","🪳","🦟","🦂","🕷️","🌸"],
  "Sea":       ["🐠","🐟","🐬","🦈","🦑","🐙","🦞","🦀","🐡","🐚","🌊","🐋"],
};

const DEFAULT_EMOJIS = ["🎨","🌟","⭐","🌈","🦄","🎭","🎪","🌺","🎯","🎮","🎲","🎸"];

function randomEmoji(topic: string): string {
  const list = TOPIC_EMOJIS[topic] ?? DEFAULT_EMOJIS;
  return list[Math.floor(Math.random() * list.length)];
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ColorDot = {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
};

const MAX_DOTS = 1800;

// ── Screen ────────────────────────────────────────────────────────────────────

export default function Drawing() {
  const router = useRouter();

  const [topics,       setTopics]       = useState<string[]>(["Animals"]);
  const [topic,        setTopic]        = useState("Animals");
  const [emoji,        setEmoji]        = useState("🐘");
  const [color,        setColor]        = useState(COLORS_12[4].hex);   // Blue default
  const [brushIdx,     setBrushIdx]     = useState(1);                  // Medium
  const [colorPicker,  setColorPicker]  = useState(false);

  const dots    = useRef<ColorDot[]>([]);
  const counter = useRef(0);
  const pending = useRef(false);
  const [, rerender] = useState(0);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(SETTINGS_KEY).then(raw => {
        const s: AppSettings = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
        const t = s.drawing.topics.length ? s.drawing.topics : ["Animals"];
        setTopics(t);
        const picked = t[Math.floor(Math.random() * t.length)];
        setTopic(picked);
        setEmoji(randomEmoji(picked));
        dots.current = [];
        rerender(n => n + 1);
      });
    }, [])
  );

  // ── Drawing logic ────────────────────────────────────────────────────────

  const flush = () => {
    if (!pending.current) {
      pending.current = true;
      setTimeout(() => { pending.current = false; rerender(n => n + 1); }, 16);
    }
  };

  const addDot = (x: number, y: number) => {
    const r = BRUSH_SIZES[brushIdx].r;
    const minSq = (r * 0.7) ** 2;
    const last = dots.current[dots.current.length - 1];
    if (last && last.color === color) {
      const dx = x - last.x, dy = y - last.y;
      if (dx * dx + dy * dy < minSq) return;
    }
    dots.current.push({ id: counter.current++, x, y, color, size: r * 2 });
    if (dots.current.length > MAX_DOTS) dots.current.splice(0, 150);
    flush();
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin(e => addDot(e.x, e.y))
    .onUpdate(e => addDot(e.x, e.y));

  const clearCanvas = () => { dots.current = []; rerender(n => n + 1); };

  const nextPicture = () => {
    clearCanvas();
    const picked = topics[Math.floor(Math.random() * topics.length)];
    setTopic(picked);
    setEmoji(randomEmoji(picked));
  };

  const brushR = BRUSH_SIZES[brushIdx].r;
  const selectedColorObj = COLORS_12.find(c => c.hex === color) ?? COLORS_12[4];

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🎨 Drawing</Text>
        <Text style={styles.subtitle}>{emoji}  {topic}</Text>
      </View>

      {/* Canvas */}
      <GestureHandlerRootView style={styles.canvas}>
        {/* Faded emoji guide */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.guideCenter}>
            <Text style={styles.guideEmoji}>{emoji}</Text>
            <Text style={styles.guideHint}>Trace & colour me! ✏️</Text>
          </View>
        </View>

        {/* Drawing layer */}
        <GestureDetector gesture={pan}>
          <View style={StyleSheet.absoluteFill}>
            {dots.current.map(d => (
              <View
                key={d.id}
                style={{
                  position: "absolute",
                  left: d.x - d.size / 2,
                  top: d.y - d.size / 2,
                  width: d.size,
                  height: d.size,
                  borderRadius: d.size / 2,
                  backgroundColor: d.color,
                  opacity: d.color === "#FFFFFF" ? 1 : 0.9,
                }}
              />
            ))}
          </View>
        </GestureDetector>
      </GestureHandlerRootView>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        {/* Row 1: actions + brush + color indicator */}
        <View style={styles.toolRow}>
          <TouchableOpacity style={styles.toolBtn} onPress={clearCanvas} activeOpacity={0.8}>
            <Text style={styles.toolTxt}>🗑️ Clear</Text>
          </TouchableOpacity>

          {/* Brush size */}
          <View style={styles.brushGroup}>
            {BRUSH_SIZES.map((b, i) => {
              const active = brushIdx === i;
              return (
                <TouchableOpacity key={b.label} onPress={() => setBrushIdx(i)} activeOpacity={0.8}
                  style={[styles.brushBtn, active && { backgroundColor: color, borderColor: color }]}>
                  <View style={{
                    width: b.r * 1.4, height: b.r * 1.4, borderRadius: b.r,
                    backgroundColor: active ? "#fff" : color,
                  }} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Color indicator → tap to open picker */}
          <TouchableOpacity onPress={() => setColorPicker(true)} activeOpacity={0.8}
            style={[styles.colorIndicator, { backgroundColor: color, borderColor: color === "#FFFFFF" ? "#E0E0E0" : color }]}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: ["#FFFFFF","#FFEB3B"].includes(color) ? "#333" : "#fff" }}>
              {selectedColorObj.name}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolBtn} onPress={nextPicture} activeOpacity={0.8}>
            <Text style={styles.toolTxt}>🎲 New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Color Picker Modal */}
      <Modal visible={colorPicker} transparent animationType="slide" onRequestClose={() => setColorPicker(false)}>
        <TouchableOpacity style={styles.pickerBackdrop} onPress={() => setColorPicker(false)} activeOpacity={1} />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>Pick a Colour 🎨</Text>
          <View style={styles.colorsGrid}>
            {COLORS_12.map(c => {
              const active = color === c.hex;
              return (
                <TouchableOpacity key={c.hex} onPress={() => { setColor(c.hex); setColorPicker(false); }} activeOpacity={0.8}
                  style={[styles.colorCell, { backgroundColor: c.hex, borderWidth: active ? 4 : 2, borderColor: active ? "#333" : "#E0E0E0" }]}>
                  {active && (
                    <Text style={{ fontSize: 16, fontWeight: "900", color: ["#FFFFFF","#FFEB3B"].includes(c.hex) ? "#333" : "#fff" }}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: "#FFFDE7" },
  header:   { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 2 },
  backBtn:  { alignSelf: "flex-start", paddingVertical: 4, marginBottom: 4 },
  backTxt:  { fontSize: 18, fontWeight: "700", color: "#78909C" },
  title:    { fontSize: 32, fontWeight: "900", color: "#E65100" },
  subtitle: { fontSize: 15, fontWeight: "600", color: "#F57F17" },

  canvas: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  guideCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  guideEmoji:  { fontSize: 176, opacity: 0.09 },
  guideHint:   { fontSize: 14, color: "#BDBDBD", fontWeight: "500", opacity: 0.6 },

  toolbar:    { paddingHorizontal: 12, paddingBottom: 16 },
  toolRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  toolBtn:    { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: "#FFF3E0", borderWidth: 2, borderColor: "#FFCCBC" },
  toolTxt:    { fontSize: 13, fontWeight: "800", color: "#BF360C" },

  brushGroup: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#FFF3E0", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: "#FFCCBC" },
  brushBtn:   { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#E0E0E0" },

  colorIndicator: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 16, borderWidth: 3, minWidth: 70, alignItems: "center" },

  pickerBackdrop: { flex: 1, backgroundColor: "#00000050" },
  pickerSheet:    { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 32, paddingHorizontal: 20, paddingTop: 12, gap: 20 },
  pickerHandle:   { width: 44, height: 5, borderRadius: 3, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 4 },
  pickerTitle:    { fontSize: 24, fontWeight: "900", color: "#37474F", textAlign: "center" },
  colorsGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 16, justifyContent: "center" },
  colorCell:      { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
});
