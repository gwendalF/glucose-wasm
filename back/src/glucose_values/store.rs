use chrono::{DateTime, Utc};
use rusqlite::Result;
use serde::Serialize;
use thiserror::Error;

#[derive(Serialize)]
pub struct Measurements<'a> {
    pub timestamps: &'a [i64],
    pub values: &'a [u16],
    pub has_more: bool,
}

struct OwnedData {
    timestamps: Vec<i64>,
    values: Vec<u16>,
}

#[derive(Debug, Error)]
pub enum Error {
    #[error("IO error")]
    Io(#[from] rusqlite::Error),
    #[error("data is missing: {0}")]
    Missing(String),
}

pub trait GlucoseStore {
    fn load(
        &self,
        from: DateTime<Utc>,
        to: DateTime<Utc>,
        limit: usize,
    ) -> std::result::Result<Measurements<'_>, Error>;
    fn insert(&self, values: &Measurements) -> Result<(), Error>;
}

static DATA: std::sync::OnceLock<OwnedData> = std::sync::OnceLock::new();

pub struct GlucoseValue {
    pub timestamp: i64,
    pub value: u16,
}

fn load_sqlite_data(path: &str) -> Result<OwnedData> {
    let conn = rusqlite::Connection::open(path)?;
    let mut stmt =
        conn.prepare("SELECT timestamp, value FROM glucose_values ORDER BY timestamp ASC")?;

    let rows = stmt.query_map((), |row| {
        Ok(GlucoseValue {
            timestamp: row.get(0)?,
            value: row.get(1)?,
        })
    })?;

    let mut measures = OwnedData {
        timestamps: vec![],
        values: vec![],
    };

    for row in rows {
        let row = row?;

        measures.values.push(row.value);
        measures.timestamps.push(row.timestamp);
    }

    Ok(measures)
}

#[derive(Clone, Copy)]
pub struct Store {
    _private: (),
}

impl Store {
    pub fn new(path: &str) -> Result<Self> {
        let data = load_sqlite_data(path)?;
        let _ = DATA.set(data);

        Ok(Store { _private: () })
    }
}

impl GlucoseStore for Store {
    fn load(
        &self,
        from: DateTime<Utc>,
        to: DateTime<Utc>,
        limit: usize,
    ) -> std::result::Result<Measurements<'_>, Error> {
        let from = from.timestamp_millis();
        let to = to.timestamp_millis();

        let data = DATA
            .get()
            .ok_or_else(|| Error::Missing(String::from("DATA static")))?;

        let from_idx = data
            .timestamps
            .partition_point(|&timestamp| timestamp < from);
        let target_to_idx = data
            .timestamps
            .partition_point(|&timestamp| timestamp <= to);

        let to_idx = std::cmp::min(target_to_idx, from_idx + limit);

        let is_before_end = to_idx < data.timestamps.len();
        let has_more = is_before_end && (to_idx == from_idx + limit);

        let timestamps = &data.timestamps[from_idx..to_idx];
        let values = &data.values[from_idx..to_idx];

        Ok(Measurements {
            timestamps,
            values,
            has_more,
        })
    }

    fn insert(&self, _values: &Measurements) -> Result<(), Error> {
        todo!()
    }
}
