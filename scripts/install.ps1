$ErrorActionPreference = "Stop"

$RepoUrl = if ($env:PROMPT_TOOL_REPO_URL) { $env:PROMPT_TOOL_REPO_URL } else { "https://github.com/DazhuangJammy/prompt-testingtool.git" }
$Branch = if ($env:PROMPT_TOOL_BRANCH) { $env:PROMPT_TOOL_BRANCH } else { "main" }
$InstallDir = if ($env:PROMPT_TOOL_DIR) { $env:PROMPT_TOOL_DIR } else { Join-Path ([Environment]::GetFolderPath("Desktop")) "prompt-testingtool" }
$HostName = if ($env:PROMPT_TOOL_HOST) { $env:PROMPT_TOOL_HOST } else { "127.0.0.1" }
$Port = if ($env:PROMPT_TOOL_PORT) { $env:PROMPT_TOOL_PORT } else { "8787" }
$OpenBrowser = if ($env:PROMPT_TOOL_OPEN) { $env:PROMPT_TOOL_OPEN } else { "1" }

if ($args.Count -gt 0 -and $args[0] -eq "--server") {
  $HostName = "0.0.0.0"
  $OpenBrowser = "0"
}

function Require-Command($Name, $Help) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is required. $Help"
  }
}

function Ensure-Pnpm {
  if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    return
  }
  if (Get-Command corepack -ErrorAction SilentlyContinue) {
    corepack enable
    corepack prepare pnpm@10.0.0 --activate
  }
  if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    npm install -g pnpm
  }
}

Require-Command git "Install Git first: https://git-scm.com/"
Require-Command node "Install Node.js 20+ first: https://nodejs.org/"
Require-Command npm "Install Node.js with npm first."
Ensure-Pnpm

$Parent = Split-Path -Parent $InstallDir
if ($Parent -and -not (Test-Path $Parent)) {
  New-Item -ItemType Directory -Path $Parent | Out-Null
}

if (Test-Path (Join-Path $InstallDir ".git")) {
  Write-Host "Updating $InstallDir..."
  git -C $InstallDir fetch origin $Branch
  git -C $InstallDir checkout $Branch
  git -C $InstallDir pull --ff-only origin $Branch
} elseif (Test-Path $InstallDir) {
  throw "$InstallDir already exists but is not a Git repository. Set PROMPT_TOOL_DIR to another path or remove that directory."
} else {
  Write-Host "Cloning $RepoUrl..."
  git clone --branch $Branch $RepoUrl $InstallDir
}

Set-Location $InstallDir

$StartArgs = @("scripts/prompt-tool.mjs", "start", "--install", "--build", "--host", $HostName, "--port", $Port)
if ($OpenBrowser -eq "1") {
  $StartArgs += "--open"
}

node @StartArgs
