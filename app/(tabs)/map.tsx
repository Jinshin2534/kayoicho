import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toMarkers } from '../../src/lib/markers';
import { summarize } from '../../src/lib/stats';
import { PlaceMap } from '../../src/map/PlaceMap';
import { useData } from '../../src/store/DataProvider';
import { TrackingBanner } from '../../src/ui/TrackingBanner';
import { COLORS, SPACING } from '../../src/ui/theme';

export default function MapScreen() {
  const { places, visits, loading } = useData();
  const markers = useMemo(() => toMarkers(summarize(places, visits)), [places, visits]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <TrackingBanner />
      <View style={styles.mapArea}>
        <PlaceMap markers={markers} />
        {!loading && markers.length === 0 && (
          <View style={styles.hint}>
            <Text style={styles.hintText}>行った建物がここに丸で出ます。よく行くほど大きくなります。</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  mapArea: { flex: 1 },
  hint: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    bottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  hintText: { color: COLORS.textDim, lineHeight: 20 },
});
