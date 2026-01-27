use rusqlite::Connection;

struct GlucoseValue {
    timestamp: i64,
    value: u16,
}

pub fn load_db(source_path: &str, dest_path: Option<&str>) -> Result<(), rusqlite::Error> {
    let destination = dest_path.unwrap_or("db.sqlite");
    println!("{destination}");
    remove_old(destination).unwrap();

    let from = Connection::open(source_path)?;
    let mut to = Connection::open(destination)?;

    to.execute_batch("CREATE TABLE glucose_values (id INTEGER PRIMARY KEY, timestamp INTEGER NOT NULL, value INTEGER NOT NULL)")?;

    let mut stmt = from.prepare("SELECT timestamp, CAST(value AS INTEGER) FROM glucoseValues")?;
    let rows = stmt.query_map((), |row| {
        Ok(GlucoseValue {
            timestamp: row.get(0)?,
            value: row.get(1)?,
        })
    })?;

    let tx = to.transaction()?;
    {
        let mut stmt = tx.prepare("INSERT INTO glucose_values (timestamp, value) VALUES (?, ?)")?;
        for row in rows {
            let row = row?;
            stmt.execute((row.timestamp, row.value))?;
        }
    }

    tx.commit()?;

    Ok(())
}

fn remove_old(path: &str) -> Result<(), std::io::Error> {
    if let Err(e) = std::fs::remove_file(path)
        && e.kind() != std::io::ErrorKind::NotFound
    {
        return Err(e);
    }

    Ok(())
}
