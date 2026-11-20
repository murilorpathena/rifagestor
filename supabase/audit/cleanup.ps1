# AUDITORIA E2E - limpeza de reservas e usuarios de teste
# Uso: powershell -ExecutionPolicy Bypass -File supabase\audit\cleanup.ps1

$ErrorActionPreference = "Continue"
. (Join-Path $PSScriptRoot "common.ps1")

$URL = $NEXT_PUBLIC_SUPABASE_URL
if (-not $URL) { $URL = "https://rtqxabffevlabbrlimjt.supabase.co" }

$login = Invoke-RestMethod -Uri "$URL/auth/v1/token?grant_type=password" -Method POST -Headers @{ apikey = $ANON; "Content-Type" = "application/json" } -Body '{"email":"mrp@adm.com","password":"adm@123"}'
$jwt = $login.access_token
$H = @{ apikey = $ANON; Authorization = "Bearer $jwt"; "Content-Type" = "application/json" }

# 1) devolve os numeros reservados para available
$reserved = Invoke-RestMethod -Uri "$URL/rest/v1/raffle_numbers?select=id&status=eq.reserved" -Headers $H
Write-Host "[1] numeros reservados antes: $($reserved.Count)"
foreach ($n in $reserved) {
  Invoke-RestMethod -Uri "$URL/rest/v1/rpc/set_number_status" -Method POST -Headers $H -Body (@{ p_number_id = $n.id; p_status = "available" } | ConvertTo-Json) | Out-Null
}
$still = Invoke-RestMethod -Uri "$URL/rest/v1/raffle_numbers?select=id&status=eq.reserved" -Headers $H
Write-Host "[1] numeros reservados depois: $($still.Count)"

# 2) remove compradores de teste (regressao/isolamento)
foreach ($nome in @("Comprador Regressao", "Comprador Teste E2E")) {
  try {
    Invoke-RestMethod -Uri "$URL/rest/v1/buyers?name=eq.$([uri]::EscapeDataString($nome))" -Method DELETE -Headers $H | Out-Null
    Write-Host "[2] comprador removido: $nome"
  } catch {
    Write-Host "[2] buyer '$nome' nao encontrado"
  }
}

# 3) estado final
$profiles = Invoke-RestMethod -Uri "$URL/rest/v1/profiles?select=email,role&order=email" -Headers $H
Write-Host "[3] profiles: $(($profiles | ForEach-Object { "$($_.email)($($_.role))" }) -join ', ')"
$buyers = Invoke-RestMethod -Uri "$URL/rest/v1/buyers?select=name" -Headers $H
Write-Host "[4] buyers: $(($buyers | ForEach-Object { $_.name }) -join ', ')"
