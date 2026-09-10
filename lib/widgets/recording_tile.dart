import 'package:flutter/material.dart';
import '../models/recording.dart';
import '../theme/app_theme.dart';

class RecordingTile extends StatelessWidget {
  final RecordingItem recording;
  final bool isPlaying;
  final VoidCallback onPlayPause;
  final VoidCallback onRename;
  final VoidCallback onDelete;
  final VoidCallback onShare;
  final VoidCallback onToggleFavorite;

  const RecordingTile({
    super.key,
    required this.recording,
    required this.isPlaying,
    required this.onPlayPause,
    required this.onRename,
    required this.onDelete,
    required this.onShare,
    required this.onToggleFavorite,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isPlaying
            ? AppTheme.primaryColor.withValues(alpha: 0.12)
            : Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isPlaying
              ? AppTheme.primaryColor.withValues(alpha: 0.5)
              : Colors.white.withValues(alpha: 0.08),
          width: isPlaying ? 1.5 : 1.0,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onPlayPause,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                // Play / Pause Circle Button
                GestureDetector(
                  onTap: onPlayPause,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: isPlaying
                          ? const LinearGradient(
                              colors: [
                                AppTheme.primaryColor,
                                AppTheme.primaryGradientEnd,
                              ],
                            )
                          : null,
                      color: isPlaying
                          ? null
                          : Colors.white.withValues(alpha: 0.1),
                    ),
                    child: Icon(
                      isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                      color: Colors.white,
                      size: 26,
                    ),
                  ),
                ),
                const SizedBox(width: 14),

                // Recording Information
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              recording.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          if (recording.isFavorite) ...[
                            const SizedBox(width: 6),
                            const Icon(
                              Icons.star_rounded,
                              size: 18,
                              color: AppTheme.accentAmber,
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(
                            recording.formattedDuration,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: isPlaying
                                  ? AppTheme.primaryColor
                                  : const Color(0xFF94A3B8),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '•  ${recording.formattedDate}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Context Menu
                PopupMenuButton<String>(
                  icon: const Icon(
                    Icons.more_vert_rounded,
                    color: Color(0xFF94A3B8),
                  ),
                  color: AppTheme.darkSurface,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  onSelected: (value) {
                    switch (value) {
                      case 'favorite':
                        onToggleFavorite();
                        break;
                      case 'rename':
                        onRename();
                        break;
                      case 'share':
                        onShare();
                        break;
                      case 'delete':
                        onDelete();
                        break;
                    }
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem(
                      value: 'favorite',
                      child: Row(
                        children: [
                          Icon(
                            recording.isFavorite
                                ? Icons.star_border_rounded
                                : Icons.star_rounded,
                            color: AppTheme.accentAmber,
                            size: 20,
                          ),
                          const SizedBox(width: 12),
                          Text(
                            recording.isFavorite ? 'Unfavorite' : 'Favorite',
                            style: const TextStyle(color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'rename',
                      child: Row(
                        children: [
                          Icon(Icons.edit_rounded, color: Colors.white70, size: 20),
                          SizedBox(width: 12),
                          Text('Rename', style: TextStyle(color: Colors.white)),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'share',
                      child: Row(
                        children: [
                          Icon(Icons.share_rounded, color: Colors.white70, size: 20),
                          SizedBox(width: 12),
                          Text('Share', style: TextStyle(color: Colors.white)),
                        ],
                      ),
                    ),
                    const PopupMenuDivider(),
                    const PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          Icon(Icons.delete_outline_rounded, color: AppTheme.accentRed, size: 20),
                          SizedBox(width: 12),
                          Text('Delete', style: TextStyle(color: AppTheme.accentRed)),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
