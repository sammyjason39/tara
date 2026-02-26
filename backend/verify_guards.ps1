
$server = Start-Process node -ArgumentList 'dist/main.js' -PassThru -NoNewWindow
Write-Host "Waiting for server to start..."
Start-Sleep -s 15

Write-Host "Test 1: Stage 4 Gating (Operational access should be forbidden)"
$res1 = curl.exe -s -i -X GET "http://127.0.0.1:3001/api/it/provisioning" -H "x-tenant-id: zen-demo-123" -H "x-dev-bypass: true"
Write-Host $res1

Write-Host "Test 2: Create Store (Should bypass Stage 4)"
$res2 = curl.exe -s -i -X POST "http://127.0.0.1:3001/api/retail/stores" -H "x-tenant-id: zen-demo-123" -H "x-dev-bypass: true" -H "Content-Type: application/json" -d '{"name": "Main Flagship Store", "code": "MFS-001", "type": "RETAIL", "locationId": "loc-default", "country": "ID", "currency": "IDR"}'
Write-Host $res2

Write-Host "Test 3: Verify Access (Operational access should be allowed now)"
$res3 = curl.exe -s -i -X GET "http://127.0.0.1:3001/api/it/provisioning" -H "x-tenant-id: zen-demo-123" -H "x-dev-bypass: true"
Write-Host $res3

Write-Host "Stopping server..."
Stop-Process -Id $server.Id
