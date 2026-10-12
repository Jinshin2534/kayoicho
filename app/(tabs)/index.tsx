import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatClock, formatDayTitle, formatDuration } from '../../src/lib/format';
import { groupByDay } from '../../src/lib/stats';
import { useData } from '../../src/store/DataProvider';
import { TrackingBanner } from '../../src/ui/TrackingBanner';
import { COLORS, SPACING } from '../../src/ui/theme';

export default function HistoryScreen() {
  const { places, visits, loading, refresh } = useData();
  const [refreshing, setRefreshing] = useState(false);
  const now = Date.now();
  const sections = useMemo(
    () => groupByDay(places, visits).map((s) => ({ title: formatDayTitle(s.dayStart, now), key: s.dayKey, data: s.items })),
    [places, visits, now],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Text style={styles.title}>履歴</Text>
      <TrackingBanner />
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.visitId)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderSectionHeader={({ section }) => <Text style={styles.day}>{section.title}</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/place/${item.placeId}`)}>
            <Text style={styles.time}>
              {formatClock(item.arrivedAt)}〜{formatClock(item.departedAt)}
            </Text>
            <View style={styles.rowMain}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.sub}>{formatDuration(item.departedAt - item.arrivedAt)}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? null : (
            <Text style={styles.empty}>まだ記録がありません。{'\n'}建物に5分以上いると、ここに出ます。</Text>
          )
        }
        contentContainerStyle={{ paddingBottom: SPACING.xl }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  day: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDim,
    backgroundColor: COLORS.bg,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
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
  time: { width: 92, fontVariant: ['tabular-nums'], color: COLORS.textDim },
  rowMain: { flex: 1 },
  name: { fontSize: 16, color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.textDim, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.textDim, marginTop: 80, lineHeight: 22 },
});
