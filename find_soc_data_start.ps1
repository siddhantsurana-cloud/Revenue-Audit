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

Write-Output "Scanning all rows of SOC 2021-22 in memory..."
$values = $sheet.UsedRange.Value2

$found = 0
for ($r = 1; $r -le $rowCount; $r++) {
    for ($c = 1; $c -le $colCount; $c++) {
        $cellVal = if ($values[$r, $c] -ne $null) { $values[$r, $c].ToString().Trim() } else { "" }
        
        # Look for numeric service codes (e.g. 6140, 22902, 3112190)
        if ($cellVal -match '^\d{3,8}$') {
            Write-Output "Found potential service code at Row $($r), Col $($c) : $($cellVal)"
            
            # Print columns of this row
            $rowVal = @()
            for ($col = 1; $col -le $colCount; $col++) {
                if ($values[$r, $col] -ne $null) {
                    $rowVal += "Col $($col): $($values[$r, $col].ToString().Trim())"
                }
            }
            Write-Output "Row $($r) data: $($rowVal -join ' | ')"
            
            # Print headers (let's look at row r-1 and r-2)
            Write-Output "Headers row $($r-1):"
            $hdrVal1 = @()
            for ($col = 1; $col -le $colCount; $col++) {
                if ($values[$r-1, $col] -ne $null) { $hdrVal1 += "Col $($col): $($values[$r-1, $col].ToString().Trim())" }
            }
            Write-Output ($hdrVal1 -join ' | ')
            
            Write-Output "Headers row $($r-2):"
            $hdrVal2 = @()
            for ($col = 1; $col -le $colCount; $col++) {
                if ($values[$r-2, $col] -ne $null) { $hdrVal2 += "Col $($col): $($values[$r-2, $col].ToString().Trim())" }
            }
            Write-Output ($hdrVal2 -join ' | ')
            
            $found++
            break
        }
    }
    if ($found -ge 3) { break }
}

$workbook.Close($false)
$excel.Quit()
