# compile_all_tariffs.ps1 - Compiles standard tariffs and room-specific tariffs
$startAll = Get-Date

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$gipsaFile = "s:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/Tarrif Masterss/International/ERRICSON GIPSA.xlsx"
$tpaFile = "s:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/Tarrif Masterss/International/ERRICSON TPA.xlsx"
$workingsFile = "s:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/Tariff validation Workings-New.xlsx"
$outputFile = "s:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/Tarrif Masterss/tariff_data.js"

$servicesHash = [ordered]@{}

# 1. Parse standard files (GIPSA & TPA)
function Process-StandardFile($file, $isGipsa) {
    if (-not (Test-Path $file)) {
        Write-Output "File not found: $file"
        return
    }
    $workbook = $excel.Workbooks.Open($file, [Type]::Missing, $true)
    $sheet = $workbook.Worksheets.Item(1)
    $values = $sheet.UsedRange.Value2
    $rowCount = $sheet.UsedRange.Rows.Count
    
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
        
        $rateNum = 0
        if (-not [double]::TryParse($finalTariff, [ref]$rateNum)) { $rateNum = 0 }
        
        if ($servicesHash.Contains($serviceId)) {
            $existing = $servicesHash[$serviceId]
            if ($isGipsa) {
                $existing.gipsa_rate = $rateNum
                $existing.gipsa_template = $templateName
            } else {
                $existing.tpa_rate = $rateNum
                $existing.tpa_template = $templateName
            }
            if ([string]::IsNullOrEmpty($existing.name) -and -not [string]::IsNullOrEmpty($serviceName)) { $existing.name = $serviceName }
            if ([string]::IsNullOrEmpty($existing.type)) { $existing.type = $serviceTypeName }
            if ([string]::IsNullOrEmpty($existing.dept)) { $existing.dept = $deptName }
            if ([string]::IsNullOrEmpty($existing.aliasCode) -or $existing.aliasCode -eq "0") { $existing.aliasCode = $aliasCode }
            if ([string]::IsNullOrEmpty($existing.aliasName) -or $existing.aliasName -eq "0") { $existing.aliasName = $aliasName }
        } else {
            $servicesHash[$serviceId] = [PSCustomObject]@{
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
        }
    }
    $workbook.Close($false)
}

Write-Output "Processing ERRICSON GIPSA..."
Process-StandardFile $gipsaFile $true

Write-Output "Processing ERRICSON TPA..."
Process-StandardFile $tpaFile $false

# 2. Parse room-specific sheets from workings file
$tpaRoomRent = [ordered]@{}
$gipsaRoomRent = [ordered]@{}
$nursingCharges = [ordered]@{}
$monitoringCharges = [ordered]@{}
$visitCharges = [ordered]@{}

if (Test-Path $workingsFile) {
    Write-Output "Processing Tariff validation Workings-New.xlsx..."
    $workbook = $excel.Workbooks.Open($workingsFile, [Type]::Missing, $true)
    
    # Helper to parse category rates
    function Parse-CategorySheet($sheetName, $catCol, $tariffCol, $hash) {
        $sheet = $workbook.Worksheets.Item($sheetName)
        if ($sheet -ne $null) {
            $values = $sheet.UsedRange.Value2
            $rowCount = $sheet.UsedRange.Rows.Count
            
            $startRow = 2
            if ($sheetName -eq "TPA2023 Room rent") { $startRow = 3 }
            if ($sheetName -eq "IP Visit Charges TPA2023") { $startRow = 3 }
            
            for ($r = $startRow; $r -le $rowCount; $r++) {
                $cat = if ($values[$r, $catCol] -ne $null) { $values[$r, $catCol].ToString().Trim().ToUpper() } else { "" }
                $tariff = if ($values[$r, $tariffCol] -ne $null) { $values[$r, $tariffCol].ToString().Trim() } else { "" }
                if ([string]::IsNullOrEmpty($cat) -or $cat -eq "BED CATEGORY" -or $cat -eq "CATEGORYNAME" -or $cat -eq "ROOM RENT") { continue }
                
                $valNum = 0
                if ([double]::TryParse($tariff, [ref]$valNum)) {
                    $hash[$cat] = $valNum
                }
            }
        }
    }
    
    Write-Output "Parsing TPA2023 Room rent..."
    Parse-CategorySheet "TPA2023 Room rent" 2 3 $tpaRoomRent
    
    Write-Output "Parsing ROOM RENT (GIPSA)..."
    Parse-CategorySheet "ROOM RENT" 4 6 $gipsaRoomRent
    
    Write-Output "Parsing NURSING CHARGES..."
    Parse-CategorySheet "NURSING CHARGES" 5 6 $nursingCharges
    
    Write-Output "Parsing MONITORING CHARGES..."
    Parse-CategorySheet "MONITORING CHARGES" 5 6 $monitoringCharges
    
    Write-Output "Parsing Doctor visits..."
    Parse-CategorySheet "IP Visit Charges TPA2023" 4 5 $visitCharges
    
    $workbook.Close($false)
} else {
    Write-Output "Warning: Workings file not found at $workingsFile"
}

$excel.Quit()
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

# Write everything to tariff_data.js
Write-Output "Writing output file: $outputFile"

$dataArray = @($servicesHash.Values)
$jsonMaster = $dataArray | ConvertTo-Json -Depth 5
$jsonTpaRoom = $tpaRoomRent | ConvertTo-Json
$jsonGipsaRoom = $gipsaRoomRent | ConvertTo-Json
$jsonNursing = $nursingCharges | ConvertTo-Json
$jsonMonitoring = $monitoringCharges | ConvertTo-Json
$jsonVisit = $visitCharges | ConvertTo-Json

$jsContent = @"
const TARIFF_DATA = $jsonMaster;

const ROOM_RENT_TPA = $jsonTpaRoom;
const ROOM_RENT_GIPSA = $jsonGipsaRoom;
const NURSING_CHARGES = $jsonNursing;
const MONITORING_CHARGES = $jsonMonitoring;
const VISIT_CHARGES = $jsonVisit;
"@

$jsContent | Out-File -FilePath $outputFile -Encoding utf8

$endAll = Get-Date
Write-Output "=================================================="
Write-Output "Full compilation successful!"
Write-Output "Total unique records compiled: $($dataArray.Count)"
Write-Output "Total execution time: $(($endAll - $startAll).TotalSeconds) seconds"
Write-Output "=================================================="
