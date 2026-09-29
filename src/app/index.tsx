import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const STORAGE_KEY = "jrkg_user_profile";

const AGES = [3, 4, 5];

const GENDERS = [
  { label: "Boy", emoji: "👦", color: "#4FC3F7", border: "#0288D1" },
  { label: "Girl", emoji: "👧", color: "#F48FB1", border: "#C2185B" },
];

type Profile = { name: string; age: number; gender: string };

function BounceButton({
  selected,
  onPress,
  selectedBg,
  selectedBorder,
  children,
  style,
}: {
  selected: boolean;
  onPress: () => void;
  selectedBg: string;
  selectedBorder: string;
  children: React.ReactNode;
  style?: object;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(1.18, { damping: 6 }, () => {
      scale.value = withSpring(1);
    });
    onPress();
  };

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={[
          styles.bounceBtn,
          style,
          selected && { backgroundColor: selectedBg, borderColor: selectedBorder },
        ]}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

function WelcomeBack({
  profile,
  onPlay,
  onReset,
}: {
  profile: Profile;
  onPlay: () => void;
  onReset: () => void;
}) {
  const genderData = GENDERS.find((g) => g.label === profile.gender);

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.welcomeWrap}>
      <Text style={styles.welcomeEmoji}>{genderData?.emoji ?? "🌟"}</Text>
      <Text style={styles.welcomeTitle}>Welcome back!</Text>
      <Text style={styles.welcomeName}>{profile.name} 🎉</Text>

      <TouchableOpacity style={styles.startBtn} activeOpacity={0.8} onPress={onPlay}>
        <Text style={styles.startBtnText}>🚀  Let's Play!</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetBtn} onPress={onReset} activeOpacity={0.7}>
        <Text style={styles.resetBtnText}>Not me? Change profile</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function Index() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setProfile(JSON.parse(raw));
          } catch {}
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStart = async () => {
    const p: Profile = { name: name.trim(), age: age!, gender: gender! };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    router.replace("/home");
  };

  const handleReset = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setProfile(null);
    setName("");
    setAge(null);
    setGender(null);
  };

  const canStart = name.trim().length > 0 && age !== null && gender !== null;

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#E65100" />
      </SafeAreaView>
    );
  }

  if (profile) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Stack.Screen options={{ headerShown: false }} />
        <WelcomeBack
          profile={profile}
          onPlay={() => router.replace("/home")}
          onReset={handleReset}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.headerEmoji}>🌈</Text>
        <Text style={styles.title}>Let's Learn!</Text>

        {/* Name */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>✏️  What's your name?</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Type your name here..."
            placeholderTextColor="#C5C5C5"
            value={name}
            onChangeText={setName}
            maxLength={20}
            autoCorrect={false}
            returnKeyType="done"
          />
        </View>

        {/* Age */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>🎂  How old are you?</Text>
          <View style={styles.row}>
            {AGES.map((a) => (
              <BounceButton
                key={a}
                selected={age === a}
                onPress={() => setAge(a)}
                selectedBg="#FFD600"
                selectedBorder="#F9A825"
                style={styles.ageBtn}
              >
                <Text style={[styles.ageBtnText, age === a && styles.ageBtnTextSelected]}>
                  {a}
                </Text>
              </BounceButton>
            ))}
          </View>
        </View>

        {/* Gender */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>🌟  I am a...</Text>
          <View style={styles.row}>
            {GENDERS.map((g) => (
              <BounceButton
                key={g.label}
                selected={gender === g.label}
                onPress={() => setGender(g.label)}
                selectedBg={g.color}
                selectedBorder={g.border}
                style={styles.genderBtn}
              >
                <Text style={styles.genderEmoji}>{g.emoji}</Text>
                <Text style={[styles.genderLabel, gender === g.label && styles.genderLabelSelected]}>
                  {g.label}
                </Text>
              </BounceButton>
            ))}
          </View>
        </View>

        {/* Start Button */}
        <TouchableOpacity
          style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
          disabled={!canStart}
          activeOpacity={0.8}
          onPress={handleStart}
        >
          <Text style={styles.startBtnText}>🚀  Let's Start!</Text>
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
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 20,
  },
  headerEmoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 40,
    fontWeight: "900",
    color: "#E65100",
    letterSpacing: 1,
    marginBottom: 4,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardLabel: {
    fontSize: 22,
    fontWeight: "700",
    color: "#37474F",
  },
  nameInput: {
    height: 60,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: "#B0BEC5",
    paddingHorizontal: 18,
    fontSize: 22,
    color: "#212121",
    backgroundColor: "#F5F5F5",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  bounceBtn: {
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#DEDEDE",
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  ageBtn: {
    width: 88,
    height: 88,
  },
  ageBtnText: {
    fontSize: 42,
    fontWeight: "900",
    color: "#78909C",
  },
  ageBtnTextSelected: {
    color: "#5D4037",
  },
  genderBtn: {
    width: 120,
    height: 120,
    gap: 6,
  },
  genderEmoji: {
    fontSize: 52,
  },
  genderLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#78909C",
  },
  genderLabelSelected: {
    color: "#fff",
  },
  startBtn: {
    marginTop: 8,
    width: "100%",
    height: 76,
    borderRadius: 28,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2E7D32",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  startBtnDisabled: {
    backgroundColor: "#CFD8DC",
    shadowOpacity: 0,
    elevation: 0,
  },
  startBtnText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  // Welcome back
  welcomeWrap: {
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 16,
  },
  welcomeEmoji: {
    fontSize: 96,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#37474F",
  },
  welcomeName: {
    fontSize: 44,
    fontWeight: "900",
    color: "#E65100",
    textAlign: "center",
  },
  welcomeBadgeRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 50,
  },
  badgeText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  resetBtn: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  resetBtnText: {
    fontSize: 17,
    color: "#90A4AE",
    textDecorationLine: "underline",
  },
});
