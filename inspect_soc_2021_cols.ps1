$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$file = "S:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/International/Base File/SOC's Use/SOC 2021-22.xlsx"

if (-not (Test-Path $file)) {
    Write-Output "File not found: $file"
    $excel.Quit()
    exit
}

$workbook = $excel.Workbooks.Open($file, [Type]::Missing, $true)
$sheet = $workbook.Worksheets.Item(1)
$colCount = $sheet.UsedRange.Columns.Count

Write-Output "File: SOC 2021-22.xlsx | Columns=$colCount"

# Print row 5 headers
$headers = @()
for ($c = 1; $c -le $colCount; $c++) {
    $val = $sheet.Cells.Item(5, $c).Text.Trim()
    if ($val) {
        $headers += "Col $($c): $($val)"
    }
}
Write-Output "Row 5: $($headers -join ' | ')"

# Print row 6 headers (sometimes sub-headers exist)
$headers2 = @()
for ($c = 1; $c -le $colCount; $c++) {
    $val = $sheet.Cells.Item(6, $c).Text.Trim()
    if ($val) {
        $headers2 += "Col $($c): $($val)"
    }
}
Write-Output "Row 6: $($headers2 -join ' | ')"

$workbook.Close($false)
$excel.Quit()
