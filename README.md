
---

## 2️⃣ **Voice Recorder React Native App README**


# 🎙️ Voice Recorder App

A **React Native app** to record, save, and play audio on your mobile device. Ideal for voice memos, interviews, or audio testing.

---

## 📸 Screenshots

| Recording Screen | Playback Screen |
|-----------------|----------------|
| ![record](./assets/record.png) | ![playback](./assets/playback.png) |

---

## ⚡ Features

- Record audio using device microphone  
- Play, pause, and stop recordings  
- Save recordings locally  
- Optional: delete or rename recordings  
- Clean and simple user interface  

---

## 🛠 Tech Stack

- React Native  
- `expo-av` or `react-native-audio-recorder-player`  
- AsyncStorage / FileSystem for saving audio files  
- iOS & Android support  

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18  
- npm or yarn  
- React Native CLI or Expo CLI  

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/voice-recorder-app.git
cd voice-recorder-app

# Install dependencies
npm install
# or
yarn install
```

### Run the App
```bash
#Expo:
npx expo start

React Native CLI:
# iOS
npx react-native run-ios

# Android
npx react-native run-android
```

# 🎯 Usage
- Open the app on your device.
- Press Record to start capturing audio.
- Press Stop when finished.
- Play back recordings from the list.
- Optionally, delete or rename saved audio files.