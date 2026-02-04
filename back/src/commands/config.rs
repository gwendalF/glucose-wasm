use core::fmt;
use std::{num::ParseIntError, str::FromStr};

pub struct Config {
    pub domain: String,
    pub https_port: u16,
    pub http_port: u16,
    pub is_prod: bool,
}

#[derive(Debug)]
pub enum Error {
    Env(String),
    Convert(String),
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Env(e) => write!(f, "Env: {e}"),
            Self::Convert(e) => write!(f, "{e}"),
        }
    }
}

impl std::error::Error for Error {}

impl From<dotenvy::Error> for Error {
    fn from(value: dotenvy::Error) -> Self {
        Self::Env(value.to_string())
    }
}

impl From<std::env::VarError> for Error {
    fn from(value: std::env::VarError) -> Self {
        Self::Env(value.to_string())
    }
}

impl From<ParseIntError> for Error {
    fn from(_value: ParseIntError) -> Self {
        Self::Convert(String::from("cannot convert to integer"))
    }
}

impl Config {
    pub fn load() -> Result<Self, Error> {
        dotenvy::from_filename(".env")?;

        let domain = std::env::var("DOMAIN_URL")?;

        let https_port = std::env::var("HTTPS_PORT")?;
        let https_port = u16::from_str(&https_port)?;

        let http_port = std::env::var("HTTP_PORT")?;
        let http_port = u16::from_str(&http_port)?;
        Ok(Config {
            domain,
            https_port,
            http_port,
            is_prod: cfg!(not(debug_assertions)),
        })
    }
}
