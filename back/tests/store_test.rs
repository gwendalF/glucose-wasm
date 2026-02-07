use chrono::{TimeZone, Utc};
use glucose_wasm::{
    commands,
    glucose_values::store::{GlucoseStore, GlucoseValue, Store},
};
use tempfile::NamedTempFile;

fn temp_path() -> String {
    let temp_file = NamedTempFile::new().unwrap();
    let path = temp_file.path().to_str().unwrap();
    path.to_string()
}

#[test]
fn can_create_store_from_sqlite() {
    let date = Utc.with_ymd_and_hms(2023, 10, 8, 18, 00, 30).unwrap();

    let db_path = temp_path();
    commands::generate_sqlite_file(
        &db_path,
        &[GlucoseValue {
            timestamp: date.timestamp_millis(),
            value: 80,
        }],
    )
    .unwrap();
    let store = Store::new(&db_path).unwrap();

    let from = Utc.with_ymd_and_hms(1, 1, 1, 0, 0, 0).unwrap();
    let values = store.load(from, date, 500).unwrap();
    assert_eq!(values.timestamps.len(), 1);
    assert_eq!(values.timestamps[0], date.timestamp_millis());
}

#[test]
fn can_create_store_from_postcard() {
    let db_path = temp_path();
    let date = Utc.with_ymd_and_hms(2023, 10, 8, 18, 00, 30).unwrap();
    commands::save_postcard(&db_path, &[date.timestamp_millis()], &[90]).unwrap();
    let store = Store::new(&db_path).unwrap();

    let from = Utc.with_ymd_and_hms(1, 1, 1, 0, 0, 0).unwrap();
    let values = store.load(from, date, 500).unwrap();
    assert_eq!(values.timestamps.len(), 1);
    assert_eq!(values.timestamps[0], date.timestamp_millis());
}
