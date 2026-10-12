import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatClock, formatDate, formatDuration } from '../../src/lib/format';
import { displayName, summarize } from '../../src/lib/stats';
import { useData } from '../../src/store/DataProvider';
import { COLORS, SPACING } from '../../src/ui/theme';

export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const placeId = Number(id);
  const { places, visits, rename } = useData();
  const place = places.find((p) => p.id === placeId);
  const placeVisits = useMemo(
    () => visits.filter((v) => v.placeId === placeId).sort((a, b) => b.arrivedAt - a.arrivedAt),
    [visits, placeId],
  );
  const stats = useMemo(() => (place ? summarize([place], placeVisits)[0] : undefined), [place, placeVisits]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  if (!place) {
    return <Text style={styles.empty}>この建物は見つかりませんでした。</Text>;
  }

  const startEdit = () => {
    setDraft(place.name ?? '');
    setEditing(true);
  };
  const save = async () => {
    const name = draft.trim();
    if (name !== '') await rename(place.id, name);
    setEditing(false);
  };

  return (
    <>
      <Stack.Screen options={{ title: displayName(place) }} />
      <FlatList
        style={styles.screen}
        data={placeVisits}
        keyExtractor={(v) => String(v.id)}
        ListHeaderComponent={
          <View style={styles.header}>
            {editing ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.input}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="名前"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={save}
                  maxLength={40}
                />
                <Pressable style={styles.saveButton} onPress={save} accessibilityRole="button">
                  <Text style={styles.saveText}>保存</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.editRow}>
                <Text style={styles.name}>{displayName(place)}</Text>
                <Pressable onPress={startEdit} accessibilityRole="button">
                  <Text style={styles.link}>名前を変える</Text>
                </Pressable>
              </View>
            )}
            {place.namingPending && place.nameSource !== 'user' && (
              <Text style={styles.note}>名前を地図データから探しています…</Text>
            )}
            {stats && (
              <View style={styles.statsRow}>
                <Stat label="回数" value={`${stats.count}回`} />
                <Stat label="合計" value={formatDuration(stats.totalMs)} />
                <Stat label="初めて" value={formatDate(stats.firstAt)} />
              </View>
            )}
            <Text style={styles.section}>行った日時</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>
              {formatDate(item.arrivedAt)} {formatClock(item.arrivedAt)}〜{formatClock(item.departedAt)}
            </Text>
            <Text style={styles.rowSub}>{formatDuration(item.departedAt - item.arrivedAt)}</Text>
          </View>
        )}
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: SPACING.lg, gap: SPACING.md },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  name: { flex: 1, fontSize: 22, fontWeight: '700', color: COLORS.text },
  link: { color: COLORS.accent, fontWeight: '600' },
  input: {
    flex: 1,
    fontSize: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  saveButton: { backgroundColor: COLORS.accent, borderRadius: 8, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  saveText: { color: '#FFFFFF', fontWeight: '600' },
  note: { color: COLORS.textDim, fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  stat: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.md },
  statLabel: { fontSize: 12, color: COLORS.textDim },
  statValue: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  section: { fontSize: 13, fontWeight: '700', color: COLORS.textDim, marginTop: SPACING.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.line,
  },
  rowText: { color: COLORS.text, fontVariant: ['tabular-nums'] },
  rowSub: { color: COLORS.textDim },
  empty: { textAlign: 'center', color: COLORS.textDim, marginTop: 80 },
});
