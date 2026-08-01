param(
  [string]$Config = (Join-Path $PSScriptRoot "wrangler.staging.toml"),
  [switch]$InitializeInfrastructure
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Publish-SecretValue {
  param([string]$Name, [string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    Write-Host "Skipped $Name."
    return
  }
  $Value | npx wrangler secret put $Name --config $Config
  if ($LASTEXITCODE -ne 0) { throw "Wrangler could not store $Name." }
}

function Read-And-PublishSecret {
  param([string]$Name, [string]$Prompt)
  $secure = Read-Host "$Prompt (leave blank to skip)" -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    Publish-SecretValue -Name $Name -Value $value
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    Remove-Variable value -ErrorAction SilentlyContinue
  }
}

Write-Host "BPP HQ staging connector setup"
Write-Host "Values are sent directly to Cloudflare. They are not written to disk."

$existingSecretJson = (& npx wrangler secret list --config $Config | Out-String)
if ($LASTEXITCODE -ne 0) { throw "Wrangler could not inspect existing staging secrets." }
$existingSecretNames = @($existingSecretJson | ConvertFrom-Json | ForEach-Object { $_.name })
$planArgs = @(
  (Join-Path $PSScriptRoot "..\scripts\staging-secret-plan.mjs"),
  "--existing",
  ($existingSecretNames -join ",")
)
if ($InitializeInfrastructure) { $planArgs += "--initialize" }
$secretPlan = (& node @planArgs | Out-String) | ConvertFrom-Json

if ($secretPlan.missingInfrastructureSecrets.Count -gt 0 -and -not $InitializeInfrastructure) {
  $missing = $secretPlan.missingInfrastructureSecrets -join ", "
  throw "Missing infrastructure secrets: $missing. Rerun with -InitializeInfrastructure; existing values are never overwritten."
}

if ($secretPlan.generateCredentialEncryptionKey) {
  $keyBytes = New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Fill($keyBytes)
  Publish-SecretValue -Name "CREDENTIAL_ENCRYPTION_KEY" -Value ([Convert]::ToBase64String($keyBytes))
  [Array]::Clear($keyBytes, 0, $keyBytes.Length)
}
else {
  Write-Host "Preserved existing CREDENTIAL_ENCRYPTION_KEY."
}

if ($secretPlan.promptAccessAudience) {
  Read-And-PublishSecret "ACCESS_AUD" "Cloudflare Access application audience"
}
else {
  Write-Host "Preserved existing ACCESS_AUD."
}

Read-And-PublishSecret "HUBSPOT_ACCESS_TOKEN" "HubSpot Service Key"
Read-And-PublishSecret "MONDAY_ACCESS_TOKEN" "Monday API token"

Read-And-PublishSecret "QUICKBOOKS_CLIENT_ID" "QuickBooks client ID"
Read-And-PublishSecret "QUICKBOOKS_CLIENT_SECRET" "QuickBooks client secret"
Read-And-PublishSecret "QUICKBOOKS_REALM_ID" "QuickBooks company realm ID"
Read-And-PublishSecret "QUICKBOOKS_REFRESH_TOKEN" "QuickBooks bootstrap refresh token"

Read-And-PublishSecret "GITHUB_APP_ID" "GitHub App ID"
Read-And-PublishSecret "GITHUB_APP_INSTALLATION_ID" "GitHub App installation ID"
$privateKeyPath = Read-Host "Path to the downloaded GitHub App private-key PEM (leave blank to skip)"
if (-not [string]::IsNullOrWhiteSpace($privateKeyPath)) {
  $resolvedPrivateKeyPath = (Resolve-Path -LiteralPath $privateKeyPath).Path
  try {
    Publish-SecretValue -Name "GITHUB_APP_PRIVATE_KEY" -Value (Get-Content -Raw -LiteralPath $resolvedPrivateKeyPath)
  }
  finally {
    Remove-Variable resolvedPrivateKeyPath -ErrorAction SilentlyContinue
  }
}

Read-And-PublishSecret "METRICOOL_SNAPSHOT_URL" "Metricool governed snapshot URL"
Read-And-PublishSecret "METRICOOL_SNAPSHOT_TOKEN" "Metricool snapshot token"

Write-Host "Staging secret upload complete. Run the status check before any manual refresh."
