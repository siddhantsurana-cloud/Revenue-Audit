$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$socDir = "S:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/International/Base File/SOC's Use"
$files = @(
    "SOC 2021-22.xlsx",
    "23-24.xlsx",
    "24-25.xlsx",
    "2025-26 (2).xlsx"
)

foreach ($fileName in $files) {
    $file = Join-Path $socDir $fileName
    if (-not (Test-Path $file)) {
        Write-Output "File not found: $file"
        continue
    }
    
    $workbook = $excel.Workbooks.Open($file, [Type]::Missing, $true)
    Write-Output "=================================================="
    Write-Output "FILE: $fileName"
    Write-Output "Sheets count: $($workbook.Worksheets.Count)"
    Write-Output "=================================================="
    
    foreach ($sheet in $workbook.Worksheets) {
        $usedRange = $sheet.UsedRange
        $rowCount = $usedRange.Rows.Count
        $colCount = $usedRange.Columns.Count
        Write-Output " - Sheet: $($sheet.Name) (Rows=$rowCount, Cols=$colCount)"
        
        # Print first row of headers
        $headers = @()
        $limitCols = [Math]::Min(15, $colCount)
        for ($c = 1; $c -le $limitCols; $c++) {
            $val = $sheet.Cells.Item(1, $c).Text.Trim()
            if ($val) {
                $headers += "Col $($c): $($val)"
            }
        }
        Write-Output "   Headers: $($headers -join ' | ')"
        
        # If headers are not in row 1, print row 2
        if ($headers.Count -eq 0 -and $rowCount -gt 1) {
            $headers2 = @()
            for ($c = 1; $c -le $limitCols; $c++) {
                $val = $sheet.Cells.Item(2, $c).Text.Trim()
                if ($val) {
                    $headers2 += "Col $($c): $($val)"
                }
            }
            Write-Output "   Headers (Row 2): $($headers2 -join ' | ')"
        }
    }
    $workbook.Close($false)
}

$excel.Quit()
