use salvo::acme::ListenerAcmeExt;
use salvo::conn::TcpListener;
use salvo::{Listener, Server};

use crate::commands;
use crate::glucose_values::store::Store;

mod errors;
mod list_glucose_values;
mod router;

pub fn run(config: &commands::Config) -> Result<(), std::io::Error> {
    let runtime = tokio::runtime::Runtime::new()?;

    let mut output: std::io::Result<()> = Ok(());
    runtime.block_on(async {
        output = main(ServerConfig {
            http_port: config.http_port,
            https_port: config.https_port,
            address: String::from("0.0.0.0"),
            sqlite_path: String::from("db.sqlite"),
            is_prod: config.is_prod,
            domain: config.domain.clone(),
        })
        .await;
    });

    output
}

struct ServerConfig {
    https_port: u16,
    http_port: u16,
    address: String,
    sqlite_path: String,
    is_prod: bool,
    domain: String,
}

async fn main(config: ServerConfig) -> std::io::Result<()> {
    match std::fs::exists(&config.sqlite_path) {
        Err(e) => {
            return Err(e);
        }
        Ok(false) => {
            return Err(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Missing file",
            ));
        }
        Ok(true) => (),
    }

    let store = Store::new(&config.sqlite_path).unwrap();
    let mut router = router::router(&config, store);

    if config.is_prod {
        let listener = TcpListener::new(format!("{}:{}", config.address, config.https_port))
            .acme()
            .cache_path("./acme_cache")
            .add_domain(config.domain)
            .http01_challenge(&mut router);
        let acceptor = listener
            .join(TcpListener::new(format!(
                "{}:{}",
                config.address, config.http_port
            )))
            .bind()
            .await;
        eprintln!("Server running on port: {}", config.https_port);
        Server::new(acceptor).serve(router).await;
    } else {
        let acceptor = TcpListener::new(format!("{}:{}", config.address, config.http_port))
            .bind()
            .await;
        eprintln!("Server running on port: {}", config.http_port);
        Server::new(acceptor).serve(router).await;
    };

    Ok(())
}
