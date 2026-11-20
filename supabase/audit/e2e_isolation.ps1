# AUDITORIA E2E - isolamento de dados entre papeis
# Uso: powershell -ExecutionPolicy Bypass -File supabase\audit\e2e_isolation.ps1

$ErrorActionPreference = "Continue"
. (Join-Path $PSScriptRoot "common.ps1")

$URL = $NEXT_PUBLIC_SUPABASE_URL
if (-not $URL) { $URL = "https://rtqxabffevlabbrlimjt.supabase.co" }

function Try-Get($label, $path, $jwt) {
  try {
    $r = Invoke-RestMethod -Uri "$URL/rest/v1/$path" -Headers @{ apikey = $ANON; Authorization = "Bearer $jwt" }
    $n = if ($null -eq $r) { 0 } elseif ($r -is [array]) { $r.Count } else { 1 }
    Write-Host "$label : $n linha(s)"
    if ($n -gt 0 -and $n -le 3) { Write-Host "    -> $($r | ConvertTo-Json -Compress -Depth 3)" }
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    $s = $_.Exception.Response.GetResponseStream()
    $sr = New-Object System.IO.StreamReader($s)
    Write-Host "$label : ERRO $code - $($sr.ReadToEnd())"
  }
}

$ADMIN_EMAIL = "mrp@adm.com"
$ADMIN_PASS  = "adm@123"

$login = Invoke-RestMethod -Uri "$URL/auth/v1/token?grant_type=password" -Method POST -Headers @{ apikey = $ANON; "Content-Type" = "application/json" } -Body "{`"email`":`"$ADMIN_EMAIL`",`"password`":`"$ADMIN_PASS`"}"
$jwtAdmin = $login.access_token

$members = Invoke-RestMethod -Uri "$URL/rest/v1/organization_members?select=organization_id,role&user_id=eq.db99e183-3351-4ac7-ae15-3013a09f91b2" -Headers @{ apikey = $ANON; Authorization = "Bearer $jwtAdmin" }
$orgId = $members[0].organization_id

# cria um vendedor temporario para os testes de isolamento
$email = "isolamento@rifagestor.com"
$cr = Invoke-RestMethod -Uri "$URL/functions/v1/create-user" -Method POST -Headers @{ apikey = $ANON; Authorization = "Bearer $jwtAdmin"; "Content-Type" = "application/json" } -Body (@{ email=$email; password="Isolamento@123"; full_name="Vendedor Isolamento"; role="vendedor"; organization_id=$orgId } | ConvertTo-Json)
$jwtVendedor = (Invoke-RestMethod -Uri "$URL/auth/v1/token?grant_type=password" -Method POST -Headers @{ apikey = $ANON; "Content-Type" = "application/json" } -Body "{`"email`":`"$email`",`"password`":`"Isolamento@123`"}").access_token

Write-Host "=== COMO VENDEDOR (esperado: 0 vendas de terceiros, 0 perfis alheios) ==="
Try-Get "[E1] vendas visiveis ao vendedor" "sales?select=id,seller_id,total_cents" $jwtVendedor
Try-Get "[E2] profile do ADMIN lido pelo vendedor" "profiles?select=id,email,role&id=eq.db99e183-3351-4ac7-ae15-3013a09f91b2" $jwtVendedor
Try-Get "[E3] todos os profiles visiveis ao vendedor" "profiles?select=id,email,role" $jwtVendedor
Try-Get "[E4] organization_members visiveis ao vendedor" "organization_members?select=user_id,role" $jwtVendedor
Try-Get "[E5] buyers visiveis ao vendedor" "buyers?select=id,name,cpf" $jwtVendedor

Write-Host ""
Write-Host "=== COMO ADMIN (esperado: tudo visivel) ==="
Try-Get "[A1] vendas visiveis ao admin" "sales?select=id,seller_id,total_cents" $jwtAdmin
Try-Get "[A2] profiles visiveis ao admin" "profiles?select=id,email,role" $jwtAdmin
Try-Get "[A3] members visiveis ao admin" "organization_members?select=user_id,role" $jwtAdmin

Write-Host ""
Write-Host "=== SEM TOKEN (esperado: 401) ==="
Try-Get "[N1] sales sem auth" "sales?select=id" "invalid-token"
Try-Get "[N2] profiles sem auth" "profiles?select=id" "invalid-token"

# cleanup
Invoke-RestMethod -Uri "$URL/functions/v1/create-user" -Method POST -Headers @{ apikey = $ANON; Authorization = "Bearer $jwtAdmin"; "Content-Type" = "application/json" } -Body (@{ action="delete"; user_id=$cr.user.id } | ConvertTo-Json) | Out-Null
Write-Host ""
Write-Host "[cleanup] vendedor temporario removido"
