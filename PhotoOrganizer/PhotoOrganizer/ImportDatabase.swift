import Foundation
import SQLite3

class ImportDatabase {
    private var db: OpaquePointer?
    private let dbPath: String

    init() {
        // Store database in Application Support directory
        let fileManager = FileManager.default
        let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let appDir = appSupport.appendingPathComponent("PhotoOrganizer")

        try? fileManager.createDirectory(at: appDir, withIntermediateDirectories: true)

        dbPath = appDir.appendingPathComponent("imports.db").path

        openDatabase()
        createTable()
    }

    deinit {
        closeDatabase()
    }

    private func openDatabase() {
        if sqlite3_open(dbPath, &db) != SQLITE_OK {
            print("Error opening database")
        }
    }

    private func closeDatabase() {
        if db != nil {
            sqlite3_close(db)
            db = nil
        }
    }

    private func createTable() {
        let createTableQuery = """
        CREATE TABLE IF NOT EXISTS imports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sha256 TEXT NOT NULL UNIQUE,
            original_filename TEXT NOT NULL,
            destination_path TEXT NOT NULL,
            imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            device_id TEXT,
            file_size INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_sha256 ON imports(sha256);
        """

        var statement: OpaquePointer?

        if sqlite3_prepare_v2(db, createTableQuery, -1, &statement, nil) == SQLITE_OK {
            if sqlite3_step(statement) == SQLITE_DONE {
                print("Import table created successfully")
            } else {
                print("Table creation failed")
            }
        }

        sqlite3_finalize(statement)
    }

    func isDuplicate(hash: String) -> Bool {
        let query = "SELECT COUNT(*) FROM imports WHERE sha256 = ?;"
        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, query, -1, &statement, nil) == SQLITE_OK else {
            return false
        }

        sqlite3_bind_text(statement, 1, (hash as NSString).utf8String, -1, nil)

        var count = 0
        if sqlite3_step(statement) == SQLITE_ROW {
            count = Int(sqlite3_column_int(statement, 0))
        }

        sqlite3_finalize(statement)

        return count > 0
    }

    func recordImport(hash: String, fileName: String, destinationPath: String, deviceId: String? = nil, fileSize: Int64? = nil) {
        let insertQuery = """
        INSERT INTO imports (sha256, original_filename, destination_path, device_id, file_size)
        VALUES (?, ?, ?, ?, ?);
        """

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, insertQuery, -1, &statement, nil) == SQLITE_OK else {
            print("Error preparing insert statement")
            return
        }

        sqlite3_bind_text(statement, 1, (hash as NSString).utf8String, -1, nil)
        sqlite3_bind_text(statement, 2, (fileName as NSString).utf8String, -1, nil)
        sqlite3_bind_text(statement, 3, (destinationPath as NSString).utf8String, -1, nil)

        if let deviceId = deviceId {
            sqlite3_bind_text(statement, 4, (deviceId as NSString).utf8String, -1, nil)
        } else {
            sqlite3_bind_null(statement, 4)
        }

        if let fileSize = fileSize {
            sqlite3_bind_int64(statement, 5, fileSize)
        } else {
            sqlite3_bind_null(statement, 5)
        }

        if sqlite3_step(statement) == SQLITE_DONE {
            print("Import recorded successfully")
        } else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            print("Error recording import: \(errorMessage)")
        }

        sqlite3_finalize(statement)
    }

    func getImportHistory(limit: Int = 100) -> [ImportRecord] {
        let query = """
        SELECT id, sha256, original_filename, destination_path, imported_at, device_id, file_size
        FROM imports
        ORDER BY imported_at DESC
        LIMIT ?;
        """

        var statement: OpaquePointer?
        var records: [ImportRecord] = []

        guard sqlite3_prepare_v2(db, query, -1, &statement, nil) == SQLITE_OK else {
            return records
        }

        sqlite3_bind_int(statement, 1, Int32(limit))

        while sqlite3_step(statement) == SQLITE_ROW {
            let id = Int(sqlite3_column_int(statement, 0))
            let sha256 = String(cString: sqlite3_column_text(statement, 1))
            let filename = String(cString: sqlite3_column_text(statement, 2))
            let destPath = String(cString: sqlite3_column_text(statement, 3))

            let dateString = String(cString: sqlite3_column_text(statement, 4))
            let formatter = ISO8601DateFormatter()
            let importedAt = formatter.date(from: dateString) ?? Date()

            let deviceId = sqlite3_column_text(statement, 5) != nil ?
                String(cString: sqlite3_column_text(statement, 5)) : nil

            let fileSize = sqlite3_column_type(statement, 6) != SQLITE_NULL ?
                sqlite3_column_int64(statement, 6) : nil

            records.append(ImportRecord(
                id: id,
                sha256: sha256,
                originalFilename: filename,
                destinationPath: destPath,
                importedAt: importedAt,
                deviceId: deviceId,
                fileSize: fileSize
            ))
        }

        sqlite3_finalize(statement)

        return records
    }

    func getTotalImports() -> Int {
        let query = "SELECT COUNT(*) FROM imports;"
        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, query, -1, &statement, nil) == SQLITE_OK else {
            return 0
        }

        var count = 0
        if sqlite3_step(statement) == SQLITE_ROW {
            count = Int(sqlite3_column_int(statement, 0))
        }

        sqlite3_finalize(statement)

        return count
    }
}

struct ImportRecord {
    let id: Int
    let sha256: String
    let originalFilename: String
    let destinationPath: String
    let importedAt: Date
    let deviceId: String?
    let fileSize: Int64?
}
