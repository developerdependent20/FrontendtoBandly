use std::net::UdpSocket;

// Puente local con Bandly Lights: manda un datagrama UDP (mensaje OSC) a
// 127.0.0.1. El destino es SIEMPRE el loopback y no se puede cambiar desde JS,
// así este comando no sirve para mandar tráfico a otras máquinas de la red.
#[tauri::command]
pub fn send_local_udp(port: u16, data: Vec<u8>) -> Result<(), String> {
    if port < 1024 {
        return Err("Puerto no permitido (usa 1024 o mayor)".into());
    }
    let socket = UdpSocket::bind("127.0.0.1:0")
        .map_err(|e| format!("No se pudo abrir el socket UDP local: {e}"))?;
    socket
        .send_to(&data, ("127.0.0.1", port))
        .map_err(|e| format!("No se pudo enviar el cue a Lights: {e}"))?;
    Ok(())
}
