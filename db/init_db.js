const { Pool } =  require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
}

const pool = new Pool({ connectionString });

async function runMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations');

    try {
        const files = fs
            .readdirSync(migrationsDir)
            .filter((f) => f.endsWith('.sql'))
            .sort(); // ensures 001_, 002_, 003_ run in order

        for (const file of files) {
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
            try {
                await pool.query(sql);
                console.log(`✓ ${file}`);
            } catch (err) {
                console.error(`✗ ${file}:`, err);
                throw err; // stop on first failure and let top-level handler set exit code
            }
        }

        console.log('All migrations complete');
    } finally {
        await pool.end();
    }
}

runMigrations().catch((err) => {
    console.error('Migration run failed:', err);
    process.exitCode = 1;
});
