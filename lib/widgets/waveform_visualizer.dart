import 'dart:math';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class WaveformVisualizer extends StatelessWidget {
  final List<double> amplitudes;
  final bool isRecording;
  final Color activeColor;

  const WaveformVisualizer({
    super.key,
    required this.amplitudes,
    required this.isRecording,
    this.activeColor = AppTheme.accentRed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 90,
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? AppTheme.darkSurface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.08),
          width: 1,
        ),
      ),
      child: CustomPaint(
        painter: _WaveformPainter(
          amplitudes: amplitudes,
          isRecording: isRecording,
          activeColor: activeColor,
        ),
      ),
    );
  }
}

class _WaveformPainter extends CustomPainter {
  final List<double> amplitudes;
  final bool isRecording;
  final Color activeColor;

  _WaveformPainter({
    required this.amplitudes,
    required this.isRecording,
    required this.activeColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final barWidth = 4.0;
    final barGap = 3.0;
    final maxBars = (size.width / (barWidth + barGap)).floor();

    final visibleAmplitudes = amplitudes.length > maxBars
        ? amplitudes.sublist(amplitudes.length - maxBars)
        : amplitudes;

    final centerY = size.height / 2;

    if (visibleAmplitudes.isEmpty) {
      final paint = Paint()
        ..color = activeColor.withValues(alpha: 0.3)
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.round;

      canvas.drawLine(
        Offset(0, centerY),
        Offset(size.width, centerY),
        paint,
      );
      return;
    }

    final totalBars = visibleAmplitudes.length;
    final startX = max(0.0, (size.width - (totalBars * (barWidth + barGap))) / 2);

    for (int i = 0; i < totalBars; i++) {
      final x = startX + i * (barWidth + barGap);
      final amp = visibleAmplitudes[i].clamp(0.05, 1.0);
      final barHeight = max(6.0, amp * (size.height - 10));

      final isLastFew = i >= totalBars - 3 && isRecording;
      final opacity = isLastFew ? 1.0 : 0.75 + (i / totalBars) * 0.25;

      final paint = Paint()
        ..color = activeColor.withValues(alpha: opacity)
        ..style = PaintingStyle.fill;

      final rect = RRect.fromLTRBR(
        x,
        centerY - (barHeight / 2),
        x + barWidth,
        centerY + (barHeight / 2),
        const Radius.circular(2),
      );

      canvas.drawRRect(rect, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _WaveformPainter oldDelegate) {
    return oldDelegate.amplitudes.length != amplitudes.length ||
        oldDelegate.isRecording != isRecording;
  }
}
