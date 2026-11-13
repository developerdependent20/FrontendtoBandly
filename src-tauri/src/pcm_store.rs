//! Almacenamiento del PCM de las pistas: en RAM o "en streaming" (archivo mapeado).
//!
//! # Por qué existe
//! Antes cada pista se decodificaba COMPLETA a un `Vec<i16>`: una canción de 16 stems de
//! 9 minutos son ~1.5 GB de RAM. Ahora, cuando una pista supera [`SPILL_THRESHOLD_SAMPLES`],
//! el decodificador la va escribiendo a un archivo temporal y al terminar la deja MAPEADA a
//! memoria (`mmap`). El hilo de audio sigue leyendo un `&[i16]` con exactamente la misma
//! matemática de siempre (por eso el sonido es bit a bit idéntico); lo que cambia es que ese
//! slice vive en el caché del sistema operativo, que lo puede soltar, y no en la RAM del
//! proceso.
//!
//! # Garantías de seguridad (lo que NO debe romperse)
//! * El hilo de audio nunca abre archivos ni espera locks: solo lee el slice.
//! * Un hilo aparte (ver `stream_pump` en `audio_engine.rs`) lee por adelantado las páginas
//!   que van a sonar, para que el hilo de audio no sufra fallos de página en frío.
//! * Si algo falla al escribir (disco lleno, sin permisos) o al mapear, la pista cae a RAM
//!   con TODOS sus datos: el streaming es una optimización, nunca un requisito.
//! * El archivo temporal se borra al soltar la pista (el borrado va a otro hilo para no
//!   hacer trabajo de disco dentro del hilo de audio) y los restos de sesiones anteriores
//!   se limpian al arrancar.

use std::fs::{self, File, OpenOptions};
use std::io::{self, Read, Seek, SeekFrom, Write};
use std::ops::Deref;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{mpsc, Mutex};
use std::time::{Duration, Instant};

use memmap2::Mmap;
use once_cell::sync::Lazy;
use serde::Serialize;

/// A partir de cuántas muestras i16 una pista pasa de RAM a archivo (4 Mi muestras = 8 MB,
/// unos 24 s de estéreo a 44.1 kHz). Las pistas cortas (clicks, FX) se quedan en RAM.
pub const SPILL_THRESHOLD_SAMPLES: usize = 4 * 1024 * 1024;
/// Tamaño del buffer de escritura una vez que la pista ya está en archivo (1 MB).
const WRITE_BUF_SAMPLES: usize = 512 * 1024;
/// Una página de 4 KB en muestras i16. Se "toca" una muestra por página para forzar su carga.
pub const PAGE_SAMPLES: usize = 2048;
/// Granularidad con la que se sueltan páginas (64 KB): múltiplo de la página de Windows (4 KB),
/// de macOS Apple Silicon (16 KB) y de la granularidad de reserva de Windows.
const RELEASE_ALIGN_SAMPLES: usize = 32 * 1024;
/// No se derrama a disco si queda menos libre que esto en la unidad del caché.
const MIN_FREE_DISK_BYTES: u64 = 3 * 1024 * 1024 * 1024;

/// Interruptor global. Se puede apagar con la variable de entorno `BANDLY_NO_STREAM=1` o con
/// el comando `set_streaming_enabled`; las pistas YA cargadas no cambian, solo las siguientes.
pub static STREAMING_ENABLED: Lazy<AtomicBool> =
    Lazy::new(|| AtomicBool::new(std::env::var_os("BANDLY_NO_STREAM").is_none()));

static MAPPED_BYTES: AtomicU64 = AtomicU64::new(0);
static MAPPED_TRACKS: AtomicU64 = AtomicU64::new(0);
static SPILL_FALLBACKS: AtomicU64 = AtomicU64::new(0);
static FILE_SEQ: AtomicU64 = AtomicU64::new(0);

// ── Utilidades de bytes ───────────────────────────────────────────────────

fn as_bytes(data: &[i16]) -> &[u8] {
    // SAFETY: i16 no tiene padding ni valores inválidos; el slice resultante cubre exactamente
    // los mismos bytes con alineación 1.
    unsafe { std::slice::from_raw_parts(data.as_ptr() as *const u8, data.len() * 2) }
}

fn read_samples(file: &mut File, count: usize) -> io::Result<Vec<i16>> {
    let mut out = vec![0i16; count];
    // SAFETY: mismo razonamiento que `as_bytes`, pero mutable; `out` es dueño de la memoria.
    let bytes = unsafe { std::slice::from_raw_parts_mut(out.as_mut_ptr() as *mut u8, count * 2) };
    file.seek(SeekFrom::Start(0))?;
    file.read_exact(bytes)?;
    Ok(out)
}

// ── Directorio de caché ───────────────────────────────────────────────────

fn cache_root() -> PathBuf {
    std::env::temp_dir().join("bandly-pcm-cache")
}

/// Cada proceso usa su propia subcarpeta (el pid), así dos instancias no se pisan.
static CACHE_DIR: Lazy<PathBuf> = Lazy::new(|| cache_root().join(std::process::id().to_string()));

/// Borra los restos de sesiones anteriores (cierre brusco, corte de luz). Mejor esfuerzo:
/// si otra instancia viva tiene archivos mapeados, Windows no deja borrarlos y se ignoran.
pub fn cleanup_stale_cache() {
    let Ok(entries) = fs::read_dir(cache_root()) else { return };
    let mine = std::process::id().to_string();
    for entry in entries.flatten() {
        if entry.file_name().to_string_lossy() == mine { continue; }
        let _ = fs::remove_dir_all(entry.path());
    }
}

fn sanitize(label: &str) -> String {
    label.chars().map(|c| if c.is_ascii_alphanumeric() { c } else { '_' }).take(40).collect()
}

/// Espacio libre suficiente en la unidad del caché. Se consulta como mucho cada 5 s
/// (listar discos no es gratis y se llama una vez por pista que derrama).
fn enough_free_disk() -> bool {
    static LAST: Mutex<Option<(Instant, bool)>> = Mutex::new(None);
    let mut last = match LAST.lock() { Ok(g) => g, Err(_) => return true };
    if let Some((at, ok)) = *last {
        if at.elapsed() < Duration::from_secs(5) { return ok; }
    }
    let disks = sysinfo::Disks::new_with_refreshed_list();
    let dir: &Path = &CACHE_DIR;
    let best = disks
        .iter()
        .filter(|d| dir.starts_with(d.mount_point()))
        .max_by_key(|d| d.mount_point().as_os_str().len());
    // Si no se identifica la unidad, no se bloquea el streaming por eso.
    let ok = best.map_or(true, |d| d.available_space() >= MIN_FREE_DISK_BYTES);
    if !ok { eprintln!("[PCM] Poco espacio libre en disco: las pistas se quedan en RAM."); }
    *last = Some((Instant::now(), ok));
    ok
}

// ── Borrado diferido ──────────────────────────────────────────────────────

/// Hilo que borra los archivos temporales ya desmapeados. Se crea al mapear la primera pista
/// (nunca dentro de un `Drop`) para que soltar una pista en el hilo de audio no cree hilos.
static REAPER: Lazy<mpsc::Sender<PathBuf>> = Lazy::new(|| {
    let (tx, rx) = mpsc::channel::<PathBuf>();
    let _ = std::thread::Builder::new().name("bandly-pcm-reaper".into()).spawn(move || {
        for path in rx {
            // En Windows el borrado puede fallar un instante si el desmapeo aún no se propagó.
            for _ in 0..40 {
                if fs::remove_file(&path).is_ok() || !path.exists() { break; }
                std::thread::sleep(Duration::from_millis(50));
            }
        }
    });
    tx
});

// ── Búfer PCM: RAM o mapeado ──────────────────────────────────────────────

pub struct MappedPcm {
    mmap: Option<Mmap>,
    path: PathBuf,
    samples: usize,
}

impl MappedPcm {
    fn slice(&self) -> &[i16] {
        match &self.mmap {
            // SAFETY: el mapeo es de solo lectura, empieza alineado a página (por tanto a 2
            // bytes) y se verificó al crearlo que mide al menos `samples * 2` bytes. El archivo
            // es nuestro y no se modifica mientras está mapeado.
            Some(m) => unsafe { std::slice::from_raw_parts(m.as_ptr() as *const i16, self.samples) },
            None => &[],
        }
    }

    /// Suelta del working set las páginas completamente contenidas en `[start, end)` (en
    /// muestras). Los datos NO se pierden: siguen en el caché del sistema y un acceso posterior
    /// solo cuesta un fallo "suave". Si la región no se puede soltar, no pasa nada.
    fn release(&self, start: usize, end: usize) {
        let Some(map) = &self.mmap else { return };
        let end = end.min(self.samples);
        let a = start.div_ceil(RELEASE_ALIGN_SAMPLES) * RELEASE_ALIGN_SAMPLES;
        let b = end / RELEASE_ALIGN_SAMPLES * RELEASE_ALIGN_SAMPLES;
        if b <= a { return; }
        let (offset, len) = (a * 2, (b - a) * 2);
        #[cfg(windows)]
        // SAFETY: `offset + len <= samples * 2 <= map.len()`, así que la región está dentro de
        // nuestro mapeo. `VirtualUnlock` sobre páginas no bloqueadas solo las saca del working
        // set (devuelve error `ERROR_NOT_LOCKED`, que se ignora a propósito).
        unsafe {
            windows_sys::Win32::System::Memory::VirtualUnlock(map.as_ptr().add(offset) as *const _, len);
        }
        #[cfg(unix)]
        // SAFETY: región dentro del mapeo; `MADV_DONTNEED` en un mapeo compartido de solo
        // lectura únicamente descarta las páginas del proceso (se recargan del archivo).
        unsafe {
            let _ = map.unchecked_advise_range(memmap2::UncheckedAdvice::DontNeed, offset, len);
        }
        #[cfg(not(any(windows, unix)))]
        let _ = (map, offset, len);
    }
}

impl Drop for MappedPcm {
    fn drop(&mut self) {
        if let Some(m) = self.mmap.take() {
            MAPPED_BYTES.fetch_sub((self.samples * 2) as u64, Ordering::Relaxed);
            MAPPED_TRACKS.fetch_sub(1, Ordering::Relaxed);
            drop(m); // primero desmapear: Windows no deja borrar un archivo mapeado
        }
        let path = std::mem::take(&mut self.path);
        if REAPER.send(path.clone()).is_err() {
            let _ = fs::remove_file(path);
        }
    }
}

/// PCM estéreo entrelazado de 16 bits de UNA pista.
pub enum PcmBuf {
    Ram(Vec<i16>),
    Mapped(MappedPcm),
}

impl PcmBuf {
    pub fn empty() -> Self { PcmBuf::Ram(Vec::new()) }

    #[inline]
    pub fn as_slice(&self) -> &[i16] {
        match self {
            PcmBuf::Ram(v) => v,
            PcmBuf::Mapped(m) => m.slice(),
        }
    }

    pub fn is_mapped(&self) -> bool { matches!(self, PcmBuf::Mapped(_)) }

    /// Ver [`MappedPcm::release`]. No hace nada si la pista está en RAM.
    pub fn release_range(&self, start: usize, end: usize) {
        if let PcmBuf::Mapped(m) = self { m.release(start, end); }
    }

    /// Fuerza la carga en memoria de las páginas de `[start, end)` (en muestras) leyendo una
    /// muestra por página. Pensado para el hilo precargador, NUNCA para el hilo de audio.
    pub fn touch_range(&self, start: usize, end: usize) {
        if !self.is_mapped() { return; }
        let s = self.as_slice();
        let end = end.min(s.len());
        let mut i = start - start % PAGE_SAMPLES;
        let mut acc = 0i16;
        while i < end {
            acc = acc.wrapping_add(s[i]);
            i += PAGE_SAMPLES;
        }
        std::hint::black_box(acc);
    }

    #[cfg(test)]
    fn backing_path(&self) -> Option<PathBuf> {
        match self { PcmBuf::Mapped(m) => Some(m.path.clone()), PcmBuf::Ram(_) => None }
    }
}

impl Deref for PcmBuf {
    type Target = [i16];
    #[inline]
    fn deref(&self) -> &[i16] { self.as_slice() }
}

// ── Sumidero de decodificación ────────────────────────────────────────────

struct SpillFile {
    file: File,
    path: PathBuf,
    /// Muestras ya escritas con éxito (solo crece tras un `write_all` completo).
    flushed: usize,
}

/// Recibe las muestras que va produciendo el decodificador y decide dónde viven.
///
/// Empieza en RAM; al superar el umbral derrama a un archivo temporal y de ahí en adelante
/// solo conserva en RAM un buffer de escritura de ~1 MB. `finish` devuelve el [`PcmBuf`].
pub struct PcmSink {
    label: String,
    /// En modo RAM: todas las muestras. En modo archivo: solo lo pendiente de escribir.
    buf: Vec<i16>,
    spill: Option<SpillFile>,
    can_spill: bool,
    spill_threshold: usize,
    write_buf: usize,
    /// Datos irrecuperables (falló escribir Y releer). Solo se reporta; no debería pasar.
    lost: bool,
    /// Para pruebas: número de escrituras que salen bien antes de empezar a fallar.
    fail_after: Option<usize>,
    writes: usize,
}

impl PcmSink {
    /// `hint_samples` es el tamaño esperado (muestras i16) si el contenedor lo declara.
    pub fn new(label: &str, hint_samples: usize) -> Self {
        Self::with_limits(
            label, hint_samples, SPILL_THRESHOLD_SAMPLES, WRITE_BUF_SAMPLES,
            STREAMING_ENABLED.load(Ordering::Relaxed),
        )
    }

    pub fn with_limits(label: &str, hint_samples: usize, spill_threshold: usize, write_buf: usize, can_spill: bool) -> Self {
        // Si puede derramar no se reserva todo de golpe: la RAM nunca pasará de ~umbral.
        let cap = if can_spill { hint_samples.min(spill_threshold + write_buf) } else { hint_samples };
        Self {
            label: label.to_string(), buf: Vec::with_capacity(cap), spill: None,
            can_spill, spill_threshold, write_buf, lost: false, fail_after: None, writes: 0,
        }
    }

    /// Total de muestras recibidas hasta ahora.
    #[cfg(test)]
    pub fn len(&self) -> usize {
        self.buf.len() + self.spill.as_ref().map_or(0, |s| s.flushed)
    }

    pub fn extend(&mut self, data: &[i16]) {
        self.buf.extend_from_slice(data);
        if self.spill.is_some() {
            if self.buf.len() >= self.write_buf { self.flush_buf(); }
        } else if self.can_spill && self.buf.len() >= self.spill_threshold {
            self.try_spill();
        }
    }

    fn injected_failure(&mut self) -> bool {
        self.writes += 1;
        matches!(self.fail_after, Some(n) if self.writes > n)
    }

    fn try_spill(&mut self) {
        if !enough_free_disk() { self.can_spill = false; return; }
        let dir: &Path = &CACHE_DIR;
        if let Err(e) = fs::create_dir_all(dir) {
            eprintln!("[PCM] No se pudo crear el caché {:?}: {} — la pista se queda en RAM.", dir, e);
            self.can_spill = false;
            return;
        }
        let path = dir.join(format!("{}-{}.pcm", FILE_SEQ.fetch_add(1, Ordering::Relaxed), sanitize(&self.label)));
        let mut file = match OpenOptions::new().read(true).write(true).create_new(true).open(&path) {
            Ok(f) => f,
            Err(e) => {
                eprintln!("[PCM] No se pudo crear {:?}: {} — la pista se queda en RAM.", path, e);
                self.can_spill = false;
                return;
            }
        };
        let result = if self.injected_failure() {
            Err(io::Error::other("fallo inyectado"))
        } else {
            file.write_all(as_bytes(&self.buf))
        };
        match result {
            Ok(()) => {
                let flushed = self.buf.len();
                self.buf = Vec::with_capacity(self.write_buf); // devuelve la RAM acumulada
                self.spill = Some(SpillFile { file, path, flushed });
            }
            Err(e) => {
                // `buf` sigue intacto: simplemente no se derrama.
                eprintln!("[PCM] Falló la escritura inicial de {:?}: {} — la pista se queda en RAM.", path, e);
                drop(file);
                let _ = fs::remove_file(&path);
                self.can_spill = false;
            }
        }
    }

    fn flush_buf(&mut self) {
        if self.buf.is_empty() { return; }
        let fail = self.injected_failure();
        let Some(sf) = self.spill.as_mut() else { return };
        let result = if fail {
            Err(io::Error::other("fallo inyectado"))
        } else {
            sf.file.write_all(as_bytes(&self.buf))
        };
        match result {
            Ok(()) => {
                sf.flushed += self.buf.len();
                self.buf.clear();
            }
            Err(e) => {
                eprintln!("[PCM] Error escribiendo el caché de '{}': {} — se pasa a RAM.", self.label, e);
                self.degrade_to_ram();
            }
        }
    }

    /// Recupera lo ya escrito en el archivo y lo junta con lo pendiente en `buf`, dejando la
    /// pista entera en RAM. Es el plan B ante disco lleno o cualquier error de E/S.
    fn degrade_to_ram(&mut self) {
        let Some(mut sf) = self.spill.take() else { return };
        self.can_spill = false;
        SPILL_FALLBACKS.fetch_add(1, Ordering::Relaxed);
        match read_samples(&mut sf.file, sf.flushed) {
            Ok(mut all) => {
                all.extend_from_slice(&self.buf);
                self.buf = all;
            }
            Err(e) => {
                eprintln!("[PCM] No se pudo recuperar el caché de '{}': {} — pista perdida.", self.label, e);
                self.buf = Vec::new();
                self.lost = true;
            }
        }
        drop(sf.file);
        let _ = fs::remove_file(&sf.path);
    }

    /// Cierra la escritura y entrega el búfer final (mapeado si derramó, RAM si no).
    pub fn finish(mut self) -> PcmBuf {
        if self.spill.is_none() {
            let mut v = std::mem::take(&mut self.buf);
            v.shrink_to_fit(); // devolver la reserva sobrante, igual que antes
            return PcmBuf::Ram(v);
        }

        self.flush_buf();
        let Some(sf) = self.spill.take() else {
            // flush_buf degradó a RAM
            return self.ram_result();
        };
        if sf.flushed == 0 {
            drop(sf.file);
            let _ = fs::remove_file(&sf.path);
            return PcmBuf::empty();
        }

        // SAFETY: el archivo es nuestro y exclusivo; no se trunca ni se modifica mientras
        // exista el mapeo (el borrado ocurre después de desmapear, en `MappedPcm::drop`).
        match unsafe { Mmap::map(&sf.file) } {
            Ok(map) if map.len() >= sf.flushed * 2 => {
                Lazy::force(&REAPER); // que el hilo de borrado exista antes de poder necesitarlo
                MAPPED_BYTES.fetch_add((sf.flushed * 2) as u64, Ordering::Relaxed);
                MAPPED_TRACKS.fetch_add(1, Ordering::Relaxed);
                let samples = sf.flushed;
                drop(sf.file);
                PcmBuf::Mapped(MappedPcm { mmap: Some(map), path: sf.path, samples })
            }
            other => {
                match other {
                    Ok(m) => eprintln!("[PCM] Mapeo incompleto de '{}' ({} de {} bytes) — se pasa a RAM.", self.label, m.len(), sf.flushed * 2),
                    Err(e) => eprintln!("[PCM] No se pudo mapear '{}': {} — se pasa a RAM.", self.label, e),
                }
                self.spill = Some(sf);
                self.degrade_to_ram();
                self.ram_result()
            }
        }
    }

    fn ram_result(&mut self) -> PcmBuf {
        if self.lost { eprintln!("[PCM] '{}' quedó vacía por un error de disco.", self.label); }
        let mut v = std::mem::take(&mut self.buf);
        v.shrink_to_fit();
        PcmBuf::Ram(v)
    }
}

impl Drop for PcmSink {
    /// Carga abortada (el usuario cambió de canción): no dejar el archivo temporal huérfano.
    fn drop(&mut self) {
        if let Some(sf) = self.spill.take() {
            drop(sf.file);
            let _ = fs::remove_file(&sf.path);
        }
    }
}

// ── Estadísticas ──────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct StreamingStats {
    pub enabled: bool,
    pub mapped_tracks: u64,
    pub mapped_mb: f64,
    /// Veces que una pista tuvo que volver a RAM por un error (debería ser 0).
    pub fallbacks: u64,
    pub cache_dir: String,
}

pub fn stats() -> StreamingStats {
    StreamingStats {
        enabled: STREAMING_ENABLED.load(Ordering::Relaxed),
        mapped_tracks: MAPPED_TRACKS.load(Ordering::Relaxed),
        mapped_mb: MAPPED_BYTES.load(Ordering::Relaxed) as f64 / 1_048_576.0,
        fallbacks: SPILL_FALLBACKS.load(Ordering::Relaxed),
        cache_dir: CACHE_DIR.to_string_lossy().to_string(),
    }
}

// ── Cálculo de rangos (puro, sin E/S: fácil de probar) ────────────────────

/// Traduce la ventana de tiempo VIRTUAL `[v0, v1)` a rangos de la línea de tiempo REAL
/// del audio, aplicando el arreglo (mismas reglas que `map_arrangement` en el render:
/// los segmentos se recorren en orden y consumen tiempo virtual consecutivo).
/// Sin arreglo es la identidad.
pub fn source_ranges(v0: u64, v1: u64, segments: &[(u64, u64)]) -> Vec<(u64, u64)> {
    if v1 <= v0 { return Vec::new(); }
    if segments.is_empty() { return vec![(v0, v1)]; }
    let mut out = Vec::new();
    let mut consumed = 0u64;
    for &(start, end) in segments {
        let len = end.saturating_sub(start);
        if len == 0 { continue; }
        let seg_v0 = consumed;
        let seg_v1 = consumed + len;
        if seg_v0 >= v1 { break; }
        let lo = v0.max(seg_v0);
        let hi = v1.min(seg_v1);
        if hi > lo {
            out.push((start + (lo - seg_v0), start + (hi - seg_v0)));
        }
        consumed = seg_v1;
    }
    out
}

/// Ordena y une rangos que se tocan o se solapan; descarta los vacíos.
pub fn merge_ranges(mut ranges: Vec<(usize, usize)>) -> Vec<(usize, usize)> {
    ranges.retain(|&(a, b)| b > a);
    ranges.sort_unstable();
    let mut out: Vec<(usize, usize)> = Vec::with_capacity(ranges.len());
    for (a, b) in ranges {
        match out.last_mut() {
            Some(last) if a <= last.1 => last.1 = last.1.max(b),
            _ => out.push((a, b)),
        }
    }
    out
}

/// Complemento de `wanted` (ya fusionado y ordenado) dentro de `[0, len)`.
pub fn complement(len: usize, wanted: &[(usize, usize)]) -> Vec<(usize, usize)> {
    let mut out = Vec::new();
    let mut cursor = 0usize;
    for &(a, b) in wanted {
        let a = a.min(len);
        let b = b.min(len);
        if a > cursor { out.push((cursor, a)); }
        cursor = cursor.max(b);
    }
    if cursor < len { out.push((cursor, len)); }
    out
}

// ── Pruebas ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    /// Señal reproducible que no se repite en ventanas cortas: detecta cualquier desorden.
    fn signal(n: usize) -> Vec<i16> {
        (0..n).map(|i| ((i as u32).wrapping_mul(2_654_435_761) >> 16) as i16).collect()
    }

    fn feed(sink: &mut PcmSink, data: &[i16], chunk: usize) {
        for c in data.chunks(chunk) { sink.extend(c); }
    }

    fn wait_gone(path: &Path) -> bool {
        for _ in 0..80 {
            if !path.exists() { return true; }
            std::thread::sleep(Duration::from_millis(50));
        }
        false
    }

    #[test]
    fn small_track_stays_in_ram() {
        let data = signal(500);
        let mut sink = PcmSink::with_limits("small", 500, 1000, 100, true);
        feed(&mut sink, &data, 37);
        let buf = sink.finish();
        assert!(!buf.is_mapped());
        assert_eq!(buf.as_slice(), &data[..]);
    }

    #[test]
    fn spill_disabled_never_maps() {
        let data = signal(5000);
        let mut sink = PcmSink::with_limits("off", 5000, 1000, 100, false);
        feed(&mut sink, &data, 64);
        let buf = sink.finish();
        assert!(!buf.is_mapped());
        assert_eq!(buf.as_slice(), &data[..]);
    }

    #[test]
    fn spilled_track_is_bit_identical() {
        // Varios tamaños de trozo, incluidos los que caen justo en los bordes del buffer.
        for &chunk in &[1usize, 7, 64, 99, 100, 101, 333, 4096] {
            let data = signal(12_345);
            let mut sink = PcmSink::with_limits("spill", 12_345, 1000, 300, true);
            feed(&mut sink, &data, chunk);
            assert_eq!(sink.len(), data.len());
            let buf = sink.finish();
            assert!(buf.is_mapped(), "chunk {chunk} debía quedar mapeado");
            assert_eq!(buf.len(), data.len());
            assert_eq!(buf.as_slice(), &data[..], "chunk {chunk}");
        }
    }

    #[test]
    fn exact_multiple_of_write_buffer() {
        let data = signal(3000); // umbral 1000, buffer 500: termina justo en un borde
        let mut sink = PcmSink::with_limits("edge", 3000, 1000, 500, true);
        feed(&mut sink, &data, 500);
        let buf = sink.finish();
        assert!(buf.is_mapped());
        assert_eq!(buf.as_slice(), &data[..]);
    }

    #[test]
    fn write_failure_midway_falls_back_to_ram_without_losing_data() {
        let data = signal(10_000);
        let before = SPILL_FALLBACKS.load(Ordering::Relaxed);
        let mut sink = PcmSink::with_limits("fail-mid", 10_000, 1000, 300, true);
        sink.fail_after = Some(3); // el derrame inicial y 2 escrituras salen bien
        feed(&mut sink, &data, 128);
        let buf = sink.finish();
        assert!(!buf.is_mapped());
        assert_eq!(buf.as_slice(), &data[..]);
        assert!(SPILL_FALLBACKS.load(Ordering::Relaxed) > before);
    }

    #[test]
    fn write_failure_on_first_spill_keeps_ram() {
        let data = signal(4000);
        let mut sink = PcmSink::with_limits("fail-first", 4000, 1000, 300, true);
        sink.fail_after = Some(0); // ni siquiera el derrame inicial
        feed(&mut sink, &data, 100);
        let buf = sink.finish();
        assert!(!buf.is_mapped());
        assert_eq!(buf.as_slice(), &data[..]);
    }

    #[test]
    fn write_failure_on_final_flush_falls_back() {
        let data = signal(1000 + 150);
        let mut sink = PcmSink::with_limits("fail-final", 1150, 1000, 300, true);
        feed(&mut sink, &data, 50); // derrama a 1000; quedan 150 pendientes
        sink.fail_after = Some(sink.writes); // la siguiente escritura (la del finish) falla
        let buf = sink.finish();
        assert!(!buf.is_mapped());
        assert_eq!(buf.as_slice(), &data[..]);
    }

    #[test]
    fn empty_sink_gives_empty_buf() {
        let sink = PcmSink::with_limits("empty", 0, 1000, 300, true);
        let buf = sink.finish();
        assert_eq!(buf.len(), 0);
    }

    #[test]
    fn dropping_mapped_buf_deletes_its_file() {
        let data = signal(5000);
        let mut sink = PcmSink::with_limits("drop-me", 5000, 1000, 300, true);
        feed(&mut sink, &data, 100);
        let buf = sink.finish();
        let path = buf.backing_path().expect("debía estar mapeado");
        assert!(path.exists());
        drop(buf);
        assert!(wait_gone(&path), "el archivo temporal debía borrarse");
    }

    #[test]
    fn abandoned_sink_deletes_its_file() {
        let data = signal(5000);
        let mut sink = PcmSink::with_limits("abort", 5000, 1000, 300, true);
        feed(&mut sink, &data, 100);
        let path = sink.spill.as_ref().expect("debía haber derramado").path.clone();
        assert!(path.exists());
        drop(sink); // como cuando se aborta la carga
        assert!(!path.exists());
    }

    #[test]
    fn release_and_touch_never_change_the_data() {
        let n = 400_000; // varios bloques de 64 KB
        let data = signal(n);
        let mut sink = PcmSink::with_limits("release", n, 1000, 4096, true);
        feed(&mut sink, &data, 5000);
        let buf = sink.finish();
        assert!(buf.is_mapped());
        // Soltar todo, parte, rangos absurdos y volver a leer.
        buf.release_range(0, n);
        buf.release_range(10, 20);
        buf.release_range(n - 5, n + 1_000_000);
        buf.release_range(300_000, 100_000);
        buf.touch_range(0, n);
        buf.touch_range(n, n + 10);
        buf.release_range(40_000, 300_000);
        assert_eq!(buf.as_slice(), &data[..]);
    }

    #[test]
    fn source_ranges_without_arrangement_is_identity() {
        assert_eq!(source_ranges(100, 500, &[]), vec![(100, 500)]);
        assert!(source_ranges(500, 500, &[]).is_empty());
    }

    #[test]
    fn source_ranges_follows_arrangement_jumps() {
        // Virtual: [0,100) -> real [1000,1100); [100,150) -> real [50,100); [150,250) -> real [1000,1100)
        let seg = [(1000, 1100), (50, 100), (1000, 1100)];
        assert_eq!(source_ranges(0, 250, &seg), vec![(1000, 1100), (50, 100), (1000, 1100)]);
        // Ventana que arranca a mitad del primer segmento y termina a mitad del segundo.
        assert_eq!(source_ranges(60, 120, &seg), vec![(1060, 1100), (50, 70)]);
        // Ventana más allá del final del arreglo.
        assert_eq!(source_ranges(240, 400, &seg), vec![(1090, 1100)]);
        assert!(source_ranges(250, 400, &seg).is_empty());
        // Segmentos vacíos se ignoran.
        assert_eq!(source_ranges(0, 10, &[(5, 5), (7, 20)]), vec![(7, 17)]);
    }

    #[test]
    fn source_ranges_agree_with_render_mapping() {
        // La misma regla que map_arrangement del motor, comprobada muestra a muestra.
        let seg = [(500u64, 560u64), (10, 40), (500, 520), (900, 1000)];
        let map = |v: u64| -> Option<u64> {
            let mut consumed = 0;
            for &(s, e) in &seg {
                let len = e - s;
                if v < consumed + len { return Some(s + (v - consumed)); }
                consumed += len;
            }
            None
        };
        let ranges = source_ranges(17, 180, &seg);
        for v in 17..180u64 {
            if let Some(real) = map(v) {
                assert!(ranges.iter().any(|&(a, b)| real >= a && real < b), "v={v} real={real} fuera de {ranges:?}");
            }
        }
    }

    #[test]
    fn merge_and_complement() {
        assert_eq!(merge_ranges(vec![(10, 20), (15, 30), (30, 40), (50, 50), (60, 70)]), vec![(10, 40), (60, 70)]);
        assert_eq!(complement(100, &[(10, 40), (60, 70)]), vec![(0, 10), (40, 60), (70, 100)]);
        assert_eq!(complement(100, &[]), vec![(0, 100)]);
        assert_eq!(complement(100, &[(0, 100)]), Vec::<(usize, usize)>::new());
        assert_eq!(complement(100, &[(50, 500)]), vec![(0, 50)]);
    }

    /// Medición real del efecto en memoria: mapear ~400 MB, leerlos todos (el working set sube
    /// ~400 MB) y comprobar que `release_range` los devuelve. No corre por defecto (escribe
    /// 400 MB a disco):  cargo test --lib working_set -- --ignored --nocapture
    #[test]
    #[ignore]
    fn working_set_drops_after_release() {
        use sysinfo::{Pid, ProcessesToUpdate, System};
        let n = 200 * 1024 * 1024; // 200 Mi muestras = 400 MB
        let mut sink = PcmSink::with_limits("ws", n, 1000, WRITE_BUF_SAMPLES, true);
        let chunk = signal(1 << 20);
        for _ in 0..(n / chunk.len()) { sink.extend(&chunk); }
        let buf = sink.finish();
        assert!(buf.is_mapped());

        let pid = Pid::from_u32(std::process::id());
        let mut sys = System::new();
        let rss_mb = |sys: &mut System| -> f64 {
            sys.refresh_processes(ProcessesToUpdate::Some(&[pid]), true);
            sys.process(pid).map(|p| p.memory() as f64 / 1_048_576.0).unwrap_or(0.0)
        };

        let base = rss_mb(&mut sys);
        let mut sum = 0i64;
        for &v in buf.as_slice().iter().step_by(PAGE_SAMPLES) { sum += v as i64; }
        std::hint::black_box(sum);
        let touched = rss_mb(&mut sys);
        buf.release_range(0, buf.len());
        std::thread::sleep(Duration::from_millis(300));
        let released = rss_mb(&mut sys);
        println!("working set: base {base:.0} MB | tras leer todo {touched:.0} MB | tras liberar {released:.0} MB");
        assert!(touched - base > 300.0, "leer todo debía subir el working set (+{:.0} MB)", touched - base);
        assert!(touched - released > 250.0, "liberar debía bajarlo (bajó {:.0} MB)", touched - released);
    }
}
