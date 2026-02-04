use std::any::Any;

use salvo::{Depot, Request, Response, Writer, async_trait};
use thiserror::Error;

use crate::glucose_values;

#[derive(Debug, Error)]
pub enum Error {
    #[error("Database error {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Internal error")]
    Internal,
    #[error("Invalid request")]
    InvalidRequest,
    #[error("Store error")]
    Store(#[from] glucose_values::store::Error),
}

impl From<Option<&Box<dyn Any + Send + Sync>>> for Error {
    fn from(_value: Option<&Box<dyn Any + Send + Sync>>) -> Self {
        Self::Internal
    }
}

#[async_trait]
impl Writer for Error {
    async fn write(mut self, _req: &mut Request, _depot: &mut Depot, res: &mut Response) {
        match self {
            Error::Database(_) | Error::InvalidRequest => {
                res.status_code(salvo::http::StatusCode::BAD_REQUEST);
            }
            Error::Internal | Error::Store(_) => {
                res.status_code(salvo::http::StatusCode::INTERNAL_SERVER_ERROR);
            }
        }
    }
}
