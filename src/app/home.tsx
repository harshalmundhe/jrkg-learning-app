import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const STORAGE_KEY = "jrkg_user_profile";

const { width } = Dimensions.get("window");
const COLS = 3;
const GRID_GAP = 12;
const H_PAD = 16;
const CARD_SIZE = Math.floor((width - H_PAD * 2 - GRID_GAP * (COLS - 1)) / COLS);

const SUBJECTS = [
  { label: "English", emoji: "📖", bg: "#E3F2FD", accent: "#1565C0" },
  { label: "Hindi", emoji: "🕉️", bg: "#FFF3E0", accent: "#BF360C" },
  { label: "Maths", emoji: "🔢", bg: "#F3E5F5", accent: "#6A1B9A" },
  { label: "Drawing", emoji: "🎨", bg: "#FCE4EC", accent: "#880E4F" },
  { label: "Craft", emoji: "✂️", bg: "#E8F5E9", accent: "#1B5E20" },
  { label: "Poem", emoji: "📜", bg: "#FFF8E1", accent: "#F57F17" },
  { label: "GK", emoji: "🌍", bg: "#E0F7FA", accent: "#00695C" },
  { label: "Story", emoji: "📚", bg: "#F9FBE7", accent: "#558B2F" },
  { label: "Settings", emoji: "⚙️", bg: "#ECEFF1", accent: "#37474F" },
];

type Profile = { name: string; age: number; gender: string };

function SubjectCard({
  subject,
  index,
  onPress,
}: {
  subject: (typeof SUBJECTS)[0];
  index: number;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.92, { damping: 8 }, () => {
      scale.value = withSpring(1);
    });
    onPress();
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <Animated.View style={animStyle}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={1}
          style={[styles.card, { backgroundColor: subject.bg, width: CARD_SIZE, height: CARD_SIZE + 8 }]}
        >
          <Text style={styles.cardEmoji}>{subject.emoji}</Text>
          <Text style={[styles.cardLabel, { color: subject.accent }]}>{subject.label}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setProfile(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const handleSubject = (label: string) => {
    if (label === "Settings") router.push("/settings" as any);
    else if (label === "English") router.push("/english" as any);
    else if (label === "Maths")   router.push("/maths"   as any);
    else if (label === "Hindi")   router.push("/hindi"   as any);
    else if (label === "Drawing") router.push("/drawing" as any);
    else if (label === "Craft")   router.push("/craft"   as any);
    else if (label === "Poem")    router.push("/poem"    as any);
    else if (label === "Story")   router.push("/story"   as any);
    else if (label === "GK")      router.push("/gk" as any);
  };

  const greeting = profile ? `Hi, ${profile.name}! 👋` : "Hi there! 👋";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🌈</Text>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.subtitle}>Pick a subject to learn! 🎯</Text>
        </View>

        {/* Subject grid */}
        <View style={styles.grid}>
          {SUBJECTS.map((s, i) => (
            <SubjectCard
              key={s.label}
              subject={s}
              index={i}
              onPress={() => handleSubject(s.label)}
            />
          ))}
        </View>
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
    paddingHorizontal: H_PAD,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 20,
  },
  header: {
    alignItems: "center",
    paddingTop: 4,
    gap: 4,
  },
  headerEmoji: {
    fontSize: 48,
    lineHeight: 56,
  },
  greeting: {
    fontSize: 30,
    fontFamily: "Nunito_900Black",
    color: "#E65100",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#78909C",
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    justifyContent: "space-between",
  },
  card: {
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cardEmoji: {
    fontSize: 42,
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: "Nunito_800ExtraBold",
  },
});
