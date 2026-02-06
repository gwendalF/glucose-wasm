use chrono::{DateTime, Utc};

use postcard_bindgen::PostcardBindings;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Serialize, PostcardBindings)]
pub struct Measurements<'a> {
    pub timestamps: &'a [i64],
    pub values: &'a [u16],
    pub has_more: bool,
}

pub struct OwnedData {
    pub timestamps: Vec<i64>,
    pub values: Vec<u16>,
}

#[derive(Debug, Error)]
pub enum Error {
    #[error("IO error")]
    Io(#[from] rusqlite::Error),
    #[error("data is missing: {0}")]
    Missing(String),
    #[error("Postcard error {0}")]
    Postcard(String),
}

type Result<T> = std::result::Result<T, Error>;

pub trait GlucoseStore {
    fn load(
        &self,
        from: DateTime<Utc>,
        to: DateTime<Utc>,
        limit: usize,
    ) -> Result<Measurements<'_>>;
    fn insert(&self, values: &Measurements) -> Result<()>;
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

#[derive(Serialize, Deserialize)]
pub struct PostCardData {
    pub first_timestamp: i64,
    pub timestamps: Vec<i64>,
    pub first_measure: u16,
    pub measures: Vec<i16>,
}

fn load_postcard_data(path: &str) -> Result<OwnedData> {
    let content = std::fs::read(path).map_err(|e| Error::Postcard(e.to_string()))?;

    let raw_postcard =
        zstd::decode_all(content.as_slice()).map_err(|e| Error::Postcard(e.to_string()))?;

    let postcard: PostCardData =
        postcard::from_bytes(&raw_postcard).map_err(|e| Error::Postcard(e.to_string()))?;

    let timestamps: Vec<_> =
        std::iter::once(postcard.first_timestamp)
            .chain(postcard.timestamps.into_iter().scan(
                postcard.first_timestamp,
                |timestamp, dt| {
                    *timestamp += dt;
                    Some(*timestamp)
                },
            ))
            .collect();

    let glucoses: Vec<_> = std::iter::once(postcard.first_measure)
        .chain(
            postcard
                .measures
                .into_iter()
                .scan(postcard.first_measure, |measure, dy| {
                    let next = (*measure as i16 + dy) as u16;
                    *measure = next;
                    Some(next)
                }),
        )
        .collect();

    Ok(OwnedData {
        timestamps,
        values: glucoses,
    })
}

#[derive(Clone, Copy)]
pub struct Store {
    _private: (),
}

impl Store {
    pub fn new(path: &str) -> Result<Self> {
        match load_postcard_data(path) {
            Ok(data) => {
                let _ = DATA.set(data);
                Ok(Store { _private: () })
            }
            Err(e) => {
                eprintln!("Erreur loading postcard {e}");

                let data = load_sqlite_data(path)?;
                let _ = DATA.set(data);
                Ok(Store { _private: () })
            }
        }
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

    fn insert(&self, _values: &Measurements) -> Result<()> {
        todo!()
    }
}
