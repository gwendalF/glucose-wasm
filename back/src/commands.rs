use crate::{glucose_values::store::Measurements, server};

mod config;
mod load_db;
mod postcard;

pub use config::Config;
use postcard_bindgen::{
    PackageInfo, generate_bindings,
    javascript::{GenerationSettings, build_package},
};

pub fn run(args: Vec<String>) -> Result<(), String> {
    if args.len() <= 1 {
        return Err(String::from("No command provided"));
    }

    match args[1].as_ref() {
        "load_db" => {
            if args.len() <= 2 {
                return Err(String::from("missing db file"));
            }

            let new_file = if args.len() > 3 {
                Some(args[3].as_str())
            } else {
                None
            };

            load_db::load_db(&args[2], new_file).map_err(|e| e.to_string())
        }
        "run" => {
            let config = Config::load().map_err(|e| e.to_string())?;
            println!("Server output: {:?}", server::run(&config));
            Ok(())
        }
        "postcard" => {
            if args.len() <= 2 {
                return Err(String::from("missing db file"));
            }

            postcard::save_db_to_postcard(&args[2]).map_err(|e| e.to_string())?;
            Ok(())
        }
        "bindings" => {
            let settings = GenerationSettings::enable_all()
                .serialization(false)
                .deserialization(true)
                .esm_module(true)
                .module_structure(false)
                .runtime_type_checks(false)
                .type_script_types(true);

            let package_path = std::env::current_dir()
                .unwrap()
                .parent()
                .unwrap()
                .join("front/libs");

            build_package(
                &package_path,
                PackageInfo {
                    name: "postcard-bindings".into(),
                    version: "0.1.0".try_into().unwrap(),
                },
                settings,
                generate_bindings!(Measurements),
            )
            .unwrap();
            Ok(())
        }
        _ => Err(String::from("unknow command")),
    }
}
