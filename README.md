# Modern Voice Recorder App

A modern, cross-platform voice recorder app built with **Flutter**. It features a sleek dark-mode UI, real-time waveform visualization, search/filtering, inline audio playback, audio sharing, and local persistence.

## Features

- 🎙️ **Interactive Recording Screen**:
  - Real-time animated amplitude waveform visualizer.
  - Precision recording timer with intuitive controls (Start, Pause, Resume, Stop).
  - Quick inline playback preview after recording.

- 📁 **Recordings Library**:
  - Instant search filtering by title.
  - Favorite bookmarking to save important clips.
  - Interactive audio player bar with seek slider, play/pause, and duration indicators.
  - Rename recordings via modal dialogs.
  - Native file sharing capabilities.
  - Safe deletion with confirmation dialogs.

- 🎨 **Modern UX & Aesthetics**:
  - Dark mode aesthetic with vibrant accent gradients and glassmorphism-inspired cards.
  - Smooth animated bottom navigation bar.

## Tech Stack

- **Flutter & Dart**: Cross-platform framework.
- **`record`**: Audio recording with live amplitude monitoring.
- **`audioplayers`**: High-performance audio playback.
- **`path_provider`**: Persistent directory storage.
- **`shared_preferences`**: Local storage for recording metadata.
- **`google_fonts`**: Modern typography (Inter & Outfit).
- **`share_plus`**: Native file sharing capabilities.

## Getting Started

### Prerequisites
- Flutter SDK 3.x or higher installed.

### Installation & Execution

1. **Fetch dependencies:**
   ```bash
   flutter pub get
   ```

2. **Run the application:**
   ```bash
   flutter run
   ```
   Or launch on web:
   ```bash
   flutter run -d chrome
   ```

## Project Structure

```
lib/
├── models/         # Data models (RecordingItem)
├── services/       # File & storage service (StorageService)
├── screens/        # UI Screens (RecorderScreen, RecordingsScreen, MainNavigationScreen)
├── theme/          # App theme configuration (AppTheme)
├── widgets/        # Reusable widgets (WaveformVisualizer, RecordingTile, AudioPlayerBar, RenameDialog)
└── main.dart       # App entry point
```
