use std::io::Write;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::glucose_values::{
    self,
    store::{GlucoseStore, PostCardData},
};

pub fn save_db_to_postcard(db_path: &str) -> Result<(), postcard::Error> {
    let store = glucose_values::store::Store::new(db_path).unwrap();

    let measurements = store
        .load(DateTime::from_timestamp_nanos(0), Utc::now(), 1_000_000)
        .unwrap();

    let t0 = measurements.timestamps[0];
    let x0 = measurements.values[0];

    let delta_t = measurements
        .timestamps
        .windows(2)
        .map(|pair| pair[1] - pair[0])
        .collect::<Vec<_>>();
    let delta_x = measurements
        .values
        .windows(2)
        .map(|pair| pair[1] as i16 - pair[0] as i16)
        .collect::<Vec<_>>();

    let postcard = PostCardData {
        first_measure: x0,
        first_timestamp: t0,
        timestamps: delta_t,
        measures: delta_x,
    };

    let raw = postcard::to_stdvec(&postcard).unwrap();

    let file = std::fs::File::create("postcard_zstd").unwrap();

    let mut encoder = zstd::Encoder::new(file, 15).unwrap();

    encoder.write_all(&raw).unwrap();

    Ok(())
}
