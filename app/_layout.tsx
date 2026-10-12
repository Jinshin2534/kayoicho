import '../src/services/tracker'; // 位置タスクの定義をアプリ起動時に必ず読み込む
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DataProvider } from '../src/store/DataProvider';
import { COLORS } from '../src/ui/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DataProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ contentStyle: { backgroundColor: COLORS.bg } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="place/[id]" options={{ title: '建物', headerBackTitle: '戻る' }} />
        </Stack>
      </DataProvider>
    </SafeAreaProvider>
  );
}
