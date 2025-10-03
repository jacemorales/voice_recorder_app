# Voice Recorder App

A cross-platform mobile voice recorder app built with React Native and Expo, featuring a clean, modern UI inspired by Flutter.

## Features

- **Record Audio**: Easily record audio from your device's microphone.
- **Manage Recordings**: Start, stop, pause, and resume recordings.
- **Playback**: Listen to your recordings with simple playback controls.
- **Local Storage**: Recordings are saved locally on your device.
- **Clean UI**: A beautiful, modern interface with light and dark mode support.
- **Recording Management**: List, play, rename, and delete your recordings.

## Technical Stack

- **React Native (Expo)**: For cross-platform mobile development.
- **`expo-av`**: For handling audio recording and playback.
- **`expo-file-system`**: For saving audio files.
- **`@react-native-async-storage/async-storage`**: For storing recording metadata.
- **React Navigation**: For managing screens.
- **React Hooks**: For state management.

## Screenshots

*(Coming soon...)*

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/voice-recorder-app.git
   cd voice-recorder-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Usage

1. **Start the app:**
   ```bash
   npx expo start
   ```

2. **Run on your device:**
   - Scan the QR code with the Expo Go app on your iOS or Android device.
   - Or, run on an emulator/simulator:
     - Press `a` for Android.
     - Press `i` for iOS.

## Folder Structure

```
.
├── app/                # Expo Router screen definitions
├── assets/             # Images and fonts
├── components/         # Reusable UI components
├── constants/          # Theme colors and other constants
├── hooks/              # Custom React hooks
├── screens/            # UI screens for the app
└── README.md
```

## Cross-Platform Compatibility

This app is built with Expo and is designed to work on both iOS and Android devices. All core functionalities have been implemented using cross-platform APIs to ensure a consistent experience.