import { offsetMeters } from './geo';
import { buildOverpassQuery, pickName } from './naming';

const AT = { lat: 35.681236, lng: 139.767125 };

function node(id: number, north: number, tags: Record<string, string>) {
  const p = offsetMeters(AT, north, 0);
  return { type: 'node', id, lat: p.lat, lon: p.lng, tags };
}
function way(id: number, north: number, tags: Record<string, string>) {
  const p = offsetMeters(AT, north, 0);
  return { type: 'way', id, center: { lat: p.lat, lon: p.lng }, tags };
}

describe('buildOverpassQuery', () => {
  it('半径と座標を含む', () => {
    const q = buildOverpassQuery(AT, 50);
    expect(q).toContain('around:50,35.681236,139.767125');
    expect(q).toContain('[out:json]');
    expect(q).toContain('out center tags');
  });
});

describe('pickName', () => {
  it('最も近い名前付きのお店・建物を選ぶ', () => {
    const json = {
      elements: [
        node(1, 30, { name: '遠いカフェ', amenity: 'cafe' }),
        way(2, 10, { name: '近いビル', building: 'yes' }),
      ],
    };
    expect(pickName(json, AT)).toBe('近いビル');
  });

  it('道路の名前は使わない', () => {
    const json = {
      elements: [way(1, 2, { name: '国道1号', highway: 'primary' }), node(2, 40, { name: 'ローソン', shop: 'convenience' })],
    };
    expect(pickName(json, AT)).toBe('ローソン');
  });

  it('駅は使う', () => {
    expect(pickName({ elements: [node(1, 5, { name: '東京', railway: 'station' })] }, AT)).toBe('東京');
  });

  it('name:ja を優先する', () => {
    expect(pickName({ elements: [node(1, 5, { name: 'Tokyo Tower', 'name:ja': '東京タワー', tourism: 'attraction' })] }, AT)).toBe(
      '東京タワー',
    );
  });

  it('候補が無ければ null', () => {
    expect(pickName({ elements: [] }, AT)).toBeNull();
    expect(pickName({ elements: [way(1, 2, { name: '国道1号', highway: 'primary' })] }, AT)).toBeNull();
  });

  it('壊れた応答は null', () => {
    expect(pickName(null, AT)).toBeNull();
    expect(pickName('oops', AT)).toBeNull();
    expect(pickName({ elements: [{ type: 'node' }, { tags: { name: 'x', shop: 'y' } }] }, AT)).toBeNull();
  });
});
