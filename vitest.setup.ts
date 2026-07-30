// Load .env, then force an isolated SQLite database for the test run so
// integration tests never touch the dev database.
import 'dotenv/config'

process.env.DATABASE_URI = 'file:./tests/.test.db'
process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || 'test-secret-abtr'
