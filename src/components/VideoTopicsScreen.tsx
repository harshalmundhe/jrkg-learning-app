import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WebView from "react-native-webview";

const SETTINGS_KEY = "jrkg_settings";

const TOPIC_ICONS: Record<string, string> = {
  "Origami":       "🦢",
  "Flowers":       "🌸",
  "Paper Boats":   "⛵",
  "Rain":          "🌧️",
  "Nature":        "🌿",
  "Family":        "👨‍👩‍👧",
  "Seasons":       "🍂",
  "Fairy Tales":   "🧚",
  "Animals":       "🐘",
  "Adventure":     "🏔️",
  "Moral Stories": "⭐",
};

const SECTION_DEFAULTS: Record<string, string[]> = {
  craft: ["Origami", "Flowers", "Paper Boats"],
  poem:  ["Rain", "Nature", "Family", "Seasons"],
  story: ["Fairy Tales", "Animals", "Adventure", "Moral Stories"],
};

// ── YouTube InnerTube search ───────────────────────────────────────────────────
// Uses the same JSON API YouTube uses internally — no API key required.

type VideoResult = { id: string; title: string; channel: string };
type TopicStatus = "idle" | "loading" | "done" | "error";

// Base64 protobuf filter for videos-only results (must NOT be URL-encoded in JSON body)
const VIDEOS_ONLY_PARAM = "EgIQAQ==";

function extractVideos(data: any): VideoResult[] {
  const sections: any[] =
    data?.contents?.sectionListRenderer?.contents ??
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents ?? [];

  const videos: VideoResult[] = [];
  for (const section of sections) {
    for (const item of section?.itemSectionRenderer?.contents ?? []) {
      // ANDROID client uses compactVideoRenderer; WEB uses videoRenderer
      const vr = item?.compactVideoRenderer ?? item?.videoRenderer;
      if (vr?.videoId) {
        videos.push({
          id:      vr.videoId,
          title:   vr.title?.runs?.[0]?.text ?? vr.title?.simpleText ?? "Video",
          channel: vr.shortBylineText?.runs?.[0]?.text ?? vr.ownerText?.runs?.[0]?.text ?? "",
        });
        if (videos.length >= 1) return videos;
      }
    }
  }
  return videos;
}

async function fetchTop1(query: string): Promise<VideoResult[]> {
  // Try multiple clients in order — older client versions get deprecated by YouTube.
  const clients = [
    // ANDROID client (current version as of 2024)
    {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 14; GB) gzip",
        "X-YouTube-Client-Name": "3",
        "X-YouTube-Client-Version": "19.09.37",
        "Accept-Language": "en-US,en;q=0.9",
      },
      body: {
        query,
        params: VIDEOS_ONLY_PARAM,
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: "19.09.37",
            androidSdkVersion: 34,
            hl: "en",
            gl: "US",
          },
        },
      },
    },
    // WEB client fallback — different renderer shape, handled by extractVideos
    {
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
      body: {
        query,
        params: VIDEOS_ONLY_PARAM,
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20240726.00.00",
            hl: "en",
            gl: "US",
          },
        },
      },
    },
  ];

  for (const client of clients) {
    try {
      const res = await fetch(
        "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
        {
          method: "POST",
          headers: client.headers,
          body: JSON.stringify(client.body),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const videos = extractVideos(data);
      if (videos.length > 0) return videos;
    } catch {
      // Try next client
    }
  }

  return [];
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  settingsKey: "craft" | "poem" | "story";
  searchSuffix: string;
  accentColor: string;
  cardBg: string;
};

export function VideoTopicsScreen({ settingsKey, searchSuffix, accentColor, cardBg }: Props) {
  const [topics,    setTopics]    = useState<string[]>([]);
  const [status,    setStatus]    = useState<Record<string, TopicStatus>>({});
  const [results,   setResults]   = useState<Record<string, VideoResult[]>>({});
  const [playId,    setPlayId]    = useState<string | null>(null);
  const [playTitle, setPlayTitle] = useState("");

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(SETTINGS_KEY).then(raw => {
        try {
          const s = raw ? JSON.parse(raw) : {};
          const t: string[] = s[settingsKey]?.topics ?? SECTION_DEFAULTS[settingsKey];
          setTopics(t.length ? t : SECTION_DEFAULTS[settingsKey]);
          setStatus({});
          setResults({});
        } catch {
          setTopics(SECTION_DEFAULTS[settingsKey]);
        }
      });
    }, [settingsKey])
  );

  const search = async (topic: string) => {
    setStatus(prev => ({ ...prev, [topic]: "loading" }));
    try {
      const videos = await fetchTop1(`kids ${topic} ${searchSuffix}`);
      if (videos.length > 0) {
        setResults(prev => ({ ...prev, [topic]: videos }));
        setStatus(prev => ({ ...prev, [topic]: "done" }));
      } else {
        setStatus(prev => ({ ...prev, [topic]: "error" }));
      }
    } catch {
      setStatus(prev => ({ ...prev, [topic]: "error" }));
    }
  };

  const thumbUri = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

  // Loading a YouTube embed URL directly into WebView triggers error 153 because
  // YouTube detects the WebView context. The workaround is to inject an HTML page
  // whose <iframe> has the `allow` attribute, and set baseUrl to youtube-nocookie.com
  // so the embed sees itself as hosted on YouTube's own domain.
  const embedHtml = (id: string) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center}
    iframe{width:100%;aspect-ratio:16/9;border:0}
  </style>
</head>
<body>
  <iframe
    src="https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&controls=1&fs=1"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
  ></iframe>
</body>
</html>`;

  return (
    <>
      <ScrollView contentContainerStyle={styles.sc} showsVerticalScrollIndicator={false}>
        <Text style={[styles.hint, { color: accentColor }]}>
          Tap a topic to find the best video! 🎬
        </Text>

        {topics.map(topic => {
          const icon   = TOPIC_ICONS[topic] ?? "🎬";
          const st     = status[topic]  ?? "idle";
          const videos = results[topic] ?? [];

          return (
            <View key={topic} style={[styles.card, { backgroundColor: cardBg, borderLeftColor: accentColor }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>{icon}</Text>
                <Text style={[styles.cardTitle, { color: accentColor }]}>{topic}</Text>
              </View>

              {st === "idle" && (
                <TouchableOpacity style={[styles.findBtn, { backgroundColor: accentColor }]}
                  onPress={() => search(topic)} activeOpacity={0.8}>
                  <Text style={styles.findTxt}>🔍  Find a Video</Text>
                </TouchableOpacity>
              )}

              {st === "loading" && (
                <View style={styles.loadRow}>
                  <ActivityIndicator color={accentColor} size="small" />
                  <Text style={[styles.loadTxt, { color: accentColor }]}>Searching YouTube…</Text>
                </View>
              )}

              {st === "done" && videos.map((v) => (
                <TouchableOpacity key={v.id} onPress={() => { setPlayId(v.id); setPlayTitle(v.title); }}
                  activeOpacity={0.85} style={styles.videoCard}>
                  <Image source={{ uri: thumbUri(v.id) }} style={styles.thumb} contentFit="cover" />
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle} numberOfLines={2}>{v.title}</Text>
                    <Text style={styles.videoChannel} numberOfLines={1}>{v.channel}</Text>
                  </View>
                  <View style={[styles.playCircle, { backgroundColor: accentColor }]}>
                    <Text style={styles.playArrow}>▶</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {st === "error" && (
                <View style={styles.errorRow}>
                  <Text style={styles.errorTxt}>😕  Couldn't load videos</Text>
                  <TouchableOpacity style={[styles.retryBtn, { borderColor: accentColor }]}
                    onPress={() => search(topic)} activeOpacity={0.8}>
                    <Text style={[styles.retryTxt, { color: accentColor }]}>🔄  Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {topics.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>⚙️</Text>
            <Text style={styles.emptyTxt}>No topics yet. Add some in Settings!</Text>
          </View>
        )}
      </ScrollView>

      {/* Embedded player */}
      <Modal visible={!!playId} animationType="slide" onRequestClose={() => setPlayId(null)}>
        <SafeAreaView style={styles.playerSafe}>
          <View style={styles.playerBar}>
            <TouchableOpacity onPress={() => setPlayId(null)} style={styles.closeBtn} activeOpacity={0.8}>
              <Text style={styles.closeTxt}>✕  Close</Text>
            </TouchableOpacity>
            <Text style={styles.playerTitle} numberOfLines={1}>{playTitle}</Text>
          </View>
          {playId && (
            <WebView
              source={{ html: embedHtml(playId), baseUrl: "https://www.youtube-nocookie.com" }}
              style={{ flex: 1, backgroundColor: "#000" }}
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={["*"]}
              mixedContentMode="always"
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sc:   { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 16 },
  hint: { fontSize: 14, fontWeight: "600", textAlign: "center", paddingBottom: 4, opacity: 0.6 },

  card:       { borderRadius: 20, padding: 18, gap: 14, borderLeftWidth: 6, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon:   { fontSize: 40 },
  cardTitle:  { fontSize: 22, fontWeight: "800", flex: 1 },

  findBtn: { paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  findTxt: { fontSize: 16, fontWeight: "800", color: "#fff" },

  loadRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  loadTxt: { fontSize: 15, fontWeight: "600" },

  videoCard:    { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  thumb:        { width: 110, height: 72 },
  videoInfo:    { flex: 1, gap: 3, paddingVertical: 8 },
  videoTitle:   { fontSize: 13, fontWeight: "700", color: "#37474F", lineHeight: 18 },
  videoChannel: { fontSize: 11, color: "#90A4AE", fontWeight: "500" },
  playCircle:   { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginRight: 12 },
  playArrow:    { fontSize: 14, color: "#fff", fontWeight: "900" },

  errorRow: { gap: 10, alignItems: "flex-start" },
  errorTxt: { fontSize: 15, color: "#90A4AE", fontWeight: "600" },
  retryBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 12, borderWidth: 2 },
  retryTxt: { fontSize: 14, fontWeight: "800" },

  empty:    { alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 60 },
  emptyTxt: { fontSize: 18, fontWeight: "600", color: "#90A4AE", textAlign: "center" },

  playerSafe:  { flex: 1, backgroundColor: "#000" },
  playerBar:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12, backgroundColor: "#121212" },
  closeBtn:    { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#333" },
  closeTxt:    { fontSize: 15, fontWeight: "700", color: "#fff" },
  playerTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#ccc" },
});
