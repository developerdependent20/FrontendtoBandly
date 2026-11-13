# Bandly Tracker (Live-Ready Engine)

Este es el núcleo de reproducción profesional de Bandly, diseñado para latencia cero y estabilidad total en conciertos en vivo. 

> [!IMPORTANT]
> **Arquitectura de Estabilidad**: Para entender cómo mantener el transporte estable, libre de cortes y con respuesta instantánea, consulta el archivo [ENGINE_STABILITY_RECORD.md](file:///c:/Users/User/.gemini/antigravity/scratch/Bandly/ENGINE_STABILITY_RECORD.md).

## Características Principales
- **Hardened Engine 2.0**: Motor de audio en Rust desacoplado de la UI.
- **Batch Decoding**: Procesamiento por lotes de 2 segundos para evitar contención de memoria.
- **Instant Play**: Transporte atómico sin esperas de carga.
- **Reloj Sagrado**: Sincronía visual independiente del procesamiento de audio.

## Desarrollo
1. `npm install`
2. `npm run tauri dev`

## Créditos
- Muestras de piano: Salamander Grand Piano de Alexander Holm (CC-BY 3.0), en `public/audio/piano/`.
