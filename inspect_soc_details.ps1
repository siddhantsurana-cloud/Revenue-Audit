$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$socDir = "S:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/International/Base File/SOC's Use"

# 1. Inspect SOC 2021-22.xlsx Table 1
$file2122 = Join-Path $socDir "SOC 2021-22.xlsx"
if (Test-Path $file2122) {
    $workbook = $excel.Workbooks.Open($file2122, [Type]::Missing, $true)
    $sheet = $workbook.Worksheets.Item(1)
    Write-Output "=== SOC 2021-22.xlsx: Row 5 & 6 (Headers check) ==="
    for ($r = 4; $r -le 7; $r++) {
        $rowVal = @()
        for ($c = 1; $c -le 25; $c++) {
            $val = $sheet.Cells.Item($r, $c).Text.Trim()
            if ($val) { $rowVal += "Col $($c): $($val)" }
        }
        Write-Output "Row $($r): $($rowVal -join ' | ')"
    }
    $workbook.Close($false)
}

# 2. Inspect 24-25.xlsx Laboratory Columns 1-12
$file2425 = Join-Path $socDir "24-25.xlsx"
if (Test-Path $file2425) {
    $workbook = $excel.Workbooks.Open($file2425, [Type]::Missing, $true)
    $sheet = $workbook.Worksheets.Item("Laboratory")
    Write-Output "`n=== 24-25.xlsx: Laboratory Rows 3 to 6 ==="
    for ($r = 3; $r -le 6; $r++) {
        $rowVal = @()
        for ($c = 1; $c -le 12; $c++) {
            $val = $sheet.Cells.Item($r, $c).Text.Trim()
            if ($val) { $rowVal += "Col $($c): $($val)" }
        }
        Write-Output "Row $($r): $($rowVal -join ' | ')"
    }
    $workbook.Close($false)
}

# 3. Inspect 23-24.xlsx 06 Investigations Column count and cells
$file2324 = Join-Path $socDir "23-24.xlsx"
if (Test-Path $file2324) {
    $workbook = $excel.Workbooks.Open($file2324, [Type]::Missing, $true)
    $sheet = $workbook.Worksheets.Item("06 Investigations proced")
    Write-Output "`n=== 23-24.xlsx: Investigations Rows 3 to 6 ==="
    for ($r = 3; $r -le 6; $r++) {
        $rowVal = @()
        for ($c = 1; $c -le 10; $c++) { # inspect up to 10 cols
            $val = $sheet.Cells.Item($r, $c).Text.Trim()
            if ($val) { $rowVal += "Col $($c): $($val)" }
        }
        Write-Output "Row $($r): $($rowVal -join ' | ')"
    }
    $workbook.Close($false)
}

$excel.Quit()
