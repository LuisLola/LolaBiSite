# Constantes y helpers compartidos por los scripts de aprovisionamiento.
# Se usa con dot-source:  . "$PSScriptRoot\PortalBI.Comun.ps1"

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# --- Identidad de la app de PnP PowerShell -----------------------------------
# La misma aplicacion de Entra que usa el repo de la intranet de SharePoint.
#
# No es un secreto: identifica la aplicacion, no autentica. La autenticacion es
# interactiva (-Interactive), la hace la persona con su sesion.
#
# Se puede sobrescribir con la variable de entorno PNP_CLIENT_ID.
$ClientIdPnP = if ($env:PNP_CLIENT_ID) { $env:PNP_CLIENT_ID } else { '9a1e5391-8317-4db1-b88e-75bb948e6ba8' }

# --- Tenant ------------------------------------------------------------------
$TenantId  = '52dfd00a-ad1b-4688-8b88-c8cb5c7b1a70'
$DominioTenant = 'lolacasademunt.onmicrosoft.com'
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
  'Pregunta'                    = '<Field Type="Text" Name="Pregunta" StaticName="Pregunta" DisplayName="Pregunta" MaxLength="255" Required="FALSE" />'
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

# --- Mapeo de la lista de origen ---------------------------------------------
# La lista de /sites/Operaciones NO usa los nombres internos del destino, asi
# que hay que traducir. Comprobado en la lista real:
#
#   titulo visible      nombre interno   tipo
#   Titulo              Title            Text
#   Area de Trabajo     Departamento     User    <- ojo: es un campo de persona
#   Url Panel           UrlPanel         URL
#   Departamento        Departamento0    Choice
#
# El nombre interno "Departamento" del origen apunta a "Area de Trabajo", no al
# departamento. Leerlo por el nombre del destino escribiria el nombre de una
# persona en la columna de departamento.
#
# destino -> @{ origen; tipo }, donde tipo es texto | url | usuario.
$MapaOrigen = [ordered]@{
  'Title'                       = @{ origen = 'Title';         tipo = 'texto' }
  'Area_x0020_de_x0020_Trabajo' = @{ origen = 'Departamento';  tipo = 'usuario' }
  'Url_x0020_Panel'             = @{ origen = 'UrlPanel';      tipo = 'url' }
  'Departamento'                = @{ origen = 'Departamento0'; tipo = 'texto' }
}

# --- Helpers -----------------------------------------------------------------

# Conexiones ya abiertas en este proceso, por URL.
$script:ConexionesPnP = @{}

function Conectar {
  param([Parameter(Mandatory)][string]$Url)

  if ($script:ConexionesPnP.ContainsKey($Url)) { return $script:ConexionesPnP[$Url] }

  $opciones = @{ Url = $Url; ClientId = $ClientIdPnP; ReturnConnection = $true }

  if ($env:PNP_DEVICE_LOGIN -eq '1') {
    # Para terminales que no pueden abrir un navegador (sesiones no
    # interactivas): imprime un codigo y una URL en la consola. Sin esto,
    # -Interactive se queda colgado esperando un navegador que nunca aparece.
    $opciones['DeviceLogin'] = $true
    $opciones['Tenant'] = $DominioTenant   # -DeviceLogin lo exige
  } else {
    $opciones['Interactive'] = $true
    # -PersistLogin guarda la cache de token en disco. Sin el, cada proceso
    # nuevo de PowerShell abre otra pestana para volver a iniciar sesion. Solo
    # existe en PnP 3.x; el script de despliegue usa la 2.12.0 a proposito.
    if ((Get-Command Connect-PnPOnline).Parameters.ContainsKey('PersistLogin')) {
      $opciones['PersistLogin'] = $true
    }
  }

  Write-Host "-> Conectando a $Url"
  $conexion = Connect-PnPOnline @opciones
  $script:ConexionesPnP[$Url] = $conexion
  return $conexion
}

function Asegurar-Lista {
  param(
    [Parameter(Mandatory)]$Conexion,
    [Parameter(Mandatory)][string]$Titulo,
    [Parameter(Mandatory)][string]$UrlInterna,
    # Para listas de configuracion que no deben ensuciar la navegacion del sitio
    # (p. ej. "Marca LC" en la raiz de la intranet).
    [switch]$SinQuickLaunch
  )

  $lista = $null
  try { $lista = Get-PnPList -Identity $Titulo -Connection $Conexion -ErrorAction Stop } catch {}
  if ($lista) {
    Write-Host "   = lista '$Titulo' ya existe"
    return $lista
  }
  # Se crea con el nombre limpio (deja /Lists/PanelesBI) y se renombra despues.
  Write-Host "   + creando lista '$Titulo' en /Lists/$UrlInterna"
  if ($SinQuickLaunch) {
    New-PnPList -Title $UrlInterna -Template GenericList -Connection $Conexion | Out-Null
  } else {
    New-PnPList -Title $UrlInterna -Template GenericList -OnQuickLaunch -Connection $Conexion | Out-Null
  }
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

  # OJO: nunca usar -Identity para comprobar si existe. -Identity empareja
  # tambien por titulo, y SharePoint trae campos internos ocultos cuyo titulo
  # en espanol coincide con los nuestros ("Order" se llama "Orden"). Eso hacia
  # que el campo se diera por creado y la columna no existiera nunca.
  $existe = Get-PnPField -List $Lista -Connection $Conexion | Where-Object { $_.InternalName -ceq $Interno }
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

  # Comparacion por nombre interno exacto y sensible a mayusculas. Con
  # -Identity esta comprobacion no vale: empareja por titulo y da por buenos
  # campos que no existen (ver el comentario de Asegurar-Campo).
  $reales = (Get-PnPField -List $Lista -Connection $Conexion | ForEach-Object { $_.InternalName })
  $faltan = @($Esperados | Where-Object { $reales -cnotcontains $_ })
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
  # No aborta el aprovisionamiento: si el grupo de M365 todavia no existe, las
  # listas ya estan bien y el permiso se arregla a mano o re-ejecutando.
  try {
    Add-PnPGroupMember -Identity $Grupo -LoginName $LoginName -Connection $Conexion -ErrorAction Stop | Out-Null
    Write-Host "   + '$LoginName' -> '$Grupo'"
  } catch {
    Write-Warning "No se ha podido anadir '$LoginName' a '$Grupo': $($_.Exception.Message)"
  }
}
