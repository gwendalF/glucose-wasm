use std::time;

use chrono::DateTime;
use salvo::cors::Cors;
use salvo::http::Method;
use salvo::writing::Json;
use salvo::{Depot, Response, Writer, affix_state};
use salvo::{Router, handler, macros::Extractible};
use serde::{Deserialize, Serialize};

use crate::glucose_values::store::{GlucoseStore, Store};

pub trait StoreBound: GlucoseStore + Sync + Send + Clone + 'static {}

impl<T: GlucoseStore + Sync + Send + Clone + 'static> StoreBound for T {}

pub fn router<T: StoreBound>(store: T) -> salvo::Router {
    let cors = Cors::new()
        .allow_origin("http://localhost:5173")
        .allow_methods(vec![
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::OPTIONS,
        ])
        .allow_headers(vec!["content-type", "authorization"])
        .into_handler();

    Router::new()
        .hoop(affix_state::inject(store))
        .hoop(cors)
        .push(Router::with_path("glucose").get(list_glucose_values))
}

#[derive(Serialize, Deserialize, Extractible, Debug)]
#[salvo(extract(default_source(from = "query")))]
struct RangeQuery {
    from: i64,
    to: i64,
}

#[handler]
async fn list_glucose_values(
    res: &mut Response,
    depot: &mut Depot,
    query: RangeQuery,
) -> Option<()> {
    let store = depot.obtain::<Store>().unwrap();

    let from = DateTime::from_timestamp_millis(query.from)?;
    let to = DateTime::from_timestamp_millis(query.to)?;
    let now = time::Instant::now();
    let measurements = store.load(from, to, 1000).unwrap();
    let elapsed = now.elapsed().as_millis();

    res.add_header("Server-Timing", format!("db;dur={elapsed}"), true)
        .unwrap()
        .render(Json(measurements));
    Some(())
}
