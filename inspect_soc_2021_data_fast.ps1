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
$rowCount = $sheet.UsedRange.Rows.Count
$colCount = $sheet.UsedRange.Columns.Count

Write-Output "File: SOC 2021-22.xlsx | Rows=$rowCount | Cols=$colCount"
$values = $sheet.UsedRange.Value2

Write-Output "Searching in memory..."

for ($r = 24; $r -le 200; $r++) {
    $rowVal = @()
    for ($c = 1; $c -le $colCount; $c++) {
        if ($values[$r, $c] -ne $null) {
            $rowVal += "Col $($c): $($values[$r, $c].ToString().Trim())"
        }
    }
    if ($rowVal.Count -gt 5) {
        Write-Output "Row $($r): $($rowVal -join ' | ')"
        
        for ($k = 1; $k -le 10; $k++) {
            $rowVal2 = @()
            for ($c = 1; $c -le $colCount; $c++) {
                if ($values[$r + $k, $c] -ne $null) {
                    $rowVal2 += "Col $($c): $($values[$r + $k, $c].ToString().Trim())"
                }
            }
            Write-Output "Row $($r + $k): $($rowVal2 -join ' | ')"
        }
        break
    }
}

$workbook.Close($false)
$excel.Quit()
