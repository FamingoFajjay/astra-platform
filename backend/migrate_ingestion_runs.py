from database import get_connection

def migrate():
    conn = get_connection()

    try:
        columns = [
            row["name"]
            for row in conn.execute(
                "PRAGMA table_info(ingestion_runs)"
            )
        ]

        if "id" in columns:
            print("[ASTRA] Migration already applied")
            return

        if not columns:
            raise RuntimeError(
                "ingestion_runs table does not exist"
            )

        print("[ASTRA] Migrating ingestion_runs")

        conn.execute("BEGIN")

        conn.execute("""
            CREATE TABLE ingestion_runs_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pipeline TEXT NOT NULL,
                status TEXT NOT NULL
                    CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED')),
                started_at TEXT NOT NULL,
                finished_at TEXT,
                records_fetched INTEGER NOT NULL DEFAULT 0,
                rows_affected INTEGER NOT NULL DEFAULT 0,
                error_message TEXT,
                CHECK (
                    (status = 'RUNNING' AND finished_at IS NULL)
                    OR
                    (status != 'RUNNING' AND finished_at IS NOT NULL)
                )
            )
        """)

        conn.execute("""
            INSERT INTO ingestion_runs_new (
                pipeline,
                status,
                started_at,
                finished_at,
                records_fetched,
                rows_affected,
                error_message
            )
            SELECT
                pipeline,
                status,
                started_at,
                finished_at,
                records_fetched,
                rows_affected,
                error_message
            FROM ingestion_runs
        """)

        conn.execute("DROP TABLE ingestion_runs")

        conn.execute("""
            ALTER TABLE ingestion_runs_new
            RENAME TO ingestion_runs
        """)

        conn.commit()

        print("[ASTRA] Migration completed")

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


if __name__ == "__main__":
    migrate()
