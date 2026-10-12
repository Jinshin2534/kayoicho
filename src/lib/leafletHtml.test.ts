import { buildMapHtml, safeJson } from './leafletHtml';

describe('safeJson', () => {
  it('</script> で脱出できない', () => {
    const s = safeJson({ label: '</script><script>alert(1)</script>' });
    expect(s).not.toContain('</script>');
    expect(JSON.parse(s)).toEqual({ label: '</script><script>alert(1)</script>' });
  });
  it('U+2028 をエスケープする', () => {
    expect(safeJson('a b')).toBe('"a\\u2028b"');
  });
});

describe('buildMapHtml', () => {
  const html = buildMapHtml();
  it('Leaflet を版指定で読み込む', () => {
    expect(html).toContain('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
  });
  it('橋渡しの関数と合図を持つ', () => {
    expect(html).toContain('window.kayoi');
    expect(html).toContain("type: 'ready'");
    expect(html).toContain("type: 'loadFailed'");
  });
  it('ラベルは textContent で入れる(HTMLとして解釈しない)', () => {
    expect(html).toContain('textContent');
  });
});
