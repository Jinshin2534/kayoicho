/**
 * HTML の script タグの中に埋めても壊れない JSON。
 * `<` `>` を潰すことで `</script>` による脱出を、U+2028/U+2029 を潰すことで
 * JS の行区切り扱いを防ぐ。どれも \uXXXX なので読み戻すと元に戻る。
 */
export function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** マーカーが増えても作り直さないこと(WebView がリロードされる)。差し替えは window.kayoi.setMarkers */
export function buildMapHtml(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #EDEAE4; }
  .leaflet-container { background: #EDEAE4; }
  .leaflet-control-attribution { font-size: 9px; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<script>
(function () {
  function post(message) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
  if (typeof L === 'undefined') { post({ type: 'loadFailed' }); return; }

  try {
    var map = L.map('map', { zoomControl: false }).setView([35.681236, 139.767125], 12);
    map.attributionControl.setPrefix('');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    var layer = L.layerGroup().addTo(map);
    var fitted = false;

    window.kayoi = {
      setMarkers: function (markers) {
        layer.clearLayers();
        var bounds = [];
        for (var i = 0; i < markers.length; i++) {
          var m = markers[i];
          var label = document.createElement('div');
          label.textContent = m.label;
          L.circleMarker([m.lat, m.lng], {
            radius: m.radius,
            fillColor: '#2F6B5E',
            fillOpacity: 0.55,
            color: '#FFFFFF',
            weight: 2
          }).bindPopup(label).addTo(layer);
          bounds.push([m.lat, m.lng]);
        }
        if (!fitted && bounds.length > 0) {
          map.fitBounds(bounds, { maxZoom: 16, padding: [40, 40] });
          fitted = true;
        }
      }
    };

    // コンテナの高さが後から決まると Leaflet が古いサイズのまま描くので測り直す
    var el = document.getElementById('map');
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function () {
        try { map.invalidateSize(); } catch (e) {}
      }).observe(el);
    }
    setTimeout(function () { try { map.invalidateSize(); } catch (e) {} }, 100);

    post({ type: 'ready' });
  } catch (e) {
    post({ type: 'loadFailed' });
  }
})();
</script>
</body>
</html>`;
}
