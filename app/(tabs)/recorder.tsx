import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useState } from 'react';
import { Platform, SafeAreaView, Text, View } from 'react-native';

let Waveform: any = null;
if (Platform.OS !== 'web') {
  try {
    Waveform = require('@kaannn/react-native-waveform').default;
  } catch (e) {
    Waveform = null;
  }
}
import StyledButton from '../../components/StyledButton';

export default function RecorderScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [mediaLibraryPermissionResponse, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [lastRecordingUri, setLastRecordingUri] = useState<string | null>(null);
  const [waveform, setWaveform] = useState<number[]>([]);

  useEffect(() => {
    requestPermission();
    requestMediaLibraryPermission();
  }, [requestPermission, requestMediaLibraryPermission]);

  useEffect(() => {
    return sound
      ? () => {
        console.log('Unloading Sound');
        sound.unloadAsync();
      }
      : undefined;
  }, [sound]);

  useEffect(() => {
    let interval: number | null = null;
    if (recordingStatus === 'recording') {
      interval = setInterval(async () => {
        const status = await recording?.getStatusAsync();
        if (status?.isRecording) {
          setDuration(status.durationMillis);
        }
      }, 1000);
    }
    return () => {
      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, [recording, recordingStatus]);

  const normalizeWaveform = (db: number) => {
    const minDb = -160;
    const maxDb = 0;
    const normalized = (db - minDb) / (maxDb - minDb);
    return Math.max(0, Math.min(1, normalized));
  };

  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') {
        const audioResponse = await requestPermission();
        if (audioResponse?.status !== 'granted') {
          console.warn('Permission to record audio was denied');
          return;
        }
      }

      if (mediaLibraryPermissionResponse?.status !== 'granted') {
        const mediaResponse = await requestMediaLibraryPermission();
        if (mediaResponse?.status !== 'granted') {
          console.warn('Permission to access media library was denied');
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording: newRecording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });

      setRecording(newRecording);
      setRecordingStatus('recording');
      setLastRecordingUri(null);
      setDuration(0);
      setWaveform([]);

      newRecording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && typeof status.metering === 'number') {
          const normalizedValue = normalizeWaveform(status.metering);
          setWaveform((prev) => [...prev, normalizedValue]);
        }
      });

      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!recording) {
      return;
    }
    console.log('Stopping recording..');
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    setRecordingStatus('stopped');
    setWaveform([]);

    if (uri) {
      setLastRecordingUri(uri);
      console.log('Recording stopped and stored at', uri);
      saveRecording(uri, duration);
    } else {
      console.error('Recording URI is null');
    }
  }

  async function saveRecording(uri: string, durationMillis: number) {
    try {
      const docDir = FileSystem.documentDirectory;

      if (!docDir) {
        throw new Error('FileSystem.documentDirectory is not available');
      }

      const recordingDir = `${docDir}recordings/`;
      const dirInfo = await FileSystem.getInfoAsync(recordingDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(recordingDir, { intermediates: true });
      }

      const fileName = `recording-${Date.now()}.caf`;
      const newUri = `${recordingDir}${fileName}`;
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      const recordings = JSON.parse(await AsyncStorage.getItem('recordings') || '[]');
      const newRecording = {
        id: `rec-${Date.now()}`,
        name: `Recording ${recordings.length + 1}`,
        uri: newUri,
        duration: formatDuration(durationMillis),
      };
      const updatedRecordings = [...recordings, newRecording];
      await AsyncStorage.setItem('recordings', JSON.stringify(updatedRecordings));
      console.log('Recording saved successfully');
    } catch (error) {
      console.error('Failed to save recording', error);
    }
  }

  async function pauseRecording() {
    if (!recording) {
      return;
    }
    try {
      await recording.pauseAsync();
      setRecordingStatus('paused');
      console.log('Recording paused');
    } catch (error) {
      console.error('Failed to pause recording', error);
    }
  }

  async function resumeRecording() {
    if (!recording) {
      return;
    }
    try {
      await recording.startAsync();
      setRecordingStatus('recording');
      console.log('Recording resumed');
    } catch (error) {
      console.error('Failed to resume recording', error);
    }
  }

  async function handlePlayback() {
    if (!lastRecordingUri) return;

    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } else {
      console.log('Loading Sound');
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: lastRecordingUri },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          setIsPlaying(false);
          setSound(null);
        }
      });
    }
  }

  const formatDuration = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${parseInt(seconds) < 10 ? '0' : ''}${seconds}`;
  };

  const getRecordingButton = () => {
    switch (recordingStatus) {
      case 'idle':
        return <StyledButton title="🎙️ Start Recording" onPress={startRecording} className="bg-red-500 px-8 py-4" />;
      case 'recording':
        return (
          <View className="flex-row justify-center space-x-4">
            <StyledButton title="⏸️ Pause" onPress={pauseRecording} className="bg-amber-500 mr-3" />
            <StyledButton title="⏹️ Stop" onPress={stopRecording} className="bg-slate-700" />
          </View>
        );
      case 'paused':
        return (
          <View className="flex-row justify-center space-x-4">
            <StyledButton title="▶️ Resume" onPress={resumeRecording} className="bg-amber-500 mr-3" />
            <StyledButton title="⏹️ Stop" onPress={stopRecording} className="bg-slate-700" />
          </View>
        );
      case 'stopped':
        return <StyledButton title="🎙️ Start New Recording" onPress={startRecording} className="bg-red-500 px-8 py-4" />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-between items-center py-10 px-6">
      <View className="items-center mt-6">
        <Text className="text-3xl font-extrabold text-slate-800 tracking-tight">Voice Recorder</Text>
        <Text className="text-sm font-medium text-slate-500 mt-1">Tap record to begin audio capture</Text>
      </View>

      <View className="items-center justify-center bg-white rounded-3xl p-8 shadow-sm border border-slate-100 w-11/12 max-w-sm">
        <Text className="text-6xl font-light text-slate-800 tracking-wider mb-6 font-mono">
          {formatDuration(duration)}
        </Text>

        {recordingStatus === 'recording' && (
          Waveform ? (
            <Waveform
              data={waveform}
              waveColor="#ef4444"
              barWidth={5}
              barGap={2}
              style={{ width: '100%', height: 80, marginBottom: 16 }}
            />
          ) : (
            <View className="w-full h-20 mb-4 flex-row items-center justify-center bg-slate-50 rounded-xl p-2">
              {waveform.length > 0 ? (
                waveform.slice(-20).map((val, idx) => (
                  <View
                    key={idx}
                    style={{
                      width: 4,
                      height: Math.max(8, val * 60),
                      backgroundColor: '#ef4444',
                      marginHorizontal: 2,
                      borderRadius: 2,
                    }}
                  />
                ))
              ) : (
                <Text className="text-slate-400 text-xs">Recording audio...</Text>
              )}
            </View>
          )
        )}

        <View className="mt-2 w-full items-center">{getRecordingButton()}</View>
      </View>

      {lastRecordingUri && recordingStatus === 'stopped' ? (
        <View className="w-11/12 max-w-sm items-center p-5 rounded-2xl bg-emerald-50 border border-emerald-100 mb-4 shadow-sm">
          <Text className="text-base font-semibold text-emerald-800 mb-3">✓ Recording Saved!</Text>
          <StyledButton
            title={isPlaying ? '⏸️ Pause Playback' : '▶️ Play Last Recording'}
            onPress={handlePlayback}
            className="bg-emerald-600 px-6"
          />
        </View>
      ) : (
        <View className="h-16" />
      )}
    </SafeAreaView>
  );
}
