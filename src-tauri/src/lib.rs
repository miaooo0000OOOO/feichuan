use std::{sync::{Arc, Mutex}, thread, time::Duration};
use tauri::State;
use serialport::available_ports;
use serialport::SerialPortType;

#[tauri::command]
async fn get_serial_ports() -> Vec<String> {
    // match available_ports() {
    //     Ok(ports) => ports.into_iter().map(|port| port.port_name).collect(),
    //     Err(_) => vec![],
    // }
    vec!["COM1".to_string(), "COM2".to_string()]
}

#[tauri::command]
fn open_serial(state: State<SerialState>) -> bool {
    let mut serial_open = state.0.lock().unwrap();
    *serial_open = true;
    true
}

#[tauri::command]
fn close_serial(state: State<SerialState>) -> bool {
    let mut serial_open = state.0.lock().unwrap();
    *serial_open = false;
    true
}

#[tauri::command]
fn get_serial_data(state: State<'_, SerialState>) -> String {
    let serial_open = state.0.clone();

    thread::spawn(move || {
        loop {
            {
                let serial_open = serial_open.lock().unwrap();
                if !*serial_open {
                    break;
                }
            }
            // Simulate sending data
            thread::sleep(Duration::from_secs(2));
        }
    });

    "up\r\n".to_string()
}

struct SerialState(Arc<Mutex<bool>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(SerialState(Arc::new(Mutex::new(false))))
        .invoke_handler(tauri::generate_handler![
            get_serial_ports,
            open_serial,
            close_serial,
            get_serial_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
