import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, useColorScheme, FlatList, TouchableOpacity, Modal, TextInput, Button } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export default function RecordingsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  type Recording = { id: string; name: string; uri: string; duration: string };
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<{ id: string; name: string; uri: string; duration: string } | null>(null);
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

  function openRenameModal(recording: { id: string; name: string; uri: string; duration: string }) {
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
    <View style={[styles.card, theme.card]}>
      <View>
        <Text style={[styles.cardTitle, theme.text]}>{item.name}</Text>
        <Text style={[styles.cardSubtitle, theme.subtleText]}>{item.duration}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => playRecording(item.uri)} style={styles.actionButton}>
          <Text style={{ color: '#007AFF' }}>Play</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openRenameModal(item)} style={styles.actionButton}>
          <Text style={{ color: '#ff9500' }}>Rename</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteRecording(item.id)} style={styles.actionButton}>
          <Text style={{ color: '#ff3b30' }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      <Text style={[styles.title, theme.text]}>My Recordings</Text>
      <FlatList
        data={recordings}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        style={styles.list}
        ListEmptyComponent={<Text style={[theme.text, { textAlign: 'center' }]}>No recordings yet.</Text>}
      />
      <Link href="/recorder" asChild>
        <button title="New Recording" style={{ margin: 20 }}/>
      </Link>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={[styles.modalView, theme.card]}>
            <Text style={[styles.modalText, theme.text]}>Rename Recording</Text>
            <TextInput
              style={[styles.input, theme.text, { borderColor: theme.subtleText.color }]}
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
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  list: {
    width: '100%',
  },
  card: {
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 20,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    fontSize: 14,
    marginTop: 5,
  },
  cardActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 15,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    height: 40,
    width: 200,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
  },
});
