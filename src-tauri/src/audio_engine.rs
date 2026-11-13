use std::sync::{Arc, Condvar, Mutex};
use std::sync::atomic::{AtomicU32, AtomicBool, AtomicU64, Ordering};
use crate::pcm_store::{self, PcmBuf, PcmSink};
use crate::clips::{self, ClipSeg};
use once_cell::sync::Lazy;
use arc_swap::ArcSwap;
use serde::{Serialize, Deserialize};
use cpal::traits::{HostTrait, DeviceTrait, StreamTrait};
use cpal::Sample;
use tauri::{AppHandle, Emitter, Manager};

// Wrapper para permitir que el Stream sea enviado entre hilos (necesario en Windows)
pub struct SendStream(#[allow(dead_code)] pub cpal::Stream);
unsafe impl Send for SendStream {}
unsafe impl Sync for SendStream {}

// Helper para manejar floats atómicos usando bits de U32
pub fn store_f32(atomic: &AtomicU32, val: f32) {
    atomic.store(val.to_bits(), Ordering::Relaxed);
}
pub fn load_f32(atomic: &AtomicU32) -> f32 {
    f32::from_bits(atomic.load(Ordering::Relaxed))
}

// EQ de 3 bandas — fórmulas del RBJ Audio EQ Cookbook (referencia estándar de
// la industria para filtros biquad), coeficientes normalizados con a0=1. A
// 0dB de ganancia estas fórmulas dan una identidad matemática exacta
// (b0=a0, b1=a1, b2=a2 tras normalizar), así que un canal sin tocar el EQ
// no cambia el sonido ni un bit — no arriesga nada de lo que ya funciona.
fn low_shelf_coeffs(freq: f32, gain_db: f32, sr: f32) -> [f32; 5] {
    let a = 10f32.powf(gain_db / 40.0);
    let w0 = 2.0 * std::f32::consts::PI * freq / sr;
    let cos_w0 = w0.cos();
    let sin_w0 = w0.sin();
    let alpha = sin_w0 / 2.0 * ((a + 1.0 / a) + 2.0).sqrt(); // slope S=1
    let sqrt_a = a.sqrt();

    let b0 = a * ((a + 1.0) - (a - 1.0) * cos_w0 + 2.0 * sqrt_a * alpha);
    let b1 = 2.0 * a * ((a - 1.0) - (a + 1.0) * cos_w0);
    let b2 = a * ((a + 1.0) - (a - 1.0) * cos_w0 - 2.0 * sqrt_a * alpha);
    let a0 = (a + 1.0) + (a - 1.0) * cos_w0 + 2.0 * sqrt_a * alpha;
    let a1 = -2.0 * ((a - 1.0) + (a + 1.0) * cos_w0);
    let a2 = (a + 1.0) + (a - 1.0) * cos_w0 - 2.0 * sqrt_a * alpha;

    [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0]
}

fn high_shelf_coeffs(freq: f32, gain_db: f32, sr: f32) -> [f32; 5] {
    let a = 10f32.powf(gain_db / 40.0);
    let w0 = 2.0 * std::f32::consts::PI * freq / sr;
    let cos_w0 = w0.cos();
    let sin_w0 = w0.sin();
    let alpha = sin_w0 / 2.0 * ((a + 1.0 / a) + 2.0).sqrt();
    let sqrt_a = a.sqrt();

    let b0 = a * ((a + 1.0) + (a - 1.0) * cos_w0 + 2.0 * sqrt_a * alpha);
    let b1 = -2.0 * a * ((a - 1.0) + (a + 1.0) * cos_w0);
    let b2 = a * ((a + 1.0) + (a - 1.0) * cos_w0 - 2.0 * sqrt_a * alpha);
    let a0 = (a + 1.0) - (a - 1.0) * cos_w0 + 2.0 * sqrt_a * alpha;
    let a1 = 2.0 * ((a - 1.0) - (a + 1.0) * cos_w0);
    let a2 = (a + 1.0) - (a - 1.0) * cos_w0 - 2.0 * sqrt_a * alpha;

    [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0]
}

fn peaking_coeffs(freq: f32, gain_db: f32, q: f32, sr: f32) -> [f32; 5] {
    let a = 10f32.powf(gain_db / 40.0);
    let w0 = 2.0 * std::f32::consts::PI * freq / sr;
    let cos_w0 = w0.cos();
    let sin_w0 = w0.sin();
    let alpha = sin_w0 / (2.0 * q);

    let b0 = 1.0 + alpha * a;
    let b1 = -2.0 * cos_w0;
    let b2 = 1.0 - alpha * a;
    let a0 = 1.0 + alpha / a;
    let a1 = -2.0 * cos_w0;
    let a2 = 1.0 - alpha / a;

    [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0]
}

// Direct Form 1. st = [x1, x2, y1, y2]. Salvaguarda: si por lo que sea entra
// un NaN/infinito, no lo dejamos quedar atrapado para siempre en el estado
// recursivo del filtro (bug clásico de DSP) — se resetea y sigue en silencio
// esa banda por una muestra en vez de contaminar el audio permanentemente.
#[inline(always)]
fn process_biquad(coeffs: &[f32; 5], x: f32, st: &mut [f32; 4]) -> f32 {
    let mut y = coeffs[0] * x + coeffs[1] * st[0] + coeffs[2] * st[1] - coeffs[3] * st[2] - coeffs[4] * st[3];
    if !y.is_finite() { y = 0.0; st[2] = 0.0; st[3] = 0.0; }
    st[1] = st[0]; st[0] = x;
    st[3] = st[2]; st[2] = y;
    y
}

// Estado interno de un filtro biquad (Direct Form 1): las 2 muestras de
// entrada y 2 de salida anteriores. Solo lo toca el hilo de audio (nunca se
// lee desde el hilo de UI), pero se guarda en AtomicU32 para que TrackSource
// siga siendo Sync trivialmente, igual que el resto de sus campos.
pub struct BiquadState {
    pub x1: AtomicU32, pub x2: AtomicU32,
    pub y1: AtomicU32, pub y2: AtomicU32,
}
impl BiquadState {
    pub fn zeroed() -> Self {
        Self { x1: AtomicU32::new(0), x2: AtomicU32::new(0), y1: AtomicU32::new(0), y2: AtomicU32::new(0) }
    }
}

// Estructura para una pista activa en el motor
pub struct TrackSource {
    pub id: String,
    pub volume: AtomicU32,
    pub is_muted: AtomicBool,
    pub is_soloed: AtomicBool,
    pub output_idx: AtomicU32,
    pub is_stereo: AtomicBool,
    pub is_eof: AtomicBool,
    pub is_aborted: AtomicBool, // Previene fugas de memoria si se cancela la carga
    pub frames_loaded: AtomicU64,
    pub peak: AtomicU32,          // Peak VU
    pub sample_rate: AtomicU32,   // Frecuencia original del archivo
    // PCM de 16 bits (ver pcm_from_f32): la mitad de RAM que f32. `PcmBuf` es un Vec en RAM
    // (pistas cortas) o un archivo mapeado (pistas largas, "streaming"): en ambos casos el
    // render lee el mismo `&[i16]` (ver pcm_store.rs).
    pub samples: arc_swap::ArcSwap<PcmBuf>,
    // Clips (secuenciador). `None` = la pista suena entera y de corrido, como siempre. `Some(lista)` =
    // SOLO suenan esos clips (lista vacía = pista en silencio). Es un único ArcSwap para que el
    // hilo de audio nunca vea un estado a medias. Ver clips.rs.
    pub clips: arc_swap::ArcSwapOption<Vec<ClipSeg>>,
    // EQ de 3 bandas (graves/medios/agudos), en dB, rango ±12dB. Frecuencias
    // fijas (100Hz shelf / 1kHz peak Q0.7 / 8kHz shelf) — solo la ganancia es
    // ajustable, como un canal de mezcla estándar. 100% aislado por pista:
    // nunca se comparte entre canciones, igual que volumen/mute/solo — cada
    // TrackSource nace y muere junto con su canción.
    pub eq_low_db: AtomicU32,
    pub eq_mid_db: AtomicU32,
    pub eq_high_db: AtomicU32,
    pub eq_state_l: [BiquadState; 3], // low, mid, high — canal izquierdo
    pub eq_state_r: [BiquadState; 3], // low, mid, high — canal derecho
}

// Estructura para un Pad
pub struct PadVoice {
    pub id: String,
    pub samples: Arc<Vec<f32>>, 
    pub position: AtomicU64,
    pub is_playing: AtomicBool,
    pub is_loop: AtomicBool,
    pub volume: AtomicU32,
    pub output_idx: AtomicU32,
    pub envelope_level: AtomicU32, // Ganancia actual de la envolvente (bits f32)
    pub is_releasing: AtomicBool,  // Estado de apagado suave
    pub sample_rate: AtomicU32,    // Nuevo: SR original del archivo
}

pub static TRACKS: Lazy<ArcSwap<Vec<Arc<TrackSource>>>> = Lazy::new(|| ArcSwap::from_pointee(Vec::new()));
pub static PADS: Lazy<ArcSwap<Vec<Arc<PadVoice>>>> = Lazy::new(|| ArcSwap::from_pointee(Vec::new()));

// ── Arreglo no destructivo ───────────────────────────────────────────────
// Un arreglo es una lista ordenada de segmentos (inicio, fin) sobre la línea
// de tiempo de la canción: "sáltate el verso 2" es simplemente no incluir ese
// segmento, y "repite el coro" es incluirlo dos veces. El audio original nunca
// se corta, re-exporta ni se duplica.
//
// Cómo encaja sin reescribir el motor: `sample_counter` sigue siendo una línea
// de tiempo VIRTUAL que avanza de corrido. Justo antes de resamplear, cada
// pista traduce esa posición virtual a la posición real dentro del archivo.
// Con la lista vacía la traducción es la identidad, así que el camino de
// siempre queda exactamente igual que antes — el arreglo es opt-in.
pub static ARRANGEMENT: Lazy<ArcSwap<Vec<(u64, u64)>>> = Lazy::new(|| ArcSwap::from_pointee(Vec::new()));

// Fundido corto a cada lado de un corte. Sin esto, saltar de un punto a otro
// del audio produce un click audible: las dos muestras a lado y lado del corte
// casi nunca están al mismo nivel. ~6ms a 44.1kHz: inaudible como fundido,
// suficiente para matar el click.
const CUT_FADE_SAMPLES: u64 = 256;

/// Traduce posición virtual -> posición real en el audio.
/// Devuelve `(posición, distancia_al_corte_más_cercano)`. La distancia sirve
/// para aplicar el fundido; `u64::MAX` en la posición significa "el arreglo ya
/// terminó" y esa muestra no debe sonar.
#[inline]
fn map_arrangement(virtual_pos: u64, segments: &[(u64, u64)]) -> (u64, u64) {
    let mut consumed = 0u64;
    for (start, end) in segments {
        let len = end.saturating_sub(*start);
        if len == 0 { continue; }
        if virtual_pos < consumed + len {
            let offset = virtual_pos - consumed;
            let dist_to_edge = offset.min(len - offset);
            return (start + offset, dist_to_edge);
        }
        consumed += len;
    }
    (u64::MAX, 0)
}

/// Largo total del arreglo en muestras (0 si no hay arreglo activo).
fn arrangement_len(segments: &[(u64, u64)]) -> u64 {
    segments.iter().map(|(s, e)| e.saturating_sub(*s)).sum()
}
pub static AUDIO_STREAM: Lazy<Mutex<Option<SendStream>>> = Lazy::new(|| Mutex::new(None));
pub static CURRENT_DEVICE: Lazy<Mutex<String>> = Lazy::new(|| Mutex::new(String::new()));

pub struct GlobalAudioState {
    pub is_playing: AtomicBool,
    pub is_ready: AtomicBool,
    pub tracks_loading: AtomicU32,
    pub master_volume: AtomicU32,
    pub metronome_enabled: AtomicBool,
    pub metronome_standalone: AtomicBool,
    pub metronome_volume: AtomicU32,
    pub metronome_sample_counter: AtomicU64,
    pub metronome_out_ch: AtomicU32,
    pub bpm: AtomicU32,
    pub current_sample_rate: AtomicU32,     // bits de f32
    pub preroll_active: AtomicBool,
    pub preroll_remaining_bars: AtomicU32,
    pub preroll_target_sample: AtomicU64,
    pub cue_active: AtomicBool,
    pub cue_bars_left: AtomicU32,
    pub cue_target_sample: AtomicU64,
    pub sample_counter: AtomicU64,
    pub device_channels: AtomicU32,
    pub requested_buffer_size: AtomicU32,   // 0 = automático (el que decida el driver)
    pub requested_sample_rate: AtomicU32,   // 0 = automático
    pub sample_rate_hint: AtomicU32,        // frecuencia de las últimas pistas (para el modo automático)
    // Transposición varispeed: 2^(semitonos/12). Escala el resampler de pistas,
    // el metrónomo y los cues juntos — pitch y tempo cambian como en cinta.
    pub pitch_ratio: AtomicU32,             // bits de f32
    // Beats por compás según la métrica real de la secuencia (4 en 4/4, 3 en 3/4,
    // 6 en 6/8...). Antes estaba fijo en 4 en todo el motor — un 6/8 sonaba
    // acentuado y hacía pre-roll como si fuera 4/4.
    pub beats_per_bar: AtomicU32,
}

#[derive(Serialize)]
pub struct EngineReport {
    pub sample_pos: u64,
    pub is_playing: bool,
    pub sample_rate: u32,
    pub is_ready: bool,
    pub tracks_loading: u32,
    pub preroll_active: bool,
    pub preroll_bars: u32,
    pub peaks: Vec<(String, f32)>,
    pub total_samples: u64,
    // Largo real del audio cargado, sin importar el arreglo. `total_samples`
    // pasa a ser el largo del ARREGLO cuando hay uno activo; la UI necesita
    // además el largo original para poder recalcular las secciones — si usara
    // total_samples se realimentaría a sí misma cada vez que edites el arreglo.
    pub song_samples: u64,
    pub device_channels: u32,
    // Frecuencia de muestreo de las pistas cargadas (0 si no hay). `sample_pos` y
    // `total_samples` van en cuadros de SALIDA de la tarjeta (`sample_rate`); si la
    // tarjeta trabaja a otra frecuencia que los archivos (p. ej. 48 kHz contra pistas
    // de 44,1 kHz), la UI usa esto para pasar esas posiciones a la unidad del archivo —
    // la misma en la que se guardan los marcadores — y que no dependan de la tarjeta.
    pub file_sample_rate: u32,
}

pub static AUDIO_STATE: Lazy<Arc<GlobalAudioState>> = Lazy::new(|| {
    Arc::new(GlobalAudioState {
        is_playing: AtomicBool::new(false),
        is_ready: AtomicBool::new(false),
        tracks_loading: AtomicU32::new(0),
        master_volume: AtomicU32::new(1.0f32.to_bits()),
        metronome_enabled: AtomicBool::new(false),
        metronome_standalone: AtomicBool::new(false),
        metronome_volume: AtomicU32::new(0.5f32.to_bits()),
        metronome_out_ch: AtomicU32::new(0),
        bpm: AtomicU32::new(120.0f32.to_bits()),
        sample_counter: AtomicU64::new(0),
        current_sample_rate: AtomicU32::new(44100.0f32.to_bits()),
        device_channels: AtomicU32::new(2),
        cue_active: AtomicBool::new(false),
        cue_target_sample: AtomicU64::new(0),
        cue_bars_left: AtomicU32::new(0),
        requested_buffer_size: AtomicU32::new(0),
        requested_sample_rate: AtomicU32::new(0),
        sample_rate_hint: AtomicU32::new(0),
        metronome_sample_counter: AtomicU64::new(0),
        preroll_active: AtomicBool::new(false),
        preroll_remaining_bars: AtomicU32::new(0),
        preroll_target_sample: AtomicU64::new(0),
        pitch_ratio: AtomicU32::new(1.0f32.to_bits()),
        beats_per_bar: AtomicU32::new(4),
    })
});

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AudioDevice {
    pub name: String,
    pub id: String,
    pub host: String,
}

#[tauri::command]
pub fn get_audio_devices() -> Result<Vec<AudioDevice>, String> {
    let mut all_devices = Vec::new();
    let host_ids = cpal::available_hosts();

    for host_id in host_ids {
        let host_name = host_id.name().to_string();
        // Compatibilidad Universal: ASIO/WASAPI (Windows), CoreAudio (Mac), ALSA (Linux)
        let host_upper = host_name.to_uppercase();
        let is_valid_host = host_upper.contains("ASIO") || 
                           host_upper.contains("WASAPI") || 
                           host_upper.contains("COREAUDIO") || 
                           host_upper.contains("ALSA");
        
        if !is_valid_host { continue; }

        println!("[Audio] Escaneando Host: {}...", host_name);

        if let Ok(host) = cpal::host_from_id(host_id) {
            match host.devices() {
                Ok(devs) => {
                    for device in devs {
                        if let Ok(name) = device.name() {
                            println!("[Audio] Dispositivo encontrado: {}", name);
                            let unique_id = format!("{}_{}", host_name, name);
                            all_devices.push(AudioDevice { name, id: unique_id, host: host_name.clone() });
                        }
                    }
                },
                Err(e) => {
                    eprintln!("[Audio] ERROR al listar dispositivos para {}: {}", host_name, e);
                }
            }
        }
    }
    
    Ok(all_devices)
}

#[tauri::command]
pub fn init_audio_stream(
    app: AppHandle,
    device_id: String,
    sample_rate: Option<u32>,
    buffer_size: Option<u32>,
    rate_hint: Option<u32>,
) -> Result<(), String> {
    // Preferencias de esta conexión (0 = automático). Se guardan antes de abrir el audio.
    AUDIO_STATE.requested_sample_rate.store(sample_rate.unwrap_or(0), Ordering::Relaxed);
    AUDIO_STATE.requested_buffer_size.store(buffer_size.unwrap_or(0), Ordering::Relaxed);
    AUDIO_STATE.sample_rate_hint.store(rate_hint.unwrap_or(0), Ordering::Relaxed);
    // Siempre permitimos la reinicialización forzada si el usuario lo solicita (Hito Resiliencia)
    println!("[Audio] Iniciando/Reiniciando motor para: {}", device_id);

    // PROTOCOLO DE SEGURIDAD AGRESIVO: Matar y esperar 1 segundo para que el hardware libere recursos
    {
        println!("[Audio] Liberando recursos de hardware (Deep Clean)...");
        if let Ok(mut g) = AUDIO_STREAM.lock() { *g = None; }
        AUDIO_STATE.is_ready.store(false, Ordering::Relaxed);
    }
    
    // Pausa asíncrona para no congelar la UI de Tauri mientras el driver libera recursos
    std::thread::sleep(std::time::Duration::from_millis(800));
    let mut found_device = None;
    let mut debug_log = String::new();
    
    // RETRY LOOP: Los drivers ASIO a veces tardan ms de 800ms en soltar el lock del COM.
    // Damos hasta 2.5 segundos extra (5 intentos de 500ms) si el dispositivo no aparece.
    for retry in 0..5 {
        let host_ids = cpal::available_hosts();
        debug_log.push_str(&format!("[R{}] ", retry));
        for host_id in host_ids {
            if let Ok(host) = cpal::host_from_id(host_id) {
                let host_name = host_id.name().to_string();
                
                match host.devices() {
                    Ok(devs) => {
                        let mut dev_count = 0;
                        for device in devs {
                            if let Ok(name) = device.name() {
                                dev_count += 1;
                                let current_id = format!("{}_{}", host_name, name);
                                // 1. Intento de coincidencia exacta
                                if current_id == device_id {
                                    found_device = Some(device);
                                    break;
                                }
                                // 2. Intento de coincidencia por nombre (Fuzzy Match para reconexiones)
                                if device_id.contains(&name) || name.contains(&device_id) {
                                    found_device = Some(device);
                                }
                            }
                        }
                        debug_log.push_str(&format!("H:{}({}D) ", host_name, dev_count));
                    },
                    Err(e) => {
                        println!("[Audio] Retry {} - Fallo al listar dispositivos en el host {}: {}", retry, host_name, e);
                        debug_log.push_str(&format!("H:{} Err({}) ", host_name, e));
                    }
                }
            }
            if found_device.is_some() { break; }
        }
        
        if found_device.is_some() { break; }
        
        // Si no lo encontramos, esperamos medio segundo y reintentamos. 
        // ASIO suele estar ocupado limpiando la sesin anterior.
        std::thread::sleep(std::time::Duration::from_millis(500));
    }

    if let Some(device) = found_device {
        let res = setup_stream(app.clone(), device);
        if res.is_ok() {
            if let Ok(mut current) = CURRENT_DEVICE.lock() { *current = device_id.clone(); }
        }
        return res;
    }

    Err(format!("Dispositivo no encontrado o no disponible tras reconexin. Debug: {}", debug_log))
}

fn render_audio<T>(data: &mut [T], _channels: usize, state: Arc<GlobalAudioState>) 
where T: cpal::Sample + cpal::FromSample<f32>, f32: cpal::FromSample<T> 
{
    let master_vol = load_f32(&state.master_volume);
    let mut is_playing = state.is_playing.load(Ordering::Relaxed);
    let preroll_active = state.preroll_active.load(Ordering::Relaxed);
    let bpm = load_f32(&state.bpm);
    let met_enabled = state.metronome_enabled.load(Ordering::Relaxed);
    let met_vol = load_f32(&state.metronome_volume);
    let met_out_ch = state.metronome_out_ch.load(Ordering::Relaxed) as usize;
    let sr = load_f32(&state.current_sample_rate);
    let safe_sr = if sr < 1.0 { 44100.0 } else { sr };
    let pitch = { let p = load_f32(&state.pitch_ratio); if p > 0.01 { p } else { 1.0 } };

    for out in data.iter_mut() { *out = T::from_sample(0.0); }
    
    // Elevación de prioridad del hilo de audio (thread-safe con std::sync::Once)
    static THREAD_INIT: std::sync::Once = std::sync::Once::new();
    THREAD_INIT.call_once(|| {
        if let Err(e) = thread_priority::set_current_thread_priority(thread_priority::ThreadPriority::Max) {
            eprintln!("[Audio] No se pudo elevar la prioridad del hilo: {:?}", e);
        } else {
            println!("[Audio] Hilo de renderizado elevado a prioridad máxima (Real-Time).");
        }
    });

    let real_channels = _channels;
    if real_channels == 0 { return; }
    let num_frames = data.len() / real_channels;

    // El metrónomo escala con el pitch para mantenerse pegado a las pistas transpuestas
    let spb = ((safe_sr * 60.0 / bpm) / pitch) as u64;
    let beats_per_bar = state.beats_per_bar.load(Ordering::Relaxed).max(1) as u64;
    let samples_per_bar = spb * beats_per_bar;

    for f_idx in 0..num_frames {
        let song_sample = if is_playing && !preroll_active {
            state.sample_counter.fetch_add(1, Ordering::Relaxed)
        } else {
            state.sample_counter.load(Ordering::Relaxed)
        };

        // El contador del metrónomo avanza si: hay reproducción, preroll activo, o el metrónomo
        // está habilitado en modo standalone (sin canción). Así el metrónomo es completamente independiente.
        let met_sample = if is_playing || preroll_active || met_enabled {
            state.metronome_sample_counter.fetch_add(1, Ordering::Relaxed)
        } else {
            state.metronome_sample_counter.load(Ordering::Relaxed)
        };

        if preroll_active {
            if met_sample % samples_per_bar == 0 {
                let left = state.preroll_remaining_bars.fetch_sub(1, Ordering::Relaxed);
                if left <= 1 {
                    state.sample_counter.store(state.preroll_target_sample.load(Ordering::Relaxed), Ordering::Relaxed);
                    state.preroll_active.store(false, Ordering::Relaxed);
                    state.is_playing.store(true, Ordering::Relaxed);
                    is_playing = true;
                }
            }
        }

        // El metrónomo suena si: está habilitado (con o sin canción) O hay preroll activo
        if met_enabled || preroll_active {
            let phase = met_sample % spb;
            if phase < (safe_sr * 0.05) as u64 {
                let freq = if (met_sample / spb) % beats_per_bar == 0 { 800.0 } else { 400.0 };
                let met_s = (met_sample as f32 * freq * 2.0 * std::f32::consts::PI / safe_sr).sin();
                let decay = 1.0 - (phase as f32 / (safe_sr * 0.05));
                let envelope = decay * decay * decay; // Envolvente exponencial para sonido de "palo/clack" en lugar de "alarma"
                let final_met = met_s * met_vol * master_vol * envelope;
                if let Some(out_mono) = data.get_mut(f_idx * real_channels + (met_out_ch % real_channels)) {
                    *out_mono = T::from_sample(final_met);
                }
            }
        }

        if is_playing && !preroll_active && state.cue_active.load(Ordering::Relaxed) && song_sample % samples_per_bar == 0 {
            let left = state.cue_bars_left.fetch_sub(1, Ordering::Relaxed);
            if left <= 1 {
                state.sample_counter.store(state.cue_target_sample.load(Ordering::Relaxed), Ordering::Relaxed);
                state.cue_active.store(false, Ordering::Relaxed);
            }
        }
    }

    if is_playing && !preroll_active {
        let tracks = TRACKS.load();
        // Se lee una vez por bloque, no por muestra: ArcSwap::load es barato
        // pero no gratis, y el arreglo no cambia a mitad de un buffer.
        let arrangement = ARRANGEMENT.load();
        let arranged = !arrangement.is_empty();
        {
            let start_sample = state.sample_counter.load(Ordering::Relaxed).saturating_sub(num_frames as u64);
            let any_solo = tracks.iter().any(|t| t.is_soloed.load(Ordering::Relaxed));

            for track in tracks.iter() {
                let muted = track.is_muted.load(Ordering::Relaxed);
                let soloed = track.is_soloed.load(Ordering::Relaxed);
                let should_play = if any_solo { soloed && !muted } else { !muted };
                if !should_play {
                    store_f32(&track.peak, 0.0); // Silenciar el VU meter de canales muteados/no-soloed
                    continue;
                }

                // Una sola vez por bloque: el match RAM/mapeado queda fuera del loop de muestras.
                let samples_guard = track.samples.load();
                let samples: &[i16] = samples_guard.as_slice();
                // Clips: una lectura por bloque. Sin clips activos `track_clips` es None y el
                // camino de abajo queda idéntico al de siempre.
                let clips_guard = track.clips.load();
                let track_clips: Option<&[ClipSeg]> = clips_guard.as_ref().map(|c| c.as_slice());
                let total_interleaved = samples.len();
                let total_frames_track = total_interleaved / 2;
                if total_frames_track < 4 { continue; } // Hermite necesita mínimo 4 puntos

                // Fix #5: Leer estado atómico UNA SOLA VEZ antes del loop interno
                let vol = load_f32(&track.volume);
                let is_stereo = track.is_stereo.load(Ordering::Relaxed);
                let src_sr = load_f32(&track.sample_rate);
                let out_idx = track.output_idx.load(Ordering::Relaxed) as usize;
                let (left_ch, right_ch) = if is_stereo {
                    ((out_idx * 2) % real_channels, (out_idx * 2 + 1) % real_channels)
                } else {
                    (out_idx % real_channels, out_idx % real_channels)
                };

                // Fix #2: f64 para precisión en canciones largas (>6 min)
                // El pitch multiplica el ratio: la interpolación Hermite hace el resto
                let ratio_64 = (src_sr as f64 / safe_sr as f64) * pitch as f64;
                let gain = vol * master_vol;

                // EQ de 3 bandas: coeficientes recalculados una vez por bloque (no por
                // muestra) a partir de la ganancia actual — barato, y evita tener que
                // invalidar una caché cuando el usuario mueve un control en vivo.
                let eq_low_db = load_f32(&track.eq_low_db).clamp(-12.0, 12.0);
                let eq_mid_db = load_f32(&track.eq_mid_db).clamp(-12.0, 12.0);
                let eq_high_db = load_f32(&track.eq_high_db).clamp(-12.0, 12.0);
                let eq_coeffs = [
                    low_shelf_coeffs(100.0, eq_low_db, safe_sr),
                    peaking_coeffs(1000.0, eq_mid_db, 0.7, safe_sr),
                    high_shelf_coeffs(8000.0, eq_high_db, safe_sr),
                ];
                // Fix #5 (mismo patrón que vol/is_stereo/etc.): leer el estado del filtro
                // UNA sola vez antes del loop interno, procesar en locales, y escribirlo
                // de vuelta una sola vez al final — nada de atómicos por muestra.
                let mut eq_state_l: [[f32; 4]; 3] = [[0.0; 4]; 3];
                let mut eq_state_r: [[f32; 4]; 3] = [[0.0; 4]; 3];
                for b in 0..3 {
                    eq_state_l[b] = [load_f32(&track.eq_state_l[b].x1), load_f32(&track.eq_state_l[b].x2), load_f32(&track.eq_state_l[b].y1), load_f32(&track.eq_state_l[b].y2)];
                    eq_state_r[b] = [load_f32(&track.eq_state_r[b].x1), load_f32(&track.eq_state_r[b].x2), load_f32(&track.eq_state_r[b].y1), load_f32(&track.eq_state_r[b].y2)];
                }

                // Helper: leer muestra interleaved con bounds check
                let s = |frame: usize, ch: usize| -> f32 {
                    let idx = frame * 2 + ch;
                    if idx < total_interleaved { pcm_to_f32(samples[idx]) } else { 0.0 }
                };

                // VU Meter: pico máximo (post-gain) de este bloque para esta pista
                let mut block_peak: f32 = 0.0;

                for f in 0..num_frames {
                    // Posición virtual -> posición real. Sin arreglo activo es
                    // la identidad y el cálculo queda idéntico al de siempre.
                    let virtual_pos = start_sample + f as u64;
                    let (source_pos, edge_dist) = if arranged {
                        map_arrangement(virtual_pos, &arrangement)
                    } else {
                        (virtual_pos, u64::MAX)
                    };
                    if source_pos == u64::MAX { continue; } // el arreglo ya terminó

                    // Clips de la pista: traducen tiempo de canción -> posición en su archivo.
                    // Hueco entre clips = silencio. El fundido del borde de un clip se combina
                    // con el del arreglo (gana el más cercano).
                    let (source_pos, edge_dist) = match track_clips {
                        None => (source_pos, edge_dist),
                        Some(cl) => match clips::map(source_pos, cl) {
                            Some((p, d)) => (p, edge_dist.min(d)),
                            None => continue,
                        },
                    };

                    // Fundido de ~6ms a cada lado de un corte para que el salto
                    // entre secciones no suene como un click.
                    let cut_gain = if edge_dist >= CUT_FADE_SAMPLES {
                        1.0
                    } else {
                        edge_dist as f32 / CUT_FADE_SAMPLES as f32
                    };

                    // Fix #2: Posición en f64 para eliminar glitches de precisión
                    let float_pos = source_pos as f64 * ratio_64;
                    let pos = float_pos as usize;
                    let fract = (float_pos - pos as f64) as f32;

                    // Hermite necesita pos-1, pos, pos+1, pos+2
                    if pos < 1 || pos + 2 >= total_frames_track { continue; }

                    // Fix #3: Interpolación Hermite 4-puntos (calidad DAW) — Canal Izquierdo
                    let xm1 = s(pos - 1, 0);
                    let x0  = s(pos, 0);
                    let x1  = s(pos + 1, 0);
                    let x2  = s(pos + 2, 0);
                    let c1 = 0.5 * (x1 - xm1);
                    let c2 = xm1 - 2.5 * x0 + 2.0 * x1 - 0.5 * x2;
                    let c3 = 0.5 * (x2 - xm1) + 1.5 * (x0 - x1);
                    let mut s_l = (((c3 * fract + c2) * fract + c1) * fract + x0) * gain * cut_gain;
                    for b in 0..3 { s_l = process_biquad(&eq_coeffs[b], s_l, &mut eq_state_l[b]); }

                    // Fix #3: Interpolación Hermite 4-puntos — Canal Derecho
                    let xm1 = s(pos - 1, 1);
                    let x0  = s(pos, 1);
                    let x1  = s(pos + 1, 1);
                    let x2  = s(pos + 2, 1);
                    let c1 = 0.5 * (x1 - xm1);
                    let c2 = xm1 - 2.5 * x0 + 2.0 * x1 - 0.5 * x2;
                    let c3 = 0.5 * (x2 - xm1) + 1.5 * (x0 - x1);
                    let mut s_r = (((c3 * fract + c2) * fract + c1) * fract + x0) * gain * cut_gain;
                    for b in 0..3 { s_r = process_biquad(&eq_coeffs[b], s_r, &mut eq_state_r[b]); }

                    let abs_max = s_l.abs().max(s_r.abs());
                    if abs_max > block_peak { block_peak = abs_max; }

                    let base = f * real_channels;

                    if let Some(out_l) = data.get_mut(base + left_ch) {
                        *out_l = T::from_sample(out_l.to_sample::<f32>() + s_l);
                    }
                    if real_channels > 1 {
                        if let Some(out_r) = data.get_mut(base + right_ch) {
                            *out_r = T::from_sample(out_r.to_sample::<f32>() + s_r);
                        }
                    }
                }

                // Guardar el estado del filtro de vuelta — una sola escritura atómica
                // por banda/canal al final del bloque, no por muestra.
                for b in 0..3 {
                    store_f32(&track.eq_state_l[b].x1, eq_state_l[b][0]); store_f32(&track.eq_state_l[b].x2, eq_state_l[b][1]);
                    store_f32(&track.eq_state_l[b].y1, eq_state_l[b][2]); store_f32(&track.eq_state_l[b].y2, eq_state_l[b][3]);
                    store_f32(&track.eq_state_r[b].x1, eq_state_r[b][0]); store_f32(&track.eq_state_r[b].x2, eq_state_r[b][1]);
                    store_f32(&track.eq_state_r[b].y1, eq_state_r[b][2]); store_f32(&track.eq_state_r[b].y2, eq_state_r[b][3]);
                }

                // VU Meter: decay-hold — el pico sube instantáneo y cae ~40dB/s.
                // Así el polling de la UI (100-300ms) ve la envolvente real del audio
                // y no el pico del bloque aleatorio del instante de lectura.
                let prev_peak = load_f32(&track.peak);
                let new_peak = (block_peak * 100.0).min(150.0);
                store_f32(&track.peak, new_peak.max(prev_peak * 0.90));
            }
        }
    } else {
        // Pausado/detenido: los VU caen suavemente a cero en vez de quedar congelados
        let tracks = TRACKS.load();
        for track in tracks.iter() {
            let prev = load_f32(&track.peak);
            if prev > 0.0 {
                let next = prev * 0.85;
                store_f32(&track.peak, if next < 0.5 { 0.0 } else { next });
            }
        }
    }

    let pads = PADS.load(); {
        for pad in pads.iter() {
            if !pad.is_playing.load(Ordering::Relaxed) { continue; }
            let samples = &pad.samples;
            let vol = load_f32(&pad.volume);
            let total_frames = (samples.len() / 2) as u64;
            
            // --- Lógica de Resampling ---
            let pad_sr = load_f32(&pad.sample_rate);
            let ratio_64 = if pad_sr > 0.0 { pad_sr as f64 / safe_sr as f64 } else { 1.0 };
            let cf_frames_src = (pad_sr * 2.0) as u64; // 2s en frames de origen — los pads son sonido continuo (10-18s), una mezcla corta se notaba como corte
            
            let can_crossfade = pad.is_loop.load(Ordering::Relaxed) && total_frames > cf_frames_src * 2;

            for f in 0..num_frames {
                let frames_since_trigger = pad.position.load(Ordering::Relaxed);
                let float_pos_64 = frames_since_trigger as f64 * ratio_64;
                let float_pos = float_pos_64 as f32; // Para cálculos de crossfade que no necesitan tanta precisión
                let pos_idx = float_pos_64 as usize;
                let fract = (float_pos_64 - pos_idx as f64) as f32;
                
                let mut s_l;
                let mut s_r;

                let next_idx = pos_idx + 1;
                
                // Interpolación para afinación perfecta
                let get_sample = |idx: usize, ch: usize| -> f32 {
                    samples.get(idx * 2 + ch).copied().unwrap_or(0.0)
                };

                if can_crossfade && pos_idx + cf_frames_src as usize >= total_frames as usize {
                    let remaining_src = total_frames as f32 - float_pos;
                    let t = (1.0 - (remaining_src / cf_frames_src as f32)).clamp(0.0, 1.0);
                    
                    // Potencia constante (cos/sin): el final y el principio de un pad no
                    // se parecen (no están en fase), así que sus potencias se suman. Con
                    // una curva lineal (1-a, a) el volumen caía ~3 dB a mitad de la
                    // mezcla y se sentía como una bajada y subida en cada vuelta.
                    let fade_out = (t * std::f32::consts::FRAC_PI_2).cos();
                    let fade_in = (t * std::f32::consts::FRAC_PI_2).sin();

                    // Interpolación en el punto de salida
                    let b_l = get_sample(pos_idx, 0) * (1.0 - fract) + get_sample(next_idx, 0) * fract;
                    let b_r = get_sample(pos_idx, 1) * (1.0 - fract) + get_sample(next_idx, 1) * fract;

                    // Interpolación en el punto de entrada (loop)
                    let in_pos = float_pos - (total_frames as f32 - cf_frames_src as f32);
                    let in_idx = in_pos as usize;
                    let in_fract = in_pos - in_idx as f32;
                    
                    let i_l = get_sample(in_idx, 0) * (1.0 - in_fract) + get_sample(in_idx + 1, 0) * in_fract;
                    let i_r = get_sample(in_idx, 1) * (1.0 - in_fract) + get_sample(in_idx + 1, 1) * in_fract;

                    s_l = (b_l * fade_out + i_l * fade_in) * vol * master_vol;
                    s_r = (b_r * fade_out + i_r * fade_in) * vol * master_vol;
                } else {
                    s_l = (get_sample(pos_idx, 0) * (1.0 - fract) + get_sample(next_idx, 0) * fract) * vol * master_vol;
                    s_r = (get_sample(pos_idx, 1) * (1.0 - fract) + get_sample(next_idx, 1) * fract) * vol * master_vol;
                }

                // --- Envolvente ---
                let mut env = load_f32(&pad.envelope_level);
                let is_rel = pad.is_releasing.load(Ordering::Relaxed);
                if !is_rel { env = (env + 1.0 / (safe_sr * 1.5)).min(1.0); }
                else { env = (env - 1.0 / (safe_sr * 1.5)).max(0.0); }
                store_f32(&pad.envelope_level, env);
                s_l *= env; s_r *= env;

                if is_rel && env <= 0.0 {
                    pad.is_playing.store(false, Ordering::Relaxed);
                    break;
                }

                if pos_idx + 2 >= total_frames as usize {
                    if pad.is_loop.load(Ordering::Relaxed) {
                        let jump_src = if can_crossfade { cf_frames_src as f64 } else { 0.0 };
                        pad.position.store((jump_src / ratio_64) as u64, Ordering::Relaxed); 
                    } else {
                        pad.is_playing.store(false, Ordering::Relaxed);
                        break;
                    }
                } else {
                    pad.position.fetch_add(1, Ordering::Relaxed);
                }

                let base = f * real_channels;
                let out_idx = pad.output_idx.load(Ordering::Relaxed) as usize;
                let left_ch = (out_idx * 2) % real_channels;
                let right_ch = (out_idx * 2 + 1) % real_channels;

                if let Some(out_l) = data.get_mut(base + left_ch) {
                    *out_l = T::from_sample(out_l.to_sample::<f32>() + s_l);
                }
                if real_channels > 1 {
                    if let Some(out_r) = data.get_mut(base + right_ch) {
                        *out_r = T::from_sample(out_r.to_sample::<f32>() + s_r);
                    }
                }
            }
        }
    }

    // --- SAFETY LIMITER (Transparente, solo previene clipping digital) ---
    // NO waveshaping, NO compresión de bus. Solo un limitador de -1dB para proteger las salidas.
    // Fix #4: Usar AtomicU32 en vez de static mut para thread-safety
    static LIMITER_ENV: AtomicU32 = AtomicU32::new(0);
    let mut lim_env = load_f32(&LIMITER_ENV);
    let lim_attack = (-1.0 / (safe_sr * 0.001)).exp();   // 1ms attack (atrapa picos instantáneamente)
    let lim_release = (-1.0 / (safe_sr * 0.100)).exp();   // 100ms release (suelta rápido sin artefactos)
    let lim_threshold = 0.89f32; // -1dB — solo actúa en picos que están a punto de clipear
    
    for f in 0..num_frames {
        let base = f * real_channels;
        let mut frame_peak = 0.0f32;
        
        for c in 0..real_channels {
            if let Some(s) = data.get(base + c) {
                let val = s.to_sample::<f32>().abs();
                if val > frame_peak { frame_peak = val; }
            }
        }

        {
            if frame_peak > lim_env {
                lim_env = lim_attack * lim_env + (1.0 - lim_attack) * frame_peak;
            } else {
                lim_env = lim_release * lim_env + (1.0 - lim_release) * frame_peak;
            }

            let gain = if lim_env > lim_threshold {
                lim_threshold / lim_env
            } else {
                1.0f32
            };

            for c in 0..real_channels {
                if let Some(s) = data.get_mut(base + c) {
                    let val = s.to_sample::<f32>() * gain;
                    // Hard clamp puro — cero coloración, cero distorsión armónica
                    *s = T::from_sample(val.clamp(-1.0, 1.0));
                }
            }
        }
    }
    // Persistir estado del limiter para el siguiente callback
    store_f32(&LIMITER_ENV, lim_env);
}

/// Frecuencia de muestreo con la que se abre la tarjeta. Si el usuario eligió una y el
/// dispositivo la admite, esa. En automático: la de las últimas pistas que se cargaron (así no
/// hay que convertir en cada muestra), luego 48 kHz y 44,1 kHz, y por último la máxima.
fn pick_sample_rate(range: &cpal::SupportedStreamConfigRange, want: u32, hint: u32) -> cpal::SampleRate {
    let (min, max) = (range.min_sample_rate().0, range.max_sample_rate().0);
    let ok = |r: u32| r >= min && r <= max;
    if want > 0 && ok(want) { return cpal::SampleRate(want); }
    for r in [hint, 48000, 44100] {
        if r > 1000 && ok(r) { return cpal::SampleRate(r); }
    }
    range.max_sample_rate()
}

fn buffer_in_range(supported: &cpal::SupportedBufferSize, n: u32) -> bool {
    match supported {
        cpal::SupportedBufferSize::Range { min, max } => n >= *min && n <= *max,
        cpal::SupportedBufferSize::Unknown => true, // no se sabe: se intenta y, si falla, se usa el del driver
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DeviceAudioOptions {
    pub sample_rates: Vec<u32>,
    pub buffer_min: u32, // 0 = el driver no lo informa
    pub buffer_max: u32,
}

/// Qué frecuencias y tamaños de buffer admite el dispositivo, para llenar los selectores.
#[tauri::command]
pub fn get_device_audio_options(device_id: String) -> Result<DeviceAudioOptions, String> {
    let mut found = None;
    'hosts: for host_id in cpal::available_hosts() {
        let host_name = host_id.name().to_string();
        if let Ok(host) = cpal::host_from_id(host_id) {
            if let Ok(devs) = host.devices() {
                for device in devs {
                    if let Ok(name) = device.name() {
                        if format!("{}_{}", host_name, name) == device_id { found = Some(device); break 'hosts; }
                    }
                }
            }
        }
    }
    let device = found.ok_or_else(|| "Dispositivo no encontrado".to_string())?;
    let configs: Vec<_> = device.supported_output_configs().map_err(|e| e.to_string())?.collect();

    const STANDARD: [u32; 6] = [44100, 48000, 88200, 96000, 176400, 192000];
    let mut rates: Vec<u32> = STANDARD.iter().copied()
        .filter(|r| configs.iter().any(|c| *r >= c.min_sample_rate().0 && *r <= c.max_sample_rate().0))
        .collect();
    rates.sort_unstable();
    rates.dedup();

    let (mut bmin, mut bmax) = (u32::MAX, 0u32);
    for c in &configs {
        if let cpal::SupportedBufferSize::Range { min, max } = c.buffer_size() {
            bmin = bmin.min(*min);
            bmax = bmax.max(*max);
        }
    }
    if bmax == 0 { bmin = 0; }
    Ok(DeviceAudioOptions { sample_rates: rates, buffer_min: bmin, buffer_max: bmax })
}

fn setup_stream(app: AppHandle, device: cpal::Device) -> Result<(), String> {
    // 1. Buscamos la configuración con MÁS CANALES (Prioridad Ruteo)
    if let Ok(configs) = device.supported_output_configs() {
        let mut all_configs: Vec<_> = configs.collect();
        // Ordenar por canales descendente y preferir F32
        // Prioridad absoluta a F32 (DAW Standard) y luego por canales
        all_configs.sort_by(|a, b| {
            let a_is_f32 = a.sample_format() == cpal::SampleFormat::F32;
            let b_is_f32 = b.sample_format() == cpal::SampleFormat::F32;
            let f32_cmp = b_is_f32.cmp(&a_is_f32);
            if f32_cmp == std::cmp::Ordering::Equal {
                b.channels().cmp(&a.channels())
            } else {
                f32_cmp
            }
        });

        let want_sr = AUDIO_STATE.requested_sample_rate.load(Ordering::Relaxed);
        let hint_sr = AUDIO_STATE.sample_rate_hint.load(Ordering::Relaxed);
        for range in all_configs {
            let sr = pick_sample_rate(&range, want_sr, hint_sr);
            let cfg = range.with_sample_rate(sr);
            println!("[Audio] Intentando inicializar: {} canales | {:?}", range.channels(), range.sample_format());
            
            match build_and_play(app.clone(), &device, &cfg) {
                Ok(_) => {
                    println!("[Audio] ¡ÉXITO! Motor arrancado con {} canales.", range.channels());
                    return Ok(());
                },
                Err(e) => {
                    eprintln!("[Audio] Configuración de {} canales rechazada: {}.", range.channels(), e);
                    // ERROR CRÍTICO: Si el hardware está mal funcionando o desconectado, NO sigas probando
                    if e.contains("malfunctioning") || e.contains("no longer available") {
                        return Err(format!("Error crítico de hardware: {}", e));
                    }
                }
            }
        }
    }

    // 2. Fallback final
    if let Ok(def_cfg) = device.default_output_config() {
        if build_and_play(app.clone(), &device, &def_cfg).is_ok() { return Ok(()); }
    }
    
    Err("Ninguna configuración de audio soportada por el dispositivo".to_string())
}

fn build_and_play(app: AppHandle, device: &cpal::Device, supported_cfg: &cpal::SupportedStreamConfig) -> Result<(), String> {
    let mut conf = supported_cfg.config();
    let channels = conf.channels as usize;

    // Tamaño de buffer elegido (0 = el que decida el driver). Si el driver no lo acepta, se vuelve
    // al suyo en vez de dejar el audio sin arrancar.
    let want_buf = AUDIO_STATE.requested_buffer_size.load(Ordering::Relaxed);
    let fixed_buf = want_buf > 0 && buffer_in_range(supported_cfg.buffer_size(), want_buf);
    if fixed_buf { conf.buffer_size = cpal::BufferSize::Fixed(want_buf); }

    let format = supported_cfg.sample_format();
    let build = |conf: &cpal::StreamConfig| -> Result<cpal::Stream, cpal::BuildStreamError> {
        let s_f32 = AUDIO_STATE.clone();
        let app_err = app.clone();
        let on_err = move |e: cpal::StreamError| {
            let _ = app_err.emit("audio-device-lost", e.to_string());
            eprintln!("Audio stream error: {}", e);
        };
        match format {
            cpal::SampleFormat::F32 => device.build_output_stream(conf, move |data: &mut [f32], _| render_audio(data, channels, s_f32.clone()), on_err, None),
            cpal::SampleFormat::I16 => device.build_output_stream(conf, move |data: &mut [i16], _| render_audio_i16(data, channels, s_f32.clone()), on_err, None),
            cpal::SampleFormat::U16 => device.build_output_stream(conf, move |data: &mut [u16], _| render_audio_u16(data, channels, s_f32.clone()), on_err, None),
            cpal::SampleFormat::I32 => device.build_output_stream(conf, move |data: &mut [i32], _| render_audio_i32(data, channels, s_f32.clone()), on_err, None),
            _ => Err(cpal::BuildStreamError::StreamConfigNotSupported),
        }
    };

    let stream = match build(&conf) {
        Ok(s) => s,
        Err(e) if fixed_buf => {
            eprintln!("[Audio] Buffer de {} no aceptado ({}): se usa el del driver.", want_buf, e);
            conf.buffer_size = cpal::BufferSize::Default;
            build(&conf).map_err(|e| e.to_string())?
        }
        Err(e) => return Err(e.to_string()),
    };

    stream.play().map_err(|e| e.to_string())?;
    store_f32(&AUDIO_STATE.current_sample_rate, conf.sample_rate.0 as f32);
    
    // DETECCIÓN SEGURA: Usamos los canales de la configuración que acabamos de abrir exitosamente.
    let final_channels = conf.channels as u32;
    
    println!("[Audio] Motor iniciado con {} canales reales.", final_channels);
    AUDIO_STATE.device_channels.store(final_channels, Ordering::Relaxed);

    AUDIO_STATE.is_ready.store(true, Ordering::Relaxed);
    if let Ok(mut g) = AUDIO_STREAM.lock() { *g = Some(SendStream(stream)); }
    println!("[Audio] Motor iniciado | Formato: {:?} | Canales Detectados: {} | SR Hardware: {}", supported_cfg.sample_format(), final_channels, conf.sample_rate.0);
    Ok(())
}

fn render_audio_i16(data: &mut [i16], channels: usize, state: Arc<GlobalAudioState>) {
    let mut float_buf = vec![0.0f32; data.len()];
    render_audio(&mut float_buf, channels, state);
    for (i, f) in float_buf.iter().enumerate() {
        data[i] = i16::from_sample(*f);
    }
}

fn render_audio_u16(data: &mut [u16], channels: usize, state: Arc<GlobalAudioState>) {
    let mut float_buf = vec![0.0f32; data.len()];
    render_audio(&mut float_buf, channels, state);
    for (i, f) in float_buf.iter().enumerate() {
        data[i] = u16::from_sample(*f);
    }
}

fn render_audio_i32(data: &mut [i32], channels: usize, state: Arc<GlobalAudioState>) {
    let mut float_buf = vec![0.0f32; data.len()];
    render_audio(&mut float_buf, channels, state);
    for (i, f) in float_buf.iter().enumerate() {
        data[i] = i32::from_sample(*f);
    }
}

#[tauri::command]
pub fn seek_to_sample(sample: u64) {
    AUDIO_STATE.sample_counter.store(sample, Ordering::Relaxed);
    AUDIO_STATE.cue_active.store(false, Ordering::Relaxed);
    AUDIO_STATE.preroll_active.store(false, Ordering::Relaxed);
    wake_stream_pump(); // precargar ya el audio de la nueva posición
}

#[tauri::command]
pub fn toggle_playback(playing: bool) {
    AUDIO_STATE.is_playing.store(playing, Ordering::Relaxed);
    AUDIO_STATE.preroll_active.store(false, Ordering::Relaxed);

    if playing {
        let tracks = TRACKS.load(); {
            for t in tracks.iter() {
                t.is_eof.store(false, Ordering::Relaxed);
            }
        }
        wake_stream_pump();
    }
}

#[tauri::command]
pub fn play_with_preroll(target_sample: u64, bars: u32) {
    // Iniciar en 1 para que el beat-0 no dispare un tick extra en el primer frame,
    // lo que causaba que el usuario escuchara 5 beats en vez de 8 (2 barras * 4 beats).
    AUDIO_STATE.metronome_sample_counter.store(1, Ordering::Relaxed);
    AUDIO_STATE.preroll_target_sample.store(target_sample, Ordering::Relaxed);
    AUDIO_STATE.preroll_remaining_bars.store(bars, Ordering::Relaxed);
    AUDIO_STATE.preroll_active.store(true, Ordering::Relaxed);
    AUDIO_STATE.is_playing.store(true, Ordering::Relaxed);
    wake_stream_pump(); // el destino del pre-roll se precarga mientras suenan los clicks
}

#[tauri::command]
pub fn jump_to_bar(bar: u32) {
    let sr = load_f32(&AUDIO_STATE.current_sample_rate);
    let bpm = load_f32(&AUDIO_STATE.bpm);
    let pitch = { let p = load_f32(&AUDIO_STATE.pitch_ratio); if p > 0.01 { p } else { 1.0 } };
    let beats_per_bar = AUDIO_STATE.beats_per_bar.load(Ordering::Relaxed).max(1) as f32;
    let samples_per_bar = (((sr * 60.0 / bpm) * beats_per_bar) / pitch) as u64;
    AUDIO_STATE.cue_target_sample.store((bar as u64 - 1) * samples_per_bar, Ordering::Relaxed);
    AUDIO_STATE.cue_bars_left.store(1, Ordering::Relaxed);
    AUDIO_STATE.cue_active.store(true, Ordering::Relaxed);
    wake_stream_pump(); // el salto ocurre al final del compás: hay tiempo de precargar el destino
}

#[tauri::command]
pub fn set_beats_per_bar(beats: u32) {
    AUDIO_STATE.beats_per_bar.store(beats.max(1), Ordering::Relaxed);
}

/// Cuántos cuadros de salida de la tarjeta hay por cada cuadro del archivo. 1.0 si no se
/// conoce alguna de las dos frecuencias o si son iguales (el caso normal: nada cambia).
fn output_ratio(file_sr: u32, hw_sr: u32) -> f64 {
    if file_sr > 1000 && hw_sr > 1000 && file_sr != hw_sr {
        hw_sr as f64 / file_sr as f64
    } else {
        1.0
    }
}

#[tauri::command]
pub fn get_engine_report() -> EngineReport {
    let peaks;
    let mut total_samples;
    let song_samples;
    let file_sr: u32;

    let tracks = TRACKS.load(); {
        if !tracks.is_empty() {
             // Silenciamos el log para no saturar consola
        }
        peaks = tracks.iter().map(|tr| (tr.id.clone(), load_f32(&tr.peak))).collect();
        let longest = tracks.iter().max_by_key(|t| t.frames_loaded.load(Ordering::Relaxed));
        total_samples = longest.map(|t| t.frames_loaded.load(Ordering::Relaxed)).unwrap_or(0);
        file_sr = longest.map(|t| load_f32(&t.sample_rate) as u32).filter(|&s| s > 1000).unwrap_or(0);
        // Sin escalar por pitch ni recortar por arreglo: es el largo crudo del
        // audio, la misma unidad en la que se guardan los markers.
        song_samples = total_samples;
        // `sample_counter` avanza por cuadro de SALIDA de la tarjeta, no del archivo:
        // el largo se pasa a esa misma unidad para que auto-stop y barra de progreso
        // cuadren aunque la tarjeta trabaje a otra frecuencia que las pistas.
        let hw_sr = load_f32(&AUDIO_STATE.current_sample_rate) as u32;
        let to_output = output_ratio(file_sr, hw_sr);
        if to_output != 1.0 {
            total_samples = (total_samples as f64 * to_output) as u64;
        }
        // Con transposición varispeed la canción se recorre más rápido/lento:
        // escalar el total para que la barra de progreso y el auto-stop coincidan
        let pitch = { let p = load_f32(&AUDIO_STATE.pitch_ratio); if p > 0.01 { p } else { 1.0 } };
        if pitch != 1.0 {
            total_samples = (total_samples as f64 / pitch as f64) as u64;
        }

        // Con un arreglo activo la duración deja de ser la del archivo y pasa a
        // ser la suma de los segmentos: saltarse un verso acorta la canción de
        // verdad, y repetir un coro la alarga. La lista ya viene en unidades de
        // reproducción, así que no se re-escala por pitch.
        let arrangement = ARRANGEMENT.load();
        let arranged = !arrangement.is_empty();
        if arranged {
            total_samples = arrangement_len(&arrangement);
        }

        // Auto-Stop REAL: Solo detenerse si todos los tracks terminaron por completo (EOF)
        let is_playing = AUDIO_STATE.is_playing.load(Ordering::Relaxed);
        if is_playing {
            let current_pos = AUDIO_STATE.sample_counter.load(Ordering::Relaxed);
            // Con arreglo no se puede esperar el EOF de las pistas: el arreglo
            // puede terminar mucho antes del final del archivo (o pasar dos
            // veces por el mismo trozo), así que manda el largo del arreglo.
            let all_eof = !tracks.is_empty() && tracks.iter().all(|t| t.is_eof.load(Ordering::Relaxed));
            if current_pos >= total_samples && total_samples > 0 && (arranged || all_eof) {
                AUDIO_STATE.is_playing.store(false, Ordering::Relaxed);
                AUDIO_STATE.preroll_active.store(false, Ordering::Relaxed);
            }
        }
    }

    EngineReport {
        sample_pos: AUDIO_STATE.sample_counter.load(Ordering::Relaxed),
        is_playing: AUDIO_STATE.is_playing.load(Ordering::Relaxed),
        sample_rate: load_f32(&AUDIO_STATE.current_sample_rate) as u32,
        is_ready: AUDIO_STATE.is_ready.load(Ordering::Relaxed),
        tracks_loading: AUDIO_STATE.tracks_loading.load(Ordering::Relaxed),
        preroll_active: AUDIO_STATE.preroll_active.load(Ordering::Relaxed),
        preroll_bars: AUDIO_STATE.preroll_remaining_bars.load(Ordering::Relaxed),
        peaks,
        total_samples,
        song_samples,
        device_channels: AUDIO_STATE.device_channels.load(Ordering::Relaxed),
        file_sample_rate: file_sr,
    }
}

#[tauri::command]
pub fn set_master_volume(volume: f32) {
    store_f32(&AUDIO_STATE.master_volume, volume);
}

#[tauri::command]
pub fn set_transpose(semitones: f32) {
    let clamped = semitones.clamp(-6.0, 6.0);
    let new_pitch = 2.0f32.powf(clamped / 12.0);
    let old_pitch = { let p = load_f32(&AUDIO_STATE.pitch_ratio); if p > 0.01 { p } else { 1.0 } };
    // Reescalar la posición actual para que el punto musical no salte al cambiar pitch
    if (new_pitch - old_pitch).abs() > f32::EPSILON {
        let pos = AUDIO_STATE.sample_counter.load(Ordering::Relaxed);
        let new_pos = (pos as f64 * old_pitch as f64 / new_pitch as f64) as u64;
        AUDIO_STATE.sample_counter.store(new_pos, Ordering::Relaxed);
    }
    store_f32(&AUDIO_STATE.pitch_ratio, new_pitch);
}

#[tauri::command]
pub fn kill_audio_stream() {
    if let Ok(mut g) = AUDIO_STREAM.lock() { *g = None; }
    AUDIO_STATE.is_ready.store(false, Ordering::Relaxed);
}

#[tauri::command]
pub fn get_v2_status() -> bool { true }

#[tauri::command]
pub fn set_track_output(track_id: String, output_idx: u32) {
    let tracks = TRACKS.load(); {
        if let Some(t) = tracks.iter().find(|t| t.id == track_id) { t.output_idx.store(output_idx, Ordering::Relaxed); }
    }
}

#[tauri::command]
pub fn set_track_pan_mode(track_id: String, is_stereo: bool) {
    let tracks = TRACKS.load(); {
        if let Some(t) = tracks.iter().find(|t| t.id == track_id) { t.is_stereo.store(is_stereo, Ordering::Relaxed); }
    }
}

/// Forma de onda del master para dibujar la línea de tiempo.
/// Antes devolvía un vector vacío y el visualizador pintaba barras planas de
/// relleno — se veía una onda falsa. Ahora recorre las pistas cargadas y saca
/// el pico real de cada "bucket".
///
/// Se llama desde la UI, nunca desde el hilo de audio: recorrer cientos de
/// millones de muestras ahí sería un corte seguro. El salto de STRIDE muestras
/// no cambia el pico visible pero divide el trabajo por 8.
#[tauri::command]
pub fn get_master_waveform(buckets: u32) -> Vec<f32> {
    const STRIDE: usize = 8;
    let buckets = buckets.clamp(64, 4000) as usize;

    let tracks = TRACKS.load();
    if tracks.is_empty() { return Vec::new(); }

    let total_frames = tracks.iter().map(|t| t.samples.load().len() / 2).max().unwrap_or(0);
    if total_frames < buckets { return Vec::new(); }
    let frames_per_bucket = total_frames / buckets;

    let mut peaks = vec![0.0f32; buckets];
    for track in tracks.iter() {
        if track.is_muted.load(Ordering::Relaxed) { continue; }
        let samples = track.samples.load();
        let track_frames = samples.len() / 2;

        for (b, bucket_peak) in peaks.iter_mut().enumerate() {
            let start = b * frames_per_bucket;
            if start >= track_frames { break; }
            let end = ((b + 1) * frames_per_bucket).min(track_frames);

            let mut local: f32 = 0.0;
            let mut f = start;
            while f < end {
                let idx = f * 2;
                let l = pcm_to_f32(samples[idx]).abs();
                let r = if idx + 1 < samples.len() { pcm_to_f32(samples[idx + 1]).abs() } else { 0.0 };
                let m = if l > r { l } else { r };
                if m > local { local = m; }
                f += STRIDE;
            }
            // Sumar los picos de cada pista aproxima el nivel del master sin
            // tener que mezclar de verdad todo el archivo.
            *bucket_peak += local;
        }
    }

    // Normalizar: la suma de picos se pasa de 1.0 con facilidad y el dibujo
    // quedaría saturado contra el techo.
    let max = peaks.iter().copied().fold(0.0f32, f32::max);
    if max > 0.0 {
        for p in peaks.iter_mut() { *p = (*p / max).clamp(0.0, 1.0); }
    }
    peaks
}

/// Envolvente (RMS por ventana) de UNA pista, para leer la pista de CUES/guía
/// y ubicar solas las secciones. A diferencia de `get_master_waveform` no se
/// normaliza ni ignora pistas muteadas: la guía suele ir muteada al PA y aun
/// así es la que dice dónde empieza cada sección.
/// Cada valor cubre `window_frames` frames, en las mismas unidades que los
/// markers (frames del audio cargado, sin pitch ni arreglo).
#[tauri::command]
pub fn get_track_envelope(track_id: String, window_frames: u32) -> Vec<f32> {
    const STRIDE: usize = 2;
    let window = window_frames.clamp(64, 48_000) as usize;

    let tracks = TRACKS.load();
    let Some(track) = tracks.iter().find(|t| t.id == track_id) else { return Vec::new(); };
    let samples = track.samples.load();
    let frames = samples.len() / 2;
    let windows = frames / window;

    let mut out = Vec::with_capacity(windows);
    for w in 0..windows {
        let start = w * window;
        let end = start + window;
        let mut acc = 0.0f64;
        let mut count = 0u32;
        let mut f = start;
        while f < end {
            let idx = f * 2;
            let l = pcm_to_f32(samples[idx]);
            let r = pcm_to_f32(samples[idx + 1]);
            acc += (l * l + r * r) as f64 * 0.5;
            count += 1;
            f += STRIDE;
        }
        out.push(if count > 0 { (acc / count as f64).sqrt() as f32 } else { 0.0 });
    }
    out
}

/// Recorte de UNA pista en mono a 16 kHz, que es lo que espera el
/// reconocedor de voz (Whisper) para leer qué dice la guía ("Coro", "Verse 2").
/// `start_frame`/`end_frame` van en frames del audio cargado, las mismas
/// unidades que devuelve `get_track_envelope`. Máximo 8 segundos por clip.
#[tauri::command]
pub fn get_track_clip_16k(track_id: String, start_frame: u64, end_frame: u64) -> Vec<f32> {
    const OUT_SR: f64 = 16_000.0;
    let tracks = TRACKS.load();
    let Some(track) = tracks.iter().find(|t| t.id == track_id) else { return Vec::new(); };
    let samples = track.samples.load();
    let frames = (samples.len() / 2) as u64;
    let src_sr = { let v = load_f32(&track.sample_rate) as f64; if v > 1000.0 { v } else { 44_100.0 } };

    let start = start_frame.min(frames);
    let max_len = (src_sr * 8.0) as u64;
    let end = end_frame.min(frames).min(start + max_len);
    if end <= start { return Vec::new(); }

    // Promedio por caja de cada tramo de entrada: filtra lo suficiente para
    // bajar a 16 kHz sin aliasing audible en la voz, y es barato.
    let step = src_sr / OUT_SR;
    let out_len = ((end - start) as f64 / step) as usize;
    let mut out = Vec::with_capacity(out_len);
    for i in 0..out_len {
        let a = start as f64 + i as f64 * step;
        let from = a as u64;
        let to = ((a + step) as u64).max(from + 1).min(end);
        let mut acc = 0.0f32;
        for f in from..to {
            let idx = (f * 2) as usize;
            acc += (pcm_to_f32(samples[idx]) + pcm_to_f32(samples[idx + 1])) * 0.5;
        }
        out.push(acc / (to - from) as f32);
    }
    out
}

/// Define el arreglo a reproducir. Cada segmento es (inicio, fin) en muestras
/// de la línea de tiempo de reproducción — repetir una sección es mandarla dos
/// veces, saltarla es no mandarla. Lista vacía = canción completa, de corrido.
#[tauri::command]
pub fn set_arrangement(segments: Vec<(u64, u64)>) {
    let clean: Vec<(u64, u64)> = segments
        .into_iter()
        .filter(|(s, e)| e > s)
        .collect();
    ARRANGEMENT.store(Arc::new(clean));
    wake_stream_pump(); // el arreglo cambia qué partes del audio van a sonar
}

/// Define los clips de UNA pista del secuenciador: cada uno es `(inicio_en_la_línea, inicio_en_el_
/// audio, largo)` en muestras de reproducción (las mismas unidades que el arreglo). Lista vacía =
/// la pista queda en silencio. Para volver a la pista entera usa `clear_track_clips`.
#[tauri::command]
pub fn set_track_clips(track_id: String, clips: Vec<(u64, u64, u64)>) {
    let normalized = clips::normalize(&clips);
    let tracks = TRACKS.load();
    if let Some(t) = tracks.iter().find(|t| t.id == track_id) {
        t.clips.store(Some(Arc::new(normalized)));
    }
    wake_stream_pump(); // cambian las partes del audio que van a sonar
}

/// Quita los clips de una pista: vuelve a sonar entera y de corrido, como antes de editarla.
#[tauri::command]
pub fn clear_track_clips(track_id: String) {
    let tracks = TRACKS.load();
    if let Some(t) = tracks.iter().find(|t| t.id == track_id) {
        t.clips.store(None);
    }
    wake_stream_pump();
}

#[derive(Serialize)]
pub struct TrackWave {
    pub id: String,
    /// Largo de la pista en cuadros del archivo.
    pub frames: u64,
    /// Cuadros del archivo que cubre cada valor de `peaks` (igual para todas las pistas, así
    /// comparten el mismo eje de tiempo).
    pub frames_per_bucket: u64,
    pub peaks: Vec<f32>,
}

/// Picos (0..1) de CADA pista para dibujar los clips del secuenciador. Se calcula una vez por
/// canción. Recorre todo el audio con salto de 8 cuadros, igual que `get_master_waveform`.
fn compute_track_waveforms(buckets: u32) -> Vec<TrackWave> {
    const STRIDE: usize = 8;
    let buckets = buckets.clamp(64, 4000) as usize;
    let tracks = TRACKS.load();
    let total_frames = tracks.iter().map(|t| t.samples.load().len() / 2).max().unwrap_or(0);
    if total_frames < buckets { return Vec::new(); }
    let fpb = total_frames / buckets + usize::from(total_frames % buckets != 0);

    tracks.iter().map(|track| {
        let samples = track.samples.load();
        let frames = samples.len() / 2;
        let n = frames.div_ceil(fpb);
        let mut peaks = Vec::with_capacity(n);
        for b in 0..n {
            let start = b * fpb;
            let end = ((b + 1) * fpb).min(frames);
            let mut local = 0.0f32;
            let mut f = start;
            while f < end {
                let l = pcm_to_f32(samples[f * 2]).abs();
                let r = pcm_to_f32(samples[f * 2 + 1]).abs();
                local = local.max(l).max(r);
                f += STRIDE;
            }
            peaks.push(local.min(1.0));
        }
        TrackWave { id: track.id.clone(), frames: frames as u64, frames_per_bucket: fpb as u64, peaks }
    }).collect()
}

/// Versión asíncrona para no congelar la interfaz mientras se recorre la canción.
#[tauri::command]
pub async fn get_track_waveforms(buckets: u32) -> Vec<TrackWave> {
    tauri::async_runtime::spawn_blocking(move || compute_track_waveforms(buckets))
        .await
        .unwrap_or_default()
}

#[tauri::command]
pub fn clear_arrangement() {
    ARRANGEMENT.store(Arc::new(Vec::new()));
    wake_stream_pump();
}

// get_project_duration eliminado en favor de get_engine_report

#[tauri::command]
pub fn set_audio_buffer_size(size: u32) {
    AUDIO_STATE.requested_buffer_size.store(size, Ordering::Relaxed);
}

#[tauri::command]
pub fn trigger_pad(pad_id: String, is_loop: bool) {
    println!("[PAD DEBUG] Recibida orden de disparar pad: {} (Loop: {})", pad_id, is_loop);
    let pads = PADS.load();
    if let Some(p) = pads.iter().find(|p| p.id == pad_id) {
        println!("[PAD DEBUG] Pad {} encontrado en memoria. Activando...", pad_id);
        p.is_loop.store(is_loop, Ordering::Relaxed);
        p.position.store(0, Ordering::Relaxed);
        store_f32(&p.envelope_level, 0.0);       // Inicia en silencio
        p.is_releasing.store(false, Ordering::Relaxed); // No está en release
        p.is_playing.store(true, Ordering::Relaxed);
    } else {
        println!("[PAD DEBUG ERROR] Se intentó disparar el pad {} pero NO EXISTE en la memoria PADS.", pad_id);
    }
}

#[tauri::command]
pub fn stop_pad(pad_id: String) {
    let pads = PADS.load(); {
        if let Some(p) = pads.iter().find(|p| p.id == pad_id) { 
            // En lugar de apagar de inmediato, iniciamos la relajación (release)
            p.is_releasing.store(true, Ordering::Relaxed); 
        }
    }
}

#[tauri::command]
pub fn set_pad_volume(pad_id: String, volume: f32) {
    let pads = PADS.load(); {
        if let Some(p) = pads.iter().find(|p| p.id == pad_id) { store_f32(&p.volume, volume); }
    }
}

#[tauri::command]
pub fn set_pad_output(pad_id: String, output_idx: u32) {
    let pads = PADS.load(); {
        if let Some(p) = pads.iter().find(|p| p.id == pad_id) { 
            p.output_idx.store(output_idx, Ordering::Relaxed); 
        }
    }
}

#[tauri::command]
pub fn load_pad_sample(pad_id: String, file_path: String) -> Result<(), String> {
    println!("[Audio] Iniciando carga de Pad '{}' desde: {}", pad_id, file_path);
    use std::fs::File;
    use symphonia::core::io::MediaSourceStream;
    use symphonia::core::probe::Hint;

    // ABRIR EL ARCHIVO DE FORMA SÍNCRONA: Para que el Catch de JS funcione si falta un WAV e intente con el MP3
    let file = File::open(&file_path).map_err(|e| format!("Error abriendo archivo {}: {}", file_path, e))?;
    
    // RECHAZO DE PLACEHOLDERS: Si el archivo solo contiene la cabecera WAV de 44 bytes (o está vacío), forzamos el fallo
    if let Ok(metadata) = file.metadata() {
        if metadata.len() < 100 {
            return Err("El archivo es un placeholder vacío (menor a 100 bytes). Forzando fallback a MP3...".to_string());
        }
    }

    let file_path_clone = file_path.clone();
    std::thread::spawn(move || {
        let mss = MediaSourceStream::new(Box::new(file), Default::default());
        
        let mut hint = Hint::new();
        if let Some(ext) = std::path::Path::new(&file_path_clone).extension().and_then(|e| e.to_str()) {
            hint.with_extension(ext);
            println!("[Audio] Aplicando Hint de extension: {}", ext);
        }

        let probed = match symphonia::default::get_probe().format(&hint, mss, &Default::default(), &Default::default()) {
            Ok(p) => p,
            Err(e) => { eprintln!("[Audio] Error probe pad: {}", e); return; }
        };

        let mut format = probed.format;
        let track = match format.tracks().iter().find(|t| t.codec_params.codec != symphonia::core::codecs::CODEC_TYPE_NULL) {
            Some(t) => t,
            None => { eprintln!("[Audio] Sin track de audio en pad: {}", pad_id); return; }
        };

        let codec_params = track.codec_params.clone();
        let file_sr = codec_params.sample_rate.unwrap_or(44100) as f32;
        println!("[Audio] Detectado SR del archivo: {}", file_sr);

        let mut decoder = match symphonia::default::get_codecs().make(&codec_params, &Default::default()) {
            Ok(d) => d,
            Err(e) => { eprintln!("[Audio] Codec pad falló: {}", e); return; }
        };

        let mut samples = Vec::new();

        loop {
            match format.next_packet() {
                Ok(packet) => {
                    match decoder.decode(&packet) {
                        Ok(decoded) => {
                            let spec = *decoded.spec();
                            let mut buf = symphonia::core::audio::SampleBuffer::<f32>::new(decoded.capacity() as u64, spec);
                            buf.copy_interleaved_ref(decoded);
                            
                            // Convert Mono to Interleaved Stereo for internal consistency
                            if spec.channels.count() == 1 {
                                for &sample in buf.samples() {
                                    samples.push(sample); // L
                                    samples.push(sample); // R
                                }
                            } else {
                                samples.extend_from_slice(buf.samples());
                            }
                        }
                        Err(e) => {
                            eprintln!("[Audio] Error decodificando paquete pad: {}", e);
                            continue;
                        }
                    }
                }
                Err(e) => {
                    if e.to_string().contains("end of stream") || e.to_string().contains("EOF") { break; }
                    eprintln!("[Audio] Error leyendo paquete pad: {}", e);
                    break;
                }
            }
        }

        if samples.is_empty() {
            eprintln!("[Audio] Pad vacio o invalido: {}", pad_id);
            return;
        }

        println!("[Audio] Pad '{}' cargado exitosamente. Frames: {}", pad_id, samples.len() / 2);

        PADS.rcu(|current| {
            let mut pads = (**current).clone();
            if let Some(idx) = pads.iter().position(|p| p.id == pad_id) {
                pads[idx] = Arc::new(PadVoice {
                    id: pad_id.clone(),
                    samples: Arc::new(samples.clone()),
                    position: AtomicU64::new(0),
                    is_playing: AtomicBool::new(false),
                    is_loop: AtomicBool::new(false),
                    volume: AtomicU32::new(1.0f32.to_bits()),
                    output_idx: AtomicU32::new(0),
                    envelope_level: AtomicU32::new(0.0f32.to_bits()),
                    is_releasing: AtomicBool::new(false),
                    sample_rate: AtomicU32::new(file_sr.to_bits()),
                });
            } else {
                pads.push(Arc::new(PadVoice {
                    id: pad_id.clone(), 
                    samples: Arc::new(samples.clone()), 
                    position: AtomicU64::new(0),
                    is_playing: AtomicBool::new(false),
                    is_loop: AtomicBool::new(false),
                    volume: AtomicU32::new(1.0f32.to_bits()),
                    output_idx: AtomicU32::new(0),
                    envelope_level: AtomicU32::new(0.0f32.to_bits()),
                    is_releasing: AtomicBool::new(false),
                    sample_rate: AtomicU32::new(file_sr.to_bits()),
                }));
            }
            pads
        });
    });

    Ok(())
}

struct LoadingGuard;
impl LoadingGuard {
    fn new() -> Self {
        AUDIO_STATE.tracks_loading.fetch_add(1, Ordering::Relaxed);
        Self
    }
}
impl Drop for LoadingGuard {
    fn drop(&mut self) {
        AUDIO_STATE.tracks_loading.fetch_sub(1, Ordering::Relaxed);
    }
}

#[tauri::command]
pub fn load_audio_track(
    track_id: String, 
    file_path: String,
    volume: f32,
    output_idx: u32,
    is_stereo: bool,
    is_muted: bool,
    is_soloed: bool
) -> Result<(), String> {
    println!("[AUDIO ENGINE] Solicitud para cargar pista (STEM). Track_ID: {} | Path: {}", track_id, file_path);
    use std::fs::File;
    use symphonia::core::io::MediaSourceStream;
    use symphonia::core::probe::Hint;
    
    // Guardián RAII: Se auto-disminuirá (fetch_sub) cuando la variable '_guard' salga de memoria, ya sea por un error '?' o porque el hilo terminó.
    let _guard = LoadingGuard::new();

    let file = match File::open(&file_path) {
        Ok(f) => {
            println!("[AUDIO ENGINE] Archivo {} abierto exitosamente en disco.", file_path);
            f
        },
        Err(e) => {
            println!("[AUDIO ENGINE ERROR] Falla física al abrir archivo {}: {}", file_path, e);
            return Err(e.to_string());
        }
    };
    
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let mut hint = Hint::new();
    if let Some(ext) = std::path::Path::new(&file_path).extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }
    let probed = match symphonia::default::get_probe().format(&hint, mss, &Default::default(), &Default::default()) {
        Ok(p) => {
            println!("[AUDIO ENGINE] Sonda Exitosa! Formato de contenedor detectado.");
            p
        },
        Err(e) => {
            println!("[AUDIO ENGINE ERROR] Symphonia PROBE falló (¿Archivo corrupto/vacío?): {}", e);
            return Err(e.to_string());
        }
    };
    
    let mut format = probed.format;
    let track = match format.tracks().iter().find(|t| t.codec_params.codec != symphonia::core::codecs::CODEC_TYPE_NULL) {
        Some(t) => {
            println!("[AUDIO ENGINE] Códec válido encontrado en la Pista.");
            t
        },
        None => {
            println!("[AUDIO ENGINE ERROR] Ningún stream de audio válido detectado dentro de la pista.");
            return Err("No audio track".into());
        }
    };
    
    let codec_params = track.codec_params.clone();
    let file_sr = codec_params.sample_rate.unwrap_or(44100) as f32;
    println!("[Audio] Detectado SR del archivo: {}", file_sr);

    let track_src = Arc::new(TrackSource {
        id: track_id.clone(), volume: AtomicU32::new(volume.to_bits()), is_muted: AtomicBool::new(is_muted),
        is_soloed: AtomicBool::new(is_soloed), output_idx: AtomicU32::new(output_idx), is_stereo: AtomicBool::new(is_stereo),
        is_eof: AtomicBool::new(false), is_aborted: AtomicBool::new(false), frames_loaded: AtomicU64::new(0), peak: AtomicU32::new(0),
        sample_rate: AtomicU32::new(file_sr.to_bits()),
        samples: arc_swap::ArcSwap::from_pointee(PcmBuf::empty()), // se publica entera al terminar la decodificación
        clips: arc_swap::ArcSwapOption::empty(),
        eq_low_db: AtomicU32::new(0.0f32.to_bits()), eq_mid_db: AtomicU32::new(0.0f32.to_bits()), eq_high_db: AtomicU32::new(0.0f32.to_bits()),
        eq_state_l: [BiquadState::zeroed(), BiquadState::zeroed(), BiquadState::zeroed()],
        eq_state_r: [BiquadState::zeroed(), BiquadState::zeroed(), BiquadState::zeroed()],
    });
    
    // Fallback de seguridad por si el lock falla momentáneamente
    TRACKS.rcu(|current| {
        let mut tracks = (**current).clone();
        tracks.push(track_src.clone());
        tracks
    });

    let t_bg = track_src.clone();
    let file_path_clone = file_path.clone();
    std::thread::spawn(move || {
        let _thread_guard = _guard; // Propagar responsabilidad de liberación al hilo
        
        let mut hint = symphonia::core::probe::Hint::new();
        if let Some(ext) = std::path::Path::new(&file_path_clone).extension().and_then(|e| e.to_str()) {
            hint.with_extension(ext);
        }
        
        let mut decoder = symphonia::default::get_codecs().make(&codec_params, &Default::default()).unwrap();
        // El sumidero acumula en RAM las pistas cortas y, pasado un umbral, las va escribiendo
        // a un archivo temporal que al final queda mapeado (ver pcm_store.rs). Así la RAM de
        // una canción larga no crece con su duración.
        let mut sink = PcmSink::new(&t_bg.id, decode_capacity(codec_params.n_frames));
        let mut scratch: Vec<i16> = Vec::new();

        while let Ok(packet) = format.next_packet() {
            if t_bg.is_aborted.load(Ordering::Relaxed) {
                println!("[AUDIO ENGINE] Hilo de decodificación abortado tempranamente para {}", t_bg.id);
                return; // Liberar RAM de inmediato (y el sumidero borra su archivo temporal al caer)
            }
            if let Ok(decoded) = decoder.decode(&packet) {
                let spec = *decoded.spec();
                let mut buf = symphonia::core::audio::SampleBuffer::<f32>::new(decoded.capacity() as u64, spec);
                buf.copy_interleaved_ref(decoded);

                // Convert Mono to Interleaved Stereo for internal consistency
                append_decoded(&mut sink, &mut scratch, buf.samples(), spec.channels.count() == 1);

                // Lock-Free Offline Loading: Acumulamos todo en el sumidero y lo inyectamos al final.
                // Esto garantiza 0 interrupciones y permite Resampling de alta calidad al final.
            }
        }

        // Finalizar carga y aplicar Resampling si es necesario
        // TODO: Implementar Rubato Resampling aquí cuando file_sr difiera del hardware
        // (hoy el motor lo resuelve al reproducir con `ratio_64`).
        let _hw_sr = load_f32(&AUDIO_STATE.current_sample_rate);

        let final_samples = sink.finish(); // devuelve la reserva sobrante / mapea el archivo
        t_bg.frames_loaded.store((final_samples.len() / 2) as u64, Ordering::Relaxed);
        t_bg.samples.store(std::sync::Arc::new(final_samples));

        t_bg.is_eof.store(true, Ordering::Relaxed);
    });
    Ok(())
}

// ══════════════════════════════════════════════════════════════
// PRECARGA DE LA SIGUIENTE CANCIÓN (Staging) — ventana de 2 canciones máx.
// ══════════════════════════════════════════════════════════════
// Área TOTALMENTE separada de TRACKS (la que realmente suena). El hilo de
// audio en tiempo real nunca la toca ni sabe que existe — solo sirve para
// tener la siguiente canción ya decodificada y lista para un swap instantáneo,
// SI el usuario efectivamente selecciona esa canción a continuación. Si no
// coincide o no terminó, el frontend cae de vuelta al camino normal de
// siempre (sync_stems_to_engine) — nunca se usa un estado a medias.
pub static STAGING_TRACKS: Lazy<ArcSwap<Vec<Arc<TrackSource>>>> = Lazy::new(|| ArcSwap::from_pointee(Vec::new()));
pub static STAGING_SONG_ID: Mutex<Option<String>> = Mutex::new(None);

// Duplica deliberadamente la lógica de decodificación de load_audio_track,
// pero publica en STAGING_TRACKS en vez de TRACKS. Se mantiene separada de
// la función original para no arriesgar ningún cambio en el camino de carga
// ya probado y estable.
fn load_audio_track_staging(
    track_id: String,
    file_path: String,
    volume: f32,
    output_idx: u32,
    is_stereo: bool,
    is_muted: bool,
    is_soloed: bool,
) -> Result<(), String> {
    use std::fs::File;
    use symphonia::core::io::MediaSourceStream;
    use symphonia::core::probe::Hint;

    let _guard = LoadingGuard::new();

    let file = File::open(&file_path).map_err(|e| e.to_string())?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let mut hint = Hint::new();
    if let Some(ext) = std::path::Path::new(&file_path).extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }
    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &Default::default(), &Default::default())
        .map_err(|e| e.to_string())?;

    let mut format = probed.format;
    let track = format.tracks().iter()
        .find(|t| t.codec_params.codec != symphonia::core::codecs::CODEC_TYPE_NULL)
        .ok_or_else(|| "No audio track".to_string())?;

    let codec_params = track.codec_params.clone();
    let file_sr = codec_params.sample_rate.unwrap_or(44100) as f32;

    let track_src = Arc::new(TrackSource {
        id: track_id.clone(), volume: AtomicU32::new(volume.to_bits()), is_muted: AtomicBool::new(is_muted),
        is_soloed: AtomicBool::new(is_soloed), output_idx: AtomicU32::new(output_idx), is_stereo: AtomicBool::new(is_stereo),
        is_eof: AtomicBool::new(false), is_aborted: AtomicBool::new(false), frames_loaded: AtomicU64::new(0), peak: AtomicU32::new(0),
        sample_rate: AtomicU32::new(file_sr.to_bits()),
        samples: arc_swap::ArcSwap::from_pointee(PcmBuf::empty()),
        clips: arc_swap::ArcSwapOption::empty(),
        eq_low_db: AtomicU32::new(0.0f32.to_bits()), eq_mid_db: AtomicU32::new(0.0f32.to_bits()), eq_high_db: AtomicU32::new(0.0f32.to_bits()),
        eq_state_l: [BiquadState::zeroed(), BiquadState::zeroed(), BiquadState::zeroed()],
        eq_state_r: [BiquadState::zeroed(), BiquadState::zeroed(), BiquadState::zeroed()],
    });

    STAGING_TRACKS.rcu(|current| {
        let mut tracks = (**current).clone();
        tracks.push(track_src.clone());
        tracks
    });

    let t_bg = track_src.clone();
    std::thread::spawn(move || {
        let _thread_guard = _guard;
        let mut decoder = match symphonia::default::get_codecs().make(&codec_params, &Default::default()) {
            Ok(d) => d,
            Err(_) => return,
        };
        let mut sink = PcmSink::new(&t_bg.id, decode_capacity(codec_params.n_frames));
        let mut scratch: Vec<i16> = Vec::new();

        while let Ok(packet) = format.next_packet() {
            if t_bg.is_aborted.load(Ordering::Relaxed) {
                return; // Abandonado: el usuario eligió otra canción distinta a la precargada
            }
            if let Ok(decoded) = decoder.decode(&packet) {
                let spec = *decoded.spec();
                let mut buf = symphonia::core::audio::SampleBuffer::<f32>::new(decoded.capacity() as u64, spec);
                buf.copy_interleaved_ref(decoded);
                append_decoded(&mut sink, &mut scratch, buf.samples(), spec.channels.count() == 1);
            }
        }

        // Chequeo extra antes de publicar (staging es más estricto que la carga
        // normal porque de esto depende la decisión de swap "todo o nada").
        if t_bg.is_aborted.load(Ordering::Relaxed) {
            return;
        }

        let final_samples = sink.finish(); // devuelve la reserva sobrante / mapea el archivo
        t_bg.frames_loaded.store((final_samples.len() / 2) as u64, Ordering::Relaxed);
        t_bg.samples.store(std::sync::Arc::new(final_samples));
        t_bg.is_eof.store(true, Ordering::Relaxed);
    });

    Ok(())
}

// ── Almacenamiento de las pistas en 16 bits ─────────────────────────────
// Cada pista se decodifica COMPLETA (no hay decodificación en tiempo real): en f32 una canción de
// 9 stems de 5:36 a 48 kHz ocupa ~1.2 GB. En i16 son ~0.6 GB. Las pistas largas además no viven en
// la RAM del proceso sino en un archivo mapeado (ver pcm_store.rs y el hilo precargador de arriba).
// La mezcla sigue haciéndose en f32 (se convierte al leer),
// así que niveles, EQ y faders no cambian; solo el suelo de ruido de lo guardado es -96 dB,
// por debajo del ruido del propio mp3. Un mp3 decodificado puede pasar de 0 dBFS (picos
// intermuestra), y en i16 eso se recortaría: por eso se guarda con 3 dB de margen
// (23170 = 32767/√2) y al leer se devuelve exactamente a su nivel.
const PCM_SCALE: f32 = 23170.0;

#[inline]
fn pcm_from_f32(s: f32) -> i16 {
    (s * PCM_SCALE).round().clamp(-32768.0, 32767.0) as i16
}

#[inline]
fn pcm_to_f32(s: i16) -> f32 {
    s as f32 * (1.0 / PCM_SCALE)
}

/// Convierte un paquete decodificado (f32 entrelazado) a PCM i16 estéreo y lo entrega al
/// sumidero. Un paquete mono se duplica a L y R, igual que siempre. `scratch` se reutiliza
/// entre paquetes para no reservar memoria en cada uno.
fn append_decoded(sink: &mut PcmSink, scratch: &mut Vec<i16>, samples: &[f32], mono: bool) {
    scratch.clear();
    if mono {
        for &s in samples {
            let v = pcm_from_f32(s);
            scratch.push(v); // L
            scratch.push(v); // R
        }
    } else {
        scratch.extend(samples.iter().map(|&s| pcm_from_f32(s)));
    }
    sink.extend(scratch);
}

// ══════════════════════════════════════════════════════════════
// STREAMING: precarga de páginas (hilo aparte, NUNCA el de audio)
// ══════════════════════════════════════════════════════════════
// Las pistas largas están mapeadas desde un archivo (pcm_store.rs). Este hilo mira dónde
// está el cabezal y "toca" por adelantado las páginas de los próximos segundos, así el hilo de
// audio las encuentra ya en memoria. También suelta las que ya sonaron para que la memoria del
// proceso no crezca con la duración de la canción.
//
// Para saber qué va a sonar usa EXACTAMENTE las mismas reglas que el render: la línea de
// tiempo virtual pasa por el arreglo (`pcm_store::source_ranges`, que replica `map_arrangement`)
// y luego por el ratio de frecuencia/pitch. También cubre los saltos conocidos de antemano
// (cue y pre-roll). Si alguna predicción fallara, el audio no se corrompe: solo habría un
// fallo de página síncrono en el hilo de audio, que es lo que ya pasaría sin este hilo.
const PUMP_PERIOD_MS: u64 = 60;
const PUMP_TRIM_EVERY: u32 = 16;          // soltar páginas ~cada segundo
const PUMP_AHEAD_SECS: f64 = 10.0;
const PUMP_URGENT_SECS: f64 = 1.5;
const PUMP_BEHIND_SECS: f64 = 2.0;
const PUMP_MARGIN_FRAMES: f64 = 8.0;      // sobra para los 4 puntos de Hermite

static PUMP_WAKE: Lazy<(Mutex<bool>, Condvar)> = Lazy::new(|| (Mutex::new(false), Condvar::new()));
static PUMP_STARTED: std::sync::Once = std::sync::Once::new();

/// Despierta al precargador sin esperar a su siguiente ciclo (seek, salto, play...).
pub fn wake_stream_pump() {
    let (flag, cvar) = &*PUMP_WAKE;
    if let Ok(mut g) = flag.lock() { *g = true; }
    cvar.notify_one();
}

pub fn start_stream_pump() {
    PUMP_STARTED.call_once(|| {
        let _ = std::thread::Builder::new().name("bandly-stream-pump".into()).spawn(|| {
            let mut tick = 0u32;
            loop {
                {
                    let (flag, cvar) = &*PUMP_WAKE;
                    let guard = flag.lock().unwrap_or_else(|e| e.into_inner());
                    let (mut g, _) = cvar
                        .wait_timeout(guard, std::time::Duration::from_millis(PUMP_PERIOD_MS))
                        .unwrap_or_else(|e| e.into_inner());
                    *g = false;
                }
                tick = tick.wrapping_add(1);
                let trim = tick % PUMP_TRIM_EVERY == 0;
                // Un pánico aquí no debe tumbar la precarga para siempre.
                let _ = std::panic::catch_unwind(|| stream_pump_cycle(trim));
            }
        });
    });
}

/// Rangos (en muestras i16 de la pista) que sonarán durante las ventanas virtuales dadas.
fn track_sample_ranges(
    src_sr: f64, len: usize, windows: &[(u64, u64)], arrangement: &[(u64, u64)],
    safe_sr: f64, pitch: f64, track_clips: Option<&[ClipSeg]>,
) -> Vec<(usize, usize)> {
    let ratio = (src_sr / safe_sr) * pitch; // mismo cálculo que `ratio_64` del render
    let mut out = Vec::new();
    for &(v0, v1) in windows {
        for (song_a, song_b) in pcm_store::source_ranges(v0, v1, arrangement) {
            // Mismo orden que el render: arreglo (tiempo virtual -> de canción) y luego los
            // clips de la pista (tiempo de canción -> posición en su archivo).
            let file_ranges = match track_clips {
                None => vec![(song_a, song_b)],
                Some(cl) => clips::source_ranges(song_a, song_b, cl),
            };
            for (a, b) in file_ranges {
            let lo = ((a as f64 * ratio) - PUMP_MARGIN_FRAMES).max(0.0) as usize;
            let hi = ((b as f64 * ratio) + PUMP_MARGIN_FRAMES).ceil() as usize;
            out.push((lo.saturating_mul(2), hi.saturating_mul(2).min(len)));
            }
        }
    }
    pcm_store::merge_ranges(out)
}

fn stream_pump_cycle(trim: bool) {
    let tracks = TRACKS.load();
    if !tracks.iter().any(|t| t.samples.load().is_mapped()) { return; }

    let sr = load_f32(&AUDIO_STATE.current_sample_rate);
    let safe_sr = if sr < 1.0 { 44100.0 } else { sr } as f64;
    let pitch = { let p = load_f32(&AUDIO_STATE.pitch_ratio); if p > 0.01 { p as f64 } else { 1.0 } };
    let pos = AUDIO_STATE.sample_counter.load(Ordering::Relaxed);
    let arrangement = ARRANGEMENT.load();

    let secs = |s: f64| (s * safe_sr) as u64;
    let (ahead, urgent, behind, lead) = (
        secs(PUMP_AHEAD_SECS), secs(PUMP_URGENT_SECS), secs(PUMP_BEHIND_SECS), secs(0.25),
    );

    // Dónde suena ahora y a dónde va a saltar (si hay un cue o un pre-roll pendiente).
    let mut anchors = vec![pos];
    if AUDIO_STATE.cue_active.load(Ordering::Relaxed) {
        anchors.push(AUDIO_STATE.cue_target_sample.load(Ordering::Relaxed));
    }
    if AUDIO_STATE.preroll_active.load(Ordering::Relaxed) {
        anchors.push(AUDIO_STATE.preroll_target_sample.load(Ordering::Relaxed));
    }
    let urgent_windows: Vec<(u64, u64)> = anchors.iter().map(|&a| (a.saturating_sub(lead), a + urgent)).collect();
    let full_windows: Vec<(u64, u64)> = anchors.iter().map(|&a| (a.saturating_sub(behind), a + ahead)).collect();

    // Primero lo inminente de TODAS las pistas, luego el resto: tras un seek el audio
    // está listo cuanto antes.
    for pass in 0..2 {
        let windows = if pass == 0 { &urgent_windows } else { &full_windows };
        for track in tracks.iter() {
            let samples = track.samples.load();
            if !samples.is_mapped() { continue; }
            let src_sr = load_f32(&track.sample_rate) as f64;
            let clips_guard = track.clips.load();
            let track_clips = clips_guard.as_ref().map(|c| c.as_slice());
            let ranges = track_sample_ranges(src_sr, samples.len(), windows, &arrangement, safe_sr, pitch, track_clips);
            for &(a, b) in &ranges { samples.touch_range(a, b); }
            if pass == 1 && trim {
                for (a, b) in pcm_store::complement(samples.len(), &ranges) { samples.release_range(a, b); }
            }
        }
    }
}

/// Estado del streaming: pistas mapeadas, MB mapeados, cuántas cayeron a RAM por error.
#[tauri::command]
pub fn get_streaming_stats() -> pcm_store::StreamingStats {
    pcm_store::stats()
}

/// Activa/desactiva el streaming para las PRÓXIMAS cargas (lo ya cargado no cambia).
#[tauri::command]
pub fn set_streaming_enabled(enabled: bool) {
    pcm_store::STREAMING_ENABLED.store(enabled, Ordering::Relaxed);
}

/// Reserva exacta para las muestras estéreo de una pista (2 por cuadro). Sin ella el Vec crece
/// a saltos mientras se decodifica: copia todo al crecer y termina con memoria reservada de más.
fn decode_capacity(n_frames: Option<u64>) -> usize {
    match n_frames {
        Some(n) if n > 0 && n <= 100_000_000 => (n as usize) * 2,
        _ => 1_000_000,
    }
}

/// Precarga en segundo plano la canción indicada (normalmente la siguiente
/// del setlist). Nunca toca TRACKS ni afecta lo que está sonando. Se salta
/// a sí misma si la RAM disponible del sistema está baja — prioriza la
/// estabilidad sobre la velocidad (importante cuando OBS/Presenter/Lightkey
/// corren a la vez en la misma máquina).
#[tauri::command]
pub async fn preload_song(app: AppHandle, song_id: String, stems: Vec<StemInfo>) -> Result<bool, String> {
    let mut sys = sysinfo::System::new();
    sys.refresh_memory();
    let available_mb = sys.available_memory() / 1024 / 1024;
    // Una canción ocupa ~0.5GB decodificada (16 bits): con menos de 2GB libres la precarga dejaría
    // menos de 1.5GB de colchón (en un Mac de 8GB, con OBS y Presenter abiertos, eso ya es
    // zona de swap).
    // Con streaming la precarga casi no usa RAM (el PCM va a disco y se mapea), así que el
    // colchón exigido baja a la mitad.
    let min_free_mb: u64 = if pcm_store::STREAMING_ENABLED.load(Ordering::Relaxed) { 1024 } else { 2048 };
    if available_mb < min_free_mb {
        println!("[PRELOAD] RAM disponible baja ({}MB) — se omite precarga, se usará carga normal.", available_mb);
        return Ok(false);
    }

    {
        let mut staged_id = STAGING_SONG_ID.lock().unwrap();
        if staged_id.as_deref() == Some(song_id.as_str()) {
            return Ok(true); // Ya se está precargando/precargó exactamente esta canción
        }
        // Abandonar cualquier precarga anterior para una canción distinta
        let old_staging = STAGING_TRACKS.load();
        for t in old_staging.iter() { t.is_aborted.store(true, Ordering::Relaxed); }
        STAGING_TRACKS.store(Arc::new(Vec::new()));
        *staged_id = Some(song_id.clone());
    }

    let local_data_dir = app.path().app_local_data_dir().map_err(|e| format!("{}", e))?;
    let project_dir = local_data_dir.join("multitracks").join(&song_id);
    if !project_dir.exists() {
        return Ok(false);
    }

    let mut loaded_count = 0usize;
    for stem in &stems {
        let flat_name = std::path::Path::new(&stem.original_name)
            .file_name().and_then(|n| n.to_str()).unwrap_or(&stem.original_name);

        let mut found_path = None;
        let exact_path = project_dir.join(flat_name);
        if exact_path.exists() {
            found_path = Some(exact_path);
        } else if let Ok(entries) = std::fs::read_dir(&project_dir) {
            let target_stem = std::path::Path::new(&flat_name).file_stem().unwrap_or_default().to_string_lossy().to_lowercase();
            for entry in entries.flatten() {
                let file_name = entry.file_name().to_string_lossy().to_lowercase();
                let file_stem = std::path::Path::new(&file_name).file_stem().unwrap_or_default().to_string_lossy().to_lowercase();
                if file_stem == target_stem || file_stem.replace(" ", "") == target_stem.replace(" ", "") {
                    found_path = Some(entry.path());
                    break;
                }
            }
        }

        if let Some(file_path) = found_path {
            if load_audio_track_staging(
                stem.id.clone(), file_path.to_string_lossy().to_string(),
                stem.volume, stem.output_idx, stem.is_stereo, stem.is_muted, stem.is_soloed,
            ).is_ok() {
                loaded_count += 1;
            }
        }
    }

    Ok(loaded_count > 0)
}

/// Intenta usar lo que quedó precargado para song_id. Solo lo usa si TODAS
/// las pistas terminaron de decodificar y coinciden exactamente con lo pedido
/// — regla "todo o nada". Si devuelve false, el frontend debe caer al camino
/// normal (sync_stems_to_engine), exactamente como funciona hoy.
#[tauri::command]
pub fn commit_staged_song(song_id: String) -> bool {
    let mut staged_id = STAGING_SONG_ID.lock().unwrap();
    if staged_id.as_deref() != Some(song_id.as_str()) {
        return false;
    }

    let staged_tracks = STAGING_TRACKS.load();
    if staged_tracks.is_empty() {
        return false;
    }
    let all_ready = staged_tracks.iter().all(|t|
        t.is_eof.load(Ordering::Relaxed) && !t.is_aborted.load(Ordering::Relaxed)
    );
    if !all_ready {
        return false;
    }

    // Swap instantáneo: detener, marcar viejas pistas activas como abortadas,
    // y reemplazar TRACKS por lo que ya estaba listo en staging.
    AUDIO_STATE.is_playing.store(false, Ordering::SeqCst);
    AUDIO_STATE.preroll_active.store(false, Ordering::SeqCst);
    std::thread::sleep(std::time::Duration::from_millis(20));

    let old_tracks = TRACKS.load();
    for t in old_tracks.iter() { t.is_aborted.store(true, Ordering::Relaxed); }

    TRACKS.store(Arc::new((**staged_tracks).clone()));
    AUDIO_STATE.sample_counter.store(0, Ordering::Relaxed);
    store_f32(&AUDIO_STATE.pitch_ratio, 1.0);

    STAGING_TRACKS.store(Arc::new(Vec::new()));
    *staged_id = None;

    println!("[PRELOAD] Swap instantáneo aplicado para canción {}", song_id);
    true
}

/// Abandona cualquier precarga en curso (ej. el usuario ya no va a esa
/// canción a continuación). Libera la RAM de inmediato.
#[tauri::command]
pub fn cancel_staging() {
    let mut staged_id = STAGING_SONG_ID.lock().unwrap();
    let old = STAGING_TRACKS.load();
    for t in old.iter() { t.is_aborted.store(true, Ordering::Relaxed); }
    STAGING_TRACKS.store(Arc::new(Vec::new()));
    *staged_id = None;
}

#[derive(Deserialize)]
pub struct StemInfo {
    pub id: String,
    pub original_name: String,
    pub volume: f32,
    pub output_idx: u32,
    pub is_stereo: bool,
    pub is_muted: bool,
    pub is_soloed: bool,
}

#[tauri::command]
pub async fn sync_stems_to_engine(app: AppHandle, song_id: String, stems: Vec<StemInfo>) -> Result<(), String> {
    println!("[NATIVO] Iniciando sincronización masiva para canción: {}", song_id);
    
    // 1. Limpiar motor antes de cargar nuevos stems
    reset_audio_engine();
    
    // 2. Obtener ruta de datos local
    let local_data_dir = app.path().app_local_data_dir().map_err(|e| format!("{}", e))?;
    let project_dir = local_data_dir.join("multitracks").join(&song_id);
    
    println!("[NATIVO] Buscando audios en ruta absoluta: {:?}", project_dir);
    
    if !project_dir.exists() {
        println!("[NATIVO ERROR] La carpeta NO existe físicamente en: {:?}", project_dir);
        // Escaneo de emergencia: ¿Qué hay en /multitracks/?
        if let Ok(entries) = std::fs::read_dir(local_data_dir.join("multitracks")) {
             let folders: Vec<_> = entries.filter_map(|e| e.ok()).map(|e| e.file_name()).collect();
             println!("[NATIVO SCAN] Carpetas encontradas en multitracks/: {:?}", folders);
        }
        return Err(format!("Carpeta no encontrada en: {:?}", project_dir));
    }

    // 3. Cargar cada stem
    let mut loaded_count = 0usize;
    let total = stems.len();
    for stem in &stems {
        let flat_name = std::path::Path::new(&stem.original_name)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(&stem.original_name);
            
        let mut found_path = None;
        let exact_path = project_dir.join(flat_name);
        
        if exact_path.exists() {
            found_path = Some(exact_path);
        } else {
            // Búsqueda robusta (ignora extensión y case)
            if let Ok(entries) = std::fs::read_dir(&project_dir) {
                let target_stem = std::path::Path::new(&flat_name).file_stem().unwrap_or_default().to_string_lossy().to_lowercase();
                for entry in entries.flatten() {
                    let file_name = entry.file_name().to_string_lossy().to_lowercase();
                    let file_stem = std::path::Path::new(&file_name).file_stem().unwrap_or_default().to_string_lossy().to_lowercase();
                    
                    if file_stem == target_stem || file_stem.replace(" ", "") == target_stem.replace(" ", "") {
                        found_path = Some(entry.path());
                        break;
                    }
                }
            }
        }
        
        if let Some(file_path) = found_path {
            println!("[NATIVO] Cargando stem: {} desde {:?}", stem.id, file_path);
            if load_audio_track(
                stem.id.clone(), 
                file_path.to_string_lossy().to_string(),
                stem.volume,
                stem.output_idx,
                stem.is_stereo,
                stem.is_muted,
                stem.is_soloed
            ).is_ok() {
                loaded_count += 1;
            }
        } else {
            println!("[NATIVO WARN] Stem no encontrado para nombre: {}", flat_name);
        }
    }
    
    if loaded_count == 0 {
        return Err("Ningún stem pudo cargarse".into());
    }
    println!("[NATIVO] {}/{} stems lanzados. Esperando...", loaded_count, total);

    // Pre-buffer Guard: Intentar esperar un poco, pero NO BLOQUEAR si falla
    let pre_buffer_frames: u64 = 11_025; // 0.25s es suficiente para arrancar
    let timeout_ms = 2000u64; // Solo 2 segundos de cortesía
    let poll_ms = 100u64;
    let mut elapsed = 0u64;
    loop {
        if elapsed >= timeout_ms { break; }
        let all_ready = {
            let tracks = TRACKS.load();
            !tracks.is_empty() && tracks.iter().all(|t|
                t.frames_loaded.load(Ordering::Relaxed) >= pre_buffer_frames
                || t.is_eof.load(Ordering::Relaxed)
            )
        };
        if all_ready { break; }
        tokio::time::sleep(std::time::Duration::from_millis(poll_ms)).await;
        elapsed += poll_ms;
    }
    Ok(())
}

#[tauri::command]
pub fn reset_audio_engine() {
    // Parar reproducción primero (SeqCst garantiza orden de memoria)
    AUDIO_STATE.is_playing.store(false, Ordering::SeqCst);
    AUDIO_STATE.preroll_active.store(false, Ordering::SeqCst);
    // Dar 20ms de gracia al hilo de render para que termine su frame actual
    std::thread::sleep(std::time::Duration::from_millis(20));
    // Ahora limpiar pistas de forma segura y ABORTAR hilos fantasmas
    let t = TRACKS.load();
    for track in t.iter() {
        track.is_aborted.store(true, Ordering::Relaxed);
    }
    TRACKS.store(Arc::new(Vec::new()));
    AUDIO_STATE.sample_counter.store(0, Ordering::Relaxed);
    store_f32(&AUDIO_STATE.pitch_ratio, 1.0); // cada canción arranca sin transposición
    AUDIO_STATE.beats_per_bar.store(4, Ordering::Relaxed); // default 4/4 hasta que el front confirme la métrica real
    println!("[MOTOR] Reset atómico completado.");
}

#[tauri::command]
pub fn set_track_volume(track_id: String, volume: f32) {
    let tracks = TRACKS.load(); {
        if let Some(t) = tracks.iter().find(|t| t.id == track_id) { store_f32(&t.volume, volume); }
    }
}

// EQ de 3 bandas por canal — band: "low" | "mid" | "high", gain_db en dB
// (se clampea igual en el hilo de audio, esto es solo defensa en profundidad).
#[tauri::command]
pub fn set_track_eq(track_id: String, band: String, gain_db: f32) {
    let clamped = gain_db.clamp(-12.0, 12.0);
    let tracks = TRACKS.load(); {
        if let Some(t) = tracks.iter().find(|t| t.id == track_id) {
            match band.as_str() {
                "low" => store_f32(&t.eq_low_db, clamped),
                "mid" => store_f32(&t.eq_mid_db, clamped),
                "high" => store_f32(&t.eq_high_db, clamped),
                _ => {}
            }
        }
    }
}

#[tauri::command]
pub fn set_track_mute(track_id: String, muted: bool) {
    let tracks = TRACKS.load(); {
        if let Some(t) = tracks.iter().find(|t| t.id == track_id) { t.is_muted.store(muted, Ordering::Relaxed); }
    }
}

#[tauri::command]
pub fn set_track_solo(track_id: String, soloed: bool) {
    let tracks = TRACKS.load(); {
        if let Some(t) = tracks.iter().find(|t| t.id == track_id) { t.is_soloed.store(soloed, Ordering::Relaxed); }
    }
}

#[tauri::command]
pub fn set_metronome(enabled: bool, volume: f32, bpm: f32, output_ch: u32, standalone: bool) {
    AUDIO_STATE.metronome_enabled.store(enabled, Ordering::Relaxed);
    AUDIO_STATE.metronome_standalone.store(standalone, Ordering::Relaxed);
    AUDIO_STATE.metronome_out_ch.store(output_ch, Ordering::Relaxed);
    store_f32(&AUDIO_STATE.metronome_volume, volume);
    if bpm > 0.0 { store_f32(&AUDIO_STATE.bpm, bpm); }
}

// get_track_peaks eliminado en favor de get_engine_report

/// Carga todos los pads de Bethel buscando directamente en la carpeta de recursos de la App.
/// No descarga nada; simplemente busca los archivos C.mp3, C#.mp3, etc., en el disco.
#[tauri::command]
pub async fn load_pads_from_assets(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let res_dir = app.path().resource_dir().map_err(|e| e.to_string())?;
    
    // En Mac, los recursos suelen estar en Contents/Resources/audio/pads/
    // Probamos las dos estructuras posibles de Tauri
    let candidates = vec![
        res_dir.join("audio").join("pads"),
        res_dir.join("resources").join("audio").join("pads"),
    ];

    let mut pads_dir = None;
    for c in &candidates {
        if c.exists() {
            pads_dir = Some(c);
            break;
        }
    }

    let pads_dir = match pads_dir {
        Some(d) => d,
        None => return Err(format!("No se encontró la carpeta de sonidos en: {:?}", candidates)),
    };

    let notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    let mut loaded = Vec::new();

    for note in &notes {
        let file_name = format!("{}.mp3", note);
        let path = pads_dir.join(&file_name);
        
        if path.exists() {
            // pad_id debe ser consistente con lo que usa el JS: bethel_pad_c, bethel_pad_csharp, etc.
            let pad_id = format!("bethel_pad_{}", note.replace('#', "sharp").to_lowercase());
            
            // load_pad_sample es la función interna que ya funciona para cargar al motor
            if let Ok(_) = load_pad_sample(pad_id.clone(), path.to_string_lossy().to_string()) {
                loaded.push(pad_id);
            }
        }
    }
    
    Ok(loaded)
}

// Mantenemos este comando vacío para que el JS no de error si aún intenta llamarlo durante la transición
#[tauri::command]
pub async fn prepare_pad_file(_app: tauri::AppHandle, _pad_id: String, _source_url: String, _file_name: String) -> Result<String, String> {
    Ok("legacy".to_string())
}





// ── Pruebas del streaming ────────────────────────────────────────────────
#[cfg(test)]
mod stream_tests {
    use super::*;

    // Estas pruebas comparten TRACKS / ARRANGEMENT / AUDIO_STATE (estáticos del motor): una a la vez.
    static GLOBAL_STATE: Mutex<()> = Mutex::new(());
    fn exclusive() -> std::sync::MutexGuard<'static, ()> {
        GLOBAL_STATE.lock().unwrap_or_else(|e| e.into_inner())
    }

    fn test_track(id: &str, buf: PcmBuf, sr: f32, out: u32, eq_low: f32) -> Arc<TrackSource> {
        Arc::new(TrackSource {
            id: id.to_string(), volume: AtomicU32::new(0.8f32.to_bits()), is_muted: AtomicBool::new(false),
            is_soloed: AtomicBool::new(false), output_idx: AtomicU32::new(out), is_stereo: AtomicBool::new(true),
            is_eof: AtomicBool::new(true), is_aborted: AtomicBool::new(false), frames_loaded: AtomicU64::new(0),
            peak: AtomicU32::new(0), sample_rate: AtomicU32::new(sr.to_bits()),
            samples: arc_swap::ArcSwap::from_pointee(buf),
            clips: arc_swap::ArcSwapOption::empty(),
            eq_low_db: AtomicU32::new(eq_low.to_bits()), eq_mid_db: AtomicU32::new(0.0f32.to_bits()),
            eq_high_db: AtomicU32::new(0.0f32.to_bits()),
            eq_state_l: [BiquadState::zeroed(), BiquadState::zeroed(), BiquadState::zeroed()],
            eq_state_r: [BiquadState::zeroed(), BiquadState::zeroed(), BiquadState::zeroed()],
        })
    }

    /// Dos voces sinusoidales distintas por canal: señal realista y sin repeticiones cortas.
    fn tone(frames: usize, f_l: f32, f_r: f32) -> Vec<i16> {
        let mut v = Vec::with_capacity(frames * 2);
        for i in 0..frames {
            let t = i as f32 / 44100.0;
            v.push((((t * f_l * 6.2831855).sin() * 0.5 + (t * f_l * 3.1 * 6.2831855).sin() * 0.2) * 8000.0) as i16);
            v.push((((t * f_r * 6.2831855).sin() * 0.5 + (t * f_r * 2.3 * 6.2831855).sin() * 0.2) * 8000.0) as i16);
        }
        v
    }

    fn make_buf(data: &[i16], mapped: bool) -> PcmBuf {
        let mut sink = PcmSink::with_limits("test", data.len(), 1000, 777, mapped);
        for c in data.chunks(1531) { sink.extend(c); }
        let buf = sink.finish();
        assert_eq!(buf.is_mapped(), mapped);
        buf
    }

    /// Renderiza `blocks` bloques de 512 cuadros y devuelve toda la salida.
    fn render_all(mapped: bool, blocks: usize, pump_every: usize) -> Vec<f32> {
        let a = tone(264_600, 220.0, 330.0);     // 6 s a 44.1 kHz
        let b = tone(200_000, 110.0, 440.0);
        let tracks = vec![
            test_track("a", make_buf(&a, mapped), 44100.0, 0, 0.0),
            test_track("b", make_buf(&b, mapped), 44100.0, 1, 4.0), // con EQ: ejercita los biquads
        ];
        TRACKS.store(Arc::new(tracks));
        AUDIO_STATE.sample_counter.store(0, Ordering::Relaxed);
        AUDIO_STATE.is_playing.store(true, Ordering::Relaxed);
        AUDIO_STATE.preroll_active.store(false, Ordering::Relaxed);

        let mut out = Vec::with_capacity(blocks * 512 * 4);
        let mut block = vec![0.0f32; 512 * 4]; // 4 canales de salida
        for i in 0..blocks {
            if pump_every > 0 && i % pump_every == 0 { stream_pump_cycle(true); }
            block.iter_mut().for_each(|s| *s = 0.0);
            render_audio::<f32>(&mut block, 4, AUDIO_STATE.clone());
            out.extend_from_slice(&block);
        }
        TRACKS.store(Arc::new(Vec::new()));
        out
    }

    /// Un solo test porque toca estado global (TRACKS, ARRANGEMENT, AUDIO_STATE).
    #[test]
    fn mapped_audio_renders_bit_identical_to_ram() {
        let _g = exclusive();
        store_f32(&AUDIO_STATE.current_sample_rate, 48000.0); // distinta al archivo: Hermite fraccionario
        store_f32(&AUDIO_STATE.pitch_ratio, 2.0f32.powf(2.0 / 12.0)); // +2 semitonos
        AUDIO_STATE.metronome_enabled.store(false, Ordering::Relaxed);

        // 1) Sin arreglo.
        ARRANGEMENT.store(Arc::new(Vec::new()));
        let ram = render_all(false, 300, 0);
        let mapped = render_all(true, 300, 0);
        let mapped_pumped = render_all(true, 300, 7); // con el precargador soltando páginas en medio
        assert!(ram.iter().any(|s| s.abs() > 0.01), "la prueba debía producir audio");
        assert_eq!(ram, mapped, "mapeado ≠ RAM (sin arreglo)");
        assert_eq!(ram, mapped_pumped, "el precargador alteró el audio (sin arreglo)");

        // 2) Con arreglo: saltos, repetición y fin del arreglo dentro de la ventana.
        ARRANGEMENT.store(Arc::new(vec![(5_000, 60_000), (120_000, 140_000), (10_000, 30_000)]));
        let ram = render_all(false, 260, 0);
        let mapped = render_all(true, 260, 0);
        let mapped_pumped = render_all(true, 260, 5);
        assert!(ram.iter().any(|s| s.abs() > 0.01));
        assert_eq!(ram, mapped, "mapeado ≠ RAM (con arreglo)");
        assert_eq!(ram, mapped_pumped, "el precargador alteró el audio (con arreglo)");

        ARRANGEMENT.store(Arc::new(Vec::new()));
        AUDIO_STATE.is_playing.store(false, Ordering::Relaxed);
        store_f32(&AUDIO_STATE.pitch_ratio, 1.0);
    }

    /// Benchmark con una canción real (NO corre por defecto). Carga todos los .mp3/.wav de la
    /// carpeta, simula `BANDLY_BENCH_SECS` segundos de reproducción en tiempo real desde la
    /// mitad de la canción y mide RAM y tiempo de render. Comparar con y sin streaming:
    ///   BANDLY_BENCH_DIR=<carpeta> cargo test --release --lib bench_real_song -- --ignored --nocapture
    ///   (y lo mismo con BANDLY_NO_STREAM=1)
    #[test]
    #[ignore]
    fn bench_real_song() {
        use sysinfo::{Pid, ProcessesToUpdate, System};
        use std::time::{Duration, Instant};
        let dir = std::env::var("BANDLY_BENCH_DIR").expect("define BANDLY_BENCH_DIR");
        let secs: f64 = std::env::var("BANDLY_BENCH_SECS").ok().and_then(|v| v.parse().ok()).unwrap_or(30.0);
        let mut files: Vec<_> = std::fs::read_dir(&dir).unwrap().flatten().map(|e| e.path())
            .filter(|p| matches!(p.extension().and_then(|e| e.to_str()), Some("mp3") | Some("wav") | Some("flac")))
            .collect();
        files.sort();
        let pid = Pid::from_u32(std::process::id());
        let mut sys = System::new();
        let mem = |sys: &mut System| -> (f64, f64) {
            sys.refresh_processes(ProcessesToUpdate::Some(&[pid]), true);
            let p = sys.process(pid).unwrap();
            (p.memory() as f64 / 1_048_576.0, p.virtual_memory() as f64 / 1_048_576.0)
        };
        println!("== streaming: {} | {} pistas", pcm_store::STREAMING_ENABLED.load(Ordering::Relaxed), files.len());
        let (ws0, pv0) = mem(&mut sys);

        let t0 = Instant::now();
        for (i, f) in files.iter().enumerate() {
            load_audio_track(format!("t{i}"), f.to_string_lossy().to_string(), 1.0, 0, true, false, false).unwrap();
        }
        while AUDIO_STATE.tracks_loading.load(Ordering::Relaxed) > 0 { std::thread::sleep(Duration::from_millis(50)); }
        let load_s = t0.elapsed().as_secs_f64();
        let (ws1, pv1) = mem(&mut sys);
        let st = pcm_store::stats();
        println!("carga: {load_s:.1} s | working set {ws0:.0} -> {ws1:.0} MB | privada/commit {pv0:.0} -> {pv1:.0} MB | mapeadas {} ({:.0} MB)", st.mapped_tracks, st.mapped_mb);

        // Lo que haría la app tras cargar: calcular la onda (lee toda la canción).
        let t1 = Instant::now();
        let wf = get_master_waveform(1200);
        let (ws_w, pv_w) = mem(&mut sys);
        println!("onda master: {:.1} s ({} puntos) | working set {ws_w:.0} MB | privada {pv_w:.0} MB", t1.elapsed().as_secs_f64(), wf.len());

        // Con BANDLY_BENCH_CLIPS=1 todas las pistas se editan como en el secuenciador: se corta a la
        // mitad, se abre un hueco de 10 s y el resto se corre. Valida clips + streaming con audio real.
        if std::env::var("BANDLY_BENCH_CLIPS").is_ok() {
            let tracks = TRACKS.load();
            let sr_f = 44100u64;
            for t in tracks.iter() {
                let frames = (t.samples.load().len() / 2) as u64;
                let half = frames / 2;
                set_track_clips(t.id.clone(), vec![(0, 0, half), (half + 10 * sr_f, half, frames - half)]);
            }
            println!("clips aplicados a {} pistas (hueco de 10 s a la mitad)", tracks.len());
        }

        // Reproducción simulada en tiempo real, desde la mitad.
        start_stream_pump();
        let sr = 44100.0f32;
        store_f32(&AUDIO_STATE.current_sample_rate, sr);
        store_f32(&AUDIO_STATE.pitch_ratio, 1.0);
        let total = TRACKS.load().iter().map(|t| t.samples.load().len() / 2).max().unwrap_or(0) as u64;
        AUDIO_STATE.sample_counter.store(total / 2, Ordering::Relaxed);
        wake_stream_pump();
        std::thread::sleep(Duration::from_millis(500));
        AUDIO_STATE.is_playing.store(true, Ordering::Relaxed);
        let block_dur = Duration::from_secs_f64(512.0 / sr as f64);
        let mut block = vec![0.0f32; 512 * 2];
        let mut times: Vec<f64> = Vec::new();
        let start = Instant::now();
        let mut n = 0u32;
        let mut peak_ws = 0.0f64;
        while start.elapsed().as_secs_f64() < secs {
            while start.elapsed() < block_dur * n { std::thread::sleep(Duration::from_micros(500)); }
            block.iter_mut().for_each(|s| *s = 0.0);
            let t = Instant::now();
            render_audio::<f32>(&mut block, 2, AUDIO_STATE.clone());
            times.push(t.elapsed().as_secs_f64() * 1000.0);
            n += 1;
            if n % 200 == 0 { let (w, _) = mem(&mut sys); peak_ws = peak_ws.max(w); }
        }
        AUDIO_STATE.is_playing.store(false, Ordering::Relaxed);
        let (ws2, pv2) = mem(&mut sys);
        times.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let pct = |p: f64| times[((times.len() as f64 - 1.0) * p) as usize];
        println!(
            "reproducción {secs:.0} s ({n} bloques de 11.6 ms): render mediana {:.2} ms | p99 {:.2} ms | máx {:.2} ms | working set final {ws2:.0} MB (pico {peak_ws:.0}) | privada {pv2:.0} MB",
            pct(0.5), pct(0.99), times[times.len() - 1]
        );
        let st = pcm_store::stats();
        println!("fallbacks: {} | pistas mapeadas: {}", st.fallbacks, st.mapped_tracks);
        TRACKS.store(Arc::new(Vec::new()));
    }

    /// Una pista ("a", 6 s a 44.1 kHz) con los clips dados; devuelve el canal izquierdo.
    fn render_clips(mapped: bool, clips: Option<Vec<(u64, u64, u64)>>, blocks: usize, pump_every: usize) -> Vec<f32> {
        let a = tone(264_600, 220.0, 330.0);
        let track = test_track("a", make_buf(&a, mapped), 44100.0, 0, 0.0);
        if let Some(c) = &clips { track.clips.store(Some(Arc::new(clips::normalize(c)))); }
        TRACKS.store(Arc::new(vec![track]));
        AUDIO_STATE.sample_counter.store(0, Ordering::Relaxed);
        AUDIO_STATE.is_playing.store(true, Ordering::Relaxed);
        AUDIO_STATE.preroll_active.store(false, Ordering::Relaxed);
        let mut left = Vec::with_capacity(blocks * 512);
        let mut block = vec![0.0f32; 512 * 2];
        for i in 0..blocks {
            if pump_every > 0 && i % pump_every == 0 { stream_pump_cycle(true); }
            block.iter_mut().for_each(|s| *s = 0.0);
            render_audio::<f32>(&mut block, 2, AUDIO_STATE.clone());
            left.extend(block.chunks(2).map(|f| f[0]));
        }
        TRACKS.store(Arc::new(Vec::new()));
        left
    }

    fn unity_setup() {
        store_f32(&AUDIO_STATE.current_sample_rate, 44100.0);
        store_f32(&AUDIO_STATE.pitch_ratio, 1.0);
        AUDIO_STATE.metronome_enabled.store(false, Ordering::Relaxed);
        ARRANGEMENT.store(Arc::new(Vec::new()));
    }

    #[test]
    fn clean_split_is_inaudible_and_full_clip_matches_plain_playback() {
        let _g = exclusive();
        unity_setup();
        let n = 30_000u64;
        let plain = render_clips(false, None, 70, 0);
        let whole = render_clips(false, Some(vec![(0, 0, n)]), 70, 0);
        let split = render_clips(false, Some(vec![(0, 0, 10_000), (10_000, 10_000, n - 10_000)]), 70, 0);
        let split3 = render_clips(false, Some(vec![(0, 0, 7_000), (7_000, 7_000, 9_000), (16_000, 16_000, n - 16_000)]), 70, 0);
        assert!(plain.iter().any(|s| s.abs() > 0.01));
        // Cortar sin mover nada NO cambia el sonido: ni un bit, ni bajón en el corte.
        assert_eq!(whole, split, "un corte limpio alteró el audio");
        assert_eq!(whole, split3, "dos cortes limpios alteraron el audio");
        // Y un clip que cubre todo suena igual que la pista sin clips (salvo el fundido de 256 de la entrada y la salida).
        // Tolerancia 2e-5 (≈ -94 dB): el EQ a 0 dB en f32 no es una identidad exacta y, tras el
        // fundido de 6 ms, deja un residuo que se apaga lento. Pasa igual con el arreglo de secciones.
        for t in 256..n as usize - 256 {
            assert!((plain[t] - whole[t]).abs() < 2e-5, "frame {t}: sin clips {} vs con clip {}", plain[t], whole[t]);
        }
        // Después del final del clip hay silencio.
        assert!(whole[n as usize..].iter().all(|&s| s == 0.0));
    }

    #[test]
    fn moved_clip_plays_the_same_audio_later_and_gaps_are_silent() {
        let _g = exclusive();
        unity_setup();
        let plain = render_clips(false, None, 70, 0);
        let shifted = render_clips(false, Some(vec![(7_000, 0, 12_000)]), 70, 0);
        assert!(shifted[..7_000].iter().all(|&s| s == 0.0), "antes del clip debía haber silencio");
        assert!(shifted[19_000..].iter().all(|&s| s == 0.0), "después del clip debía haber silencio");
        for t in (7_000 + 300)..(19_000 - 300) {
            assert!((shifted[t] - plain[t - 7_000]).abs() < 2e-5, "frame {t}: {} vs {}", shifted[t], plain[t - 7_000]);
        }
        // Un clip recortado del medio del audio (src 5000..8000) sonando desde el 2000.
        let trimmed = render_clips(false, Some(vec![(2_000, 5_000, 3_000)]), 70, 0);
        assert!(trimmed[..2_000].iter().all(|&s| s == 0.0));
        assert!(trimmed[5_000..].iter().all(|&s| s == 0.0));
        for t in (2_000 + 300)..(5_000 - 300) {
            assert!((trimmed[t] - plain[t + 3_000]).abs() < 2e-5, "frame {t}");
        }
    }

    #[test]
    fn empty_clip_list_silences_the_track_and_clearing_restores_it() {
        let _g = exclusive();
        unity_setup();
        let silent = render_clips(false, Some(vec![]), 20, 0);
        assert!(silent.iter().all(|&s| s == 0.0));
        let plain = render_clips(false, None, 20, 0);
        assert!(plain.iter().any(|s| s.abs() > 0.01));
        // set/clear por los comandos reales
        let a = tone(264_600, 220.0, 330.0);
        let track = test_track("zz", make_buf(&a, false), 44100.0, 0, 0.0);
        TRACKS.store(Arc::new(vec![track]));
        set_track_clips("zz".to_string(), vec![(100, 0, 50), (0, 0, 0)]);
        assert_eq!(TRACKS.load()[0].clips.load().as_ref().map(|c| c.len()), Some(1));
        clear_track_clips("zz".to_string());
        assert!(TRACKS.load()[0].clips.load().is_none());
        set_track_clips("no-existe".to_string(), vec![(0, 0, 10)]); // pista inexistente: no pasa nada
        TRACKS.store(Arc::new(Vec::new()));
    }

    #[test]
    fn mapped_with_clips_matches_ram_even_with_arrangement_pitch_and_pump() {
        let _g = exclusive();
        store_f32(&AUDIO_STATE.current_sample_rate, 48000.0);
        store_f32(&AUDIO_STATE.pitch_ratio, 2.0f32.powf(2.0 / 12.0));
        AUDIO_STATE.metronome_enabled.store(false, Ordering::Relaxed);
        let clips = vec![(2_000u64, 5_000u64, 6_000u64), (9_000, 0, 4_000), (13_000, 4_000, 3_000), (30_000, 100_000, 40_000)];
        for arr in [vec![], vec![(1_000u64, 40_000u64), (60_000, 80_000)]] {
            ARRANGEMENT.store(Arc::new(arr.clone()));
            let ram = render_clips(false, Some(clips.clone()), 160, 0);
            let mapped = render_clips(true, Some(clips.clone()), 160, 0);
            let pumped = render_clips(true, Some(clips.clone()), 160, 5);
            assert!(ram.iter().any(|s| s.abs() > 0.01));
            assert_eq!(ram, mapped, "mapeado ≠ RAM con clips (arreglo {arr:?})");
            assert_eq!(ram, pumped, "el precargador alteró el audio con clips (arreglo {arr:?})");
        }
        ARRANGEMENT.store(Arc::new(Vec::new()));
        store_f32(&AUDIO_STATE.pitch_ratio, 1.0);
        AUDIO_STATE.is_playing.store(false, Ordering::Relaxed);
    }

    /// El precargador debe cubrir TODO lo que el render lee, también con clips + arreglo + pitch.
    #[test]
    fn pump_ranges_cover_every_sample_read_with_clips() {
        let len = 2 * 264_600usize;
        let raw = vec![(2_000u64, 5_000u64, 6_000u64), (9_000, 0, 4_000), (13_000, 4_000, 3_000), (30_000, 100_000, 40_000)];
        let cl = clips::normalize(&raw);
        let arrangement: Vec<(u64, u64)> = vec![(1_000, 40_000), (60_000, 80_000)];
        for &(src_sr, safe_sr, pitch) in &[(44100.0, 48000.0, 1.122f64), (48000.0, 48000.0, 1.0), (44100.0, 44100.0, 0.891)] {
            for arr in [&arrangement[..], &[][..]] {
                let window = (500u64, 60_000u64);
                let ranges = track_sample_ranges(src_sr, len, &[window], arr, safe_sr, pitch, Some(&cl));
                let ratio = (src_sr / safe_sr) * pitch;
                let mut checked = 0;
                for v in window.0..window.1 {
                    let song = if arr.is_empty() { v } else {
                        let (p, _) = map_arrangement(v, arr);
                        if p == u64::MAX { continue; }
                        p
                    };
                    let Some((src, _)) = clips::map(song, &cl) else { continue };
                    let pos = (src as f64 * ratio) as usize;
                    if pos < 1 || pos + 2 >= len / 2 { continue; }
                    for frame in [pos - 1, pos, pos + 1, pos + 2] {
                        for ch in 0..2 {
                            let idx = frame * 2 + ch;
                            assert!(ranges.iter().any(|&(a, b)| idx >= a && idx < b), "idx {idx} (v={v}) fuera de {ranges:?}");
                        }
                    }
                    checked += 1;
                }
                assert!(checked > 1000, "la prueba debía verificar muchas muestras ({checked})");
            }
        }
    }

    /// Lo que el precargador toca debe incluir TODO lo que el render va a leer.
    #[test]
    fn pump_ranges_cover_every_sample_the_render_reads() {
        let _g = exclusive();
        let arrangement: Vec<(u64, u64)> = vec![(5_000, 60_000), (120_000, 140_000), (10_000, 30_000)];
        let len = 2 * 264_600usize;
        for &(src_sr, safe_sr, pitch) in &[
            (44100.0, 48000.0, 1.122f64), (48000.0, 48000.0, 1.0), (44100.0, 44100.0, 0.891), (96000.0, 48000.0, 1.0),
        ] {
            for arr in [&arrangement[..], &[][..]] {
                let window = (3_000u64, 80_000u64);
                let ranges = track_sample_ranges(src_sr, len, &[window], arr, safe_sr, pitch, None);
                let ratio = (src_sr / safe_sr) * pitch;
                for v in window.0..window.1 {
                    let source_pos = if arr.is_empty() { v } else {
                        let (p, _) = map_arrangement(v, arr);
                        if p == u64::MAX { continue; }
                        p
                    };
                    let pos = (source_pos as f64 * ratio) as usize;
                    if pos < 1 || pos + 2 >= len / 2 { continue; }
                    for frame in [pos - 1, pos, pos + 1, pos + 2] {
                        for ch in 0..2 {
                            let idx = frame * 2 + ch;
                            assert!(
                                ranges.iter().any(|&(a, b)| idx >= a && idx < b),
                                "idx {idx} (v={v}, sr {src_sr}/{safe_sr}, pitch {pitch}) fuera de {ranges:?}"
                            );
                        }
                    }
                }
            }
        }
    }
}
