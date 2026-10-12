import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDate, formatDuration } from '../../src/lib/format';
import { rank, summarize, type RankBy } from '../../src/lib/stats';
import { useData } from '../../src/store/DataProvider';
import { TrackingBanner } from '../../src/ui/TrackingBanner';
import { COLORS, SPACING } from '../../src/ui/theme';

const TOGGLES: { by: RankBy; label: string }[] = [
  { by: 'count', label: '回数順' },
  { by: 'duration', label: '時間順' },
];

export default function RankingScreen() {
  const { places, visits, loading } = useData();
  const [by, setBy] = useState<RankBy>('count');
  const ranked = useMemo(() => rank(summarize(places, visits), by), [places, visits, by]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Text style={styles.title}>ランキング</Text>
      <TrackingBanner />
      <View style={styles.toggles}>
        {TOGGLES.map((t) => (
          <Pressable
            key={t.by}
            onPress={() => setBy(t.by)}
            style={[styles.toggle, by === t.by && styles.toggleOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: by === t.by }}
          >
            <Text style={[styles.toggleText, by === t.by && styles.toggleTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={ranked}
        keyExtractor={(s) => String(s.placeId)}
        renderItem={({ item, index }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/place/${item.placeId}`)}>
            <Text style={styles.rank}>{index + 1}</Text>
            <View style={styles.rowMain}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.sub}>
                合計 {formatDuration(item.totalMs)}・最終 {formatDate(item.lastAt)}
              </Text>
            </View>
            <Text style={styles.count}>{item.count}回</Text>
          </Pressable>
        )}
        ListEmptyComponent={loading ? null : <Text style={styles.empty}>まだ記録がありません。</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  toggles: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  toggle: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  toggleOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  toggleText: { color: COLORS.textDim },
  toggleTextOn: { color: '#FFFFFF', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.line,
  },
  rank: { width: 28, fontSize: 18, fontWeight: '700', color: COLORS.textDim, textAlign: 'center' },
  rowMain: { flex: 1 },
  name: { fontSize: 16, color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.textDim, marginTop: 2 },
  count: { fontSize: 18, fontWeight: '700', color: COLORS.accent, fontVariant: ['tabular-nums'] },
  empty: { textAlign: 'center', color: COLORS.textDim, marginTop: 80 },
});
