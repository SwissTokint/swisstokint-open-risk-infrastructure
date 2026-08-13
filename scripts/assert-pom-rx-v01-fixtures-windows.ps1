param(
  [string]$RepositoryRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$modulePath = Join-Path $RepositoryRoot 'scripts\pom-rx-v01-fixture-contract.mjs'
$caseRunner = Join-Path $RepositoryRoot 'scripts\assert-pom-rx-v01-fixtures-windows-case.mjs'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("pomrx-v01-winfs-" + [Guid]::NewGuid().ToString('N'))
$fixtureRoot = Join-Path $tempRoot 'root'
$externalRoot = Join-Path $tempRoot 'external'
$cases = [System.Collections.Generic.List[object]]::new()

function Invoke-NodeCase {
  param([string]$Name, [string]$Mode, [string[]]$Arguments, [int]$ExpectedExit, [string]$ExpectedCode = '')
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $output = & node $caseRunner $Mode $modulePath @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousPreference
  if ($exitCode -ne $ExpectedExit) {
    throw "$Name returned $exitCode instead of $ExpectedExit`: $output"
  }
  if ($ExpectedCode) {
    $parsed = ($output -join "`n") | ConvertFrom-Json
    if ($parsed.code -ne $ExpectedCode) { throw "$Name returned code $($parsed.code) instead of $ExpectedCode" }
  }
  $cases.Add([pscustomobject]@{ name = $Name; exit_code = $exitCode; output = ($output -join "`n") })
}

try {
  New-Item -ItemType Directory -Path $fixtureRoot | Out-Null
  New-Item -ItemType Directory -Path $externalRoot | Out-Null
  Set-Content -LiteralPath (Join-Path $fixtureRoot 'regular.txt') -Value 'regular' -NoNewline -Encoding utf8
  Set-Content -LiteralPath (Join-Path $externalRoot 'outside.txt') -Value 'outside' -NoNewline -Encoding utf8

  Invoke-NodeCase 'regular-file-accepted' 'enumerate' @($fixtureRoot) 0

  Set-Content -LiteralPath ((Join-Path $fixtureRoot 'regular.txt') + ':shadow') -Value 'hidden' -NoNewline -Encoding utf8
  Invoke-NodeCase 'actual-ads-path-denied' 'read' @($fixtureRoot, 'regular.txt:shadow') 9 'PATH_INVALID'
  Invoke-NodeCase 'actual-attached-ads-enumeration-denied' 'enumerate' @($fixtureRoot) 9 'ALTERNATE_DATA_STREAM'
  Remove-Item -LiteralPath ((Join-Path $fixtureRoot 'regular.txt') + ':shadow') -Force

  Set-Content -LiteralPath ($fixtureRoot + ':rootshadow') -Value 'hidden' -NoNewline -Encoding utf8
  Invoke-NodeCase 'actual-root-directory-ads-denied' 'enumerate' @($fixtureRoot) 9 'ALTERNATE_DATA_STREAM'
  Remove-Item -LiteralPath ($fixtureRoot + ':rootshadow') -Force

  $nestedDirectory = Join-Path $fixtureRoot 'nested'
  New-Item -ItemType Directory -Path $nestedDirectory | Out-Null
  Set-Content -LiteralPath ($nestedDirectory + ':dirshadow') -Value 'hidden' -NoNewline -Encoding utf8
  Invoke-NodeCase 'actual-nested-directory-ads-denied' 'enumerate' @($fixtureRoot) 9 'ALTERNATE_DATA_STREAM'
  Remove-Item -LiteralPath ($nestedDirectory + ':dirshadow') -Force
  Remove-Item -LiteralPath $nestedDirectory -Force

  $junction = Join-Path $fixtureRoot 'junction'
  New-Item -ItemType Junction -Path $junction -Target $externalRoot | Out-Null
  Invoke-NodeCase 'actual-junction-reparse-denied' 'enumerate' @($fixtureRoot) 9 'NON_REGULAR_FILE'
  [System.IO.Directory]::Delete($junction)

  $rootJunction = Join-Path $tempRoot 'root-junction'
  New-Item -ItemType Junction -Path $rootJunction -Target $externalRoot | Out-Null
  Invoke-NodeCase 'actual-root-junction-denied' 'enumerate' @($rootJunction) 9 'NON_REGULAR_ROOT'
  [System.IO.Directory]::Delete($rootJunction)

  $hardlink = Join-Path $fixtureRoot 'hardlink.txt'
  New-Item -ItemType HardLink -Path $hardlink -Target (Join-Path $fixtureRoot 'regular.txt') | Out-Null
  Invoke-NodeCase 'actual-hardlink-denied' 'enumerate' @($fixtureRoot) 9 'NON_REGULAR_FILE'
  Remove-Item -LiteralPath $hardlink -Force

  $symlink = Join-Path $fixtureRoot 'symlink.txt'
  try {
    New-Item -ItemType SymbolicLink -Path $symlink -Target (Join-Path $externalRoot 'outside.txt') | Out-Null
    Invoke-NodeCase 'actual-symlink-denied' 'enumerate' @($fixtureRoot) 9 'NON_REGULAR_FILE'
    Remove-Item -LiteralPath $symlink -Force
  } catch [System.UnauthorizedAccessException] {
    $cases.Add([pscustomobject]@{ name = 'actual-symlink-denied'; exit_code = $null; output = 'SYMLINK_CREATION_NOT_PERMITTED' })
  }

  $head = (& git -C $RepositoryRoot rev-parse HEAD).Trim()
  $report = [ordered]@{
    status = if ($cases.Where({ $_.output -eq 'SYMLINK_CREATION_NOT_PERMITTED' }).Count -eq 0) { 'WINDOWS_FILESYSTEM_BOUNDARY_VERIFIED' } else { 'WINDOWS_FILESYSTEM_BOUNDARY_PARTIAL' }
    complete = ($cases.Where({ $_.output -eq 'SYMLINK_CREATION_NOT_PERMITTED' }).Count -eq 0)
    head = $head
    node = (& node -p 'process.versions.node').Trim()
    os = [System.Environment]::OSVersion.VersionString
    platform = (& node -p 'process.platform').Trim()
    arch = (& node -p 'process.arch').Trim()
    case_total = $cases.Count
    cases = $cases
  }
  $report | ConvertTo-Json -Depth 5
} finally {
  $resolvedTemp = [System.IO.Path]::GetFullPath($tempRoot)
  $resolvedSystemTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
  if ($resolvedTemp.StartsWith($resolvedSystemTemp, [System.StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $resolvedTemp).StartsWith('pomrx-v01-winfs-')) {
    Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction SilentlyContinue
  } else {
    throw "Refusing to clean unexpected path $resolvedTemp"
  }
}
