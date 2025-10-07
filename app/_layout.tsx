import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="recorder"
        options={{
          title: 'Recorder',
        }}
      />
      <Tabs.Screen
        name="recordings"
        options={{
          title: 'Recordings',
        }}
      />
    </Tabs>
  );
}
