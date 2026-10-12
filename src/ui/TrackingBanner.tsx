import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useData } from '../store/DataProvider';
import { COLORS, SPACING } from './theme';

const MESSAGES = {
  notAsked: {
    body: '建物に5分以上いると、自動で記録します。アプリを閉じていても記録できるよう、位置情報を「常に」許可してください。位置情報はこの端末の中だけに保存されます（建物の名前を調べるときだけ、その場所をOpenStreetMapに問い合わせます）。',
    action: '記録をはじめる',
  },
  needsAlways: {
    body: '記録が止まっています。アプリを閉じている間も記録するには、設定で位置情報を「常に」にしてください。',
    action: '設定を開く',
  },
  denied: {
    body: '記録が止まっています。位置情報が許可されていません。',
    action: '設定を開く',
  },
  unavailable: {
    body: '記録が止まっています。この環境では裏での位置取得を始められませんでした（Expo Go では動きません）。',
    action: null,
  },
} as const;

export function TrackingBanner() {
  const { tracking, enableTracking } = useData();
  if (tracking === null || tracking === 'on') return null;
  const message = MESSAGES[tracking];
  const onPress = tracking === 'notAsked' ? enableTracking : () => Linking.openSettings();

  return (
    <View style={styles.banner}>
      <Text style={styles.body}>{message.body}</Text>
      {message.action && (
        <Pressable style={styles.button} onPress={onPress} accessibilityRole="button">
          <Text style={styles.buttonText}>{message.action}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.warnBg,
    gap: SPACING.sm,
  },
  body: { color: COLORS.warn, fontSize: 14, lineHeight: 20 },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.warn,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
});
