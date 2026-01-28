#[derive(Debug)]
pub enum Error {
    ServerError,
    InvalidRequest,
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ServerError => write!(f, "Internal Error"),
            Self::InvalidRequest => write!(f, "Invalid request"),
        }
    }
}

impl std::error::Error for Error {}
