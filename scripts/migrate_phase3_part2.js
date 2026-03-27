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
    console.log('Starting Phase 3 - Part 2 Migration...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('Creating unblock_requests table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS unblock_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                domain_id UUID REFERENCES blocked_domains(id) ON DELETE CASCADE,
                request_reason TEXT,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
                duration_minutes INTEGER,
                responded_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_unblock_requests_user_id 
            ON unblock_requests (user_id);
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
