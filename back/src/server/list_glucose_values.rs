use std::time;

use chrono::DateTime;
use salvo::{Depot, Response, Writer, handler, macros::Extractible, writing::Json};
use serde::{Deserialize, Serialize};

use crate::{
    glucose_values::store::{GlucoseStore, Store},
    server::errors::Error,
};

#[derive(Serialize, Deserialize, Extractible, Debug)]
#[salvo(extract(default_source(from = "query")))]
struct RangeQuery {
    from: i64,
    to: i64,
}

#[handler]
pub async fn list_glucose_values(
    res: &mut Response,
    depot: &mut Depot,
    query: RangeQuery,
) -> Result<(), Error> {
    let store = depot.obtain::<Store>()?;

    let from = DateTime::from_timestamp_millis(query.from).ok_or(Error::InvalidRequest)?;
    let to = DateTime::from_timestamp_millis(query.to).ok_or(Error::InvalidRequest)?;
    let now = time::Instant::now();
    let measurements = store.load(from, to, 1000)?;
    let elapsed = now.elapsed().as_micros();

    res.add_header("Server-Timing", format!("db;dur={elapsed} us"), true)
        .unwrap()
        .render(Json(measurements));
    Ok(())
}
