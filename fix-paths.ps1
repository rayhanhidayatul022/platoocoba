# Script untuk mengubah semua path relatif menjadi absolute path

$files = Get-ChildItem -Path "." -Filter "*.html" -File

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # Replace src="src/ dengan src="/src/
    $content = $content -replace 'src="src/', 'src="/src/'
    
    # Replace href="src/ dengan href="/src/
    $content = $content -replace 'href="src/', 'href="/src/'
    
    # Save file
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
    Write-Host "Fixed: $($file.Name)"
}

Write-Host "`nDone! All HTML files have been updated with absolute paths."
