# AUDITORIA E2E - verificacao de sync (profiles x auth.users x organization_members)
# Uso: powershell -ExecutionPolicy Bypass -File supabase\audit\e2e_verify_user.ps1

$ErrorActionPreference = "Continue"
. (Join-Path $PSScriptRoot "common.ps1")

$URL = $NEXT_PUBLIC_SUPABASE_URL
if (-not $URL) { $URL = "https://rtqxabffevlabbrlimjt.supabase.co" }

$login = Invoke-RestMethod -Uri "$URL/auth/v1/token?grant_type=password" -Method POST -Headers @{ apikey = $ANON; "Content-Type" = "application/json" } -Body '{"email":"mrp@adm.com","password":"adm@123"}'
$jwt = $login.access_token
$H = @{ apikey = $ANON; Authorization = "Bearer $jwt" }

$profiles = Invoke-RestMethod -Uri "$URL/rest/v1/profiles?select=id,name,email,role&order=email" -Headers $H
Write-Host "[A] PROFILES: $(($profiles | ForEach-Object { "$($_.email)($($_.role))" }) -join ', ')"

$members = Invoke-RestMethod -Uri "$URL/rest/v1/organization_members?select=user_id,role" -Headers $H
Write-Host "[B] ORG_MEMBERS: $($members.Count) vinculo(s)"

# usuarios no auth sem profile = bug de sincronismo
if ($SERVICE_ROLE) {
  $authUsers = Invoke-RestMethod -Uri "$URL/auth/v1/admin/users" -Headers @{ apikey = $SERVICE_ROLE; Authorization = "Bearer $SERVICE_ROLE" }
  $profileIds = @($profiles | ForEach-Object { $_.id })
  $orfaos = @($authUsers.users | Where-Object { $profileIds -notcontains $_.id })
  if ($orfaos.Count -eq 0) {
    Write-Host "[C] SYNC: OK - todo usuario do auth tem profile"
  } else {
    Write-Host "[C] SYNC: FALHA - $($orfaos.Count) usuario(s) sem profile:"
    $orfaos | ForEach-Object { Write-Host "    - $($_.email) ($($_.id))" }
  }
} else {
  Write-Host "[C] SYNC: pulado (defina SUPABASE_SERVICE_ROLE_KEY no .env.local)"
}
