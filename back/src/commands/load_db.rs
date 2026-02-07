use rusqlite::Connection;

use crate::glucose_values::store::GlucoseValue;

pub fn generate_sqlite_file(path: &str, values: &[GlucoseValue]) -> Result<(), rusqlite::Error> {
    let mut connection = rusqlite::Connection::open(path)?;
    connection.execute_batch("CREATE TABLE glucose_values (id INTEGER PRIMARY KEY, timestamp INTEGER NOT NULL, value INTEGER NOT NULL)")?;

    let tx = connection.transaction()?;
    {
        let mut stmt = tx.prepare("INSERT INTO glucose_values (timestamp, value) VALUES (?, ?)")?;
        for row in values {
            stmt.execute((row.timestamp, row.value))?;
        }
    }
    tx.commit()?;

    Ok(())
}

pub fn load_db(source_path: &str, dest_path: Option<&str>) -> Result<(), rusqlite::Error> {
    let destination = dest_path.unwrap_or("db.sqlite");
    println!("{destination}");
    remove_old(destination).unwrap();

    let from = Connection::open(source_path)?;

    let mut stmt = from.prepare("SELECT timestamp, CAST(value AS INTEGER) FROM glucoseValues")?;
    let rows = stmt.query_map((), |row| {
        Ok(GlucoseValue {
            timestamp: row.get(0)?,
            value: row.get(1)?,
        })
    })?;

    let mut glucose_values = vec![];
    for row in rows {
        glucose_values.push(row.expect("row is error"));
    }

    generate_sqlite_file(destination, &glucose_values)?;

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
