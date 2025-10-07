import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, useColorScheme } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StyledButton from '../components/StyledButton';
import { Waveform } from '@kaannn/react-native-waveform';

export default function RecorderScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [lastRecordingUri, setLastRecordingUri] = useState<string | null>(null);
  const [waveform, setWaveform] = useState<number[]>([]);

  useEffect(() => {
    requestPermission();
  }, []);

  useEffect(() => {
    return sound
      ? () => {
        console.log('Unloading Sound');
        sound.unloadAsync();
      }
      : undefined;
  }, [sound]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recordingStatus === 'recording') {
      interval = setInterval(async () => {
        const status = await recording?.getStatusAsync();
        if (status?.isRecording) {
          setDuration(status.durationMillis);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recording, recordingStatus]);

  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') {
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          isMeteringEnabled: true,
        }
      );
      setRecording(recording);
      setRecordingStatus('recording');
      setLastRecordingUri(null);
      setDuration(0);
      setWaveform([]);

      recording.setOnRecordingStatusUpdate(status => {
        if (status.isRecording && status.metering) {
          setWaveform(prev => [...prev, status.metering || 0]);
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
    setLastRecordingUri(uri);
    setWaveform([]);
    console.log('Recording stopped and stored at', uri);
    saveRecording(uri, duration);
  }

  async function saveRecording(uri: string, durationMillis: number) {
    try {
      const recordingDir = FileSystem.documentDirectory + 'recordings/';
      const dirInfo = await FileSystem.getInfoAsync(recordingDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(recordingDir, { intermediates: true });
      }
      const fileName = `recording-${Date.now()}.caf`;
      const newUri = recordingDir + fileName;
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
    return `${minutes}:${(parseInt(seconds) < 10 ? '0' : '')}${seconds}`;
  }

  const getRecordingButton = () => {
    switch (recordingStatus) {
      case 'idle':
        return <StyledButton title="Start Recording" onPress={startRecording} />;
      case 'recording':
        return (
          <View style={styles.buttonGroup}>
            <StyledButton title="Pause" onPress={pauseRecording} style={styles.secondaryButton} />
            <StyledButton title="Stop" onPress={stopRecording} />
          </View>
        );
      case 'paused':
        return (
          <View style={styles.buttonGroup}>
            <StyledButton title="Resume" onPress={resumeRecording} style={styles.secondaryButton} />
            <StyledButton title="Stop" onPress={stopRecording} />
          </View>
        );
      case 'stopped':
        return <StyledButton title="Start New Recording" onPress={startRecording} />;
      default:
        return null;
    }
  }

  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      <Text style={[styles.title, theme.text]}>Voice Recorder</Text>
      <Text style={[styles.durationText, theme.subtleText]}>{formatDuration(duration)}</Text>
      {recordingStatus === 'recording' && (
        <Waveform
          data={waveform}
          style={styles.waveform}
          waveColor={theme.text.color}
          barWidth={5}
          barGap={2}
        />
      )}
      <View style={styles.controlsContainer}>
        {getRecordingButton()}
      </View>
      {lastRecordingUri && recordingStatus === 'stopped' && (
        <View style={[styles.playbackContainer, theme.card]}>
          <Text style={[styles.playbackText, theme.text]}>Recording saved!</Text>
          <StyledButton title={isPlaying ? "Pause" : "Play Last Recording"} onPress={handlePlayback} />
        </View>
      )}
    </SafeAreaView>
  );
};

const lightTheme = {
  container: { backgroundColor: '#f5f5f5' },
  card: { backgroundColor: '#ffffff' },
  text: { color: '#333333' },
  subtleText: { color: '#666666' },
};

const darkTheme = {
  container: { backgroundColor: '#121212' },
  card: { backgroundColor: '#1e1e1e' },
  text: { color: '#ffffff' },
  subtleText: { color: '#aaaaaa' },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  durationText: {
    fontSize: 48,
    fontWeight: '200',
    marginBottom: 30,
  },
  waveform: {
    width: '80%',
    height: 100,
    marginBottom: 20,
  },
  controlsContainer: {
    marginBottom: 30,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
  },
  secondaryButton: {
    backgroundColor: '#ffc107',
  },
  playbackContainer: {
    marginTop: 20,
    alignItems: 'center',
    padding: 20,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  playbackText: {
    fontSize: 18,
    marginBottom: 10,
  }
});
