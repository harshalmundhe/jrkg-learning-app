import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const { width } = Dimensions.get("window");
const H_PAD = 16; // padding each side
const GAP   = 10;

export type TabDef = {
  mode:  string;
  emoji: string;
  label: string;
  color: string;
};

type Props = {
  tabs:     readonly TabDef[];
  active:   string;
  onSelect: (mode: string) => void;
};

export function TabGrid({ tabs, active, onSelect }: Props) {
  // Adaptive columns: 4 tabs → 2 col, 6 tabs → 3 col, 8+ tabs → 4 col
  const cols      = tabs.length <= 4 ? 2 : tabs.length <= 6 ? 3 : 4;
  const cardW     = (width - H_PAD * 2 - GAP * (cols - 1)) / cols;
  const cardH     = cols === 2 ? 86 : cols === 3 ? 80 : 72;
  const emojiSz   = cols === 2 ? 36 : cols === 3 ? 30 : 26;
  const labelSz   = cols <= 3  ? 12 : 10;

  return (
    <View style={styles.grid}>
      {tabs.map(tab => {
        const active_ = tab.mode === active;
        return (
          <TouchableOpacity
            key={tab.mode}
            onPress={() => onSelect(tab.mode)}
            activeOpacity={0.8}
            style={[
              styles.card,
              {
                width:           cardW,
                height:          cardH,
                backgroundColor: active_ ? "#fff" : tab.color,
                borderWidth:     active_ ? 3     : 0,
                borderColor:     active_ ? tab.color : "transparent",
              },
              active_ && styles.cardActive,
            ]}
          >
            <Text style={{ fontSize: active_ ? emojiSz + 4 : emojiSz, lineHeight: emojiSz + 8 }}>
              {tab.emoji}
            </Text>
            <Text
              style={[
                styles.label,
                { fontSize: labelSz, color: active_ ? tab.color : "#fff" },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {active_ && (
              <View style={[styles.activeDot, { backgroundColor: tab.color }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection:  "row",
    flexWrap:       "wrap",
    paddingHorizontal: H_PAD,
    gap:            GAP,
    paddingBottom:  12,
  },
  card: {
    borderRadius: 20,
    alignItems:   "center",
    justifyContent: "center",
    gap:          4,
    shadowColor:  "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation:    4,
  },
  cardActive: {
    shadowOpacity: 0.18,
    shadowRadius:  10,
    elevation:     6,
  },
  label: {
    fontWeight:    "900",
    letterSpacing: 0.2,
  },
  activeDot: {
    position:     "absolute",
    bottom:       7,
    width:        6,
    height:       6,
    borderRadius: 3,
  },
});
