use salvo::Response;
use salvo::Router;
use salvo::affix_state;
use salvo::cors::AllowOrigin;
use salvo::cors::Cors;

use salvo::handler;
use salvo::http::{Method, header::HeaderName};
use salvo::prelude::Compression;
use salvo::prelude::CompressionLevel;
use salvo::serve_static::StaticDir;

use super::ServerConfig;
use crate::glucose_values::store::GlucoseStore;
use crate::server::list_glucose_values::list_glucose_values;

pub trait StoreBound: GlucoseStore + Sync + Send + Clone + 'static {}

impl<T: GlucoseStore + Sync + Send + Clone + 'static> StoreBound for T {}

pub fn router<T: StoreBound>(config: &ServerConfig, store: T) -> salvo::Router {
    let mut cors = Cors::new();

    let allowed_headers = [
        HeaderName::from_static("content-type"),
        HeaderName::from_static("authorization"),
    ];
    if config.is_prod {
        cors = cors
            .allow_origin(&format!("https://{}", config.domain))
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::OPTIONS])
            .allow_headers(allowed_headers);
    } else {
        cors = cors
            .allow_origin(AllowOrigin::dynamic(|origin, _req, _depot| {
                if let Some(addr) = origin
                    && addr.as_bytes().starts_with(b"http://localhost")
                {
                    return origin.cloned();
                }

                None
            }))
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::OPTIONS])
            .allow_headers(allowed_headers);
    }

    let cors = cors.into_handler();

    Router::new()
        .hoop(
            Compression::new()
                .enable_gzip(CompressionLevel::Fastest)
                .content_types(&[salvo::http::mime::APPLICATION_OCTET_STREAM])
                .min_length(2048),
        )
        .hoop(set_coop_coep)
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

#[handler]
async fn set_coop_coep(res: &mut Response) -> salvo::Result<()> {
    res.add_header("Cross-Origin-Embedder-Policy", "require-corp", true)?;
    res.add_header("Cross-Origin-Opener-Policy", "same-origin", true)?;
    Ok(())
}
