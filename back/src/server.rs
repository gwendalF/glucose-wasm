use salvo::conn::TcpListener;
use salvo::{Listener, Server};

mod router;

pub fn run() -> Result<(), std::io::Error> {
    let runtime = tokio::runtime::Runtime::new()?;

    let mut output: std::io::Result<()> = Ok(());
    runtime.block_on(async {
        output = main().await;
    });

    Ok(())
}

async fn main() -> std::io::Result<()> {
    let acceptor = TcpListener::new("0.0.0.0:4500").bind().await;
    let router = router::router();

    Server::new(acceptor).serve(router).await;
    Ok(())
}
