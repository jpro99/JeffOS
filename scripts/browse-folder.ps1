param(
  [string]$InitialPath = ""
)

Add-Type -AssemblyName System.Windows.Forms
$dlg = New-Object System.Windows.Forms.FolderBrowserDialog
$dlg.Description = "Select your project folder for Jeff OS"
$dlg.ShowNewFolderButton = $true
$dlg.UseDescriptionForTitle = $true

if ($InitialPath -and (Test-Path -LiteralPath $InitialPath)) {
  $dlg.SelectedPath = $InitialPath
}

$result = $dlg.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
  Write-Output $dlg.SelectedPath
}
