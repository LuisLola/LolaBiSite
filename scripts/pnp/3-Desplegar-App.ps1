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

# En DOS pasos a proposito: Add-PnPApp con -Publish falla con "appMetadata".
$app = Add-PnPApp -Path $sppkg -Scope Tenant -Overwrite -Connection $catalogo

if (-not $app) {
  # Add-PnPApp devuelve null, sin error, cuando SharePoint sube el fichero pero
  # RECHAZA el manifiesto. Pasa, por ejemplo, si solution.name lleva espacios o
  # signos: ese valor va al atributo Name del manifiesto XML y se valida contra
  # NameDefinition. El motivo real esta en la propia biblioteca:
  $item = Get-PnPListItem -List 'AppCatalog' -Connection $catalogo |
    Where-Object { $_.FieldValues['FileLeafRef'] -eq (Split-Path $sppkg -Leaf) }
  $motivo = if ($item) { $item.FieldValues['AppPackageErrorMessage'] } else { '(el fichero no esta en el catalogo)' }
  throw "SharePoint ha rechazado el paquete. Motivo: $motivo"
}

Write-Host "   subido: $($app.Title)"
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
    try {
      Approve-PnPTenantServicePrincipalPermissionRequest -RequestId $peticion.Id -Force -Connection $admin | Out-Null
    } catch {
      # Visto en este tenant: "El principal servicio de solicitud de permiso ...
      # no se pudo encontrar". La aprobacion por API depende del principal de
      # extensibilidad de SharePoint, que no siempre esta accesible por aqui.
      # Desde la UI si se puede, y es un clic.
      Write-Warning "No se ha podido aprobar '$($peticion.Scope)' por API: $($_.Exception.Message)"
      Write-Host "  Apruebalo a mano en: $UrlAdmin/_layouts/15/online/AdminHome.aspx#/webApiPermissionManagement" -ForegroundColor Yellow
    }
  }
  Write-Host "  Sin estos permisos el portal funciona en consulta, pero nadie" -ForegroundColor DarkGray
  Write-Host "  aparece en ningun equipo de Teams y el filtrado por area no aplica." -ForegroundColor DarkGray
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
