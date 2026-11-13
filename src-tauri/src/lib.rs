mod audio_engine;
mod file_manager;
mod local_link;
mod pcm_store;
mod clips;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            audio_engine::get_audio_devices,
            audio_engine::get_device_audio_options,
            audio_engine::init_audio_stream,
            audio_engine::set_track_mute,
            audio_engine::set_track_solo,
            audio_engine::set_master_volume,
            audio_engine::set_track_volume,
            audio_engine::set_track_eq,
            audio_engine::toggle_playback,
            audio_engine::set_metronome,
            audio_engine::jump_to_bar,
            audio_engine::load_audio_track,
            audio_engine::reset_audio_engine,
            audio_engine::kill_audio_stream,
            audio_engine::get_engine_report,
            audio_engine::seek_to_sample,
            audio_engine::get_v2_status,
            audio_engine::set_track_output,
            audio_engine::set_track_pan_mode,
            audio_engine::get_master_waveform,
            audio_engine::get_track_envelope,
            audio_engine::get_track_clip_16k,
            audio_engine::set_arrangement,
            audio_engine::clear_arrangement,
            audio_engine::set_track_clips,
            audio_engine::clear_track_clips,
            audio_engine::get_track_waveforms,
            audio_engine::set_audio_buffer_size,
            audio_engine::trigger_pad,
            audio_engine::stop_pad,
            audio_engine::set_pad_volume,
            audio_engine::load_pad_sample,
            audio_engine::set_pad_output,
            audio_engine::play_with_preroll,
            audio_engine::set_transpose,
            audio_engine::set_beats_per_bar,
            audio_engine::preload_song,
            audio_engine::commit_staged_song,
            audio_engine::cancel_staging,
            audio_engine::get_streaming_stats,
            audio_engine::set_streaming_enabled,
            file_manager::extract_multitrack_zip,
            local_link::send_local_udp,

            audio_engine::sync_stems_to_engine,
            audio_engine::load_pads_from_assets,
            audio_engine::prepare_pad_file,
            file_manager::get_project_tracks,
            file_manager::download_multitrack
        ])
        .setup(|app| {
            // Streaming de audio: limpiar restos de sesiones anteriores y arrancar el
            // hilo que precarga las páginas que van a sonar.
            pcm_store::cleanup_stale_cache();
            audio_engine::start_stream_pump();
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
