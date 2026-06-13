$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$socDir = "S:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/International/Base File/SOC's Use"

# Inspect 24-25.xlsx
$file2425 = Join-Path $socDir "24-25.xlsx"
if (Test-Path $file2425) {
    $workbook = $excel.Workbooks.Open($file2425, [Type]::Missing, $true)
    $sheet = $workbook.Worksheets.Item("Laboratory")
    Write-Output "=== 24-25.xlsx: Laboratory ==="
    for ($r = 1; $r -le 4; $r++) {
        $rowVal = @()
        for ($c = 1; $c -le $sheet.UsedRange.Columns.Count; $c++) {
            $val = $sheet.Cells.Item($r, $c).Text.Trim()
            $rowVal += "Col $($c): $($val)"
        }
        Write-Output "Row $($r): $($rowVal -join ' | ')"
    }
    $workbook.Close($false)
}

# Inspect 23-24.xlsx
$file2324 = Join-Path $socDir "23-24.xlsx"
if (Test-Path $file2324) {
    $workbook = $excel.Workbooks.Open($file2324, [Type]::Missing, $true)
    $sheet = $workbook.Worksheets.Item("06 Investigations proced")
    Write-Output "`n=== 23-24.xlsx: 06 Investigations proced ==="
    for ($r = 1; $r -le 4; $r++) {
        $rowVal = @()
        for ($c = 1; $c -le $sheet.UsedRange.Columns.Count; $c++) {
            $val = $sheet.Cells.Item($r, $c).Text.Trim()
            $rowVal += "Col $($c): $($val)"
        }
        Write-Output "Row $($r): $($rowVal -join ' | ')"
    }
    $workbook.Close($false)
}

# Inspect SOC 2021-22.xlsx
$file2122 = Join-Path $socDir "SOC 2021-22.xlsx"
if (Test-Path $file2122) {
    $workbook = $excel.Workbooks.Open($file2122, [Type]::Missing, $true)
    $sheet = $workbook.Worksheets.Item(1)
    Write-Output "`n=== SOC 2021-22.xlsx: Sheet 1 ==="
    for ($r = 1; $r -le 4; $r++) {
        $rowVal = @()
        for ($c = 1; $c -le 15; $c++) { # only first 15 columns
            $val = $sheet.Cells.Item($r, $c).Text.Trim()
            $rowVal += "Col $($c): $($val)"
        }
        Write-Output "Row $($r): $($rowVal -join ' | ')"
    }
    $workbook.Close($false)
}

$excel.Quit()
