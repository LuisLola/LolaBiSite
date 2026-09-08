# Constantes y helpers compartidos por los scripts de aprovisionamiento.
# Se usa con dot-source:  . "$PSScriptRoot\PortalBI.Comun.ps1"

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# --- Identidad de la app de PnP PowerShell -----------------------------------
# Se obtiene UNA vez con el service account:
#   Register-PnPEntraIDAppForInteractiveLogin -ApplicationName "PnP PowerShell LolaCasademunt" `
#     -Tenant lolacasademunt.onmicrosoft.com -Interactive
# El ClientId no es un secreto. Sin el, todo Connect-PnPOnline -Interactive
# falla con AADSTS700016.
$ClientIdPnP = $env:PNP_CLIENT_ID

# --- Tenant ------------------------------------------------------------------
$TenantId  = '52dfd00a-ad1b-4688-8b88-c8cb5c7b1a70'
$UrlTenant = 'https://lolacasademunt.sharepoint.com'
$UrlAdmin  = 'https://lolacasademunt-admin.sharepoint.com'
$UrlCatalogo = "$UrlTenant/sites/appcatalog"

# --- Sitio del portal --------------------------------------------------------
$AliasSitio  = 'PortalBI'
$UrlPortal   = "$UrlTenant/sites/$AliasSitio"
$TituloSitio = 'Portal BI - Lola Casademunt'
$LcidSitio   = 3082   # es-ES
$PropietarioSitio = 'serviceaccountm365@lolacasademunt.com'

# --- Origen de la migracion --------------------------------------------------
# Ojo: la lista de Operaciones se llama con M mayuscula ("LolaCasadeMunt"),
# la nueva se crea como dice src/config/tenant.config.ts ("LolaCasademunt").
$UrlOrigen   = "$UrlTenant/sites/Operaciones"
$ListaOrigen = 'Paneles PowerBi LolaCasadeMunt'

# --- Listas del portal -------------------------------------------------------
$ListaPaneles       = 'Paneles PowerBi LolaCasademunt'
$UrlListaPaneles    = 'PanelesBI'         # deja la URL limpia: /Lists/PanelesBI
$ListaDepartamentos = 'Departamentos BI'
$UrlListaDepartamentos = 'DepartamentosBI'

$GrupoAdmin = 'BI-Administradores'

# --- Contrato de columnas ----------------------------------------------------
# ORIGEN DE VERDAD: src/data/excel/columnas.ts (campo "interno") y
# src/data/sharepoint/SharePointDepartamentoRepository.ts (const CAMPOS).
# Si cambia alli, cambia aqui. Comprobar-Campos es la red que lo detecta.
#
# Se crean SIEMPRE con Add-PnPFieldFromXml y Name/StaticName explicitos:
# SharePoint congela el nombre interno al crear el campo y lo deriva del
# display name (espacio -> _x0020_). Renombrar despues no lo cambia, y el
# sintoma de equivocarse es una columna vacia en todas las filas, sin error.

$CamposPaneles = [ordered]@{
  'Area_x0020_de_x0020_Trabajo' = '<Field Type="Text" Name="Area_x0020_de_x0020_Trabajo" StaticName="Area_x0020_de_x0020_Trabajo" DisplayName="Area de Trabajo" MaxLength="255" Required="FALSE" />'
  'Url_x0020_Panel'             = '<Field Type="URL" Name="Url_x0020_Panel" StaticName="Url_x0020_Panel" DisplayName="Url Panel" Format="Hyperlink" Required="FALSE" />'
  'UrlDirecta'                  = '<Field Type="URL" Name="UrlDirecta" StaticName="UrlDirecta" DisplayName="UrlDirecta" Format="Hyperlink" Required="FALSE" />'
  'Departamento'                = '<Field Type="Text" Name="Departamento" StaticName="Departamento" DisplayName="Departamento" MaxLength="255" Required="FALSE" />'
  'Descripcion'                 = '<Field Type="Note" Name="Descripcion" StaticName="Descripcion" DisplayName="Descripcion" NumLines="4" RichText="FALSE" RichTextMode="Compatible" Required="FALSE" />'
  'Responsable'                 = '<Field Type="Text" Name="Responsable" StaticName="Responsable" DisplayName="Responsable" MaxLength="255" Required="FALSE" />'
  'GrupoAcceso'                 = '<Field Type="Text" Name="GrupoAcceso" StaticName="GrupoAcceso" DisplayName="GrupoAcceso" MaxLength="255" Required="FALSE" />'
  'Destacado'                   = '<Field Type="Boolean" Name="Destacado" StaticName="Destacado" DisplayName="Destacado" Required="FALSE"><Default>0</Default></Field>'
  'Orden'                       = '<Field Type="Number" Name="Orden" StaticName="Orden" DisplayName="Orden" Decimals="0" Required="FALSE"><Default>0</Default></Field>'
  'Estado'                      = '<Field Type="Choice" Name="Estado" StaticName="Estado" DisplayName="Estado" Format="Dropdown" FillInChoice="FALSE" Required="FALSE"><Default>Activo</Default><CHOICES><CHOICE>Activo</CHOICE><CHOICE>En pruebas</CHOICE><CHOICE>Retirado</CHOICE></CHOICES></Field>'
  'HoraActualizacion'           = '<Field Type="Text" Name="HoraActualizacion" StaticName="HoraActualizacion" DisplayName="HoraActualizacion" MaxLength="16" Required="FALSE" />'
}

$CamposDepartamentos = [ordered]@{
  'Iniciales'         = '<Field Type="Text" Name="Iniciales" StaticName="Iniciales" DisplayName="Iniciales" MaxLength="8" Required="FALSE" />'
  'Color'             = '<Field Type="Text" Name="Color" StaticName="Color" DisplayName="Color" MaxLength="32" Required="FALSE" />'
  'ColorTexto'        = '<Field Type="Text" Name="ColorTexto" StaticName="ColorTexto" DisplayName="ColorTexto" MaxLength="32" Required="FALSE" />'
  'Descripcion'       = '<Field Type="Note" Name="Descripcion" StaticName="Descripcion" DisplayName="Descripcion" NumLines="4" RichText="FALSE" RichTextMode="Compatible" Required="FALSE" />'
  'Responsable'       = '<Field Type="Text" Name="Responsable" StaticName="Responsable" DisplayName="Responsable" MaxLength="255" Required="FALSE" />'
  'HoraActualizacion' = '<Field Type="Text" Name="HoraActualizacion" StaticName="HoraActualizacion" DisplayName="HoraActualizacion" MaxLength="16" Required="FALSE" />'
  'WorkspaceId'       = '<Field Type="Text" Name="WorkspaceId" StaticName="WorkspaceId" DisplayName="WorkspaceId" MaxLength="64" Required="FALSE" />'
  'EquipoId'          = '<Field Type="Text" Name="EquipoId" StaticName="EquipoId" DisplayName="EquipoId" MaxLength="64" Required="FALSE" />'
  'EquipoNombre'      = '<Field Type="Text" Name="EquipoNombre" StaticName="EquipoNombre" DisplayName="EquipoNombre" MaxLength="255" Required="FALSE" />'
  'EquipoCorreo'      = '<Field Type="Text" Name="EquipoCorreo" StaticName="EquipoCorreo" DisplayName="EquipoCorreo" MaxLength="255" Required="FALSE" />'
}

# Los 12 campos que el portal lee de la lista de paneles (Title incluido).
$InternosPaneles = @('Title') + $CamposPaneles.Keys
$InternosDepartamentos = @('Title') + $CamposDepartamentos.Keys

# --- Helpers -----------------------------------------------------------------

function Conectar {
  param([Parameter(Mandatory)][string]$Url)

  if (-not $ClientIdPnP) {
    throw "Falta el ClientId de PnP. Ejecuta Register-PnPEntraIDAppForInteractiveLogin y exporta PNP_CLIENT_ID (ver README)."
  }
  Write-Host "-> Conectando a $Url"
  Connect-PnPOnline -Url $Url -ClientId $ClientIdPnP -Interactive -ReturnConnection
}

function Asegurar-Lista {
  param(
    [Parameter(Mandatory)]$Conexion,
    [Parameter(Mandatory)][string]$Titulo,
    [Parameter(Mandatory)][string]$UrlInterna
  )

  $lista = Get-PnPList -Identity $Titulo -Connection $Conexion
  if ($lista) {
    Write-Host "   = lista '$Titulo' ya existe"
    return $lista
  }
  # Se crea con el nombre limpio (deja /Lists/PanelesBI) y se renombra despues.
  Write-Host "   + creando lista '$Titulo' en /Lists/$UrlInterna"
  New-PnPList -Title $UrlInterna -Template GenericList -OnQuickLaunch -Connection $Conexion | Out-Null
  Set-PnPList -Identity $UrlInterna -Title $Titulo -Connection $Conexion | Out-Null
  Get-PnPList -Identity $Titulo -Connection $Conexion
}

function Asegurar-Campo {
  param(
    [Parameter(Mandatory)]$Conexion,
    [Parameter(Mandatory)][string]$Lista,
    [Parameter(Mandatory)][string]$Interno,
    [Parameter(Mandatory)][string]$Xml
  )

  $existe = $null
  try { $existe = Get-PnPField -List $Lista -Identity $Interno -Connection $Conexion -ErrorAction Stop } catch {}
  if ($existe) {
    Write-Host "   = campo $Interno"
    return
  }
  Write-Host "   + campo $Interno"
  Add-PnPFieldFromXml -List $Lista -FieldXml $Xml -Connection $Conexion | Out-Null
}

function Renombrar-Title {
  param(
    [Parameter(Mandatory)]$Conexion,
    [Parameter(Mandatory)][string]$Lista,
    [Parameter(Mandatory)][string]$Etiqueta
  )
  # Title ya existe en toda lista: solo cambia la etiqueta visible.
  # El nombre interno sigue siendo 'Title', que es lo que leen los repositorios.
  Set-PnPField -List $Lista -Identity 'Title' -Values @{ Title = $Etiqueta } -Connection $Conexion | Out-Null
  Write-Host "   = Title etiquetado como '$Etiqueta'"
}

function Comprobar-Campos {
  param(
    [Parameter(Mandatory)]$Conexion,
    [Parameter(Mandatory)][string]$Lista,
    [Parameter(Mandatory)][string[]]$Esperados
  )

  $faltan = @()
  foreach ($interno in $Esperados) {
    try { Get-PnPField -List $Lista -Identity $interno -Connection $Conexion -ErrorAction Stop | Out-Null }
    catch { $faltan += $interno }
  }
  if ($faltan.Count -gt 0) {
    throw "La lista '$Lista' no tiene estos nombres internos: $($faltan -join ', '). El portal leeria esas columnas como vacias sin dar error. Arreglalo antes de seguir."
  }
  Write-Host "   OK '$Lista': $($Esperados.Count) nombres internos correctos" -ForegroundColor Green
}

function Asegurar-Miembro {
  param(
    [Parameter(Mandatory)]$Conexion,
    [Parameter(Mandatory)][string]$Grupo,
    [Parameter(Mandatory)][string]$LoginName
  )
  $ya = Get-PnPGroupMember -Identity $Grupo -Connection $Conexion | Where-Object { $_.LoginName -eq $LoginName }
  if ($ya) {
    Write-Host "   = '$LoginName' ya esta en '$Grupo'"
    return
  }
  Write-Host "   + '$LoginName' -> '$Grupo'"
  Add-PnPGroupMember -Identity $Grupo -LoginName $LoginName -Connection $Conexion | Out-Null
}
