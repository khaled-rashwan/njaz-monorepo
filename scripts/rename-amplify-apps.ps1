# ============================================================
# Rename Amplify Apps in AWS Console
#
# Run this script ONCE after you identify your App IDs.
# Usage: .\scripts\rename-amplify-apps.ps1
#
# Prerequisites: AWS CLI configured with your credentials.
# ============================================================

param(
    [string]$Region = "us-east-1"
)

Write-Host "Fetching all Amplify apps..." -ForegroundColor Cyan

$appsJson = aws amplify list-apps --region $Region 2>&1
$apps = ($appsJson | ConvertFrom-Json).apps

if (-not $apps) {
    Write-Host "ERROR: Could not fetch apps. Make sure AWS CLI is configured." -ForegroundColor Red
    exit 1
}

Write-Host "`nFound $($apps.Count) apps:" -ForegroundColor Green
Write-Host "{0,-40} {1,-20} {2}" -f "App Name", "App ID", "Last Updated"
Write-Host ("-" * 80)

foreach ($app in $apps) {
    Write-Host "{0,-40} {1,-20} {2}" -f $app.name, $app.appId, $app.updateTime
}

Write-Host "`n--- RENAME GUIDE ---" -ForegroundColor Yellow
Write-Host "Based on the production branch and app root, identify each app and run:"
Write-Host ""
Write-Host "# Example - replace <APP_ID> with actual IDs from above:"
Write-Host 'aws amplify update-app --app-id <LANDING_APP_ID>   --name "njaz-landing"   --region' $Region
Write-Host 'aws amplify update-app --app-id <DASHBOARD_APP_ID> --name "njaz-dashboard"  --region' $Region
Write-Host 'aws amplify update-app --app-id <DEV_APP_ID>       --name "njaz-dev"        --region' $Region
Write-Host 'aws amplify update-app --app-id <ESTEBIAN_APP_ID>  --name "njaz-estebian"   --region' $Region
Write-Host ""
Write-Host "After setting AMPLIFY_BACKEND_APP_ID, use the dashboard app's App ID below."
Write-Host "Set this environment variable in Amplify Console for: landing, dev, estebian, (and any future apps)"
Write-Host ""
Write-Host "AMPLIFY_BACKEND_APP_ID = <DASHBOARD_APP_ID>"
