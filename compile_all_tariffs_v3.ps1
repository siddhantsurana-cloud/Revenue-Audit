# compile_all_tariffs_v3.ps1 - Compiles all master tariffs, historical SOCs, agreements, and HDFC ERGO 2024 templates
$startAll = Get-Date

function Log-Info($msg) {
    Write-Output "$(Get-Date -Format 'HH:mm:ss') - $msg"
}

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$gipsaFile = "S:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/Other Related data/International/APOLLO GUWAHATI GIPSA TARIFF 2026.xlsx"
$tpaFile = "S:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/Other Related data/International/ERRICSON TPA.xlsx"
$workingsFile = "S:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/Tariff validation Workings-New.xlsx"
$socDir = "S:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/International/Base File/SOC's Use"
$ergoDir = "C:\Users\siddh\Downloads\HDFC ERGO - Excelcare"
$agreementFile = "S:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/Other Related data/Agreements with following Tariffs- Hyderabad.xlsx"
$outputFile = "S:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/Tarrif Masterss/tariff_data.js"

$servicesHash = [ordered]@{}

# 1. Parse standard files (GIPSA & TPA)
function Process-StandardFile($file, $isGipsa) {
    if (-not (Test-Path $file)) {
        Log-Info "File not found: $file"
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

Log-Info "Processing ERRICSON GIPSA..."
Process-StandardFile $gipsaFile $true

Log-Info "Processing ERRICSON TPA..."
Process-StandardFile $tpaFile $false

# 2. Parse room-specific sheets from workings file
$tpaRoomRent = [ordered]@{}
$gipsaRoomRent = [ordered]@{}
$roomRent2021 = [ordered]@{}
$nursingCharges = [ordered]@{}
$monitoringCharges = [ordered]@{}
$visitCharges = [ordered]@{}

if (Test-Path $workingsFile) {
    Log-Info "Processing Tariff validation Workings-New.xlsx..."
    $workbook = $excel.Workbooks.Open($workingsFile, [Type]::Missing, $true)
    
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
    
    Log-Info "Parsing TPA2023 Room rent..."
    Parse-CategorySheet "TPA2023 Room rent" 2 3 $tpaRoomRent
    
    Log-Info "Parsing ROOM RENT (GIPSA)..."
    Parse-CategorySheet "ROOM RENT" 4 6 $gipsaRoomRent
    
    Log-Info "Parsing NURSING CHARGES..."
    Parse-CategorySheet "NURSING CHARGES" 5 6 $nursingCharges
    
    Log-Info "Parsing MONITORING CHARGES..."
    Parse-CategorySheet "MONITORING CHARGES" 5 6 $monitoringCharges
    
    Log-Info "Parsing Doctor visits..."
    Parse-CategorySheet "IP Visit Charges TPA2023" 4 5 $visitCharges
    
    $workbook.Close($false)
} else {
    Log-Info "Warning: Workings file not found at $workingsFile"
}

# 3. Parse SOC 2021-22.xlsx
Log-Info "Parsing SOC 2021-22..."
$list2021 = New-Object System.Collections.Generic.List[Object]
$file2122 = Join-Path $socDir "SOC 2021-22.xlsx"
if (Test-Path $file2122) {
    $wb = $excel.Workbooks.Open($file2122, [Type]::Missing, $true)
    $sheet = $wb.Worksheets.Item(1)
    $values = $sheet.UsedRange.Value2
    $rowCount = $sheet.UsedRange.Rows.Count
    
    # 3a. Extract 2021-22 Room Rents from Table 1 sheet
    $table1Sheet = $null
    try {
        $table1Sheet = $wb.Worksheets.Item("Table 1")
    } catch {
        $table1Sheet = $wb.Worksheets.Item(1)
    }
    if ($table1Sheet -ne $null) {
        $t1Values = $table1Sheet.UsedRange.Value2
        for ($r = 27; $r -le 45; $r++) {
            $cat = if ($t1Values[$r, 13] -ne $null) { $t1Values[$r, 13].ToString().Trim().ToUpper() } else { "" }
            $rate = if ($t1Values[$r, 27] -ne $null) { $t1Values[$r, 27].ToString().Trim() } else { "" }
            if ($cat) {
                $valNum = 0
                if ([double]::TryParse($rate, [ref]$valNum)) {
                    $roomRent2021[$cat] = $valNum
                }
            }
        }
    }

    # 3b. Pre-scan parent-row rate patterns (e.g. PDA CLOSURE Rs. 30,000/-)
    $parentRowRates = @{}
    for ($r = 24; $r -le $rowCount; $r++) {
        $c1 = if ($values[$r, 1] -ne $null) { $values[$r, 1].ToString().Trim() } else { "" }
        if ($c1 -and ($c1.Contains("Rs.") -or $c1.Contains("Rs"))) {
            if ($c1 -match 'Rs\.?\s*(\d{1,3}(,\d{3})*)') {
                $rateStr = $Matches[1].Replace(",", "")
                $rateNum = 0
                if ([double]::TryParse($rateStr, [ref]$rateNum)) {
                    $name = $c1 -replace 'Rs\.?.*$', ''
                    $name = $name.Trim()
                    
                    # Look for subsequent code in the next 4 rows
                    for ($offset = 1; $offset -le 4; $offset++) {
                        $targetRow = $r + $offset
                        if ($targetRow -gt $rowCount) { break }
                        $nextVal = if ($values[$targetRow, 1] -ne $null) { $values[$targetRow, 1].ToString().Trim() } else { "" }
                        $nextNum = 0
                        if ($nextVal -and [double]::TryParse($nextVal, [ref]$nextNum) -and $nextNum -ge 1) {
                            $parentRowRates[$nextVal] = @{ name = $name; rate = $rateNum }
                            break
                        }
                    }
                }
            }
        }
    }
    
    # 3c. Parse standard sheet services (allowing codes >= 1 in Col 1 or Col 4)
    $section = "General"
    for ($r = 24; $r -le $rowCount; $r++) {
        $c1 = if ($values[$r, 1] -ne $null) { $values[$r, 1].ToString().Trim() } else { "" }
        $c4 = if ($values[$r, 4] -ne $null) { $values[$r, 4].ToString().Trim() } else { "" }
        $c6 = if ($values[$r, 6] -ne $null) { $values[$r, 6].ToString().Trim() } else { "" }
        $c13 = if ($values[$r, 13] -ne $null) { $values[$r, 13].ToString().Trim() } else { "" }
        
        # Check for section headers in Col 1 or Col 4
        if ($c1 -match '^[A-Za-z /&,-]{5,50}$' -and [string]::IsNullOrEmpty($c6) -and [string]::IsNullOrEmpty($c13)) {
            $section = $c1
            continue
        } elseif ($c4 -match '^[A-Za-z /&,-]{5,50}$' -and [string]::IsNullOrEmpty($c1) -and [string]::IsNullOrEmpty($c6) -and [string]::IsNullOrEmpty($c13)) {
            $section = $c4
            continue
        }
        
        $code = ""
        $codeVal = 0
        
        if ([double]::TryParse($c1, [ref]$codeVal) -and $codeVal -ge 1) {
            $code = $c1
        } elseif ([double]::TryParse($c4, [ref]$codeVal) -and $codeVal -ge 1) {
            $code = $c4
        }
        
        if ($code -ne "") {
            $name = ""
            $rate = 0
            
            if ($parentRowRates.ContainsKey($code)) {
                $name = $parentRowRates[$code].name
                $rate = $parentRowRates[$code].rate
            } else {
                # Find the rate first by scanning Col 15 to 52
                $rateCol = 0
                for ($c = 15; $c -le 52; $c++) {
                    $v = if ($values[$r, $c] -ne $null) { $values[$r, $c].ToString().Trim() } else { "" }
                    $rateNum = 0
                    if ($v -eq "No Charge") {
                        $rate = 0
                        $rateCol = $c
                        break
                    } elseif ($v -and [double]::TryParse($v, [ref]$rateNum)) {
                        $rate = $rateNum
                        $rateCol = $c
                        break
                    }
                }
                
                # Find the name by concatenating non-empty text cells between the code column and the rate column
                $nameParts = @()
                $startCol = if ($code -eq $c4) { 5 } else { 2 }
                $endCol = if ($rateCol -gt 0) { $rateCol - 1 } else { 18 }
                if ($endCol -gt 18) { $endCol = 18 }
                
                for ($c = $startCol; $c -le $endCol; $c++) {
                    $v = if ($values[$r, $c] -ne $null) { $values[$r, $c].ToString().Trim() } else { "" }
                    if ($v -and $v.Length -gt 1 -and $v -notmatch '^\d+$') {
                        $nameParts += $v
                    }
                }
                $name = $nameParts -join " "
            }
            
            if (-not [string]::IsNullOrEmpty($name)) {
                # Skip comments/remarks/notes (which have code < 100 but no rate)
                if ($codeVal -lt 100 -and $rate -eq 0 -and $c1 -ne "" -and $values[$r, 19] -eq $null) {
                    continue
                }
                
                # Also populate the roomRent2021 hash if this is a DAY CARE rate
                if ($section -eq "DAY CARE") {
                    $key = ""
                    if ($name -like "*0 to 1 hours*") { $key = "DAY CARE 0 TO 1 HOUR" }
                    elseif ($name -like "*one hour*Two*") { $key = "DAY CARE 1 TO 2 HOURS" }
                    elseif ($name -like "*Two*Three*") { $key = "DAY CARE 2 TO 3 HOURS" }
                    elseif ($name -like "*Three*Four*") { $key = "DAY CARE 3 TO 4 HOURS" }
                    elseif ($name -like "*Four*Five*") { $key = "DAY CARE 4 TO 5 HOURS" }
                    elseif ($name -like "*Five*Six*") { $key = "DAY CARE 5 TO 6 HOURS" }
                    elseif ($name -like "*Six*Twenty-three*") { $key = "DAY CARE 5 TO 24 HOURS" }
                    
                    if ($key) {
                        $roomRent2021[$key] = $rate
                    }
                }
                
                $list2021.Add([PSCustomObject]@{
                    id = $code
                    name = $name
                    type = $section
                    dept = $section
                    rate = $rate
                })
            }
        }
    }
    $wb.Close($false)
}

# Generic Sheet Parser for 23-24 and 24-25 (with row-by-row fallback scanning for merged headings)
function Parse-MultiSheetFile($file) {
    $results = New-Object System.Collections.Generic.List[Object]
    if (-not (Test-Path $file)) { return $results }
    
    $wb = $excel.Workbooks.Open($file, [Type]::Missing, $true)
    for ($i = 1; $i -le $wb.Worksheets.Count; $i++) {
        $sheet = $wb.Worksheets.Item($i)
        $sheetName = $sheet.Name
        if ($sheetName -in @("Index", "cover page", "01 Billing terms", "1.1 Additional Terms", "Room Tariff", "end page")) {
            continue
        }
        
        $values = $sheet.UsedRange.Value2
        if ($null -eq $values) { continue }
        $rowCount = $sheet.UsedRange.Rows.Count
        $colCount = $sheet.UsedRange.Columns.Count
        if ($rowCount -lt 3) { continue }
        
        $fromCol = 0
        $toCol = 0
        
        for ($r = 1; $r -le $rowCount; $r++) {
            # 1. Collect non-empty cells in the row and identify headers/units dynamically
            $cells = New-Object System.Collections.Generic.List[Object]
            $isHeader = $false
            for ($c = 1; $c -le $colCount; $c++) {
                $val = $values[$r, $c]
                if ($val -ne $null) {
                    $valStr = $val.ToString().Trim()
                    $cells.Add([PSCustomObject]@{ index = $c; value = $valStr })
                    
                    $valUpper = $valStr.ToUpper()
                    if ($valUpper -eq "FROM UNIT") { $fromCol = $c }
                    if ($valUpper -eq "TO UNIT") { $toCol = $c }
                    if ($valUpper -in @("CODE", "SERVICE CODE", "SERVICEID", "NEW CODE", "MEDMANTRA")) {
                        $isHeader = $true
                    }
                }
            }
            if ($cells.Count -eq 0 -or $isHeader) { continue }
            
            # Check if this row looks like a header from string content
            $rowStr = ($cells | ForEach-Object { $_.value.ToUpper() }) -join " "
            if ($rowStr -match "NEW CODE|SERVICE CODE|SERVICEID|SL-NO\.|SL\.NO\.") { continue }
            if ($rowStr -match "CODE" -and $rowStr -match "SERVICE") { continue }
            
            # Code is the first non-empty cell value
            $codeObj = $cells[0]
            $code = $codeObj.value
            $codeUpper = $code.ToUpper()
            
            if ($codeUpper -in @("CODE", "SERVICE", "RATE", "TARIFF", "PRICE", "AMT", "AMOUNT", "SL-NO.", "SL.NO.", "NOTE:", "GENERAL", "INVESTIGATION", "PARTICULARS")) {
                continue
            }
            if ($code.Length -gt 30) { continue }
            
            # Find name and rate from remaining cells
            $name = ""
            $rateNum = 0
            $foundRate = $false
            
            for ($idx = 1; $idx -lt $cells.Count; $idx++) {
                $cellObj = $cells[$idx]
                $valStr = $cellObj.value
                
                # Check if it's numeric
                $valDouble = 0
                if (-not $foundRate -and [double]::TryParse($valStr, [ref]$valDouble)) {
                    $rateNum = $valDouble
                    $foundRate = $true
                } else {
                    if ([string]::IsNullOrEmpty($name) -and $valStr.Length -gt 1 -and $valStr -notmatch '^\d+$') {
                        $name = $valStr
                    }
                }
            }

            if ([string]::IsNullOrEmpty($name) -and -not [string]::IsNullOrEmpty($code) -and $foundRate) {
                if ($code -notmatch '^\d+$') {
                    $name = $code
                }
            }

            if (-not [string]::IsNullOrEmpty($name)) {
                $nameUpper = $name.ToUpper()
                if ($nameUpper -in @("SERVICE", "PARTICULARS", "PROCEDURE", "DESCRIPTION", "RATE", "CODE")) { continue }
                
                $fromUnit = 0
                $toUnit = 0
                if ($fromCol -gt 0) {
                    $fromVal = $values[$r, $fromCol]
                    if ($fromVal -ne $null) {
                        [double]::TryParse($fromVal.ToString().Trim(), [ref]$fromUnit) | Out-Null
                    }
                }
                if ($toCol -gt 0) {
                    $toVal = $values[$r, $toCol]
                    if ($toVal -ne $null) {
                        [double]::TryParse($toVal.ToString().Trim(), [ref]$toUnit) | Out-Null
                    }
                }
                
                $obj = [PSCustomObject]@{
                    id = $code
                    name = $name
                    type = $sheetName
                    dept = $sheetName
                    rate = $rateNum
                }
                if ($fromCol -gt 0) { $obj | Add-Member -MemberType NoteProperty -Name "fromUnit" -Value $fromUnit }
                if ($toCol -gt 0) { $obj | Add-Member -MemberType NoteProperty -Name "toUnit" -Value $toUnit }
                $results.Add($obj)
            }
        }
    }
    $wb.Close($false)
    return $results
}

# 4. Parse 2023-24 SOC
Log-Info "Parsing SOC 2023-24..."
$list2023 = Parse-MultiSheetFile (Join-Path $socDir "23-24.xlsx")

# 5. Parse 2024-25 SOC
Log-Info "Parsing SOC 2024-25..."
$list2024 = Parse-MultiSheetFile (Join-Path $socDir "24-25.xlsx")

# 6. Parse 2025-26 SOC
Log-Info "Parsing SOC 2025-26..."
$list2025 = New-Object System.Collections.Generic.List[Object]
$file2526 = Join-Path $socDir "2025-26 (2).xlsx"
if (Test-Path $file2526) {
    $wb = $excel.Workbooks.Open($file2526, [Type]::Missing, $true)
    $sheet = $wb.Worksheets.Item("TemplateList (15)")
    if ($sheet -ne $null) {
        $values = $sheet.UsedRange.Value2
        $rowCount = $sheet.UsedRange.Rows.Count
        for ($r = 2; $r -le $rowCount; $r++) {
            $template = if ($values[$r, 1] -ne $null) { $values[$r, 1].ToString().Trim() } else { "" }
            $code = if ($values[$r, 2] -ne $null) { $values[$r, 2].ToString().Trim() } else { "" }
            $name = if ($values[$r, 3] -ne $null) { $values[$r, 3].ToString().Trim() } else { "" }
            $type = if ($values[$r, 4] -ne $null) { $values[$r, 4].ToString().Trim() } else { "" }
            $dept = if ($values[$r, 5] -ne $null) { $values[$r, 5].ToString().Trim() } else { "" }
            $rateStr = if ($values[$r, 6] -ne $null) { $values[$r, 6].ToString().Trim() } else { "" }
            $rateNum = 0
            if (-not [double]::TryParse($rateStr, [ref]$rateNum)) { $rateNum = 0 }
            
            if ([string]::IsNullOrEmpty($code) -or [string]::IsNullOrEmpty($name)) { continue }
            
            $list2025.Add([PSCustomObject]@{
                id = $code
                name = $name
                type = $type
                dept = $dept
                rate = $rateNum
                template = $template
            })
        }
    }
    $wb.Close($false)
}

# 7. Parse HDFC ERGO 2024 Templates
Log-Info "Parsing HDFC ERGO 2024 Templates..."
$listHdfcErgo = New-Object System.Collections.Generic.List[Object]
if (Test-Path $ergoDir) {
    $ergoFiles = Get-ChildItem -Path $ergoDir -Filter "*.xlsx"
    foreach ($file in $ergoFiles) {
        Log-Info "Parsing HDFC ERGO File: $($file.Name)"
        $wb = $excel.Workbooks.Open($file.FullName, [Type]::Missing, $true)
        $sheet = $wb.Worksheets.Item(1)
        $values = $sheet.UsedRange.Value2
        $rowCount = $sheet.UsedRange.Rows.Count
        
        for ($r = 2; $r -le $rowCount; $r++) {
            $template = if ($values[$r, 1] -ne $null) { $values[$r, 1].ToString().Trim() } else { "" }
            $code = if ($values[$r, 2] -ne $null) { $values[$r, 2].ToString().Trim() } else { "" }
            $name = if ($values[$r, 3] -ne $null) { $values[$r, 3].ToString().Trim() } else { "" }
            $type = if ($values[$r, 4] -ne $null) { $values[$r, 4].ToString().Trim() } else { "" }
            $dept = if ($values[$r, 5] -ne $null) { $values[$r, 5].ToString().Trim() } else { "" }
            $rateStr = if ($values[$r, 6] -ne $null) { $values[$r, 6].ToString().Trim() } else { "" }
            $rateNum = 0
            if (-not [double]::TryParse($rateStr, [ref]$rateNum)) { $rateNum = 0 }
            
            if ([string]::IsNullOrEmpty($code) -or [string]::IsNullOrEmpty($name)) { continue }
            
            $listHdfcErgo.Add([PSCustomObject]@{
                id = $code
                name = $name
                type = $type
                dept = $dept
                rate = $rateNum
                template = $template
            })
        }
        $wb.Close($false)
    }
} else {
    Log-Info "Warning: HDFC ERGO folder not found at $ergoDir"
}

# 8. Parse Agreement Details
Log-Info "Parsing Agreement Details..."
$listAgreements = New-Object System.Collections.Generic.List[Object]
if (Test-Path $agreementFile) {
    $wb = $excel.Workbooks.Open($agreementFile, [Type]::Missing, $true)
    $sheet = $wb.Worksheets.Item("Agreements with following Tarif")
    if ($sheet -eq $null) {
        $sheet = $wb.Worksheets.Item(1)
    }
    if ($sheet -ne $null) {
        $values = $sheet.UsedRange.Value2
        $rowCount = $sheet.UsedRange.Rows.Count
        
        $agMap = [ordered]@{}
        
        # helper for customer type classification
        function Get-CustomerType($custName, $agName) {
            $n = ($custName + " " + $agName).ToUpper()
            if ($n -like "*INSURANCE*" -or $n -like "*HEALTH*" -or $n -like "*CHOLA*" -or $n -like "*IFFCO*" -or $n -like "*TATA AIG*" -or $n -like "*BAJAJ ALLIANZ*" -or $n -like "*SBI GENERAL*" -or $n -like "*HDFC ERGO*") {
                return "Insurance Company"
            }
            if ($n -like "*TPA*" -or $n -like "*MEDI ASSIST*" -or $n -like "*MDINDIA*" -or $n -like "*VIDAL*" -or $n -like "*PARAMOUNT*" -or $n -like "*HERITAGE*" -or $n -like "*VIPUL*" -or $n -like "*EAST WEST*" -or $n -like "*GENINSVALU*" -or $n -like "*ALANKIT*" -or $n -like "*PARK MEDICLAIM*") {
                return "TPA"
            }
            if ($n -like "*BANK*") {
                return "Bank"
            }
            if ($n -like "*GOVT*" -or $n -like "*GOVERNMENT*" -or $n -like "*RAILWAY*" -or $n -like "*POST*" -or $n -like "*POLICE*" -or $n -like "*AIRPORT*" -or $n -like "*ECHS*" -or $n -like "*CGHS*" -or $n -like "*AIDC*" -or $n -like "*ASTC*" -or $n -like "*ONGC*" -or $n -like "*OIL INDIA*" -or $n -like "*COAL INDIA*" -or $n -like "*FCI*") {
                return "State Govt. Organization"
            }
            return "Corporate"
        }
        
        for ($r = 4; $r -le $rowCount; $r++) {
            $agName = if ($values[$r, 3] -ne $null) { $values[$r, 3].ToString().Trim() } else { "" }
            $custName = if ($values[$r, 5] -ne $null) { $values[$r, 5].ToString().Trim() } else { "" }
            $tplName = if ($values[$r, 7] -ne $null) { $values[$r, 7].ToString().Trim() } else { "" }
            $effVal = if ($values[$r, 11] -ne $null) { $values[$r, 11] } else { $null }
            $expVal = if ($values[$r, 12] -ne $null) { $values[$r, 12] } else { $null }
            $locName = if ($values[$r, 14] -ne $null) { $values[$r, 14].ToString().Trim() } else { "" }
            
            if ([string]::IsNullOrEmpty($agName)) { continue }
            
            $key = $agName
            if (-not $agMap.Contains($key)) {
                $agMap[$key] = [PSCustomObject]@{
                    customerType = Get-CustomerType $custName $agName
                    agreementName = $key
                    tariffMappedList = New-Object System.Collections.Generic.List[string]
                    status = "Available/Valid"
                    minEff = $null
                    maxExp = $null
                    locations = New-Object System.Collections.Generic.List[string]
                }
            }
            
            $entry = $agMap[$key]
            
            if ($tplName -and -not $entry.tariffMappedList.Contains($tplName)) {
                $entry.tariffMappedList.Add($tplName)
            }
            
            if ($locName -and -not $entry.locations.Contains($locName)) {
                $entry.locations.Add($locName)
            }
            
            # Parse Dates
            if ($effVal -ne $null) {
                $effDate = $null
                $numVal = 0
                if ([double]::TryParse($effVal.ToString(), [ref]$numVal) -and $numVal -gt 10000) {
                    $effDate = [DateTime]::FromOADate($numVal)
                }
                if ($effDate -ne $null) {
                    if ($null -eq $entry.minEff -or $effDate -lt $entry.minEff) {
                        $entry.minEff = $effDate
                    }
                }
            }
            if ($expVal -ne $null) {
                $expDate = $null
                $numVal = 0
                if ([double]::TryParse($expVal.ToString(), [ref]$numVal) -and $numVal -gt 10000) {
                    $expDate = [DateTime]::FromOADate($numVal)
                }
                if ($expDate -ne $null) {
                    if ($null -eq $entry.maxExp -or $expDate -gt $entry.maxExp) {
                        $entry.maxExp = $expDate
                    }
                }
            }
        }
        
        # Convert back to list of objects
        foreach ($k in $agMap.Keys) {
            $entry = $agMap[$k]
            $tariffMapped = $entry.tariffMappedList -join ", "
            $locationsStr = $entry.locations -join " | "
            
            # default dates
            $fromDate = "01-01-2025"
            if ($entry.minEff) {
                $fromDate = $entry.minEff.ToString("dd-MM-yyyy")
            }
            $toDate = "31-12-2027"
            if ($entry.maxExp) {
                $toDate = $entry.maxExp.ToString("dd-MM-yyyy")
            }
            
            $listAgreements.Add([PSCustomObject]@{
                customerType = $entry.customerType
                agreementName = $entry.agreementName
                tariffMapped = $tariffMapped
                discountMapped = "Refer to master discount schedule"
                status = "Available/Valid"
                fromDate = $fromDate
                toDate = $toDate
                discountAgreed = "Refer to master discount schedule"
                locations = $locationsStr
            })
        }
    }
    $wb.Close($false)
} else {
    Log-Info "Warning: Agreement file not found at $agreementFile"
}

# 9. Parse Excelcare SOC 2025-26 (SOC FY26  CREDIT (1).xls)
Log-Info "Parsing Excelcare SOC 2025-26..."
$listExcelcare2025 = New-Object System.Collections.Generic.List[Object]
$excelcareDir = "S:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/Other Related data/Execlcare - Tarrif"
$excelcareFile2025 = Join-Path $excelcareDir "SOC FY26  CREDIT (1).xls"

if (Test-Path $excelcareFile2025) {
    $wb = $excel.Workbooks.Open($excelcareFile2025, [Type]::Missing, $true)
    $sheet = $wb.Worksheets.Item("SOC 25-26 Merged")
    if ($sheet -ne $null) {
        $values = $sheet.UsedRange.Value2
        $rowCount = $sheet.UsedRange.Rows.Count
        for ($r = 2; $r -le $rowCount; $r++) {
            $code = if ($values[$r, 1] -ne $null) { $values[$r, 1].ToString().Trim() } else { "" }
            $name = if ($values[$r, 2] -ne $null) { $values[$r, 2].ToString().Trim() } else { "" }
            $rateStr = if ($values[$r, 3] -ne $null) { $values[$r, 3].ToString().Trim() } else { "" }
            $rateNum = 0
            if (-not [double]::TryParse($rateStr, [ref]$rateNum)) { $rateNum = 0 }
            
            if ([string]::IsNullOrEmpty($code) -or [string]::IsNullOrEmpty($name)) { continue }
            
            $listExcelcare2025.Add([PSCustomObject]@{
                id = $code
                name = $name
                rate = $rateNum
            })
        }
    }
    $wb.Close($false)
} else {
    Log-Info "Warning: Excelcare 2025-26 SOC file not found at $excelcareFile2025"
}

# 10. Parse Excelcare SOC 2024-25 (SOC FY24-25 Credit (2).xls)
Log-Info "Parsing Excelcare SOC 2024-25..."
$listExcelcare2024 = New-Object System.Collections.Generic.List[Object]
$excelcareFile2024 = Join-Path $excelcareDir "SOC FY24-25 Credit (2).xls"

if (Test-Path $excelcareFile2024) {
    $wb = $excel.Workbooks.Open($excelcareFile2024, [Type]::Missing, $true)
    $sheet = $wb.Worksheets.Item("Merged")
    if ($sheet -ne $null) {
        $values = $sheet.UsedRange.Value2
        $rowCount = $sheet.UsedRange.Rows.Count
        $colCount = $sheet.UsedRange.Columns.Count
        for ($r = 2; $r -le $rowCount; $r++) {
            # In 24-25 Merged sheet: Col 2 is Service ID, Col 3 is Service Name, Col 5 is standard rate
            $code = if ($values[$r, 2] -ne $null) { $values[$r, 2].ToString().Trim() } else { "" }
            $name = if ($values[$r, 3] -ne $null) { $values[$r, 3].ToString().Trim() } else { "" }
            
            if ([string]::IsNullOrEmpty($code) -or [string]::IsNullOrEmpty($name)) { continue }
            
            $rateNum = 0
            $rateStr = if ($values[$r, 5] -ne $null) { $values[$r, 5].ToString().Trim() } else { "" }
            if ($rateStr -and [double]::TryParse($rateStr, [ref]$rateNum)) {
                # Found in Col 5
            } else {
                # Fallback check columns 6 to 12
                for ($c = 6; $c -le $colCount; $c++) {
                    $rateStr = if ($values[$r, $c] -ne $null) { $values[$r, $c].ToString().Trim() } else { "" }
                    $valNum = 0
                    if ($rateStr -and [double]::TryParse($rateStr, [ref]$valNum)) {
                        $rateNum = $valNum
                        break
                    }
                }
            }
            
            $listExcelcare2024.Add([PSCustomObject]@{
                id = $code
                name = $name
                rate = $rateNum
            })
        }
    }
    $wb.Close($false)
} else {
    Log-Info "Warning: Excelcare 2024-25 SOC file not found at $excelcareFile2024"
}

# 11. Parse Excelcare 2026 - Cash SOC (SOC FY26  CASH.xls)
Log-Info "Parsing Excelcare 2026 - Cash SOC..."
$listExcelcareCash2025 = New-Object System.Collections.Generic.List[Object]
$excelcareCashFile = "S:/Sid Work/1. Apollo/@ Apollo Guwahti/Tarriff Working/Tarrif Reporting Format/Other Related data/International/OP Bill Checking/SOC FY26  CASH.xls"

if (Test-Path $excelcareCashFile) {
    $wb = $excel.Workbooks.Open($excelcareCashFile, [Type]::Missing, $true)
    for ($i = 1; $i -le $wb.Worksheets.Count; $i++) {
        $sheet = $wb.Worksheets.Item($i)
        $sheetName = $sheet.Name
        if ($sheetName -in @("Index", "cover page", "01 Billing terms", "1.1 Additional Terms", "Others", "Room Tariff", "Doctor Consultancy", "end page")) {
            continue
        }
        
        $values = $sheet.UsedRange.Value2
        if ($null -eq $values) { continue }
        $rowCount = $sheet.UsedRange.Rows.Count
        $colCount = $sheet.UsedRange.Columns.Count
        if ($rowCount -lt 3) { continue }
        
        $headerRow = 0
        $codeCol = 0
        $nameCol = 0
        $rateCol = 0
        
        for ($r = 1; $r -le [Math]::Min(15, $rowCount); $r++) {
            for ($c = 1; $c -le $colCount; $c++) {
                $v = if ($values[$r, $c] -ne $null) { $values[$r, $c].ToString().Trim().ToUpper() } else { "" }
                if ($v -eq "CODE" -or $v -eq "SERVICE CODE" -or $v -eq "SERVICEID" -or $v -eq "SERVICE CODE") {
                    $headerRow = $r
                    $codeCol = $c
                }
            }
            if ($headerRow -gt 0) {
                for ($c = 1; $c -le $colCount; $c++) {
                    $v = if ($values[$headerRow, $c] -ne $null) { $values[$headerRow, $c].ToString().Trim().ToUpper() } else { "" }
                    if ($v -match "NAME|PROCEDURE|SERVICE|PARTICULARS|BED CATEGORY|DESCRIPTION") {
                        if ($v -notmatch "TYPE|GROUP|CATEGORYNAME|DEPT|DEPARTMENT") {
                            if ($c -ne $codeCol) { $nameCol = $c }
                        }
                    }
                    if ($v -match "TARIFF|RATE|AMT|PRICE|CHARGE|OPD/EMERGENCY|CASH|AMOUNT") {
                        $rateCol = $c
                    }
                }
                break
            }
        }
        
        if ($codeCol -eq 0) { $codeCol = 1 }
        if ($nameCol -eq 0) { $nameCol = 2 }
        if ($rateCol -eq 0) { $rateCol = 5 }
        $startRow = if ($headerRow -gt 0) { $headerRow + 1 } else { 1 }
        
        for ($r = $startRow; $r -le $rowCount; $r++) {
            $code = if ($values[$r, $codeCol] -ne $null) { $values[$r, $codeCol].ToString().Trim() } else { "" }
            if ([string]::IsNullOrEmpty($code) -or $code -eq "CODE" -or $code -eq "SERVICE CODE") { continue }
            
            $name = if ($values[$r, $nameCol] -ne $null) { $values[$r, $nameCol].ToString().Trim() } else { "" }
            if ([string]::IsNullOrEmpty($name)) { continue }
            
            # Rate extraction with non-zero fallback
            $rateStr = if ($values[$r, $rateCol] -ne $null) { $values[$r, $rateCol].ToString().Trim() } else { "" }
            $rateNum = 0
            if ($rateStr -and [double]::TryParse($rateStr, [ref]$rateNum) -and $rateNum -gt 0) {
                # Found valid positive rate
            } else {
                $rateNum = 0
                for ($c = 5; $c -le $colCount; $c++) {
                    $rateStr = if ($values[$r, $c] -ne $null) { $values[$r, $c].ToString().Trim() } else { "" }
                    $valNum = 0
                    if ($rateStr -and [double]::TryParse($rateStr, [ref]$valNum) -and $valNum -gt 0) {
                        $rateNum = $valNum
                        break
                    }
                }
            }
            
            $listExcelcareCash2025.Add([PSCustomObject]@{
                id = $code
                name = $name
                rate = $rateNum
            })
        }
    }
    $wb.Close($false)
} else {
    Log-Info "Warning: Excelcare 2026 - Cash SOC file not found at $excelcareCashFile"
}

$excel.Quit()
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

# Write everything to tariff_data.js
Log-Info "Writing output file: $outputFile"

$dataArray = @($servicesHash.Values)
$jsonMaster = $dataArray | ConvertTo-Json -Depth 5
$jsonTpaRoom = $tpaRoomRent | ConvertTo-Json
$jsonGipsaRoom = $gipsaRoomRent | ConvertTo-Json
$jsonRoomRent2021 = $roomRent2021 | ConvertTo-Json
$jsonNursing = $nursingCharges | ConvertTo-Json
$jsonMonitoring = $monitoringCharges | ConvertTo-Json
$jsonVisit = $visitCharges | ConvertTo-Json

$json2021 = $list2021 | ConvertTo-Json -Depth 5
$json2023 = $list2023 | ConvertTo-Json -Depth 5
$json2024 = $list2024 | ConvertTo-Json -Depth 5
$json2025 = $list2025 | ConvertTo-Json -Depth 5
$jsonExcelcare2025 = $listExcelcare2025 | ConvertTo-Json -Depth 5
$jsonExcelcareCash2025 = $listExcelcareCash2025 | ConvertTo-Json -Depth 5
$jsonExcelcare2024 = $listExcelcare2024 | ConvertTo-Json -Depth 5
$jsonHdfcErgo = $listHdfcErgo | ConvertTo-Json -Depth 5
$jsonAgreements = $listAgreements | ConvertTo-Json -Depth 5

# Safety guards to prevent empty/null assignments causing syntax errors in JS
$jsonMaster = if ($jsonMaster) { $jsonMaster } else { "[]" }
$jsonTpaRoom = if ($jsonTpaRoom) { $jsonTpaRoom } else { "{}" }
$jsonGipsaRoom = if ($jsonGipsaRoom) { $jsonGipsaRoom } else { "{}" }
$jsonRoomRent2021 = if ($jsonRoomRent2021) { $jsonRoomRent2021 } else { "{}" }
$jsonNursing = if ($jsonNursing) { $jsonNursing } else { "{}" }
$jsonMonitoring = if ($jsonMonitoring) { $jsonMonitoring } else { "{}" }
$jsonVisit = if ($jsonVisit) { $jsonVisit } else { "{}" }

$json2021 = if ($json2021) { $json2021 } else { "[]" }
$json2023 = if ($json2023) { $json2023 } else { "[]" }
$json2024 = if ($json2024) { $json2024 } else { "[]" }
$json2025 = if ($json2025) { $json2025 } else { "[]" }
$jsonExcelcare2025 = if ($jsonExcelcare2025) { $jsonExcelcare2025 } else { "[]" }
$jsonExcelcareCash2025 = if ($jsonExcelcareCash2025) { $jsonExcelcareCash2025 } else { "[]" }
$jsonExcelcare2024 = if ($jsonExcelcare2024) { $jsonExcelcare2024 } else { "[]" }
$jsonHdfcErgo = if ($jsonHdfcErgo) { $jsonHdfcErgo } else { "[]" }
$jsonAgreements = if ($jsonAgreements) { $jsonAgreements } else { "[]" }

$jsContent = @"
const TARIFF_DATA = $jsonMaster;

const ROOM_RENT_TPA = $jsonTpaRoom;
const ROOM_RENT_GIPSA = $jsonGipsaRoom;
const ROOM_RENT_2021_COMPILED = $jsonRoomRent2021;
const NURSING_CHARGES = $jsonNursing;
const MONITORING_CHARGES = $jsonMonitoring;
const VISIT_CHARGES = $jsonVisit;

const TARIFF_2021 = $json2021;
const TARIFF_2023 = $json2023;
const TARIFF_2024 = $json2024;
const TARIFF_2025 = $json2025;
const TARIFF_EXCELCARE_2025 = $jsonExcelcare2025;
const TARIFF_EXCELCARE_CASH_2025 = $jsonExcelcareCash2025;
const TARIFF_EXCELCARE_2024 = $jsonExcelcare2024;
const TARIFF_HDFC_ERGO_2024 = $jsonHdfcErgo;
const AGREEMENT_DETAILS = $jsonAgreements;
"@

$jsContent | Out-File -FilePath $outputFile -Encoding utf8

$endAll = Get-Date
Log-Info "=================================================="
Log-Info "Full compilation successful!"
Log-Info "Master 2026 records: $($dataArray.Count)"
Log-Info "SOC 2021-22 records: $($list2021.Count)"
Log-Info "SOC 2023-24 records: $($list2023.Count)"
Log-Info "SOC 2024-25 records: $($list2024.Count)"
Log-Info "SOC 2025-26 records: $($list2025.Count)"
Log-Info "Excelcare SOC 25-26 records: $($listExcelcare2025.Count)"
Log-Info "Excelcare 2026 - Cash records: $($listExcelcareCash2025.Count)"
Log-Info "Excelcare SOC 24-25 records: $($listExcelcare2024.Count)"
Log-Info "HDFC ERGO 2024 records: $($listHdfcErgo.Count)"
Log-Info "Agreements compiled: $($listAgreements.Count)"
Log-Info "Total execution time: $(($endAll - $startAll).TotalSeconds) seconds"
Log-Info "=================================================="
