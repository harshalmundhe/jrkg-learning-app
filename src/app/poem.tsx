import { Stack, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VideoTopicsScreen } from "../components/VideoTopicsScreen";

export default function Poem() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📜 Poems</Text>
        <Text style={styles.subtitle}>Listen and recite! 🎵</Text>
      </View>
      <VideoTopicsScreen
        settingsKey="poem"
        searchSuffix="poem rhymes for kids nursery"
        accentColor="#F57F17"
        cardBg="#FFF8E1"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: "#FFFDE7" },
  header:   { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 2 },
  backBtn:  { alignSelf: "flex-start", paddingVertical: 4, marginBottom: 4 },
  backTxt:  { fontSize: 18, fontWeight: "700", color: "#78909C" },
  title:    { fontSize: 32, fontWeight: "900", color: "#E65100" },
  subtitle: { fontSize: 15, fontWeight: "600", color: "#F57F17" },
});
