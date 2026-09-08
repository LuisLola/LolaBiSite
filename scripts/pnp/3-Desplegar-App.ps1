# Sube el .sppkg al catalogo, aprueba los permisos de Graph y (opcional) deja
# la pagina del portal montada. Idempotente.
#
#   .\3-Desplegar-App.ps1
#   .\3-Desplegar-App.ps1 -ConfigurarPagina
#
# El build va antes y a mano, porque /spfx exige Node 18:
#   cd spfx && nvm use 18 && npm install
#   gulp bundle --ship && gulp package-solution --ship

param(
  [switch]$ConfigurarPagina
)

. "$PSScriptRoot\PortalBI.Comun.ps1"

$raiz  = Resolve-Path "$PSScriptRoot\..\.."
$sppkg = Join-Path $raiz 'spfx\sharepoint\solution\portal-bi.sppkg'
$solucion = Join-Path $raiz 'spfx\config\package-solution.json'

if (-not (Test-Path $sppkg)) {
  throw "No existe $sppkg. Ejecuta antes: cd spfx && nvm use 18 && gulp bundle --ship && gulp package-solution --ship"
}
if ((Get-Item $sppkg).LastWriteTime -lt (Get-Item $solucion).LastWriteTime) {
  throw "El .sppkg es mas viejo que package-solution.json. Vuelve a empaquetar antes de subirlo."
}

# --- 1. Catalogo -------------------------------------------------------------
# Con skipFeatureDeployment: true la app queda disponible en todos los sitios al
# publicarla. NO se llama a Install-PnPApp: con esa combinacion da error.
$catalogo = Conectar $UrlCatalogo
Write-Host "+ subiendo $(Split-Path $sppkg -Leaf)"
Add-PnPApp -Path $sppkg -Scope Tenant -Publish -Overwrite -SkipFeatureDeployment -Connection $catalogo | Out-Null

# --- 2. Permisos de Graph ----------------------------------------------------
# Los declara spfx/config/package-solution.json (GroupMember.Read.All,
# User.Read.All). Sin aprobarlos, IdentidadSharePoint traga el error y devuelve
# grupos: [] -> nadie es administrador y no se ve ninguna area. Causa numero uno
# de "el portal sale vacio".
$admin = Conectar $UrlAdmin
$concedidos = (Get-PnPTenantServicePrincipalPermissionGrants -Connection $admin | ForEach-Object { $_.Scope }) -join ' '
$pendientes = Get-PnPTenantServicePrincipalPermissionRequest -Connection $admin |
  Where-Object { $_.Resource -eq 'Microsoft Graph' -and $concedidos -notmatch [regex]::Escape($_.Scope) }

if (-not $pendientes) {
  Write-Host "= permisos de Graph ya concedidos"
} else {
  foreach ($peticion in $pendientes) {
    Write-Host "+ aprobando $($peticion.Scope)"
    Approve-PnPTenantServicePrincipalPermissionRequest -RequestId $peticion.Id -Force -Connection $admin | Out-Null
  }
}

# --- 3. Pagina del portal ----------------------------------------------------
if ($ConfigurarPagina) {
  $portal = Conectar $UrlPortal
  Write-Host "`n[Pagina]"

  $pagina = $null
  try { $pagina = Get-PnPPage -Identity 'Home' -Connection $portal -ErrorAction Stop } catch {}
  if (-not $pagina) {
    Add-PnPPage -Name 'Home' -LayoutType Home -Connection $portal | Out-Null
  }

  # Ancho completo si la deja; si no, una columna normal.
  try {
    Add-PnPPageSection -Page 'Home' -SectionTemplate OneColumnFullWidth -Connection $portal -ErrorAction Stop | Out-Null
  } catch {
    Add-PnPPageSection -Page 'Home' -SectionTemplate OneColumn -Connection $portal | Out-Null
  }

  # -Component empareja por titulo, asi que la app tiene que estar publicada ya.
  Add-PnPPageWebPart -Page 'Home' -Component 'Portal BI' -Section 1 -Column 1 -Connection $portal -WebPartProperties @{
    titulo                   = 'Portal BI'
    nombreLista              = $ListaPaneles
    nombreListaDepartamentos = $ListaDepartamentos
    grupoAdministradores     = $GrupoAdmin
    urlSitio                 = $UrlPortal
    modo                     = 'inline'
    mostrarAdministracion    = $true
  } | Out-Null

  Set-PnPPage -Identity 'Home' -CommentsEnabled:$false -Publish -Connection $portal | Out-Null
  Write-Host "   = $UrlPortal/SitePages/Home.aspx publicada"
}

Write-Host "`nListo." -ForegroundColor Green
