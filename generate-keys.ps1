# Generate RSA key pair for Tauri updater
param(
    [string]$KeyName = "updater"
)

Write-Host "Generating RSA key pair for Tauri updater..." -ForegroundColor Green

try {
    # Generate RSA key pair
    $rsa = [System.Security.Cryptography.RSA]::Create(2048)
    
    # Export private key in PKCS#8 format
    $privateKeyBytes = $rsa.ExportPkcs8PrivateKey()
    $privateKeyBase64 = [System.Convert]::ToBase64String($privateKeyBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
    $privateKeyPem = "-----BEGIN PRIVATE KEY-----`n$privateKeyBase64`n-----END PRIVATE KEY-----"
    
    # Export public key in SubjectPublicKeyInfo format
    $publicKeyBytes = $rsa.ExportSubjectPublicKeyInfo()
    $publicKeyBase64 = [System.Convert]::ToBase64String($publicKeyBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
    $publicKeyPem = "-----BEGIN PUBLIC KEY-----`n$publicKeyBase64`n-----END PUBLIC KEY-----"
    
    # Save keys to files
    $privateKeyPath = "${KeyName}_private.pem"
    $publicKeyPath = "${KeyName}_public.pem"
    
    [System.IO.File]::WriteAllText($privateKeyPath, $privateKeyPem)
    [System.IO.File]::WriteAllText($publicKeyPath, $publicKeyPem)
    
    Write-Host "✓ Keys generated successfully!" -ForegroundColor Green
    Write-Host "Private key: $privateKeyPath" -ForegroundColor Yellow
    Write-Host "Public key: $publicKeyPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "IMPORTANT:" -ForegroundColor Red
    Write-Host "- Keep the private key secure and never commit it to your repository" -ForegroundColor Red
    Write-Host "- Copy the public key content to your tauri.conf.json" -ForegroundColor Cyan
    Write-Host ""
    
    # Display public key for easy copying
    Write-Host "Public key content for tauri.conf.json:" -ForegroundColor Cyan
    Write-Host $publicKeyPem -ForegroundColor White
    
} catch {
    Write-Host "Error generating keys: $_" -ForegroundColor Red
    Write-Host "Make sure you have .NET Framework 4.7+ or .NET Core installed" -ForegroundColor Yellow
}