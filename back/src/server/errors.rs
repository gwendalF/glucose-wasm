use salvo::{Depot, Request, Response, Writer, async_trait};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("Database error {0}")]
    DatabaseError(#[from] rusqlite::Error),
    #[error("Internal error")]
    ServerError,
    #[error("Invalid request")]
    InvalidRequest,
}

#[async_trait]
impl Writer for Error {
    async fn write(mut self, req: &mut Request, depot: &mut Depot, res: &mut Response) {
        todo!()
    }
}
