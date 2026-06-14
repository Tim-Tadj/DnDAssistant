# Import-Content.ps1
# Bulk-import a JSON file of normalized content into the backend.
#
# Usage:
#   .\import-content.ps1 -Path <json-file> -Kind <spell|monster|gear> `
#                        -Provenance <srd|derived|homebrew> `
#                        [-ApiBase <base-url>] [-OwnerUserId <id>] [-DryRun]
#
# The JSON file may be either:
#   * an array of items (matches src/res/resources/srd_*.json shape), or
#   * an object with an "items" property.
#
# Examples:
#   .\import-content.ps1 -Path ..\res\resources\srd_5e_armour.json `
#                        -Kind gear -Provenance derived
#   .\import-content.ps1 -Path my-homebrew-monsters.json `
#                        -Kind monster -Provenance homebrew -OwnerUserId alice
#   .\import-content.ps1 -Path draft.json -Kind spell -Provenance derived -Dry
#
# The script POSTs to /api/v1/import on the backend (default
# http://localhost:8081/api/v1). On success it prints the
# {imported, updated, errors[]} summary.

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][ValidateSet('spell', 'monster', 'gear')][string]$Kind,
    [Parameter(Mandatory = $true)][ValidateSet('srd', 'derived', 'homebrew')][string]$Provenance,
    [string]$ApiBase = 'http://localhost:8081/api/v1',
    [string]$OwnerUserId,
    [switch]$Dry
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $Path)) {
    throw "Input file not found: $Path"
}

$raw = Get-Content -LiteralPath $Path -Raw
try {
    $parsed = $raw | ConvertFrom-Json
} catch {
    throw "Failed to parse JSON: $($_.Exception.Message)"
}

# Accept either a top-level array or an object with an "items" property.
# PowerShell's ConvertTo-Json wraps single-element arrays as
# `{"value": [...]}` when assigning through a hashtable; force a real
# array by using `[object[]]` cast.
if ($parsed -is [System.Array]) {
    $items = [object[]]$parsed
} elseif ($parsed.PSObject.Properties.Name -contains 'items') {
    $items = [object[]]$parsed.items
} else {
    throw "JSON must be a top-level array or have an 'items' property; got type $($parsed.GetType().FullName)"
}

if ($items.Count -eq 0) {
    Write-Host "No items in $Path; nothing to import."
    exit 0
}

Write-Host "Loaded $($items.Count) items from $Path"

$body = @{
    kind = $Kind
    provenance = $Provenance
    items = $items
} | ConvertTo-Json -Depth 20

if ($OwnerUserId) {
    $body = $body.Replace('"items":', '"owner_user_id":"' + $OwnerUserId + '","items":')
}

if ($Dry) {
    Write-Host "Dry run - would POST $(([byte[]][char[]]$body).Length) bytes to $ApiBase/import"
    Write-Host "First item: $($items[0] | ConvertTo-Json -Depth 5)"
    exit 0
}

$url = "$ApiBase/import"
Write-Host "POSTing to $url ..."

try {
    $response = Invoke-RestMethod -UseBasicParsing -TimeoutSec 600 `
        -Method POST -ContentType 'application/json' -Body $body -Uri $url
    $statusCode = $response.StatusCode
    $response = $response | ConvertTo-Json -Depth 20
} catch {
    $err = $_.Exception
    if ($err.Response) {
        $reader = [System.IO.StreamReader]::new($err.Response.GetResponseStream())
        $errBody = $reader.ReadToEnd()
        Write-Host "HTTP error: $($err.Response.StatusCode)"
        Write-Host $errBody
    } else {
        Write-Host "Network error: $($err.Message)"
    }
    exit 1
}

$result = $response | ConvertFrom-Json
Write-Host "Status: $statusCode"
Write-Host "Imported: $($result.imported)"
Write-Host "Updated:  $($result.updated)"
Write-Host "Skipped:  $($result.skipped)"
Write-Host "Errors:   $($result.errors.Count)"
if ($result.errors.Count -gt 0) {
    foreach ($err in $result.errors) {
        $line = "  - " + $err.name + ": " + $err.reason
        Write-Host $line
    }
}
