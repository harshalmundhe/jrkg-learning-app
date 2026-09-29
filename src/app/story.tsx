import { Stack, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VideoTopicsScreen } from "../components/VideoTopicsScreen";

export default function Story() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📚 Stories</Text>
        <Text style={styles.subtitle}>Watch and enjoy! 🌙</Text>
      </View>
      <VideoTopicsScreen
        settingsKey="story"
        searchSuffix="story for kids bedtime animated"
        accentColor="#558B2F"
        cardBg="#F9FBE7"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: "#F9FBE7" },
  header:   { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 2 },
  backBtn:  { alignSelf: "flex-start", paddingVertical: 4, marginBottom: 4 },
  backTxt:  { fontSize: 18, fontWeight: "700", color: "#78909C" },
  title:    { fontSize: 32, fontWeight: "900", color: "#33691E" },
  subtitle: { fontSize: 15, fontWeight: "600", color: "#558B2F" },
});
