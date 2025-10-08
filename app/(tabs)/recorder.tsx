import Waveform from '@kaannn/react-native-waveform';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, View } from 'react-native';
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
        return <StyledButton title="Start Recording" onPress={startRecording} />;
      case 'recording':
        return (
          <View className="flex-row justify-around w-3/5">
            <StyledButton title="Pause" onPress={pauseRecording} className="bg-yellow-500" />
            <StyledButton title="Stop" onPress={stopRecording} />
          </View>
        );
      case 'paused':
        return (
          <View className="flex-row justify-around w-3/5">
            <StyledButton title="Resume" onPress={resumeRecording} className="bg-yellow-500" />
            <StyledButton title="Stop" onPress={stopRecording} />
          </View>
        );
      case 'stopped':
        return <StyledButton title="Start New Recording" onPress={startRecording} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-gray-100">
      <Text className="text-4xl font-bold mb-2">Voice Recorder</Text>
      <Text className="text-5xl font-thin mb-8">{formatDuration(duration)}</Text>
      {recordingStatus === 'recording' && (
        <Waveform
          data={waveform}
          waveColor="#333"
          barWidth={5}
          barGap={2}
          style={{ width: '80%', height: 100, marginBottom: 20 }}
        />
      )}
      <View className="mb-8">{getRecordingButton()}</View>
      {lastRecordingUri && recordingStatus === 'stopped' && (
        <View className="mt-5 items-center p-5 rounded-lg bg-white shadow-md">
          <Text className="text-lg mb-2">Recording saved!</Text>
          <StyledButton
            title={isPlaying ? 'Pause' : 'Play Last Recording'}
            onPress={handlePlayback}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
