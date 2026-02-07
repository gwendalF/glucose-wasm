use std::io::Write;

use chrono::{DateTime, Utc};
use thiserror::Error;

use crate::glucose_values::{
    self,
    store::{GlucoseStore, PostCardData},
};

#[derive(Debug, Error)]
pub enum Error {
    #[error("Postcard {0}")]
    Postcard(#[from] postcard::Error),
    #[error("Io {0}")]
    Io(#[from] std::io::Error),
    #[error("Empty data")]
    Empty,
}

pub fn save_postcard(path: &str, timestamps: &[i64], values: &[u16]) -> Result<(), Error> {
    if timestamps.is_empty() || values.is_empty() {
        return Err(Error::Empty);
    }

    let t0 = timestamps[0];
    let x0 = values[0];

    let delta_t = timestamps
        .windows(2)
        .map(|pair| pair[1] - pair[0])
        .collect::<Vec<_>>();
    let delta_x = values
        .windows(2)
        .map(|pair| pair[1] as i16 - pair[0] as i16)
        .collect::<Vec<_>>();

    let postcard = PostCardData {
        first_measure: x0,
        first_timestamp: t0,
        timestamps: delta_t,
        measures: delta_x,
    };

    let raw = postcard::to_stdvec(&postcard)?;
    let file = std::fs::File::create(path)?;
    let mut encoder = zstd::Encoder::new(file, 15)?;
    encoder.write_all(&raw)?;
    encoder.finish()?;

    Ok(())
}

pub fn save_db_to_postcard(db_path: &str) -> Result<(), Error> {
    let store = glucose_values::store::Store::new(db_path).unwrap();

    let measurements = store
        .load(DateTime::from_timestamp_nanos(0), Utc::now(), 1_000_000)
        .unwrap();

    save_postcard(
        "postcard_zstd",
        measurements.timestamps,
        measurements.values,
    )
}
