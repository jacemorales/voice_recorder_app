import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../models/recording.dart';
import '../services/storage_service.dart';
import '../theme/app_theme.dart';
import '../widgets/audio_player_bar.dart';
import '../widgets/recording_tile.dart';
import '../widgets/rename_dialog.dart';

class RecordingsScreen extends StatefulWidget {
  const RecordingsScreen({super.key});

  @override
  State<RecordingsScreen> createState() => RecordingsScreenState();
}

class RecordingsScreenState extends State<RecordingsScreen> {
  List<RecordingItem> _allRecordings = [];
  List<RecordingItem> _filteredRecordings = [];
  String _searchQuery = '';
  bool _showFavoritesOnly = false;

  late AudioPlayer _audioPlayer;
  RecordingItem? _currentlyPlaying;
  bool _isPlaying = false;
  Duration _currentPosition = Duration.zero;
  Duration _totalDuration = Duration.zero;

  StreamSubscription? _playerStateSub;
  StreamSubscription? _playerPositionSub;
  StreamSubscription? _playerDurationSub;

  @override
  void initState() {
    super.initState();
    _audioPlayer = AudioPlayer();
    _initPlayerListeners();
    loadRecordings();
  }

  void _initPlayerListeners() {
    _playerStateSub = _audioPlayer.onPlayerStateChanged.listen((state) {
      if (mounted) {
        setState(() {
          _isPlaying = (state == PlayerState.playing);
        });
      }
    });

    _playerPositionSub = _audioPlayer.onPositionChanged.listen((pos) {
      if (mounted) {
        setState(() {
          _currentPosition = pos;
        });
      }
    });

    _playerDurationSub = _audioPlayer.onDurationChanged.listen((dur) {
      if (mounted) {
        setState(() {
          _totalDuration = dur;
        });
      }
    });
  }

  @override
  void dispose() {
    _playerStateSub?.cancel();
    _playerPositionSub?.cancel();
    _playerDurationSub?.cancel();
    _audioPlayer.dispose();
    super.dispose();
  }

  Future<void> loadRecordings() async {
    final items = await StorageService.loadRecordings();
    if (mounted) {
      setState(() {
        _allRecordings = items;
        _applyFilter();
      });
    }
  }

  void _applyFilter() {
    _filteredRecordings = _allRecordings.where((item) {
      final matchesSearch =
          item.name.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesFavorite = !_showFavoritesOnly || item.isFavorite;
      return matchesSearch && matchesFavorite;
    }).toList();
  }

  Future<void> _playPauseRecording(RecordingItem item) async {
    if (_currentlyPlaying?.id == item.id) {
      if (_isPlaying) {
        await _audioPlayer.pause();
      } else {
        await _audioPlayer.resume();
      }
    } else {
      await _audioPlayer.stop();
      setState(() {
        _currentlyPlaying = item;
        _currentPosition = Duration.zero;
        _totalDuration = Duration(milliseconds: item.durationMillis);
      });

      if (kIsWeb) {
        await _audioPlayer.play(UrlSource(item.path));
      } else {
        await _audioPlayer.play(DeviceFileSource(item.path));
      }
    }
  }

  Future<void> _seek(Duration position) async {
    await _audioPlayer.seek(position);
  }

  Future<void> _toggleFavorite(RecordingItem item) async {
    await StorageService.toggleFavorite(item.id);
    await loadRecordings();
  }

  Future<void> _openRenameDialog(RecordingItem item) async {
    showDialog(
      context: context,
      builder: (context) => RenameDialog(
        initialName: item.name,
        onRename: (newName) async {
          await StorageService.renameRecording(item.id, newName);
          if (_currentlyPlaying?.id == item.id) {
            setState(() {
              _currentlyPlaying = _currentlyPlaying!.copyWith(name: newName);
            });
          }
          await loadRecordings();
        },
      ),
    );
  }

  Future<void> _shareRecording(RecordingItem item) async {
    if (kIsWeb) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sharing is not supported on Web')),
      );
      return;
    }
    if (item.path.isNotEmpty) {
      try {
        // ignore: deprecated_member_use
        await Share.shareXFiles(
          [XFile(item.path)],
          subject: 'Listen to my recording: ${item.name}',
        );
      } catch (e) {
        debugPrint('Error sharing recording: $e');
      }
    }
  }

  Future<void> _deleteRecording(RecordingItem item) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Recording?'),
        content: Text('Are you sure you want to delete "${item.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel', style: TextStyle(color: Colors.white70)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.accentRed,
            ),
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      if (_currentlyPlaying?.id == item.id) {
        await _audioPlayer.stop();
        setState(() {
          _currentlyPlaying = null;
        });
      }
      await StorageService.deleteRecording(item.id);
      await loadRecordings();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Header & Search Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'My Recordings',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      IconButton(
                        onPressed: () {
                          setState(() {
                            _showFavoritesOnly = !_showFavoritesOnly;
                            _applyFilter();
                          });
                        },
                        icon: Icon(
                          _showFavoritesOnly ? Icons.star_rounded : Icons.star_border_rounded,
                          color: _showFavoritesOnly ? AppTheme.accentAmber : Colors.white70,
                          size: 28,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    onChanged: (val) {
                      setState(() {
                        _searchQuery = val;
                        _applyFilter();
                      });
                    },
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Search recordings...',
                      hintStyle: const TextStyle(color: Color(0xFF64748B)),
                      prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF64748B)),
                      filled: true,
                      fillColor: AppTheme.darkSurface,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Recording List
            Expanded(
              child: _filteredRecordings.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withValues(alpha: 0.05),
                            ),
                            child: const Icon(
                              Icons.mic_none_rounded,
                              size: 48,
                              color: Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _searchQuery.isNotEmpty || _showFavoritesOnly
                                ? 'No matching recordings'
                                : 'No recordings yet',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.white70,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Recordings created will appear here',
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                      itemCount: _filteredRecordings.length,
                      itemBuilder: (context, index) {
                        final recording = _filteredRecordings[index];
                        final isPlayingThis =
                            _currentlyPlaying?.id == recording.id && _isPlaying;

                        return RecordingTile(
                          recording: recording,
                          isPlaying: isPlayingThis,
                          onPlayPause: () => _playPauseRecording(recording),
                          onRename: () => _openRenameDialog(recording),
                          onDelete: () => _deleteRecording(recording),
                          onShare: () => _shareRecording(recording),
                          onToggleFavorite: () => _toggleFavorite(recording),
                        );
                      },
                    ),
            ),

            // Persistent Audio Player Bar when playing
            if (_currentlyPlaying != null)
              AudioPlayerBar(
                recording: _currentlyPlaying!,
                isPlaying: _isPlaying,
                currentPosition: _currentPosition,
                totalDuration: _totalDuration,
                onPlayPause: () => _playPauseRecording(_currentlyPlaying!),
                onSeek: _seek,
                onClose: () async {
                  await _audioPlayer.stop();
                  setState(() {
                    _currentlyPlaying = null;
                  });
                },
              ),
          ],
        ),
      ),
    );
  }
}
