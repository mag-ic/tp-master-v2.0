$src = "c:\Users\conta\Desktop\tp-master"
$tmp = "c:\Users\conta\Desktop\tp-master-temp"
$zip = "c:\Users\conta\Desktop\tp-master\application.zip"

Write-Host "Nettoyage des anciens fichiers..."
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
if (Test-Path $zip) { Remove-Item -Force $zip }

Write-Host "Création du dossier temporaire..."
New-Item -ItemType Directory -Path $tmp | Out-Null

Write-Host "Copie des fichiers du projet (exclusion des dossiers volumineux)..."
# Robocopy returns exit codes. 1 means files copied successfully. We run it and suppress exit check.
robocopy $src $tmp /E /XD .git .next node_modules /XF Backup_TPMaster* application.zip create-archive.ps1 | Out-Null

Write-Host "Compression en cours..."
Compress-Archive -Path "$tmp\*" -DestinationPath $zip

Write-Host "Nettoyage..."
Remove-Item -Recurse -Force $tmp

Write-Host "Terminé ! L'archive est disponible à l'adresse : $zip"
