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

Write-Output "Searching for first data row..."

for ($r = 24; $r -le 200; $r++) {
    $rowVal = @()
    for ($c = 1; $c -le $colCount; $c++) {
        $val = $sheet.Cells.Item($r, $c).Text.Trim()
        if ($val) {
            $rowVal += "Col $($c): $($val)"
        }
    }
    # Print the row if it contains substantial columns
    if ($rowVal.Count -gt 5) {
        Write-Output "Row $($r): $($rowVal -join ' | ')"
        
        # Print next 5 rows too to understand sequence
        for ($k = 1; $k -le 5; $k++) {
            $rowVal2 = @()
            for ($c = 1; $c -le $colCount; $c++) {
                $val = $sheet.Cells.Item($r + $k, $c).Text.Trim()
                if ($val) {
                    $rowVal2 += "Col $($c): $($val)"
                }
            }
            Write-Output "Row $($r + $k): $($rowVal2 -join ' | ')"
        }
        break
    }
}

$workbook.Close($false)
$excel.Quit()
