# Copia los paneles de /sites/Operaciones al sitio del portal.
# El origen NO se toca: aqui no hay ni un cmdlet de escritura contra Operaciones.
# Idempotente: deduplica por Titulo + Url, asi que re-ejecutar no duplica nada.
#
#   .\2-Migrar-Paneles.ps1 -Simular    # imprime lo que haria, no escribe
#   .\2-Migrar-Paneles.ps1
#
# La traduccion de nombres internos origen -> destino esta en $MapaOrigen
# (PortalBI.Comun.ps1). No la salte: la lista de origen llama "Departamento" a
# la columna "Area de Trabajo".

param(
  [switch]$Simular
)

. "$PSScriptRoot\PortalBI.Comun.ps1"

$origen  = Conectar $UrlOrigen
$destino = Conectar $UrlPortal

# Clave de deduplicacion de lo que ya hay en el destino.
$yaEstan = New-Object 'System.Collections.Generic.HashSet[string]'
Get-PnPListItem -List $ListaPaneles -PageSize 500 -Connection $destino | ForEach-Object {
  $url = if ($_['Url_x0020_Panel']) { $_['Url_x0020_Panel'].Url } else { '' }
  [void]$yaEstan.Add("$($_['Title'])|$url")
}

function Valor-Origen {
  param($Item, [string]$Interno, [string]$Tipo)

  if (-not $Item.FieldValues.ContainsKey($Interno)) { return $null }
  $bruto = $Item.FieldValues[$Interno]
  if ($null -eq $bruto) { return $null }

  switch ($Tipo) {
    'usuario' {
      # FieldUserValue: se guarda el nombre visible, que es lo que el portal
      # muestra como texto informativo.
      return [string]$bruto.LookupValue
    }
    'url' {
      # FieldUrlValue -> convenio "url, descripcion" que entiende Add-PnPListItem.
      if ($bruto.Url -like '*,*') {
        throw "La URL de '$Interno' contiene una coma y PnP la partiria mal: $($bruto.Url). Copia esa fila a mano."
      }
      if ($bruto.Description) { return "$($bruto.Url), $($bruto.Description)" }
      return [string]$bruto.Url
    }
    default { return [string]$bruto }
  }
}

$creados = 0
$omitidos = 0
# Orden por departamento: el origen no lo trae y dejarlo todo a 0 deja la
# pantalla de administracion sin nada con lo que ordenar.
$ordenPorDepartamento = @{}

Get-PnPListItem -List $ListaOrigen -PageSize 500 -Connection $origen | ForEach-Object {
  $item = $_

  $valores = @{}
  foreach ($destinoInterno in $MapaOrigen.Keys) {
    $regla = $MapaOrigen[$destinoInterno]
    $valor = Valor-Origen $item $regla.origen $regla.tipo
    if ($null -ne $valor -and '' -ne $valor) { $valores[$destinoInterno] = $valor }
  }

  $titulo = [string]$valores['Title']
  $urlPanel = if ($valores.ContainsKey('Url_x0020_Panel')) { ($valores['Url_x0020_Panel'] -split ', ')[0] } else { '' }
  $clave = "$titulo|$urlPanel"

  if ($yaEstan.Contains($clave)) {
    Write-Host "= omitido: $titulo"
    $omitidos++
    return
  }

  $dpto = if ($valores.ContainsKey('Departamento')) { [string]$valores['Departamento'] } else { '(sin departamento)' }
  if (-not $ordenPorDepartamento.ContainsKey($dpto)) { $ordenPorDepartamento[$dpto] = 0 }
  $ordenPorDepartamento[$dpto] += 10
  $valores['Orden'] = $ordenPorDepartamento[$dpto]

  if ($Simular) {
    Write-Host ("+ (simulado) {0,-45} dpto={1,-15} orden={2} area='{3}'" -f `
      $titulo, $dpto, $valores['Orden'], $valores['Area_x0020_de_x0020_Trabajo'])
  } else {
    Add-PnPListItem -List $ListaPaneles -Values $valores -Connection $destino | Out-Null
    Write-Host "+ $titulo"
  }
  $creados++
}

$verbo = if ($Simular) { 'se crearian' } else { 'creados' }
Write-Host "`n$creados $verbo, $omitidos omitidos (ya estaban)." -ForegroundColor Green
Write-Host "Estado, Destacado y UrlDirecta quedan en su valor por defecto: el origen no los trae."
if ($Simular) { Write-Host "Nada escrito. Re-ejecuta sin -Simular para aplicarlo." }
