import 'package:intl/intl.dart';

class RecordingItem {
  final String id;
  final String name;
  final String path;
  final int durationMillis;
  final DateTime createdAt;
  final bool isFavorite;

  RecordingItem({
    required this.id,
    required this.name,
    required this.path,
    required this.durationMillis,
    required this.createdAt,
    this.isFavorite = false,
  });

  String get formattedDuration {
    final seconds = (durationMillis / 1000).truncate();
    final minutes = (seconds / 60).truncate();
    final remainingSeconds = seconds % 60;
    final minutesStr = minutes.toString().padLeft(2, '0');
    final secondsStr = remainingSeconds.toString().padLeft(2, '0');
    return '$minutesStr:$secondsStr';
  }

  String get formattedDate {
    return DateFormat('MMM d, y • HH:mm').format(createdAt);
  }

  RecordingItem copyWith({
    String? id,
    String? name,
    String? path,
    int? durationMillis,
    DateTime? createdAt,
    bool? isFavorite,
  }) {
    return RecordingItem(
      id: id ?? this.id,
      name: name ?? this.name,
      path: path ?? this.path,
      durationMillis: durationMillis ?? this.durationMillis,
      createdAt: createdAt ?? this.createdAt,
      isFavorite: isFavorite ?? this.isFavorite,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'path': path,
      'durationMillis': durationMillis,
      'createdAt': createdAt.toIso8601String(),
      'isFavorite': isFavorite,
    };
  }

  factory RecordingItem.fromJson(Map<String, dynamic> json) {
    return RecordingItem(
      id: json['id'] as String,
      name: json['name'] as String,
      path: json['path'] as String,
      durationMillis: json['durationMillis'] as int,
      createdAt: DateTime.parse(json['createdAt'] as String),
      isFavorite: json['isFavorite'] as bool? ?? false,
    );
  }
}
