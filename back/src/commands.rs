use crate::server;

mod load_db;

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
            println!("Server output: {:?}", server::run());
            Ok(())
        }
        _ => Err(String::from("unknow command")),
    }
}
