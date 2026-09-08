# Sube el .sppkg al catalogo, aprueba los permisos de Graph y (opcional) deja
# la pagina del portal montada. Idempotente.
#
#   .\3-Desplegar-App.ps1
#   .\3-Desplegar-App.ps1 -ConfigurarPagina
#
# El build va antes y a mano, porque /spfx exige Node 22 (SPFx 1.22.1, Heft):
#   cd spfx; npm install; npm run build

param(
  [switch]$ConfigurarPagina
)

# PnP.PowerShell 2.12.0 A PROPOSITO, no la 3.x.
#
# En la 3.x, Add-PnPApp termina sin error, devuelve null y NO sube nada: el
# catalogo se queda igual y el script parece haber funcionado. El repo de la
# intranet documenta lo mismo para la 3.1.0 (NullReferenceException), y fija la
# 2.12.0 por esa razon.
#
# Instalarla:  Install-Module PnP.PowerShell -RequiredVersion 2.12.0 -Scope CurrentUser -AllowClobber
Remove-Module PnP.PowerShell -Force -ErrorAction SilentlyContinue
Import-Module PnP.PowerShell -RequiredVersion 2.12.0 -Force
Write-Host "PnP.PowerShell $((Get-Module PnP.PowerShell).Version) (fijada: la 3.x no sube el paquete)"

. "$PSScriptRoot\PortalBI.Comun.ps1"

$raiz  = Resolve-Path "$PSScriptRoot\..\.."
$sppkg = Join-Path $raiz 'spfx\sharepoint\solution\portal-bi.sppkg'
$solucion = Join-Path $raiz 'spfx\config\package-solution.json'

if (-not (Test-Path $sppkg)) {
  throw "No existe $sppkg. Ejecuta antes: cd spfx; npm install; npm run build (con Node 22)"
}
if ((Get-Item $sppkg).LastWriteTime -lt (Get-Item $solucion).LastWriteTime) {
  throw "El .sppkg es mas viejo que package-solution.json. Vuelve a empaquetar antes de subirlo."
}

# --- 1. Catalogo -------------------------------------------------------------
# Con skipFeatureDeployment: true la app queda disponible en todos los sitios al
# publicarla. NO se llama a Install-PnPApp: con esa combinacion da error.
$catalogo = Conectar $UrlCatalogo
Write-Host "+ subiendo $(Split-Path $sppkg -Leaf)"

# En DOS pasos a proposito. Add-PnPApp con -Publish falla en PnP 3.x
# ("appMetadata"), y el repo de la intranet documenta lo mismo con la 3.1.0
# (NullReferenceException). Subir y publicar por separado si funciona.
$app = Add-PnPApp -Path $sppkg -Scope Tenant -Overwrite -Connection $catalogo
if (-not $app) { throw "Add-PnPApp no ha devuelto nada: el paquete no se ha subido. Comprueba la version de PnP.PowerShell." }
Write-Host "   subido: $($app.Title)"

# OJO: Publish-PnPApp de la 2.12.0 no acepta -Force.
Publish-PnPApp -Identity $app.Id -Scope Tenant -SkipFeatureDeployment -Connection $catalogo | Out-Null
Write-Host "   publicado en el catalogo de tenant"

# --- 2. Permisos de Graph ----------------------------------------------------
# Los declara spfx/config/package-solution.json (GroupMember.Read.All,
# User.Read.All). Sin aprobarlos, IdentidadSharePoint traga el error y devuelve
# grupos: [] -> nadie es administrador y no se ve ninguna area. Causa numero uno
# de "el portal sale vacio".
$admin = Conectar $UrlAdmin

# Los scopes se leen del propio package-solution.json: asi esta lista y la que
# pide la solucion no pueden divergir.
$declarados = @(
  (Get-Content $solucion -Raw | ForEach-Object { $_ -replace '(?m)^\s*//.*$', '' } | ConvertFrom-Json).solution.webApiPermissionRequests |
    Where-Object { $_.resource -eq 'Microsoft Graph' } |
    ForEach-Object { $_.scope }
)
Write-Host "   scopes declarados: $($declarados -join ', ')"

# El cmdlet es PLURAL. El singular no existe y solo da "no se reconoce".
# IMPORTANTE: se filtran los scopes de ESTA solucion. La lista de pendientes del
# tenant trae peticiones de otras aplicaciones, y aprobarlas a ciegas concederia
# permisos que nadie ha pedido.
$pendientes = @(
  Get-PnPTenantServicePrincipalPermissionRequests -Connection $admin |
    Where-Object { $_.Resource -eq 'Microsoft Graph' -and $declarados -contains $_.Scope }
)

if ($pendientes.Count -eq 0) {
  Write-Host "= sin peticiones pendientes (o ya concedidas)"
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
