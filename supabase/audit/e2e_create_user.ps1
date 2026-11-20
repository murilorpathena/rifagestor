# AUDITORIA E2E - criacao de usuario via Edge Function (admin -> novo vendedor)
# Uso: powershell -ExecutionPolicy Bypass -File supabase\audit\e2e_create_user.ps1

$ErrorActionPreference = "Continue"
. (Join-Path $PSScriptRoot "common.ps1")

$URL = $NEXT_PUBLIC_SUPABASE_URL
if (-not $URL) { $URL = "https://rtqxabffevlabbrlimjt.supabase.co" }

# 1. Login admin
$login = Invoke-RestMethod -Uri "$URL/auth/v1/token?grant_type=password" -Method POST -Headers @{ apikey = $ANON; "Content-Type" = "application/json" } -Body '{"email":"mrp@adm.com","password":"adm@123"}'
$jwt = $login.access_token
Write-Host "[1] Login admin: OK"

# 2. Organization do admin
$members = Invoke-RestMethod -Uri "$URL/rest/v1/organization_members?select=organization_id,role&user_id=eq.db99e183-3351-4ac7-ae15-3013a09f91b2" -Headers @{ apikey = $ANON; Authorization = "Bearer $jwt" }
Write-Host "[2] organization_members do admin: $($members | ConvertTo-Json -Compress)"
$orgId = $members[0].organization_id
if (-not $orgId) { Write-Host "[ERRO] Admin sem organization_id"; exit 1 }

# 3. Invoca edge function create-user
$email = "teste.e2e@rifagestor.com"
$body = @{
  email = $email
  password = "Teste@12345"
  full_name = "Usuario Teste E2E"
  role = "vendedor"
  organization_id = $orgId
} | ConvertTo-Json

try {
  $resp = Invoke-RestMethod -Uri "$URL/functions/v1/create-user" -Method POST -Headers @{ apikey = $ANON; Authorization = "Bearer $jwt"; "Content-Type" = "application/json" } -Body $body
  Write-Host "[3] create-user resposta: $($resp | ConvertTo-Json -Compress)"

  # 4. confere profile + org_member + login
  $newId = $resp.user.id
  $profiles = Invoke-RestMethod -Uri "$URL/rest/v1/profiles?select=id,name,email,role&id=eq.$newId" -Headers @{ apikey = $ANON; Authorization = "Bearer $jwt" }
  Write-Host "[4] profile criado: $($profiles | ConvertTo-Json -Compress)"

  $mem = Invoke-RestMethod -Uri "$URL/rest/v1/organization_members?select=organization_id,user_id,role&user_id=eq.$newId" -Headers @{ apikey = $ANON; Authorization = "Bearer $jwt" }
  Write-Host "[5] vinculo com a org: $($mem | ConvertTo-Json -Compress)"

  try {
    $l2 = Invoke-RestMethod -Uri "$URL/auth/v1/token?grant_type=password" -Method POST -Headers @{ apikey = $ANON; "Content-Type" = "application/json" } -Body "{`"email`":`"$email`",`"password`":`"Teste@12345`"}"
    Write-Host "[6] login do novo usuario: OK"
  } catch {
    Write-Host "[6] login do novo usuario: FALHOU"
  }

  # 7. cleanup
  $rm = Invoke-RestMethod -Uri "$URL/functions/v1/create-user" -Method POST -Headers @{ apikey = $ANON; Authorization = "Bearer $jwt"; "Content-Type" = "application/json" } -Body (@{ action="delete"; user_id=$newId } | ConvertTo-Json)
  Write-Host "[7] cleanup (delete): $($rm | ConvertTo-Json -Compress)"
} catch {
  $s = $_.Exception.Response.GetResponseStream()
  $sr = New-Object System.IO.StreamReader($s)
  Write-Host "[3] create-user ERRO: $($sr.ReadToEnd())"
}
