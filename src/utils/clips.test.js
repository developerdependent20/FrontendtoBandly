// Pruebas de la lógica de clips. Se corren con:  node --test src/utils/clips.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_CLIP, fullClips, clipsFor, isDefault, pruneDefaults, normalize, carve, splitAt, moveClips,
  trimClip, duplicateClips, removeClips, snapTo, toEngineClips,
} from './clips.js';

const FRAMES = 100_000;
const ids = (...v) => new Set(v);
const c = (id, tl, src, len) => ({ id, tl, src, len });

/** Invariantes que SIEMPRE deben cumplirse tras cualquier edición. */
function assertValid(clips, frames = FRAMES, label = '') {
  for (let i = 0; i < clips.length; i++) {
    const k = clips[i];
    assert.ok(k.len >= MIN_CLIP, `${label} clip demasiado corto ${JSON.stringify(k)}`);
    assert.ok(k.tl >= 0, `${label} tl negativo ${JSON.stringify(k)}`);
    assert.ok(k.src >= 0, `${label} src negativo ${JSON.stringify(k)}`);
    assert.ok(k.src + k.len <= frames, `${label} suena más allá del archivo ${JSON.stringify(k)}`);
    assert.ok(Number.isInteger(k.tl) && Number.isInteger(k.src) && Number.isInteger(k.len), `${label} no entero`);
    if (i > 0) {
      const p = clips[i - 1];
      assert.ok(p.tl + p.len <= k.tl, `${label} solape entre ${JSON.stringify(p)} y ${JSON.stringify(k)}`);
    }
  }
  assert.equal(new Set(clips.map(k => k.id)).size, clips.length, `${label} ids repetidos`);
}

test('pista sin editar = clip completo implícito', () => {
  const full = fullClips('t1', FRAMES);
  assert.deepEqual(full, [c('t1-full', 0, 0, FRAMES)]);
  assert.ok(isDefault(full, FRAMES));
  assert.deepEqual(clipsFor({}, 't1', FRAMES), full);
  assert.deepEqual(clipsFor({ t1: [c('a', 5, 0, 10)] }, 't1', FRAMES), [c('a', 5, 0, 10)]);
  assert.ok(!isDefault([c('a', 5, 0, 10)], FRAMES));
});

test('pruneDefaults quita solo las pistas que volvieron a ser la entera', () => {
  const map = { a: fullClips('a', 500), b: [c('x', 0, 0, 100)], c: [c('y', 0, 0, 10), c('z', 20, 20, 10)] };
  const out = pruneDefaults(map, { a: 500, b: 500, c: 500 });
  assert.deepEqual(Object.keys(out).sort(), ['b', 'c']);
});

test('dividir: dos clips con audio contiguo, el segundo con id nuevo', () => {
  const { clips, changed } = splitAt(fullClips('t', FRAMES), 30_000);
  assert.ok(changed);
  assert.equal(clips.length, 2);
  assert.deepEqual([clips[0].tl, clips[0].src, clips[0].len], [0, 0, 30_000]);
  assert.deepEqual([clips[1].tl, clips[1].src, clips[1].len], [30_000, 30_000, 70_000]);
  assert.notEqual(clips[0].id, clips[1].id);
  assertValid(clips);
});

test('dividir en un borde o fuera del clip no hace nada', () => {
  const base = fullClips('t', FRAMES);
  assert.equal(splitAt(base, 0).changed, false);
  assert.equal(splitAt(base, FRAMES).changed, false);
  assert.equal(splitAt(base, FRAMES + 50).changed, false);
  assert.equal(splitAt(base, MIN_CLIP - 1).changed, false); // dejaría un clip más corto que el mínimo
});

test('dividir solo los clips elegidos', () => {
  const base = [c('a', 0, 0, 1000), c('b', 0, 0, 1000)].map((k, i) => ({ ...k, tl: i * 2000 }));
  const { clips } = splitAt(base, 500, ids('a'));
  assert.equal(clips.length, 3);
  const r = splitAt(base, 2500, ids('a')); // 'a' no contiene 2500
  assert.equal(r.changed, false);
});

test('mover: cambia solo el tl, el audio (src) es el mismo', () => {
  const base = [c('a', 0, 0, 1000)];
  const m = moveClips(base, ids('a'), 5000);
  assert.deepEqual(m, [c('a', 5000, 0, 1000)]);
});

test('mover no pasa del 0 por la izquierda', () => {
  const m = moveClips([c('a', 300, 300, 1000)], ids('a'), -9999);
  assert.deepEqual(m, [c('a', 0, 300, 1000)]);
});

test('mover encima de otro clip lo sobrescribe (recorta o parte lo pisado)', () => {
  const base = [c('a', 0, 0, 1000), c('b', 2000, 2000, 1000)];
  // 'a' cae sobre la mitad de 'b'
  const m = moveClips(base, ids('a'), 2500);
  assertValid(m, FRAMES);
  const b = m.find(k => k.id === 'b');
  assert.deepEqual([b.tl, b.src, b.len], [2000, 2000, 500]); // 'b' conserva solo lo que no pisa
  assert.deepEqual(m.find(k => k.id === 'a'), c('a', 2500, 0, 1000));
  // 'a' cae en medio de un clip largo: lo parte en dos
  const m2 = moveClips([c('a', 0, 0, 100), c('L', 1000, 1000, 5000)], ids('a'), 3000);
  assertValid(m2);
  assert.equal(m2.length, 3);
  const left = m2.find(k => k.tl === 1000);
  const right = m2.find(k => k.tl === 3100);
  assert.deepEqual([left.src, left.len], [1000, 2000]);
  assert.deepEqual([right.src, right.len], [3100, 2900]); // el resto sigue sonando desde donde le toca
});

test('mover varios clips juntos conserva sus distancias', () => {
  const base = [c('a', 1000, 1000, 500), c('b', 2000, 2000, 500), c('z', 9000, 9000, 100)];
  const m = moveClips(base, ids('a', 'b'), 700);
  assertValid(m);
  assert.deepEqual(m.map(k => [k.id, k.tl]), [['a', 1700], ['b', 2700], ['z', 9000]]);
});

test('recortar el borde derecho: acorta, o extiende hasta el final del archivo, sin pasarse', () => {
  const base = [c('a', 1000, 0, 5000)];
  assert.deepEqual(trimClip(base, 'a', 'r', 3000, FRAMES), [c('a', 1000, 0, 2000)]);
  assert.deepEqual(trimClip(base, 'a', 'r', 1e9, FRAMES), [c('a', 1000, 0, FRAMES)]); // no más allá del audio
  assert.deepEqual(trimClip(base, 'a', 'r', 0, FRAMES), [c('a', 1000, 0, MIN_CLIP)]);  // ni más corto que el mínimo
});

test('recortar el borde izquierdo: el audio que suena queda en su sitio', () => {
  const base = [c('a', 1000, 500, 5000)];
  const t = trimClip(base, 'a', 'l', 2000, FRAMES)[0];
  assert.deepEqual([t.tl, t.src, t.len], [2000, 1500, 4000]);
  // El final del clip (tl+len) y el punto del audio que suena ahí no cambian.
  assert.equal(t.tl + t.len, 6000);
  assert.equal(t.src + t.len, 500 + 5000);
  // Extender hacia la izquierda no pasa del inicio del archivo.
  const e = trimClip(base, 'a', 'l', -1e9, FRAMES)[0];
  assert.deepEqual([e.tl, e.src], [500, 0]);
  assertValid([e]);
});

test('extender un clip sobre su vecino lo recorta', () => {
  const base = [c('a', 0, 0, 1000), c('b', 1500, 1500, 1000)];
  const t = trimClip(base, 'a', 'r', 2000, FRAMES);
  assertValid(t);
  assert.deepEqual(t.find(k => k.id === 'a').len, 2000);
  assert.deepEqual([t.find(k => k.id === 'b').tl, t.find(k => k.id === 'b').len], [2000, 500]);
});

test('duplicar: la copia va justo después, con ids nuevos', () => {
  const base = [c('a', 1000, 0, 500)];
  const { clips, newIds } = duplicateClips(base, ids('a'));
  assert.equal(clips.length, 2);
  assert.equal(newIds.size, 1);
  const copy = clips.find(k => newIds.has(k.id));
  assert.deepEqual([copy.tl, copy.src, copy.len], [1500, 0, 500]);
  assertValid(clips);
});

test('duplicar una selección la repite entera a continuación', () => {
  const base = [c('a', 0, 0, 500), c('b', 700, 700, 300), c('z', 5000, 5000, 100)];
  const { clips, newIds } = duplicateClips(base, ids('a', 'b'));
  assertValid(clips);
  const copies = clips.filter(k => newIds.has(k.id)).map(k => [k.tl, k.src, k.len]);
  assert.deepEqual(copies, [[1000, 0, 500], [1700, 700, 300]]);
});

test('borrar quita el clip y deja el hueco (silencio)', () => {
  const base = [c('a', 0, 0, 100), c('b', 100, 100, 100)];
  assert.deepEqual(removeClips(base, ids('a')), [c('b', 100, 100, 100)]);
  assert.deepEqual(removeClips(base, ids('a', 'b')), []);
});

test('carve parte un clip en dos con el audio correcto', () => {
  const out = carve([c('a', 0, 100, 1000)], 300, 400);
  assert.equal(out.length, 2);
  assert.deepEqual([out[0].tl, out[0].src, out[0].len], [0, 100, 300]);
  assert.deepEqual([out[1].tl, out[1].src, out[1].len], [400, 500, 600]);
});

test('lo que sobra de un clip pisado y mide menos que el mínimo se descarta (astillas)', () => {
  const out = carve([c('a', 0, 0, 1000)], 10, 990); // sobran 10 a la izquierda y 10 a la derecha
  assert.deepEqual(out, []);
  const out2 = carve([c('a', 0, 0, 1000)], 10, 500); // izquierda 10 (astilla), derecha 500 (ok)
  assert.deepEqual(out2.map(k => [k.tl, k.src, k.len]), [[500, 500, 500]]);
});

test('snapTo', () => {
  assert.equal(snapTo(1234, 1000), 1000);
  assert.equal(snapTo(1600, 1000), 2000);
  assert.equal(snapTo(1234, 0), 1234);
});

test('toEngineClips: sin pitch ni escala es la identidad', () => {
  assert.deepEqual(toEngineClips([c('a', 100, 40, 500), c('b', 900, 7, 20)], 1), [[100, 40, 500], [900, 7, 20]]);
});

test('toEngineClips: un corte limpio sigue siendo contiguo en el motor (sin bajón) con cualquier pitch/escala', () => {
  for (const k of [1, 0.8909, 1.1224, 1.0884 * 0.9187, 0.9187, 1.1224 * 1.0884, 2 ** (5 / 12), 2 ** (-6 / 12)]) {
    for (const cut of [1, 1234, 33_333, 50_001, 77_777, 99_999]) {
      const { clips } = splitAt(fullClips('t', FRAMES), cut);
      if (clips.length < 2) continue;
      const [l, r] = toEngineClips(clips, k);
      assert.equal(l[0] + l[2], r[0], `k=${k} cut=${cut}: hueco o solape en la línea de tiempo`);
      assert.equal(l[1] + l[2], r[1], `k=${k} cut=${cut}: el audio no es contiguo`);
    }
  }
});

test('toEngineClips: un clip movido conserva su desplazamiento de audio', () => {
  const moved = moveClips(fullClips('t', FRAMES), ids('t-full'), 20_000);
  const [e] = toEngineClips(moved, 1.1224);
  // El motor calcula audio = src + (t - tl): en tl el audio debe ser el inicio del archivo (0).
  assert.equal(e[1], 0);
  assert.equal(e[0], Math.round(20_000 / 1.1224));
});

test('fuzz: 4000 ediciones aleatorias nunca rompen las invariantes', () => {
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  let clips = fullClips('t', FRAMES);
  for (let i = 0; i < 4000; i++) {
    const op = pick(['split', 'move', 'trimL', 'trimR', 'dup', 'del', 'moveMany', 'reset']);
    const sel = clips.length ? ids(pick(clips).id) : ids();
    const label = `iter ${i} ${op}`;
    switch (op) {
      case 'split': clips = splitAt(clips, Math.floor(rnd() * FRAMES)).clips; break;
      case 'move': clips = moveClips(clips, sel, Math.floor((rnd() - 0.5) * 60_000)); break;
      case 'moveMany': clips = moveClips(clips, new Set(clips.filter(() => rnd() < 0.5).map(k => k.id)), Math.floor((rnd() - 0.4) * 40_000)); break;
      case 'trimL': if (clips.length) clips = trimClip(clips, [...sel][0], 'l', Math.floor(rnd() * 150_000 - 20_000), FRAMES); break;
      case 'trimR': if (clips.length) clips = trimClip(clips, [...sel][0], 'r', Math.floor(rnd() * 200_000), FRAMES); break;
      case 'dup': clips = duplicateClips(clips, sel).clips; break;
      case 'del': if (clips.length > 1) clips = removeClips(clips, sel); break;
      case 'reset': if (rnd() < 0.05) clips = fullClips('t', FRAMES); break;
    }
    // La duplicación puede pasar del largo del archivo en la línea de tiempo (es lo normal), pero
    // lo que suena nunca debe salirse del audio. Solo se valida lo que debe valer siempre.
    assertValid(clips, FRAMES, label);
    // Y lo que le llega al motor es siempre una lista válida.
    for (const [tl, src, len] of toEngineClips(clips, 1.0884)) {
      assert.ok(tl >= 0 && src >= 0 && len > 0, `${label}: motor ${tl},${src},${len}`);
    }
  }
});

test('normalize ordena y descarta vacíos', () => {
  assert.deepEqual(normalize([c('b', 500, 0, 10), c('x', 0, 0, 0), c('a', 100, 0, 10)]).map(k => k.id), ['a', 'b']);
});
