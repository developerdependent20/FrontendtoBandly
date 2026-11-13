# Registro de Estabilización: Motor "Live-Ready" 2.0 (Bandly)

Este documento contiene la arquitectura técnica definitiva que estabilizó el transporte (Play/Pause) y eliminó el stuttering (cortes de audio) en el entorno Tauri/Rust.

## 1. Arquitectura del Transporte (Play Instantáneo)
El botón de Play ya no es dependiente del estado de carga de las pistas. Su activación es atómica (`AtomicBool`).
- **Control Directo**: Al recibir `is_playing = true`, el motor procesa el comando de inmediato.
- **Reloj Sagrado (Sacred Clock)**: El `sample_counter` (maestro de tiempo) y el metrónomo se procesan **antes** y **fuera** de cualquier bloque que requiera un bloqueo (`lock`) de pistas. Esto garantiza que la barra de tiempo nunca se detenga, incluso si las pistas están cargando.

## 2. Eliminación de Cortes (Carga Lock-Free con ArcSwap)
Para eliminar los ruidos y cortes (glitches), las pistas (`TRACKS`) y las muestras de cada pista (`track.samples`) se almacenan en `arc_swap::ArcSwap` en vez de detrás de un `Mutex`/`lock()`:
- **El Problema (histórico)**: Un diseño basado en `lock()`/`try_lock()` sobre un vector compartido hacía que el hilo de audio en tiempo real pudiera bloquearse o saltarse bloques si el hilo de decodificación tenía el lock tomado.
- **La Solución actual**: Cada hilo de decodificación acumula todas las muestras del archivo en un `PcmSink` (antes un `Vec` local `local_chunk`; ver sección 5) mientras decodifica, y solo al terminar (EOF) publica el resultado con un único `t_bg.samples.store(...)` atómico. El hilo de tiempo real nunca escribe ni espera: solo hace `track.samples.load()`, una lectura lock-free de un snapshot inmutable.
- **Resultado**: El hilo de audio jamás puede bloquearse esperando a un hilo de carga, porque no existe ningún lock que ambos se disputen.

## 3. Mezcla No Bloqueante (Non-Blocking Mixing)
El hilo de tiempo real lee el estado de las pistas exclusivamente vía `TRACKS.load()` (snapshot `ArcSwap`), nunca con un lock exclusivo.
- Como cada lectura obtiene una instantánea inmutable, no hay bloqueos, saltos de bloque ni necesidad de un mecanismo de "no esperar" explícito: el propio diseño lock-free lo garantiza.

## 4. Parámetros Críticos (Magic Numbers)
- **Buffer Size**: 1024 (Balance ideal entre latencia ASIO/WASAPI y carga multi-hilo).
- **Publicación de muestras**: una sola vez por pista, al finalizar la decodificación completa (no hay flush incremental).
- **Zero-Init**: El hardware buffer se limpia a 0.0 antes de cada iteración para evitar basura de memoria.

## 5. Streaming de audio (rama `feat/streaming-engine`)
**Problema**: cada canción se decodificaba entera a RAM (una de 16 stems × 9 min ≈ 1.5 GB), y la precarga de la siguiente canción lo duplicaba.

**Solución**: las pistas largas ya no viven en la RAM del proceso sino en un archivo temporal **mapeado a memoria** (`src-tauri/src/pcm_store.rs`):
- `PcmSink` recibe lo que decodifica el hilo de carga. Empieza en RAM; al pasar de 8 MB derrama a `%TEMP%/bandly-pcm-cache/<pid>/` y deja un buffer de escritura de 1 MB. Al terminar (`finish`) mapea el archivo en solo lectura y lo publica con el mismo `samples.store(...)` atómico de siempre.
- `TrackSource.samples` pasó de `ArcSwap<Vec<i16>>` a `ArcSwap<PcmBuf>` (`Ram` | `Mapped`). El render obtiene **un `&[i16]` por bloque** y su matemática (Hermite, EQ, arreglo, pitch) no cambió: la prueba `mapped_audio_renders_bit_identical_to_ram` verifica que la salida es idéntica bit a bit.
- **El hilo de audio sigue sin abrir archivos ni esperar locks.** Un hilo aparte (`stream_pump`, en `audio_engine.rs`) lee por adelantado las páginas de los próximos 10 s (aplicando arreglo, pitch y los saltos conocidos de cue/pre-roll con las mismas reglas del render, ver `pump_ranges_cover_every_sample_the_render_reads`) y suelta del working set las que ya sonaron. Un seek, salto o play lo despierta de inmediato.
- **Respaldo**: si falla crear/escribir el archivo (disco lleno, permisos) o el mapeo, la pista vuelve a RAM **sin perder datos** (`degrade_to_ram`, cubierto por pruebas con fallos inyectados). Con menos de 3 GB libres en el disco no se derrama. Interruptor: variable de entorno `BANDLY_NO_STREAM=1` o el comando `set_streaming_enabled(false)` (afecta a las próximas cargas); `get_streaming_stats` informa pistas mapeadas, MB y respaldos.
- **Limpieza**: el archivo se borra al soltar la pista (desde un hilo aparte, para no hacer E/S en el hilo de audio); los restos de cierres bruscos se eliminan al arrancar.
- **Medición** (canción real de 16 stems × ~9 min, 30 s de reproducción simulada en tiempo real, `cargo test --release --lib bench_real_song -- --ignored --nocapture` con `BANDLY_BENCH_DIR`):

  | | RAM (antes) | Streaming |
  |---|---|---|
  | Working set tras cargar | 1642 MB | 12 MB |
  | Working set sonando | 1641 MB | 49 MB (pico 52) |
  | Render mediana / p99 / máx (presupuesto 11.6 ms) | 0.51 / 0.91 / 1.46 ms | 0.51 / 0.96 / 1.61 ms |
  | Tiempo de carga (decodificar 16 mp3) | 3.2 s | 8.0 s |

  El costo es la carga: hay que escribir ~1.6 GB al disco temporal. Medido con el caché del sistema ya caliente; **no** se midió con el caché frío ni con disco lento.
- **Riesgo conocido**: si el sistema tiene que traer del disco una página que el precargador no alcanzó a tocar (p. ej. un seek seguido de play en menos de ~60 ms, o un disco muy lento/ocupado), el hilo de audio espera esa lectura. Con SSD y precarga es difícil que ocurra; por eso conviene probar en el equipo y disco reales del show antes de usarlo en vivo.

## 6. Secuenciador v1: clips por pista (rama `feat/streaming-engine`)
Segunda vista del DAW, junto a **Mix**: **Secuenciador**, con una fila por pista y sus clips. Se pueden mover, recortar los bordes, dividir en el cursor, duplicar y borrar, sin tocar el audio original. Es solo de audio (sin MIDI ni grabación).

**Motor** (`src-tauri/src/clips.rs`, `audio_engine.rs`):
- Cada `TrackSource` tiene `clips: ArcSwapOption<Vec<ClipSeg>>`. **`None` = la pista suena entera y de corrido, exactamente como antes** (es el caso de toda pista que nadie editó: el código del render es el mismo). `Some(lista)` = solo suenan esos clips; lista vacía = pista en silencio. Es un único `ArcSwap` para que el hilo de audio nunca vea un estado a medias.
- El render compone dos traducciones, en este orden: arreglo de secciones (tiempo virtual → tiempo de canción) y clips de la pista (tiempo de canción → posición en su archivo). Un hueco entre clips es silencio. Los bordes de un clip llevan el mismo fundido de 256 muestras que los cortes del arreglo.
- **Un corte limpio no se oye**: dos clips contiguos (mismo audio, sin hueco) no llevan fundido en el corte (`ClipSeg.fade_in/out`), por lo que suenan bit a bit igual que sin cortar.
- El precargador de páginas (sección 5) también sigue los clips (`clips::source_ranges`), así el streaming no pierde lecturas por adelantado al editar.
- Comandos: `set_track_clips(track_id, [(tl, src, len)])`, `clear_track_clips(track_id)`, `get_track_waveforms(buckets)` (picos por pista, asíncrono, para dibujar).

**Interfaz** (`SequencerView.jsx`, `utils/clips.js`):
- Los clips se guardan en cuadros del archivo en unidades "pitch 0" (igual que los markers) dentro de `sequences.timeline_lanes.clips` (la misma columna JSON de Letras/Luces: **sin migración**). Una pista sin editar no se guarda. Los cambios entran al **historial global** de `ProMixer`, así Ctrl+Z / Ctrl+Shift+Z deshacen también los clips.
- `toEngineClips` convierte a las unidades del motor redondeando posiciones (no largos) y expresando el audio como desplazamiento `src − tl`: un corte limpio sigue siendo contiguo con cualquier transposición o frecuencia de la tarjeta.
- Atajos (con el foco en el secuenciador): `S` dividir en el cursor (con selección solo esos clips; sin selección, todas las pistas), `Ctrl+D` duplicar, `Supr` borrar, `Ctrl+A` seleccionar todo, `Esc` cancelar/soltar, Shift+clic multi-selección, Alt = sin imán, Ctrl+rueda = zoom. Imán a compás/tiempo.

**Pruebas**: `cargo test --lib` (28: normalización, mapeo, fundidos, render con clips idéntico en RAM y mapeado, cobertura del precargador) y `node --test src/utils/clips.test.js` (23, incluye un fuzz de 4000 ediciones aleatorias que verifica que nunca se rompen las invariantes).

**Límites conocidos de la v1**: los clips no se pueden mover entre pistas; las ondas tienen 3000 puntos por pista (suficiente para editar por compases, tosco con mucho zoom); con un arreglo de secciones activo los clips se editan sobre la línea de tiempo original; el cambio de vista no está probado con audio real en la app de escritorio (solo con un arnés de navegador y pruebas de motor).

> Nota: este documento describe la arquitectura tal como existe en `audio_engine.rs` a 2026-07-02 (secciones 5 y 6: rama `feat/streaming-engine`). Si se vuelve a introducir flushing incremental o locks, actualizar esta sección para que no quede desincronizada del código (ver comentario en el propio archivo: "Lock-Free Offline Loading: Acumulamos todo en local_chunk y lo inyectamos al final").

---
*Referencia técnica para futuras refactorizaciones de `audio_engine.rs`.*
