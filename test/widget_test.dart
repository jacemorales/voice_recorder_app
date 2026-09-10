import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:voice_recorder_app/main.dart';

void main() {
  testWidgets('App launches and allows tab switching', (WidgetTester tester) async {
    await tester.pumpWidget(const VoiceRecorderApp());
    await tester.pump();

    // Initially on Recorder tab
    expect(find.text('Voice Recorder'), findsOneWidget);
    expect(find.text('Recorder'), findsOneWidget);

    // Tap Library tab
    await tester.tap(find.byIcon(Icons.graphic_eq_rounded));
    await tester.pump();

    // Now on Library tab
    expect(find.text('My Recordings'), findsOneWidget);
    expect(find.text('Library'), findsOneWidget);
  });
}
