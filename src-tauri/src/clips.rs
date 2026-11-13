//! Clips por pista (secuenciador v1): qué parte del audio de UNA pista suena y dónde.
//!
//! Un clip dice "desde la posición `tl_start` de la línea de tiempo, suena el audio de la
//! pista que arranca en `src_start`, durante `len` muestras". Mover un clip cambia
//! `tl_start`; recortarlo cambia `src_start`/`len`; cortarlo en dos produce dos clips con
//! audio contiguo; borrarlo deja silencio. El archivo original nunca se toca.
//!
//! Todas las posiciones están en las MISMAS unidades que el arreglo de secciones (muestras de
//! reproducción, antes de aplicar el ratio de frecuencia/pitch del render), así los dos
//! sistemas se componen: primero el arreglo traduce tiempo virtual -> tiempo de canción, y
//! luego los clips de cada pista traducen tiempo de canción -> posición en su archivo.
//!
//! Una pista SIN clips configurados (`clips_active == false` en `TrackSource`) suena exactamente
//! como siempre: este módulo no interviene.

/// Un clip ya normalizado (ordenado, sin solapes) y con sus fundidos decididos.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ClipSeg {
    pub tl_start: u64,
    pub src_start: u64,
    pub len: u64,
    /// ¿Hay que fundir la entrada? No si el clip anterior termina justo donde éste empieza Y su
    /// audio es contiguo (un corte "limpio": sonaría igual que sin cortar, sin bajón).
    pub fade_in: bool,
    pub fade_out: bool,
}

impl ClipSeg {
    #[inline]
    pub fn tl_end(&self) -> u64 { self.tl_start.saturating_add(self.len) }
}

/// Convierte la lista cruda `(tl_start, src_start, len)` que manda la interfaz en clips válidos:
/// descarta los vacíos, ordena por posición, resuelve solapes (gana el clip que empieza después:
/// el anterior se acorta) y marca qué bordes necesitan fundido.
pub fn normalize(raw: &[(u64, u64, u64)]) -> Vec<ClipSeg> {
    let mut v: Vec<ClipSeg> = raw
        .iter()
        .filter(|&&(_, _, len)| len > 0)
        .map(|&(tl_start, src_start, len)| ClipSeg { tl_start, src_start, len, fade_in: true, fade_out: true })
        .collect();
    // Orden estable: ante empate de posición, el que vino después en la lista es el que gana.
    v.sort_by_key(|c| c.tl_start);

    let mut out: Vec<ClipSeg> = Vec::with_capacity(v.len());
    for c in v {
        if let Some(prev) = out.last_mut() {
            if prev.tl_end() > c.tl_start {
                prev.len = c.tl_start.saturating_sub(prev.tl_start);
            }
            if prev.len == 0 { out.pop(); }
        }
        out.push(c);
    }

    for i in 0..out.len() {
        let contiguous_prev = i > 0 && {
            let p = &out[i - 1];
            p.tl_end() == out[i].tl_start && p.src_start.saturating_add(p.len) == out[i].src_start
        };
        if contiguous_prev {
            out[i].fade_in = false;
            out[i - 1].fade_out = false;
        }
    }
    out
}

/// Traduce una posición de la línea de tiempo a `(posición_en_el_archivo, distancia_al_borde)`.
/// `None` = en este punto la pista está en silencio (hueco entre clips o fuera de todos).
/// La distancia solo cuenta los bordes que llevan fundido (`u64::MAX` si no hay ninguno cerca);
/// el render la usa igual que la del arreglo (`CUT_FADE_SAMPLES`).
#[inline]
pub fn map(t: u64, clips: &[ClipSeg]) -> Option<(u64, u64)> {
    let idx = clips.partition_point(|c| c.tl_start <= t);
    if idx == 0 { return None; }
    let c = &clips[idx - 1];
    let off = t - c.tl_start;
    if off >= c.len { return None; }
    let d_in = if c.fade_in { off } else { u64::MAX };
    let d_out = if c.fade_out { c.len - off } else { u64::MAX };
    Some((c.src_start + off, d_in.min(d_out)))
}

/// Rangos del ARCHIVO que sonarán mientras la línea de tiempo recorre `[a, b)`.
/// Lo usa el hilo precargador para saber qué páginas traer a memoria.
pub fn source_ranges(a: u64, b: u64, clips: &[ClipSeg]) -> Vec<(u64, u64)> {
    let mut out = Vec::new();
    if b <= a { return out; }
    let first = clips.partition_point(|c| c.tl_end() <= a);
    for c in &clips[first..] {
        if c.tl_start >= b { break; }
        let lo = a.max(c.tl_start);
        let hi = b.min(c.tl_end());
        if hi > lo {
            out.push((c.src_start + (lo - c.tl_start), c.src_start + (hi - c.tl_start)));
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn seg(tl: u64, src: u64, len: u64, fi: bool, fo: bool) -> ClipSeg {
        ClipSeg { tl_start: tl, src_start: src, len, fade_in: fi, fade_out: fo }
    }

    #[test]
    fn normalize_sorts_and_drops_empty() {
        let n = normalize(&[(500, 0, 100), (0, 0, 0), (100, 7, 50)]);
        assert_eq!(n, vec![seg(100, 7, 50, true, true), seg(500, 0, 100, true, true)]);
    }

    #[test]
    fn overlap_shortens_the_earlier_clip() {
        let n = normalize(&[(0, 0, 100), (60, 500, 100)]);
        assert_eq!(n, vec![seg(0, 0, 60, true, true), seg(60, 500, 100, true, true)]);
        // Mismo inicio: gana el que viene después en la lista y el otro desaparece.
        let n = normalize(&[(10, 0, 100), (10, 900, 20)]);
        assert_eq!(n, vec![seg(10, 900, 20, true, true)]);
        // Un clip que queda totalmente tapado por el siguiente también desaparece.
        let n = normalize(&[(0, 0, 10), (0, 5, 50)]);
        assert_eq!(n, vec![seg(0, 5, 50, true, true)]);
    }

    #[test]
    fn clean_cut_has_no_fade_but_gap_or_jump_does() {
        // Cortado en 100 con audio contiguo: seguido, sin fundidos en el corte.
        let n = normalize(&[(0, 0, 100), (100, 100, 100)]);
        assert_eq!((n[0].fade_in, n[0].fade_out, n[1].fade_in, n[1].fade_out), (true, false, false, true));
        // Pegados en el tiempo pero con audio NO contiguo (se quitó un trozo): sí se funde.
        let n = normalize(&[(0, 0, 100), (100, 400, 100)]);
        assert_eq!((n[0].fade_out, n[1].fade_in), (true, true));
        // Contiguo en el audio pero con hueco en el tiempo: sí se funde.
        let n = normalize(&[(0, 0, 100), (150, 100, 100)]);
        assert_eq!((n[0].fade_out, n[1].fade_in), (true, true));
    }

    #[test]
    fn map_follows_clips_and_reports_silence() {
        let c = normalize(&[(100, 1000, 50), (200, 0, 30)]);
        assert_eq!(map(99, &c), None);
        assert_eq!(map(100, &c), Some((1000, 0)));
        assert_eq!(map(125, &c), Some((1025, 25)));
        assert_eq!(map(149, &c), Some((1049, 1)));
        assert_eq!(map(150, &c), None);
        assert_eq!(map(199, &c), None);
        assert_eq!(map(200, &c), Some((0, 0)));
        assert_eq!(map(229, &c), Some((29, 1)));
        assert_eq!(map(230, &c), None);
        assert_eq!(map(10_000, &c), None);
        assert_eq!(map(5, &[]), None);
    }

    #[test]
    fn map_distance_ignores_edges_without_fade() {
        let c = normalize(&[(0, 0, 100), (100, 100, 100)]);
        // En el corte limpio ningún lado cuenta el borde: la distancia solo mide el otro extremo
        // del clip, así que a ambos lados del corte es grande (cero bajón) y no hay "0".
        assert_eq!(map(99, &c).unwrap().1, 99);   // 99 desde el inicio del primero
        assert_eq!(map(100, &c).unwrap().1, 100); // 100 hasta el final del segundo
        // Pero el inicio del primero y el final del segundo sí.
        assert_eq!(map(3, &c).unwrap().1, 3);
        assert_eq!(map(197, &c).unwrap().1, 3);
    }

    #[test]
    fn source_ranges_match_map_pointwise() {
        let c = normalize(&[(100, 1000, 50), (160, 0, 30), (190, 30, 40), (300, 7, 5)]);
        let (a, b) = (120u64, 310u64);
        let ranges = source_ranges(a, b, &c);
        for t in a..b {
            if let Some((p, _)) = map(t, &c) {
                assert!(ranges.iter().any(|&(lo, hi)| p >= lo && p < hi), "t={t} p={p} fuera de {ranges:?}");
            }
        }
        // Y nada de más: la suma de los rangos es exactamente lo que suena en [a, b).
        let sounding = (a..b).filter(|&t| map(t, &c).is_some()).count() as u64;
        assert_eq!(ranges.iter().map(|&(lo, hi)| hi - lo).sum::<u64>(), sounding);
        assert!(source_ranges(b, a, &c).is_empty());
        assert!(source_ranges(0, 50, &c).is_empty());
    }
}
