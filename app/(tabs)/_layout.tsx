import { Tabs } from 'expo-router';
import React from 'react';
import Icon from '../../components/Icon';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF', // Example active tint color
        headerShown: false,
      }}>
      <Tabs.Screen
        name="recorder"
        options={{
          title: 'Recorder',
          tabBarIcon: ({ color }) => <Icon name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="recordings"
        options={{
          title: 'Recordings',
          tabBarIcon: ({ color }) => <Icon name="paperplane.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
