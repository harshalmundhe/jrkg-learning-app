import * as Speech from "expo-speech";
import { useEffect } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  text:      string;
  color:     string;
  onDismiss: () => void;
};

export function InstructionBanner({ text, color, onDismiss }: Props) {
  // Speak the instruction when modal opens; stop when it closes or text changes
  useEffect(() => {
    Speech.speak(text, { language: "en-IN", rate: 0.60, pitch: 1.25 });
    return () => { Speech.stop(); };
  }, [text]);

  return (
    <Modal transparent animationType="fade" onRequestClose={onDismiss}>
      {/* Tap outside → dismiss */}
      <TouchableOpacity style={styles.backdrop} onPress={onDismiss} activeOpacity={1}>
        {/* Tap inside card does NOT dismiss */}
        <TouchableOpacity activeOpacity={1} style={[styles.card, { borderTopColor: color, borderTopWidth: 6 }]}>
          <Text style={styles.bulb}>💡</Text>
          <Text style={[styles.heading, { color }]}>How to play</Text>
          <Text style={styles.body}>{text}</Text>
          <TouchableOpacity
            onPress={onDismiss}
            style={[styles.okBtn, { backgroundColor: color }]}
            activeOpacity={0.85}
          >
            <Text style={styles.okTxt}>Got it! ✓</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: "#00000055",
    alignItems:      "center",
    justifyContent:  "center",
    padding:         32,
  },
  card: {
    width:           "100%",
    backgroundColor: "#fff",
    borderRadius:    28,
    padding:         28,
    alignItems:      "center",
    gap:             14,
    shadowColor:     "#000",
    shadowOpacity:   0.18,
    shadowRadius:    20,
    shadowOffset:    { width: 0, height: 8 },
    elevation:       10,
  },
  bulb:    { fontSize: 52 },
  heading: { fontSize: 22, fontWeight: "900", letterSpacing: 0.3 },
  body:    { fontSize: 16, fontWeight: "600", color: "#546E7A", textAlign: "center", lineHeight: 24 },
  okBtn:   {
    marginTop:         4,
    paddingVertical:   14,
    paddingHorizontal: 40,
    borderRadius:      20,
  },
  okTxt:   { fontSize: 18, fontWeight: "900", color: "#fff" },
});
