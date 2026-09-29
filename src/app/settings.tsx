import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SETTINGS_KEY = "jrkg_settings";

const ENGLISH_LETTERS = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i)
);

const HINDI_LETTERS = [
  "अ", "आ", "इ", "ई", "उ", "ऊ", "ऋ", "ए", "ऐ", "ओ", "औ",
  "क", "ख", "ग", "घ", "ङ",
  "च", "छ", "ज", "झ", "ञ",
  "ट", "ठ", "ड", "ढ", "ण",
  "त", "थ", "द", "ध", "न",
  "प", "फ", "ब", "भ", "म",
  "य", "र", "ल", "व",
  "श", "ष", "स", "ह",
];

const NUMBERS = Array.from({ length: 100 }, (_, i) => String(i + 1));

export type AppSettings = {
  english: { start: string; end: string };
  hindi: { start: string; end: string };
  maths: { start: string; end: string };
  drawing: { topics: string[] };
  craft: { topics: string[] };
  poem: { topics: string[] };
  gk: { topics: string[] };
  story: { topics: string[] };
};

export const DEFAULT_SETTINGS: AppSettings = {
  english: { start: "A", end: "Z" },
  hindi: { start: "अ", end: "ह" },
  maths: { start: "1", end: "10" },
  drawing: { topics: ["Animals", "Fruits", "Vehicles"] },
  craft: { topics: ["Origami", "Flowers", "Paper Boats"] },
  poem: { topics: ["Rain", "Nature", "Family", "Seasons"] },
  gk: { topics: ["Animals", "Birds", "Planets", "Countries"] },
  story: { topics: ["Fairy Tales", "Animals", "Adventure", "Moral Stories"] },
};

// ── Dropdown picker ───────────────────────────────────────────────────────────

function DropdownPicker({
  options,
  value,
  onChange,
  accentColor,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<FlatList>(null);
  const selectedIndex = options.indexOf(value);

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => {
      if (listRef.current && selectedIndex > 0) {
        listRef.current.scrollToIndex({
          index: selectedIndex,
          animated: false,
          viewPosition: 0.3,
        });
      }
    }, 100);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { borderColor: accentColor }]}
        onPress={handleOpen}
        activeOpacity={0.75}
      >
        <Text style={[styles.triggerValue, { color: accentColor }]}>{value}</Text>
        <Text style={[styles.chevron, { color: accentColor }]}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          activeOpacity={1}
        />
        <View style={styles.sheet}>
          <View style={[styles.sheetHandle, { backgroundColor: accentColor }]} />
          <FlatList
            ref={listRef}
            data={options}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={() => {}}
            renderItem={({ item }) => {
              const selected = item === value;
              return (
                <TouchableOpacity
                  style={[styles.option, selected && { backgroundColor: accentColor + "22" }]}
                  onPress={() => { onChange(item); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected && { color: accentColor, fontWeight: "800" },
                    ]}
                  >
                    {item}
                  </Text>
                  {selected && (
                    <Text style={{ color: accentColor, fontSize: 18 }}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

// ── Range section card (English / Hindi / Maths) ──────────────────────────────

function RangeCard({
  emoji,
  title,
  accentColor,
  bgColor,
  options,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
}: {
  emoji: string;
  title: string;
  accentColor: string;
  bgColor: string;
  options: string[];
  startValue: string;
  endValue: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: bgColor, borderLeftColor: accentColor }]}>
      <Text style={[styles.sectionTitle, { color: accentColor }]}>
        {emoji}  {title}
      </Text>
      <View style={styles.pickerRow}>
        <View style={styles.pickerGroup}>
          <Text style={styles.pickerLabel}>Start</Text>
          <DropdownPicker
            options={options}
            value={startValue}
            onChange={onStartChange}
            accentColor={accentColor}
          />
        </View>
        <View style={styles.pickerDivider} />
        <View style={styles.pickerGroup}>
          <Text style={styles.pickerLabel}>End</Text>
          <DropdownPicker
            options={options}
            value={endValue}
            onChange={onEndChange}
            accentColor={accentColor}
          />
        </View>
      </View>
    </View>
  );
}

// ── Topics section card (Drawing / Craft) ─────────────────────────────────────

function TopicsCard({
  emoji,
  title,
  accentColor,
  bgColor,
  topics,
  onTopicsChange,
}: {
  emoji: string;
  title: string;
  accentColor: string;
  bgColor: string;
  topics: string[];
  onTopicsChange: (topics: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addTopic = () => {
    const trimmed = input.trim();
    if (!trimmed || topics.map((t) => t.toLowerCase()).includes(trimmed.toLowerCase())) return;
    onTopicsChange([...topics, trimmed]);
    setInput("");
  };

  const removeTopic = (topic: string) => {
    onTopicsChange(topics.filter((t) => t !== topic));
  };

  return (
    <View style={[styles.sectionCard, { backgroundColor: bgColor, borderLeftColor: accentColor }]}>
      <Text style={[styles.sectionTitle, { color: accentColor }]}>
        {emoji}  {title}
      </Text>

      {/* Input + Add button */}
      <View style={styles.topicInputRow}>
        <TextInput
          style={[styles.topicInput, { borderColor: accentColor }]}
          placeholder="Type a topic..."
          placeholderTextColor="#BDBDBD"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={addTopic}
          returnKeyType="done"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: accentColor }]}
          onPress={addTopic}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Topic chips */}
      {topics.length > 0 ? (
        <View style={styles.chipsWrap}>
          {topics.map((topic) => (
            <View
              key={topic}
              style={[
                styles.chip,
                { backgroundColor: accentColor + "18", borderColor: accentColor + "55" },
              ]}
            >
              <Text style={[styles.chipText, { color: accentColor }]}>{topic}</Text>
              <TouchableOpacity
                onPress={() => removeTopic(topic)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.chipRemove, { color: accentColor }]}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyHint}>No topics added yet. Add some above!</Text>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function Settings() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (raw) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
        } catch {}
      }
    });
  }, []);

  const updateRange = (
    subject: "english" | "hindi" | "maths",
    field: "start" | "end",
    value: string
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [subject]: { ...prev[subject], [field]: value } };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updateTopics = (subject: "drawing" | "craft" | "poem" | "gk" | "story", topics: string[]) => {
    setSettings((prev) => {
      const next = { ...prev, [subject]: { topics } };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>⚙️ Settings</Text>
          <Text style={styles.pageSubtitle}>Configure learning ranges for your child</Text>
        </View>

        {/* English */}
        <RangeCard
          emoji="📖"
          title="English"
          accentColor="#1565C0"
          bgColor="#E3F2FD"
          options={ENGLISH_LETTERS}
          startValue={settings.english.start}
          endValue={settings.english.end}
          onStartChange={(v) => updateRange("english", "start", v)}
          onEndChange={(v) => updateRange("english", "end", v)}
        />

        {/* Hindi */}
        <RangeCard
          emoji="🕉️"
          title="Hindi"
          accentColor="#BF360C"
          bgColor="#FFF3E0"
          options={HINDI_LETTERS}
          startValue={settings.hindi.start}
          endValue={settings.hindi.end}
          onStartChange={(v) => updateRange("hindi", "start", v)}
          onEndChange={(v) => updateRange("hindi", "end", v)}
        />

        {/* Maths */}
        <RangeCard
          emoji="🔢"
          title="Maths"
          accentColor="#6A1B9A"
          bgColor="#F3E5F5"
          options={NUMBERS}
          startValue={settings.maths.start}
          endValue={settings.maths.end}
          onStartChange={(v) => updateRange("maths", "start", v)}
          onEndChange={(v) => updateRange("maths", "end", v)}
        />

        {/* Drawing */}
        <TopicsCard
          emoji="🎨"
          title="Drawing"
          accentColor="#880E4F"
          bgColor="#FCE4EC"
          topics={settings.drawing.topics}
          onTopicsChange={(topics) => updateTopics("drawing", topics)}
        />

        {/* Craft */}
        <TopicsCard
          emoji="✂️"
          title="Craft"
          accentColor="#1B5E20"
          bgColor="#E8F5E9"
          topics={settings.craft.topics}
          onTopicsChange={(topics) => updateTopics("craft", topics)}
        />

        {/* Poem */}
        <TopicsCard
          emoji="📜"
          title="Poem"
          accentColor="#F57F17"
          bgColor="#FFF8E1"
          topics={settings.poem.topics}
          onTopicsChange={(topics) => updateTopics("poem", topics)}
        />

        {/* GK */}
        <TopicsCard
          emoji="🌍"
          title="GK"
          accentColor="#00695C"
          bgColor="#E0F7FA"
          topics={settings.gk.topics}
          onTopicsChange={(topics) => updateTopics("gk", topics)}
        />

        {/* Story */}
        <TopicsCard
          emoji="📚"
          title="Story"
          accentColor="#558B2F"
          bgColor="#F9FBE7"
          topics={settings.story.topics}
          onTopicsChange={(topics) => updateTopics("story", topics)}
        />

        {/* Save */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>💾  Save Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFF9C4",
  },
  scroll: {
    padding: 20,
    gap: 20,
    paddingBottom: 48,
  },
  header: {
    gap: 4,
    marginBottom: 4,
  },
  backBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    marginBottom: 8,
  },
  backText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#78909C",
  },
  pageTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "#37474F",
  },
  pageSubtitle: {
    fontSize: 15,
    color: "#90A4AE",
    fontWeight: "500",
  },

  // Section card
  sectionCard: {
    borderRadius: 20,
    borderLeftWidth: 6,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
  },

  // Range pickers
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pickerGroup: {
    flex: 1,
    gap: 8,
  },
  pickerDivider: {
    width: 1,
    height: 48,
    backgroundColor: "#CFD8DC",
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#90A4AE",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Trigger
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  triggerValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  chevron: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Modal sheet
  backdrop: {
    flex: 1,
    backgroundColor: "#00000040",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "55%",
    paddingBottom: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ECEFF1",
  },
  optionText: {
    fontSize: 20,
    color: "#37474F",
    fontWeight: "500",
  },

  // Topics input
  topicInputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  topicInput: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 14,
    fontSize: 17,
    color: "#212121",
    backgroundColor: "#fff",
  },
  addBtn: {
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },

  // Chips
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 50,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 15,
    fontWeight: "700",
  },
  chipRemove: {
    fontSize: 13,
    fontWeight: "800",
  },
  emptyHint: {
    fontSize: 14,
    color: "#BDBDBD",
    fontStyle: "italic",
  },

  // Save
  saveBtn: {
    height: 68,
    borderRadius: 22,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#2E7D32",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  saveBtnText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
  },
});
