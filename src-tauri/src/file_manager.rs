use std::fs;
use zip::ZipArchive;
use tauri::AppHandle;
use tauri::Manager;
use std::path::Path;

#[tauri::command]
pub fn extract_multitrack_zip(app: AppHandle, zip_path: String, song_id: String) -> Result<String, String> {
    // Obtener la ruta de datos local de la app
    let local_data_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    let target_dir = local_data_dir.join("multitracks").join(&song_id);

    // 0. Cache Inteligente de Extracción
    let marker_path = target_dir.join(".extracted");
    if marker_path.exists() {
        println!("[FileManager] Proyecto ZIP ya extraído en caché (marcador encontrado): {}", song_id);
        return Ok(target_dir.to_string_lossy().to_string());
    }

    // Crear el directorio destino
    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    // Abrir el archivo ZIP
    let file = fs::File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

    println!("[FileManager] Iniciando extracción 'Flatten' para canción: {}", song_id);

    // Extraer cada archivo de forma plana (solo audios permitidos)
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        
        // Obtenemos solo el nombre del archivo, descartando carpetas internas del ZIP
        let file_raw_name = file.name();
        let path_in_zip = Path::new(file_raw_name);
        
        // Solo procesamos archivos, no directorios dentro del ZIP
        if file.is_dir() { continue; }

        if let Some(file_name) = path_in_zip.file_name() {
            let file_name_str = file_name.to_string_lossy().to_lowercase();
            
            // FILTRO ESTRICTO: Solo archivos de audio
            let is_audio = file_name_str.ends_with(".wav") || 
                           file_name_str.ends_with(".mp3") || 
                           file_name_str.ends_with(".m4a");

            if is_audio {
                let outpath = target_dir.join(file_name);
                println!("[FileManager] Extrayendo: {:?}", outpath.file_name().unwrap());
                
                let mut outfile = fs::File::create(&outpath).map_err(|e| e.to_string())?;
                std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
            }
        }
    }

    fs::write(target_dir.join(".extracted"), "done").ok();
    Ok(target_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_project_tracks(app: AppHandle, song_id: String) -> Result<Vec<String>, String> {
    let local_data_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    let target_dir = local_data_dir.join("multitracks").join(&song_id);

    if !target_dir.exists() {
        return Err("La carpeta del proyecto no existe".to_string());
    }

    let mut tracks = Vec::new();
    if let Ok(entries) = fs::read_dir(target_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                let ext_str = ext.to_string_lossy().to_lowercase();
                if ext_str == "wav" || ext_str == "mp3" {
                    if let Some(name) = path.file_stem() {
                        tracks.push(name.to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    Ok(tracks)
}


#[tauri::command]
pub async fn download_multitrack(app: AppHandle, url: String, song_id: String, file_name: String, token: String) -> Result<String, String> {
    let local_data_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    let target_dir = local_data_dir.join("multitracks").join(&song_id);
    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    // Sanear file_name: si viniera una ruta absoluta o con "..", PathBuf::join()
    // la usaría tal cual e ignoraría target_dir por completo (comportamiento
    // real de Rust). Nos quedamos solo con el nombre final del archivo.
    let safe_name = Path::new(&file_name)
        .file_name()
        .ok_or_else(|| "Nombre de archivo inválido".to_string())?;
    let target_path = target_dir.join(safe_name);
    
    if target_path.exists() {
        if let Ok(meta) = fs::metadata(&target_path) {
            if meta.len() > 0 {
                println!("[FileManager] Usando archivo en caché: {:?}", target_path.file_name().unwrap_or_default());
                return Ok(target_path.to_string_lossy().to_string());
            }
        }
    }

    let client = reqwest::Client::new();
    let mut request_builder = client.get(&url);
    
    if !token.is_empty() {
        request_builder = request_builder.header("Authorization", format!("Bearer {}", token));
    }
    
    let response = request_builder.send()
        .await
        .map_err(|e: reqwest::Error| e.to_string())?;
    
    let status = response.status();
    if !status.is_success() {
        return Err(format!("Error de Servidor ({}): No se pudo encontrar el archivo", status));
    }

    let bytes = response.bytes().await.map_err(|e: reqwest::Error| e.to_string())?;
    let len = bytes.len();
    fs::write(&target_path, bytes).map_err(|e: std::io::Error| e.to_string())?;
    println!("[FileManager] Archivo guardado: {:?} | Tamaño: {} bytes", target_path.file_name(), len);
    
    Ok(target_path.to_string_lossy().to_string())
}
