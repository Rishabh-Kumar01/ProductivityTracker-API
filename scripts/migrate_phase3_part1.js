const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('Starting Phase 3 - Part 1 Migration...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Add role and linked_user_id to sessions
        console.log('Modifying sessions table...');
        
        // Add role if it doesn't exist
        await client.query(`
            ALTER TABLE sessions 
            ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'owner'
            CHECK (role IN ('owner', 'partner'));
        `);

        // Add linked_user_id if it doesn't exist
        await client.query(`
            ALTER TABLE sessions 
            ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES users(id);
        `);

        // Add index
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_sessions_linked_user 
            ON sessions (linked_user_id)
            WHERE role = 'partner' AND is_revoked = FALSE;
        `);

        // 2. Add role to login_history
        console.log('Modifying login_history table...');
        await client.query(`
            ALTER TABLE login_history 
            ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'owner';
        `);

        await client.query('COMMIT');
        console.log('Migration completed successfully!');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
