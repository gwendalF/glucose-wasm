fn main() {
    let args = std::env::args();
    match glucose_wasm::commands::run(args.collect()) {
        Ok(()) => (),
        Err(e) => println!("{e}"),
    }
}
