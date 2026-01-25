# Executar Migrações do Supabase

Como você está usando um projeto **Supabase remoto** (não local), siga um destes métodos:

## Método 1: Via Supabase Dashboard (Recomendado)

1. Acesse [https://app.supabase.com](https://app.supabase.com)
2. Selecione seu projeto `hafwvsiwsuhiazboivyb`
3. Vá para **SQL Editor**
4. Clique em "New Query"
5. Cole o seguinte SQL:

```sql
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
```

6. Clique em "Run" (botão verde no canto superior direito)

✅ **Pronto!** A migração foi aplicada.

## Método 2: Via CLI (caso tenha Supabase CLI instalado)

```bash
cd /workspaces/insight-creator-ai
supabase db push
```

## Verificar se funcionou

Na página de Admin de Convites (`/admin/invites`), você poderá:
- Gerar novos códigos hexadecimais de 10 caracteres
- Listar todos os códigos
- Ver status (ativo, usado, expirado)
- Copiar códigos
- Deletar códigos

Na página de Cadastro (`/auth`), usuários podem:
- Inserir email corporativo
- Inserir código de convite
- Inserir email pessoal
- Criar senha

O sistema validará o código automaticamente!
