import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Button, FlatList, Modal, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function RecordingsScreen() {
  type Recording = { id: string; name: string; uri: string; duration: string };
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [newName, setNewName] = useState('');

  async function loadRecordings() {
    try {
      const recordingsString = await AsyncStorage.getItem('recordings');
      if (recordingsString) {
        setRecordings(JSON.parse(recordingsString));
      }
    } catch (error) {
      console.error('Failed to load recordings', error);
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      loadRecordings();
    }, [])
  );

  useEffect(() => {
    return sound
      ? () => {
        console.log('Unloading Sound');
        sound.unloadAsync();
      }
      : undefined;
  }, [sound]);

  async function playRecording(item: Recording) {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
      if (playingId === item.id) {
        setPlayingId(null);
        return;
      }
    }
    console.log('Loading Sound for playback');
    const { sound: newSound } = await Audio.Sound.createAsync({ uri: item.uri });
    setSound(newSound);
    setPlayingId(item.id);
    console.log('Playing Sound');
    await newSound.playAsync();
    newSound.setOnPlaybackStatusUpdate((status) => {
      if ('didJustFinish' in status && status.didJustFinish) {
        setPlayingId(null);
      }
    });
  }

  async function deleteRecording(id: string) {
    try {
      const recordingToDelete = recordings.find(rec => rec.id === id);
      if (recordingToDelete) {
        await FileSystem.deleteAsync(recordingToDelete.uri, { idempotent: true });
      }
      const updatedRecordings = recordings.filter(rec => rec.id !== id);
      setRecordings(updatedRecordings);
      await AsyncStorage.setItem('recordings', JSON.stringify(updatedRecordings));
    } catch (error) {
      console.error("Failed to delete recording", error);
    }
  }

  function openRenameModal(recording: Recording) {
    setSelectedRecording(recording);
    setNewName(recording.name);
    setModalVisible(true);
  }

  async function renameRecording() {
    if (!selectedRecording) return;
    try {
      const updatedRecordings = recordings.map(rec => {
        if (rec.id === selectedRecording.id) {
          return { ...rec, name: newName };
        }
        return rec;
      });
      setRecordings(updatedRecordings);
      await AsyncStorage.setItem('recordings', JSON.stringify(updatedRecordings));
      setModalVisible(false);
      setSelectedRecording(null);
      setNewName('');
    } catch (error) {
      console.error("Failed to rename recording", error);
    }
  }

  const renderItem = ({ item }: { item: Recording }) => (
    <View className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm my-2 mx-4 flex-row justify-between items-center">
      <View className="flex-1 pr-3">
        <Text className="text-base font-bold text-slate-800">{item.name}</Text>
        <Text className="text-xs text-slate-500 mt-1 font-mono">{item.duration}</Text>
      </View>
      <View className="flex-row items-center space-x-2">
        <TouchableOpacity
          onPress={() => playRecording(item)}
          className="bg-blue-50 border border-blue-100 px-3 py-2 rounded-xl mr-2"
        >
          <Text className="text-blue-600 font-semibold text-xs">
            {playingId === item.id ? '⏸ Pause' : '▶ Play'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => openRenameModal(item)}
          className="bg-slate-100 px-3 py-2 rounded-xl mr-2"
        >
          <Text className="text-slate-700 font-semibold text-xs">✎ Rename</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => deleteRecording(item.id)}
          className="bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl"
        >
          <Text className="text-rose-600 font-semibold text-xs">✕ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50 pt-8">
      <View className="items-center mb-6">
        <Text className="text-3xl font-extrabold text-slate-800 tracking-tight">My Recordings</Text>
        <Text className="text-sm font-medium text-slate-500 mt-1">Manage and playback recorded audio clips</Text>
      </View>

      <FlatList
        data={recordings}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        className="w-full"
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-16 px-6">
            <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Text className="text-2xl">🎙️</Text>
            </View>
            <Text className="text-slate-600 font-medium text-base text-center">No recordings yet</Text>
            <Text className="text-slate-400 text-xs text-center mt-1">Recordings created in the Recorder tab will appear here</Text>
          </View>
        }
      />

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-slate-900/40 p-4">
          <View className="w-full max-w-sm bg-white rounded-3xl p-6 items-center shadow-lg border border-slate-100">
            <Text className="mb-4 text-center text-lg font-bold text-slate-800">Rename Recording</Text>
            <TextInput
              className="w-full h-11 border border-slate-200 px-4 rounded-xl bg-slate-50 text-slate-800 text-sm mb-5"
              onChangeText={setNewName}
              value={newName}
              placeholder="Recording name"
              placeholderTextColor="#94a3b8"
            />
            <View className="flex-row w-full space-x-3">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="flex-1 py-3 bg-slate-100 rounded-xl items-center mr-2"
              >
                <Text className="text-slate-700 font-semibold text-sm">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={renameRecording}
                className="flex-1 py-3 bg-blue-600 rounded-xl items-center"
              >
                <Text className="text-white font-semibold text-sm">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
