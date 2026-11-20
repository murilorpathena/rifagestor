# AUDITORIA E2E - fluxo completo de venda como vendedor
# Requer: .env.local com NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
#         e SUPABASE_SERVICE_ROLE_KEY (opcional, so para checar auth.users).
# Uso: powershell -ExecutionPolicy Bypass -File supabase\audit\regression_test.ps1

$ErrorActionPreference = "Continue"
. (Join-Path $PSScriptRoot "common.ps1")

$URL = $NEXT_PUBLIC_SUPABASE_URL
if (-not $URL) { $URL = "https://rtqxabffevlabbrlimjt.supabase.co" }

function Req($method, $path, $jwt, $body) {
  $h = @{ apikey = $ANON; Authorization = "Bearer $jwt"; "Content-Type" = "application/json" }
  try {
    $r = Invoke-RestMethod -Uri "$URL$path" -Method $method -Headers $h -Body ($body | ConvertTo-Json -Depth 6)
    return @{ ok = $true; data = $r }
  } catch {
    $s = $_.Exception.Response.GetResponseStream(); $sr = New-Object System.IO.StreamReader($s)
    return @{ ok = $false; err = $sr.ReadToEnd() }
  }
}

# 1) admin cria um vendedor de teste
$adm = Invoke-RestMethod -Uri "$URL/auth/v1/token?grant_type=password" -Method POST -Headers @{ apikey=$ANON; "Content-Type"="application/json" } -Body '{"email":"mrp@adm.com","password":"adm@123"}'
$jwtAdm = $adm.access_token
$orgId = (Invoke-RestMethod -Uri "$URL/rest/v1/organization_members?select=organization_id&user_id=eq.db99e183-3351-4ac7-ae15-3013a09f91b2" -Headers @{ apikey=$ANON; Authorization="Bearer $jwtAdm" })[0].organization_id

$email = "regressao@rifagestor.com"
$cr = Req "POST" "/functions/v1/create-user" $jwtAdm @{ email=$email; password="Regressao@123"; full_name="Vendedor Regressao"; role="vendedor"; organization_id=$orgId }
Write-Host "[1] criar vendedor: $($cr.ok) $($cr.data | ConvertTo-Json -Compress)"
if (-not $cr.ok) { exit 1 }
$vendId = $cr.data.user.id

# 2) login do vendedor
$vl = Invoke-RestMethod -Uri "$URL/auth/v1/token?grant_type=password" -Method POST -Headers @{ apikey=$ANON; "Content-Type"="application/json" } -Body "{`"email`":`"$email`",`"password`":`"Regressao@123`"}"
$jwtV = $vl.access_token
Write-Host "[2] login vendedor: OK"

# 3) vendedor le a rifa e numeros disponiveis
$raffle = (Invoke-RestMethod -Uri "$URL/rest/v1/raffles?select=id,title,ticket_price_cents&limit=1" -Headers @{ apikey=$ANON; Authorization="Bearer $jwtV" })[0]
Write-Host "[3] rifa visivel: $($raffle.title) preco=$($raffle.ticket_price_cents)"

$nums = Invoke-RestMethod -Uri "$URL/rest/v1/raffle_numbers?select=id,number,status&raffle_id=eq.$($raffle.id)&status=eq.available&limit=2" -Headers @{ apikey=$ANON; Authorization="Bearer $jwtV" }
Write-Host "[4] numeros disponiveis para o vendedor: $($nums.Count)"

# 4) vendedor cria venda via RPC create_sale
$numIds = @($nums | ForEach-Object { $_.id })
$sale = Req "POST" "/rest/v1/rpc/create_sale" $jwtV @{
  p_raffle_id = $raffle.id
  p_buyer_name = "Comprador Regressao"
  p_buyer_cpf = "11122233344"
  p_buyer_email = "comprador@teste.com"
  p_buyer_whatsapp = "11988887777"
  p_quantity = $numIds.Count
  p_number_ids = $numIds
  p_payment_method = "pix"
  p_payment_status = "paid"
  p_notes = "teste de regressao"
}
Write-Host "[5] create_sale: ok=$($sale.ok) sale_id=$($sale.data) err=$($sale.err)"

# 5) confere venda, numeros e buyer
if ($sale.ok) {
  $s = (Invoke-RestMethod -Uri "$URL/rest/v1/sales?select=id,quantity,total_cents,payment_status,seller_id&id=eq.$($sale.data)" -Headers @{ apikey=$ANON; Authorization="Bearer $jwtV" })[0]
  Write-Host "[6] venda gravada: qtd=$($s.quantity) total=$($s.total_cents) status=$($s.payment_status)"
  $sn = Invoke-RestMethod -Uri "$URL/rest/v1/sale_numbers?select=raffle_number_id,number_value&sale_id=eq.$($sale.data)" -Headers @{ apikey=$ANON; Authorization="Bearer $jwtV" }
  Write-Host "[7] sale_numbers: $($sn.Count) linha(s) -> $(($sn | ForEach-Object { $_.number_value }) -join ', ')"
  $nstat = Invoke-RestMethod -Uri "$URL/rest/v1/raffle_numbers?select=number,status&id=in.($($numIds -join ','))" -Headers @{ apikey=$ANON; Authorization="Bearer $jwtV" }
  Write-Host "[8] numeros apos a venda: $(($nstat | ForEach-Object { "$($_.number)=$($_.status)" }) -join ', ')"
}

# 6) vendedor alterna o status da propria venda
if ($sale.ok) {
  $up = Req "POST" "/rest/v1/rpc/set_sale_status" $jwtV @{ p_sale_id = $sale.data; p_status = "pending" }
  Write-Host "[9] set_sale_status(pending) pelo vendedor: ok=$($up.ok) err=$($up.err)"
}

# 7) cleanup: deleta a venda (o trigger deve liberar os numeros) e o vendedor
if ($sale.ok) {
  $del = Req "DELETE" "/rest/v1/sales?id=eq.$($sale.data)" $jwtAdm @{}
  Write-Host "[10] cleanup venda: ok=$($del.ok) err=$($del.err)"

  # confere se os numeros voltaram para available
  $after = Invoke-RestMethod -Uri "$URL/rest/v1/raffle_numbers?select=number,status&id=in.($($numIds -join ','))" -Headers @{ apikey=$ANON; Authorization="Bearer $jwtAdm" }
  Write-Host "[11] numeros apos excluir a venda: $(($after | ForEach-Object { "$($_.number)=$($_.status)" }) -join ', ') (esperado: available)"

  # limpa o comprador de teste
  $delBuyer = Invoke-RestMethod -Uri "$URL/rest/v1/buyers?name=eq.Comprador%20Regressao" -Method DELETE -Headers @{ apikey=$ANON; Authorization="Bearer $jwtAdm" } -ErrorAction SilentlyContinue
}
$rm = Req "POST" "/functions/v1/create-user" $jwtAdm @{ action="delete"; user_id=$vendId }
Write-Host "[12] cleanup vendedor: ok=$($rm.ok) $($rm.data | ConvertTo-Json -Compress) err=$($rm.err)"
