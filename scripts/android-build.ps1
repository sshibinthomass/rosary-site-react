param(
    [ValidateSet("sync", "debug")]
    [string]$Mode = "sync"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

function Resolve-JavaHome {
    if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
        return $env:JAVA_HOME
    }

    $candidates = @(
        "C:\Program Files\Android\Android Studio\jbr",
        "C:\Program Files\Android\Android Studio\jre"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path (Join-Path $candidate "bin\java.exe")) {
            return $candidate
        }
    }

    throw "JAVA_HOME is not set and Android Studio's bundled JBR was not found."
}

function Resolve-AndroidSdk {
    if ($env:ANDROID_SDK_ROOT -and (Test-Path (Join-Path $env:ANDROID_SDK_ROOT "platform-tools"))) {
        return $env:ANDROID_SDK_ROOT
    }

    if ($env:ANDROID_HOME -and (Test-Path (Join-Path $env:ANDROID_HOME "platform-tools"))) {
        return $env:ANDROID_HOME
    }

    $candidate = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    if (Test-Path (Join-Path $candidate "platform-tools")) {
        return $candidate
    }

    throw "ANDROID_SDK_ROOT is not set and the default Android SDK path was not found."
}

$env:JAVA_HOME = Resolve-JavaHome
$env:ANDROID_SDK_ROOT = Resolve-AndroidSdk
$env:ANDROID_HOME = $env:ANDROID_SDK_ROOT

Write-Host "Using JAVA_HOME=$env:JAVA_HOME"
Write-Host "Using ANDROID_SDK_ROOT=$env:ANDROID_SDK_ROOT"

Push-Location $repoRoot
try {
    npm run build
    npx cap sync android

    if ($Mode -eq "debug") {
        Push-Location (Join-Path $repoRoot "android")
        try {
            .\gradlew.bat --no-daemon --console=plain assembleDebug
        }
        finally {
            Pop-Location
        }
    }
}
finally {
    Pop-Location
}
