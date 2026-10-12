import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { COLORS } from '../../src/ui/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textDim,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: '履歴', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>☰</Text> }}
      />
      <Tabs.Screen
        name="ranking"
        options={{ title: 'ランキング', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>♛</Text> }}
      />
      <Tabs.Screen
        name="map"
        options={{ title: '地図', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>◉</Text> }}
      />
    </Tabs>
  );
}
