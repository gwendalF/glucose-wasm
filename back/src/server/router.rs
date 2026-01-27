use chrono::DateTime;
use salvo::Writer;
use salvo::{Router, handler, macros::Extractible};
use serde::{Deserialize, Serialize};

pub fn router() -> salvo::Router {
    Router::with_path("glucose").get(list_glucose_values)
}

#[derive(Serialize, Deserialize, Extractible)]
#[salvo(extract(default_source = "query"))]
struct RangeQuery {
    from: i64,
    to: i64,
}

#[handler]
async fn list_glucose_values(param: RangeQuery) -> Option<&'static str> {
    let from = DateTime::from_timestamp_millis(param.from)?;
    let to = DateTime::from_timestamp_millis(param.to)?;

    Some("Hello")
}
