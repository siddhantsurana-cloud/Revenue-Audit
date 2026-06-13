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

Write-Output "File: SOC 2021-22.xlsx | Rows=$($sheet.UsedRange.Rows.Count)"

for ($r = 1; $r -le 25; $r++) {
    $rowVal = @()
    for ($c = 4; $c -le 15; $c++) {
        $val = $sheet.Cells.Item($r, $c).Text.Trim()
        if ($val) {
            $rowVal += "Col $($c): $($val)"
        }
    }
    if ($rowVal.Count -gt 0) {
        Write-Output "Row $($r): $($rowVal -join ' | ')"
    }
}

$workbook.Close($false)
$excel.Quit()
