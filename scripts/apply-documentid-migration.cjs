const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL no está definida');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Aplicando migración para agregar columna documentId...');
    
    // Step 1: Add documentId column as nullable first
    await client.query('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "documentId" TEXT;');
    console.log('✅ Paso 1: Columna documentId agregada');
    
    // Step 2: Populate documentId for existing users
    await client.query(`
      UPDATE "User" 
      SET "documentId" = COALESCE(
        CASE WHEN "nationalId" IS NOT NULL AND "nationalId" != '' 
          THEN CONCAT(COALESCE("nationalIdType", ''), '-', "nationalId") 
          ELSE NULL 
        END,
        "email",
        "id"
      )
      WHERE "documentId" IS NULL;
    `);
    console.log('✅ Paso 2: Valores de documentId poblados');
    
    // Step 3: For any remaining NULL values, generate unique IDs
    await client.query(`
      UPDATE "User"
      SET "documentId" = CONCAT('USER-', "id")
      WHERE "documentId" IS NULL;
    `);
    console.log('✅ Paso 3: IDs únicos generados para valores NULL');
    
    // Step 4: Make documentId NOT NULL
    await client.query('ALTER TABLE "User" ALTER COLUMN "documentId" SET NOT NULL;');
    console.log('✅ Paso 4: Columna documentId marcada como NOT NULL');
    
    // Step 5: Create unique constraint
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "User_documentId_key" ON "User"("documentId");');
    console.log('✅ Paso 5: Índice único creado');
    
    // Step 6: Add index for documentId
    await client.query('CREATE INDEX IF NOT EXISTS "User_documentId_idx" ON "User"("documentId");');
    console.log('✅ Paso 6: Índice adicional creado');
    
    // Step 7: Remove birthDate column
    await client.query('ALTER TABLE "User" DROP COLUMN IF EXISTS "birthDate";');
    console.log('✅ Paso 7: Columna birthDate eliminada');
    
    // Verify
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'documentId'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verificación: Columna documentId existe:', result.rows[0]);
    } else {
      console.error('❌ Error: La columna documentId no se creó correctamente');
      process.exit(1);
    }
    
    console.log('\n✅ ¡Migración aplicada exitosamente!');
  } catch (error) {
    console.error('❌ Error aplicando migración:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();
