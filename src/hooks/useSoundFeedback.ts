import * as Speech from "expo-speech";

// Hinglish phrases — the natural mix Indian kids aged 3-5 hear every day.
const CORRECT = [
  "Shabash! Ekdum sahi jawab!",
  "Wah wah! Kya baat hai!",
  "Bahut accha! Tum bahut hoshiyaar ho!",
  "Ek number! Sahi jawab!",
  "Super duper! Bahut khoob!",
  "Amazing! Bilkul sahi!",
  "Wonderful! Shabash mere champ!",
  "Fantastic! Tum bahut smart ho!",
  "Yes yes yes! Bahut accha kiya!",
  "Kya baat hai! You are so clever!",
];

const WRONG = [
  "Koi baat nahi! Phir se try karo!",
  "Almost sahi! Ek baar aur sochho!",
  "Himmat mat haaro! Try karo phir!",
  "Thoda aur sochho! Tum kar sakte ho!",
  "No problem! Ek baar aur try karo!",
  "Galat nahi, bas thoda aur dhyaan do!",
];

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export function useSoundFeedback() {
  const playCorrect = () => {
    Speech.stop();
    Speech.speak(pick(CORRECT), { language: "en-IN", rate: 0.62, pitch: 1.45 });
  };

  const playWrong = () => {
    Speech.stop();
    Speech.speak(pick(WRONG), { language: "en-IN", rate: 0.62, pitch: 1.1 });
  };

  return { playCorrect, playWrong };
}
