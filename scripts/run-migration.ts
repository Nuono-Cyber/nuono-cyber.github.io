import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
  console.log("🚀 Executando migração: add_invite_code...");

  try {
    // Execute the migration SQL
    const migrationSQL = `
      -- Add code column to invites table for hexadecimal codes
      ALTER TABLE public.invites 
      ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

      -- Function to generate a 10-character hexadecimal code
      CREATE OR REPLACE FUNCTION public.generate_hex_code()
      RETURNS TEXT
      LANGUAGE plpgsql
      AS $$
      DECLARE
        new_code TEXT;
        code_exists BOOLEAN;
      BEGIN
        LOOP
          -- Generate a random 10-character hexadecimal code
          new_code := encode(gen_random_bytes(5), 'hex');
          
          -- Check if code already exists
          SELECT EXISTS (
            SELECT 1 FROM public.invites WHERE code = new_code
          ) INTO code_exists;
          
          -- If code doesn't exist, exit loop
          IF NOT code_exists THEN
            EXIT;
          END IF;
        END LOOP;
        
        RETURN new_code;
      END;
      $$;
    `;

    const { error } = await supabase.rpc("execute_sql", {
      sql: migrationSQL,
    });

    if (error) {
      console.error("❌ Erro ao executar migração:", error);
      process.exit(1);
    }

    console.log("✅ Migração executada com sucesso!");
  } catch (err) {
    console.error("❌ Erro:", err);
    process.exit(1);
  }
}

runMigration();
