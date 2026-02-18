import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const { Client } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is missing in .env or .env.local");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: true, // Neon requires SSL
  });

  try {
    console.log("Connecting to Neon...");
    await client.connect();
    
    console.log("Reading migration file...");
    const sqlPath = path.join(__dirname, 'migration-faq-approval.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("Applying migration...");
    await client.query(sql);
    
    console.log("✅ Migration applied successfully!");
    console.log("   - Created table 'FaqItem'");
    console.log("   - Created table 'ApprovalEmailTemplate'");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
