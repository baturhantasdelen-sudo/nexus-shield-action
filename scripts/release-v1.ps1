#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

Write-Host "==> Syncing main branch"
git checkout main
git pull origin main

$TagVersion = "v1.0.0"
$TagMajor = "v1"
$TagMessage = "Release v1.0.0 - Policy-driven PII & Secret Protection"
$TagMajorMessage = "Release v1 - Major version pointer"

$existing = git rev-parse $TagVersion 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Tag $TagVersion already exists locally; recreating annotated tag."
  git tag -d $TagVersion | Out-Null
}

git tag -a $TagVersion -m $TagMessage
git tag -f $TagMajor -m $TagMajorMessage

Write-Host "==> Pushing tags to origin"
git push origin $TagVersion
git push origin --force $TagMajor

Write-Host "Done. Published tags: $TagVersion and $TagMajor"
