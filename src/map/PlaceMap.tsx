import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { buildMapHtml, safeJson } from '../lib/leafletHtml';
import type { MapMarker } from '../lib/markers';
import { COLORS, SPACING } from '../ui/theme';

/** Leaflet が CDN から読めないと判断するまでの待ち時間 */
const LOAD_TIMEOUT_MS = 10_000;

export function PlaceMap({ markers }: { markers: readonly MapMarker[] }) {
  const webRef = useRef<WebView>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const html = useMemo(() => buildMapHtml(), []);

  const push = useCallback(() => {
    webRef.current?.injectJavaScript(`window.kayoi && window.kayoi.setMarkers(${safeJson(markers)}); true;`);
  }, [markers]);

  useEffect(() => {
    if (status === 'ready') push();
  }, [status, push]);

  useEffect(() => {
    const timer = setTimeout(() => setStatus((s) => (s === 'loading' ? 'failed' : s)), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const onMessage = (event: WebViewMessageEvent) => {
    let type: unknown;
    try {
      type = (JSON.parse(event.nativeEvent.data) as { type?: unknown }).type;
    } catch {
      return;
    }
    if (type === 'ready') setStatus('ready');
    if (type === 'loadFailed') setStatus((s) => (s === 'ready' ? s : 'failed'));
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        style={styles.web}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={onMessage}
        onError={() => setStatus('failed')}
        javaScriptEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
      />
      {status === 'failed' && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>地図を読み込めませんでした。通信できる場所でもう一度開いてください。</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.mapBg },
  web: { flex: 1, backgroundColor: COLORS.mapBg },
  overlay: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    top: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  overlayText: { color: COLORS.text, lineHeight: 20 },
});
