import 'dotenv/config';
import pg from 'pg';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  // 1. Check users before
  const before = await pool.query('SELECT id, name, email FROM "User"');
  console.log('Users BEFORE:', before.rowCount, JSON.stringify(before.rows));

  // 2. Check sequence
  const seq = await pool.query('SELECT last_value, is_called FROM "User_id_seq"');
  console.log('Sequence:', JSON.stringify(seq.rows[0]));

  // 3. Check sessions
  const sessions = await pool.query('SELECT id, "userId" FROM "Session"');
  console.log('Sessions:', sessions.rowCount, JSON.stringify(sessions.rows));

  await pool.end();
}

main().catch(console.error);
