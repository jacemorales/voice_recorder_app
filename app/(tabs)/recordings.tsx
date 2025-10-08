import { useFocusEffect } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, FlatList, TouchableOpacity, Modal, TextInput, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import StyledButton from '../../components/StyledButton';

export default function RecordingsScreen() {
  type Recording = { id: string; name: string; uri: string; duration: string };
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
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

  async function playRecording(uri: string) {
    if (sound) {
      await sound.unloadAsync();
    }
    console.log('Loading Sound for playback');
    const { sound: newSound } = await Audio.Sound.createAsync({ uri });
    setSound(newSound);
    console.log('Playing Sound');
    await newSound.playAsync();
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
    <View className="bg-white p-5 rounded-lg shadow-md my-2 mx-5 flex-row justify-between items-center">
      <View>
        <Text className="text-lg font-bold">{item.name}</Text>
        <Text className="text-sm text-gray-500 mt-1">{item.duration}</Text>
      </View>
      <View className="flex-row">
        <TouchableOpacity onPress={() => playRecording(item.uri)} className="ml-4">
          <Text className="text-blue-500">Play</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openRenameModal(item)} className="ml-4">
          <Text className="text-yellow-500">Rename</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteRecording(item.id)} className="ml-4">
          <Text className="text-red-500">Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 items-center pt-5 bg-gray-100">
      <Text className="text-4xl font-bold mb-5">My Recordings</Text>
      <FlatList
        data={recordings}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        className="w-full"
        ListEmptyComponent={<Text className="text-center text-gray-500">No recordings yet.</Text>}
      />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="m-5 bg-white rounded-2xl p-9 items-center shadow-lg">
            <Text className="mb-4 text-center text-lg font-bold">Rename Recording</Text>
            <TextInput
              className="h-10 w-52 m-3 border border-gray-300 p-2.5 rounded-md"
              onChangeText={setNewName}
              value={newName}
            />
            <Button title="Save" onPress={renameRecording} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
