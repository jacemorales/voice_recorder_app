import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/recording.dart';

class StorageService {
  static const String _keyRecordings = 'recordings_metadata_v2';

  static Future<String> getRecordingsDirectory() async {
    if (kIsWeb) {
      return '';
    }
    final appDir = await getApplicationDocumentsDirectory();
    final recDir = Directory('${appDir.path}/recordings');
    if (!await recDir.exists()) {
      await recDir.create(recursive: true);
    }
    return recDir.path;
  }

  static Future<List<RecordingItem>> loadRecordings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String? jsonString = prefs.getString(_keyRecordings);
      if (jsonString == null || jsonString.isEmpty) {
        return [];
      }
      final List<dynamic> jsonList = jsonDecode(jsonString);
      return jsonList
          .map((item) => RecordingItem.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('Error loading recordings: $e');
      return [];
    }
  }

  static Future<void> saveRecordings(List<RecordingItem> recordings) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = recordings.map((r) => r.toJson()).toList();
      await prefs.setString(_keyRecordings, jsonEncode(jsonList));
    } catch (e) {
      debugPrint('Error saving recordings: $e');
    }
  }

  static Future<RecordingItem> addRecording({
    required String path,
    required int durationMillis,
    String? name,
  }) async {
    final recordings = await loadRecordings();
    final count = recordings.length + 1;
    final recordingName = name ?? 'Recording #$count';

    final newItem = RecordingItem(
      id: 'rec_${DateTime.now().millisecondsSinceEpoch}',
      name: recordingName,
      path: path,
      durationMillis: durationMillis,
      createdAt: DateTime.now(),
    );

    recordings.insert(0, newItem);
    await saveRecordings(recordings);
    return newItem;
  }

  static Future<void> renameRecording(String id, String newName) async {
    final recordings = await loadRecordings();
    final index = recordings.indexWhere((r) => r.id == id);
    if (index != -1) {
      recordings[index] = recordings[index].copyWith(name: newName);
      await saveRecordings(recordings);
    }
  }

  static Future<void> toggleFavorite(String id) async {
    final recordings = await loadRecordings();
    final index = recordings.indexWhere((r) => r.id == id);
    if (index != -1) {
      recordings[index] = recordings[index].copyWith(
        isFavorite: !recordings[index].isFavorite,
      );
      await saveRecordings(recordings);
    }
  }

  static Future<void> deleteRecording(String id) async {
    final recordings = await loadRecordings();
    final recording = recordings.firstWhere(
      (r) => r.id == id,
      orElse: () => RecordingItem(
        id: '',
        name: '',
        path: '',
        durationMillis: 0,
        createdAt: DateTime.now(),
      ),
    );

    if (recording.id.isNotEmpty) {
      if (!kIsWeb && recording.path.isNotEmpty) {
        try {
          final file = File(recording.path);
          if (await file.exists()) {
            await file.delete();
          }
        } catch (e) {
          debugPrint('Error deleting file: $e');
        }
      }
      recordings.removeWhere((r) => r.id == id);
      await saveRecordings(recordings);
    }
  }
}
