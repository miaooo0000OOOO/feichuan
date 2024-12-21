use std::{sync::{Arc, Mutex}, thread, time::Duration};
use tauri::State;
use serialport::{available_ports, SerialPort, SerialPortType};

#[derive(Default)]
struct SerialState {
    is_open: Arc<Mutex<bool>>,
    port: Arc<Mutex<Option<Box<dyn SerialPort>>>>,
}

#[tauri::command]
async fn get_serial_ports() -> Vec<String> {
    match available_ports() {
        Ok(ports) => ports.into_iter().map(|port| port.port_name).collect(),
        Err(_) => vec![],
    }
}

#[tauri::command]
fn open_serial(state: State<SerialState>, port_name: String) -> bool {
    let mut is_open = state.is_open.lock().unwrap();
    let mut port = state.port.lock().unwrap();

    if *is_open {
        return false;
    }

    match serialport::new(port_name, 115200).timeout(Duration::from_millis(10)).open() {
        Ok(p) => {
            *port = Some(p);
            *is_open = true;
            true
        }
        Err(_) => false,
    }
}

#[tauri::command]
fn close_serial(state: State<SerialState>) -> bool {
    let mut is_open = state.is_open.lock().unwrap();
    let mut port = state.port.lock().unwrap();

    if !*is_open {
        return false;
    }

    *port = None;
    *is_open = false;
    true
}

#[tauri::command]
fn get_serial_data(state: State<SerialState>) -> Result<String, String> {
    let mut port = state.port.lock().unwrap();
    let mut is_open = state.is_open.lock().unwrap();

    if let Some(ref mut p) = *port {
        let mut buffer: Vec<u8> = vec![0; 1024];
        match p.read(buffer.as_mut_slice()) {
            Ok(t) => {
                buffer.truncate(t);
                match String::from_utf8(buffer) {
                    Ok(data) => Ok(data),
                    Err(_) => Err("Failed to parse data".into()),
                }
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => Ok("".into()),
            Err(ref e) if e.kind() == std::io::ErrorKind::NotConnected || e.raw_os_error() == Some(22) => {
                // 串口已断开
                *port = None;
                *is_open = false;
                Err("Port disconnected".into())
            }
            Err(ref e) => Err(format!("Failed to read from port: {}", e)),
        }
    } else {
        Err("Port is not open".into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(SerialState::default())
        .invoke_handler(tauri::generate_handler![
            get_serial_ports,
            open_serial,
            close_serial,
            get_serial_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
