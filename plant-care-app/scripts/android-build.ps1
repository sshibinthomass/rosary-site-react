param(
  [ValidateSet('sync', 'debug')]
  [string]$Mode = 'sync'
)

$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $PSScriptRoot

if (-not $env:JAVA_HOME) {
  $env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
}
if (-not (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
  throw 'A Java 21 runtime is required. Install Android Studio or set JAVA_HOME.'
}

if (-not $env:ANDROID_SDK_ROOT) {
  $env:ANDROID_SDK_ROOT = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
}
if (-not (Test-Path (Join-Path $env:ANDROID_SDK_ROOT 'platform-tools'))) {
  throw 'The Android SDK was not found. Install it with Android Studio or set ANDROID_SDK_ROOT.'
}
$env:ANDROID_HOME = $env:ANDROID_SDK_ROOT

Push-Location $appRoot
try {
  npm.cmd run build
  npx.cmd cap sync android
  if ($Mode -eq 'debug') {
    Push-Location (Join-Path $appRoot 'android')
    try { .\gradlew.bat --no-daemon --console=plain assembleDebug }
    finally { Pop-Location }
  }
}
finally { Pop-Location }
