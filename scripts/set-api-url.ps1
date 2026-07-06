param(
  [Parameter(Mandatory = $true)]
  [string]$ApiUrl
)

# Strips trailing slash
$ApiUrl = $ApiUrl.TrimEnd("/")

Write-Host "Setting GitHub secret NEXT_PUBLIC_API_URL to: $ApiUrl"
gh secret set NEXT_PUBLIC_API_URL --body $ApiUrl --repo TawfiqAhmedAbir/stillhere

Write-Host ""
Write-Host "Done. Re-run the Pages deploy:"
Write-Host "  gh workflow run deploy-pages.yml --repo TawfiqAhmedAbir/stillhere"
Write-Host ""
Write-Host "Also update mobile/.env:"
Write-Host "  EXPO_PUBLIC_API_URL=$ApiUrl"
