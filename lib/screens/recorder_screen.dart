import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:record/record.dart';
import '../models/recording.dart';
import '../services/storage_service.dart';
import '../theme/app_theme.dart';
import '../widgets/waveform_visualizer.dart';

enum RecordingState { idle, recording, paused, stopped }

class RecorderScreen extends StatefulWidget {
  final VoidCallback? onRecordingSaved;

  const RecorderScreen({super.key, this.onRecordingSaved});

  @override
  State<RecorderScreen> createState() => _RecorderScreenState();
}

class _RecorderScreenState extends State<RecorderScreen>
    with SingleTickerProviderStateMixin {
  late AudioRecorder _audioRecorder;
  late AudioPlayer _previewPlayer;

  RecordingState _state = RecordingState.idle;
  int _durationMillis = 0;
  Timer? _timer;
  StreamSubscription<Amplitude>? _amplitudeSubscription;

  final List<double> _amplitudes = [];
  String? _lastRecordedPath;
  RecordingItem? _lastSavedItem;

  bool _isPreviewPlaying = false;
  StreamSubscription? _playerStateSubscription;

  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _audioRecorder = AudioRecorder();
    _previewPlayer = AudioPlayer();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    _initPreviewPlayerListeners();
  }

  void _initPreviewPlayerListeners() {
    _playerStateSubscription = _previewPlayer.onPlayerStateChanged.listen((s) {
      if (mounted) {
        setState(() {
          _isPreviewPlaying = (s == PlayerState.playing);
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _amplitudeSubscription?.cancel();
    _playerStateSubscription?.cancel();
    _audioRecorder.dispose();
    _previewPlayer.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  String _formatDuration(int millis) {
    final totalSeconds = millis ~/ 1000;
    final minutes = totalSeconds ~/ 60;
    final seconds = totalSeconds % 60;
    final hundredths = (millis % 1000) ~/ 10;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}.${hundredths.toString().padLeft(2, '0')}';
  }

  double _normalizeDb(double db) {
    if (db.isInfinite || db.isNaN) return 0.05;
    const minDb = -60.0;
    const maxDb = 0.0;
    final clamped = db.clamp(minDb, maxDb);
    return ((clamped - minDb) / (maxDb - minDb)).clamp(0.05, 1.0);
  }

  Future<void> _startRecording() async {
    try {
      if (!await _audioRecorder.hasPermission()) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Microphone permission denied')),
          );
        }
        return;
      }

      final dirPath = await StorageService.getRecordingsDirectory();
      final filePath = kIsWeb
          ? ''
          : '$dirPath/rec_${DateTime.now().millisecondsSinceEpoch}.m4a';

      const config = RecordConfig(
        encoder: AudioEncoder.aacLc,
        bitRate: 128000,
        sampleRate: 44100,
      );

      await _audioRecorder.start(config, path: filePath);

      setState(() {
        _state = RecordingState.recording;
        _durationMillis = 0;
        _amplitudes.clear();
        _lastRecordedPath = null;
        _lastSavedItem = null;
      });

      _startTimer();
      _startAmplitudeStream();
    } catch (e) {
      debugPrint('Error starting recording: $e');
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(milliseconds: 50), (timer) {
      if (_state == RecordingState.recording) {
        setState(() {
          _durationMillis += 50;
        });
      }
    });
  }

  void _startAmplitudeStream() {
    _amplitudeSubscription?.cancel();
    _amplitudeSubscription = _audioRecorder
        .onAmplitudeChanged(const Duration(milliseconds: 100))
        .listen((amp) {
      if (_state == RecordingState.recording) {
        final normalized = _normalizeDb(amp.current);
        setState(() {
          _amplitudes.add(normalized);
        });
      }
    });
  }

  Future<void> _pauseRecording() async {
    try {
      await _audioRecorder.pause();
      setState(() {
        _state = RecordingState.paused;
      });
    } catch (e) {
      debugPrint('Error pausing recording: $e');
    }
  }

  Future<void> _resumeRecording() async {
    try {
      await _audioRecorder.resume();
      setState(() {
        _state = RecordingState.recording;
      });
    } catch (e) {
      debugPrint('Error resuming recording: $e');
    }
  }

  Future<void> _stopRecording() async {
    try {
      final path = await _audioRecorder.stop();
      _timer?.cancel();
      _amplitudeSubscription?.cancel();

      if (path != null && path.isNotEmpty) {
        final savedItem = await StorageService.addRecording(
          path: path,
          durationMillis: _durationMillis,
        );

        setState(() {
          _state = RecordingState.stopped;
          _lastRecordedPath = path;
          _lastSavedItem = savedItem;
        });

        widget.onRecordingSaved?.call();
      } else {
        setState(() {
          _state = RecordingState.idle;
        });
      }
    } catch (e) {
      debugPrint('Error stopping recording: $e');
      setState(() {
        _state = RecordingState.idle;
      });
    }
  }

  Future<void> _togglePreviewPlayback() async {
    if (_lastRecordedPath == null && _lastSavedItem == null) return;
    final path = _lastRecordedPath ?? _lastSavedItem!.path;

    if (_isPreviewPlaying) {
      await _previewPlayer.pause();
    } else {
      if (kIsWeb) {
        await _previewPlayer.play(UrlSource(path));
      } else {
        await _previewPlayer.play(DeviceFileSource(path));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            children: [
              // Header
              const SizedBox(height: 12),
              Text(
                'Voice Recorder',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 6),
              Text(
                _state == RecordingState.recording
                    ? 'Recording audio...'
                    : (_state == RecordingState.paused
                        ? 'Recording paused'
                        : 'Tap the button below to start capture'),
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 14,
                ),
              ),

              const Spacer(),

              // Timer Display Card
              Container(
                padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 32),
                decoration: BoxDecoration(
                  color: AppTheme.darkSurface,
                  borderRadius: BorderRadius.circular(32),
                  border: Border.all(
                    color: _state == RecordingState.recording
                        ? AppTheme.accentRed.withValues(alpha: 0.5)
                        : Colors.white.withValues(alpha: 0.08),
                    width: 1.5,
                  ),
                  boxShadow: [
                    if (_state == RecordingState.recording)
                      BoxShadow(
                        color: AppTheme.accentRed.withValues(alpha: 0.15),
                        blurRadius: 24,
                        spreadRadius: 2,
                      ),
                  ],
                ),
                child: Column(
                  children: [
                    Text(
                      _formatDuration(_durationMillis),
                      style: Theme.of(context).textTheme.displayLarge?.copyWith(
                            fontFamily: 'monospace',
                          ),
                    ),
                    const SizedBox(height: 20),
                    WaveformVisualizer(
                      amplitudes: _amplitudes,
                      isRecording: _state == RecordingState.recording,
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // Quick Preview Card if stopped
              if (_state == RecordingState.stopped && _lastSavedItem != null) ...[
                Container(
                  margin: const EdgeInsets.only(bottom: 24),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.accentEmerald.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppTheme.accentEmerald.withValues(alpha: 0.4),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: const BoxDecoration(
                          color: AppTheme.accentEmerald,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.check_rounded, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${_lastSavedItem!.name} Saved!',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _lastSavedItem!.formattedDuration,
                              style: const TextStyle(
                                color: AppTheme.accentEmerald,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: _togglePreviewPlayback,
                        icon: Icon(
                          _isPreviewPlaying ? Icons.pause_circle_filled : Icons.play_circle_fill,
                          color: AppTheme.accentEmerald,
                          size: 38,
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Record Control Buttons
              _buildControlButtons(),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildControlButtons() {
    switch (_state) {
      case RecordingState.idle:
      case RecordingState.stopped:
        return AnimatedBuilder(
          animation: _pulseController,
          builder: (context, child) {
            final scale = 1.0 + (_pulseController.value * 0.06);
            return Transform.scale(
              scale: scale,
              child: GestureDetector(
                onTap: _startRecording,
                child: Container(
                  width: 84,
                  height: 84,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [AppTheme.accentRed, Color(0xFFF43F5E)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.accentRed.withValues(alpha: 0.4),
                        blurRadius: 20,
                        spreadRadius: 4,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.mic_rounded,
                    color: Colors.white,
                    size: 42,
                  ),
                ),
              ),
            );
          },
        );

      case RecordingState.recording:
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Pause
            GestureDetector(
              onTap: _pauseRecording,
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.accentAmber,
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.accentAmber.withValues(alpha: 0.3),
                      blurRadius: 12,
                    ),
                  ],
                ),
                child: const Icon(Icons.pause_rounded, color: Colors.white, size: 32),
              ),
            ),
            const SizedBox(width: 32),
            // Stop
            GestureDetector(
              onTap: _stopRecording,
              child: Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.darkCard,
                  border: Border.all(color: Colors.white30, width: 2),
                ),
                child: const Icon(Icons.stop_rounded, color: Colors.white, size: 36),
              ),
            ),
          ],
        );

      case RecordingState.paused:
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Resume
            GestureDetector(
              onTap: _resumeRecording,
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.accentEmerald,
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.accentEmerald.withValues(alpha: 0.3),
                      blurRadius: 12,
                    ),
                  ],
                ),
                child: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 32),
              ),
            ),
            const SizedBox(width: 32),
            // Stop
            GestureDetector(
              onTap: _stopRecording,
              child: Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.darkCard,
                  border: Border.all(color: Colors.white30, width: 2),
                ),
                child: const Icon(Icons.stop_rounded, color: Colors.white, size: 36),
              ),
            ),
          ],
        );
    }
  }
}
