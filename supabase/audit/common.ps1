# Carrega as credenciais do .env.local para os scripts de auditoria.
# Uso: . (Join-Path $PSScriptRoot "common.ps1")

function Get-EnvValue([string]$name, [string]$fallback = $null) {
  # .env.local fica na raiz do repo (duis niveis acima de supabase/audit)
  $envFile = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) ".env.local"
  if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
      if ($line -match "^\s*$name\s*=\s*`"(.*)`"\s*$") {
        return $matches[1]
      }
    }
  }
  $fromEnv = [Environment]::GetEnvironmentVariable($name)
  if ($fromEnv) { return $fromEnv }
  return $fallback
}

$ANON = Get-EnvValue "NEXT_PUBLIC_SUPABASE_ANON_KEY"
$APP_URL = Get-EnvValue "NEXT_PUBLIC_APP_URL" "http://localhost:3000"
$SERVICE_ROLE = Get-EnvValue "SUPABASE_SERVICE_ROLE_KEY"

# Deriva a URL do projeto a partir da variavel de ambiente publica.
$NEXT_PUBLIC_SUPABASE_URL = Get-EnvValue "NEXT_PUBLIC_SUPABASE_URL"

if (-not $ANON) {
  Write-Error "NEXT_PUBLIC_SUPABASE_ANON_KEY nao encontrado no .env.local"
  exit 1
}
if (-not $NEXT_PUBLIC_SUPABASE_URL) {
  Write-Error "NEXT_PUBLIC_SUPABASE_URL nao encontrado no .env.local"
  exit 1
}
if (-not $SERVICE_ROLE) {
  Write-Warning "SUPABASE_SERVICE_ROLE_KEY nao encontrada no .env.local (necessaria para Deletes de auth)."
}
