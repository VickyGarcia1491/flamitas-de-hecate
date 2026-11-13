param([string]$InputDoc,[string]$OutputPdf)
$ErrorActionPreference = 'Stop'
$wordApp = $null
$wordDoc = $null
$InputDoc = [System.IO.Path]::GetFullPath($InputDoc)
$OutputPdf = [System.IO.Path]::GetFullPath($OutputPdf)
try {
    $wordApp = New-Object -ComObject Word.Application
    $wordApp.Visible = $false
    $wordApp.DisplayAlerts = 0
    $wordDoc = $wordApp.Documents.Open($InputDoc, $false, $true)
    $wordDoc.ExportAsFixedFormat($OutputPdf, 17)
    Write-Output "PDF exported: $OutputPdf"
} finally {
    if ($null -ne $wordDoc) { $wordDoc.Close(0) }
    if ($null -ne $wordApp) { $wordApp.Quit() }
}
