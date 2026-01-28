use salvo::Router;
use salvo::affix_state;
use salvo::cors::Cors;
use salvo::http::Method;
use salvo::serve_static::StaticDir;

use super::ServerConfig;
use crate::glucose_values::store::GlucoseStore;
use crate::server::list_glucose_values::list_glucose_values;

pub trait StoreBound: GlucoseStore + Sync + Send + Clone + 'static {}

impl<T: GlucoseStore + Sync + Send + Clone + 'static> StoreBound for T {}

pub fn router<T: StoreBound>(config: &ServerConfig, store: T) -> salvo::Router {
    let cors = Cors::new()
        .allow_origin(&vec![
            String::from("http://localhost:5173"),
            format!("https://{}", config.domain),
        ])
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
        .push(
            Router::with_path("{*path}").get(
                StaticDir::new(["dist"])
                    .defaults("index.html")
                    .auto_list(true),
            ),
        )
}

#[derive(Serialize)]
struct MeasurementsDto<'a> {
    complete: bool,
    timestamps: &'a [i64],
    values: &'a [u16],
    covered_range: TimeRange,
}

#[derive(Serialize)]
struct TimeRange {
    from: i64,
    to: i64,
}
