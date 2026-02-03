use salvo::conn::TcpListener;
use salvo::{Listener, Server};

use crate::glucose_values::store::Store;

mod errors;
mod router;

pub fn run() -> Result<(), std::io::Error> {
    let runtime = tokio::runtime::Runtime::new()?;

    let mut output: std::io::Result<()> = Ok(());
    runtime.block_on(async {
        output = main(ServerConfig {
            port: 4500,
            address: String::from("0.0.0.0"),
            sqlite_path: String::from("db.sqlite"),
        })
        .await;
    });

    output
}

struct ServerConfig {
    port: u16,
    address: String,
    sqlite_path: String,
}

async fn main(config: ServerConfig) -> std::io::Result<()> {
    let acceptor = TcpListener::new(format!("{}:{}", config.address, config.port))
        .bind()
        .await;

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
    let router = router::router(store);

    eprintln!("Server running on port: {}", config.port);
    Server::new(acceptor).serve(router).await;
    Ok(())
}
