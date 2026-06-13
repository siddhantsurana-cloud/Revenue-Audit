# compile_tariffs.ps1 - Compiles tariff excel sheets into a JS file
$startAll = Get-Date

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$gipsaFile = "s:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/Tarrif Masterss/International/ERRICSON GIPSA.xlsx"
$tpaFile = "s:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/Tarrif Masterss/International/ERRICSON TPA.xlsx"
$outputFile = "s:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/Tarrif Masterss/tariff_data.js"

$servicesHash = [ordered]@{}

function Process-ExcelFile($file, $isGipsa) {
    if (-not (Test-Path $file)) {
        Write-Output "Error: File not found - $file"
        return
    }
    
    $startFile = Get-Date
    $workbook = $excel.Workbooks.Open($file, [Type]::Missing, $true)
    $sheet = $workbook.Worksheets.Item(1)
    $usedRange = $sheet.UsedRange
    $rowCount = $usedRange.Rows.Count
    $colCount = $usedRange.Columns.Count
    
    Write-Output "File: $(Split-Path $file -Leaf) - Loading range (Rows=$rowCount, Cols=$colCount)..."
    $values = $usedRange.Value2
    
    Write-Output "Parsing range data..."
    
    # Range is 1-indexed. Skip row 1 which is the header.
    for ($r = 2; $r -le $rowCount; $r++) {
        $serviceId = if ($values[$r, 2] -ne $null) { $values[$r, 2].ToString().Trim() } else { "" }
        if ([string]::IsNullOrEmpty($serviceId)) { continue }
        
        $templateName = if ($values[$r, 1] -ne $null) { $values[$r, 1].ToString().Trim() } else { "" }
        $serviceName = if ($values[$r, 3] -ne $null) { $values[$r, 3].ToString().Trim() } else { "" }
        $serviceTypeName = if ($values[$r, 4] -ne $null) { $values[$r, 4].ToString().Trim() } else { "" }
        $deptName = if ($values[$r, 5] -ne $null) { $values[$r, 5].ToString().Trim() } else { "" }
        $finalTariff = if ($values[$r, 6] -ne $null) { $values[$r, 6].ToString().Trim() } else { "" }
        $aliasCode = if ($values[$r, 7] -ne $null) { $values[$r, 7].ToString().Trim() } else { "" }
        $aliasName = if ($values[$r, 8] -ne $null) { $values[$r, 8].ToString().Trim() } else { "" }
        
        # Parse rate to a numeric value
        $rateNum = 0
        if (-not [double]::TryParse($finalTariff, [ref]$rateNum)) {
            $rateNum = 0
        }
        
        if ($servicesHash.Contains($serviceId)) {
            $existing = $servicesHash[$serviceId]
            if ($isGipsa) {
                $existing.gipsa_rate = $rateNum
                $existing.gipsa_template = $templateName
                if ([string]::IsNullOrEmpty($existing.name) -and -not [string]::IsNullOrEmpty($serviceName)) {
                    $existing.name = $serviceName
                }
            } else {
                $existing.tpa_rate = $rateNum
                $existing.tpa_template = $templateName
                if ([string]::IsNullOrEmpty($existing.name) -and -not [string]::IsNullOrEmpty($serviceName)) {
                    $existing.name = $serviceName
                }
            }
            
            # Fill missing attributes if the existing one is empty
            if ([string]::IsNullOrEmpty($existing.type)) { $existing.type = $serviceTypeName }
            if ([string]::IsNullOrEmpty($existing.dept)) { $existing.dept = $deptName }
            if ([string]::IsNullOrEmpty($existing.aliasCode) -or $existing.aliasCode -eq "0") { $existing.aliasCode = $aliasCode }
            if ([string]::IsNullOrEmpty($existing.aliasName) -or $existing.aliasName -eq "0") { $existing.aliasName = $aliasName }
        } else {
            $newObj = [PSCustomObject]@{
                id = $serviceId
                name = $serviceName
                type = $serviceTypeName
                dept = $deptName
                gipsa_rate = if ($isGipsa) { $rateNum } else { $null }
                tpa_rate = if (-not $isGipsa) { $rateNum } else { $null }
                gipsa_template = if ($isGipsa) { $templateName } else { "" }
                tpa_template = if (-not $isGipsa) { $templateName } else { "" }
                aliasCode = $aliasCode
                aliasName = $aliasName
            }
            $servicesHash[$serviceId] = $newObj
        }
    }
    
    $workbook.Close($false)
    $endFile = Get-Date
    Write-Output "Finished processing file in $(($endFile - $startFile).TotalSeconds) seconds."
}

Write-Output "Processing ERRICSON GIPSA..."
Process-ExcelFile $gipsaFile $true

Write-Output "Processing ERRICSON TPA..."
Process-ExcelFile $tpaFile $false

$excel.Quit()
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

# Write out the results
Write-Output "Converting compiled data to JSON format..."
$dataArray = @($servicesHash.Values)
$json = $dataArray | ConvertTo-Json -Depth 5
$jsContent = "const TARIFF_DATA = $json;"

Write-Output "Writing to output file: $outputFile"
$jsContent | Out-File -FilePath $outputFile -Encoding utf8

$endAll = Get-Date
Write-Output "=================================================="
Write-Output "Compilation successful!"
Write-Output "Total unique records compiled: $($dataArray.Count)"
Write-Output "Total execution time: $(($endAll - $startAll).TotalSeconds) seconds"
Write-Output "=================================================="
