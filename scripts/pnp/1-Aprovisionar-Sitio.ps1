# Crea el sitio del portal y sus dos listas. Idempotente: se puede re-ejecutar.
#
#   .\1-Aprovisionar-Sitio.ps1
#   .\1-Aprovisionar-Sitio.ps1 -SoloComprobar    # no crea nada, solo valida

param(
  [switch]$SoloComprobar
)

. "$PSScriptRoot\PortalBI.Comun.ps1"

# --- 1. Sitio ----------------------------------------------------------------
if (-not $SoloComprobar) {
  $admin = Conectar $UrlAdmin
  $existente = $null
  try { $existente = Get-PnPTenantSite -Identity $UrlPortal -Connection $admin -ErrorAction Stop } catch {}

  if ($existente) {
    Write-Host "= sitio $UrlPortal ya existe"
  } else {
    Write-Host "+ creando Communication site $UrlPortal"
    New-PnPSite -Type CommunicationSite `
      -Title $TituloSitio `
      -Url $UrlPortal `
      -Lcid $LcidSitio `
      -Owner $PropietarioSitio `
      -Connection $admin | Out-Null
  }
}

$portal = Conectar $UrlPortal

# --- 2. Lista de paneles -----------------------------------------------------
Write-Host "`n[$ListaPaneles]"
if (-not $SoloComprobar) {
  Asegurar-Lista -Conexion $portal -Titulo $ListaPaneles -UrlInterna $UrlListaPaneles | Out-Null
  Renombrar-Title -Conexion $portal -Lista $ListaPaneles -Etiqueta 'Titulo'
  foreach ($interno in $CamposPaneles.Keys) {
    Asegurar-Campo -Conexion $portal -Lista $ListaPaneles -Interno $interno -Xml $CamposPaneles[$interno]
  }

  # Versionado: el unico deshacer que hay cuando alguien edita desde /admin.
  Set-PnPList -Identity $ListaPaneles -EnableVersioning $true -MajorVersions 50 -Connection $portal | Out-Null

  # La vista por defecto se busca por la bandera, nunca por nombre (esta localizado).
  $vista = Get-PnPView -List $ListaPaneles -Connection $portal | Where-Object { $_.DefaultView }
  Set-PnPView -List $ListaPaneles -Identity $vista.Id -Connection $portal -Values @{
    ViewFields = [string[]]@(
      'Title', 'Departamento', 'Estado', 'Orden', 'Destacado',
      'Responsable', 'HoraActualizacion', 'Url_x0020_Panel', 'Modified'
    )
  } | Out-Null
  Write-Host "   = vista por defecto ajustada"
}
Comprobar-Campos -Conexion $portal -Lista $ListaPaneles -Esperados $InternosPaneles

# --- 3. Lista de departamentos ----------------------------------------------
Write-Host "`n[$ListaDepartamentos]"
if (-not $SoloComprobar) {
  Asegurar-Lista -Conexion $portal -Titulo $ListaDepartamentos -UrlInterna $UrlListaDepartamentos | Out-Null
  # El Title de esta lista es el nombre del departamento y tiene que coincidir
  # EXACTAMENTE con la columna Departamento de la otra: el emparejamiento va por ahi
  # (SharePointDepartamentoRepository.guardarAjustes filtra por Title).
  Renombrar-Title -Conexion $portal -Lista $ListaDepartamentos -Etiqueta 'Departamento'
  foreach ($interno in $CamposDepartamentos.Keys) {
    Asegurar-Campo -Conexion $portal -Lista $ListaDepartamentos -Interno $interno -Xml $CamposDepartamentos[$interno]
  }

  Set-PnPList -Identity $ListaDepartamentos -EnableVersioning $true -MajorVersions 50 -Connection $portal | Out-Null

  $vistaDep = Get-PnPView -List $ListaDepartamentos -Connection $portal | Where-Object { $_.DefaultView }
  Set-PnPView -List $ListaDepartamentos -Identity $vistaDep.Id -Connection $portal -Values @{
    ViewFields = [string[]]@('Title', 'Iniciales', 'Color', 'WorkspaceId', 'EquipoNombre', 'Modified')
  } | Out-Null
  Write-Host "   = vista por defecto ajustada"

  # Semilla: solo el nombre. Una celda vacia significa "usa el valor de
  # src/config/departamentos.config.ts" (derivarDepartamentos usa || ), asi que
  # sembrar colores aqui congelaria el tema en vez de dejarlo seguir a la marca.
  $existentes = (Get-PnPListItem -List $ListaDepartamentos -Fields 'Title' -PageSize 500 -Connection $portal |
    ForEach-Object { $_['Title'] })
  foreach ($nombre in @('Retail-Online', 'Multimarca', 'Logistica')) {
    if ($existentes -contains $nombre) {
      Write-Host "   = departamento '$nombre'"
      continue
    }
    Write-Host "   + departamento '$nombre'"
    Add-PnPListItem -List $ListaDepartamentos -Values @{ Title = $nombre } -Connection $portal | Out-Null
  }
}
Comprobar-Campos -Conexion $portal -Lista $ListaDepartamentos -Esperados $InternosDepartamentos

# --- 4. Permisos -------------------------------------------------------------
# AVISO: los repositorios leen con el contexto del usuario, asi que todo el que
# use el portal necesita Read en la lista completa y puede ver todas las filas
# entrando a /Lists/. El filtrado por equipo de Teams es de interfaz, no una
# frontera de seguridad; el permiso real lo aplica Power BI al cargar el iframe.
if (-not $SoloComprobar) {
  Write-Host "`n[Permisos]"
  $visitantes = Get-PnPGroup -AssociatedVisitorGroup -Connection $portal
  Asegurar-Miembro -Conexion $portal -Grupo $visitantes.Title `
    -LoginName "c:0-.f|rolemanager|spo-grid-all-users/$TenantId"   # Todos excepto usuarios externos

  $miembros = Get-PnPGroup -AssociatedMemberGroup -Connection $portal
  Asegurar-Miembro -Conexion $portal -Grupo $miembros.Title -LoginName "$GrupoAdmin@lolacasademunt.com"
}

Write-Host "`nListo. Siguiente: .\2-Migrar-Paneles.ps1 -Simular" -ForegroundColor Green
