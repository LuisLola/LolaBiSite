# Copia los paneles de /sites/Operaciones al sitio del portal.
# El origen NO se toca: aqui no hay ni un cmdlet de escritura contra Operaciones.
# Idempotente: deduplica por Titulo + Url, asi que re-ejecutar no duplica nada.
#
#   .\2-Migrar-Paneles.ps1 -Simular    # imprime lo que haria, no escribe
#   .\2-Migrar-Paneles.ps1

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

# El origen tiene menos columnas que el destino: se lee lo que haya y el resto
# queda vacio (Estado toma su valor por defecto, Activo).
function Valor {
  param($Item, [string]$Interno)
  if ($Item.FieldValues.ContainsKey($Interno)) { return $Item.FieldValues[$Interno] }
  return $null
}

# Los campos URL se leen como FieldUrlValue y se escriben con el convenio
# "url, descripcion" que entiende Add-PnPListItem.
function UrlAValor {
  param($Valor, [string]$Interno)
  if (-not $Valor) { return $null }
  if ($Valor.Url -like '*,*') {
    throw "La URL de '$Interno' contiene una coma y PnP la partiria mal: $($Valor.Url). Copia esa fila a mano."
  }
  if ($Valor.Description) { return "$($Valor.Url), $($Valor.Description)" }
  return $Valor.Url
}

$creados = 0
$omitidos = 0

Get-PnPListItem -List $ListaOrigen -PageSize 500 -Connection $origen | ForEach-Object {
  $item = $_
  $titulo = [string](Valor $item 'Title')
  $urlPanel = Valor $item 'Url_x0020_Panel'
  $clave = "$titulo|$(if ($urlPanel) { $urlPanel.Url } else { '' })"

  if ($yaEstan.Contains($clave)) {
    Write-Host "= omitido: $titulo"
    $omitidos++
    return
  }

  $valores = @{ Title = $titulo }
  foreach ($par in @(
      @{ interno = 'Area_x0020_de_x0020_Trabajo'; tipo = 'texto' },
      @{ interno = 'Departamento';                tipo = 'texto' },
      @{ interno = 'Descripcion';                 tipo = 'texto' },
      @{ interno = 'Responsable';                 tipo = 'texto' },
      @{ interno = 'GrupoAcceso';                 tipo = 'texto' },
      @{ interno = 'Estado';                      tipo = 'texto' },
      @{ interno = 'HoraActualizacion';           tipo = 'texto' },
      @{ interno = 'Destacado';                   tipo = 'crudo' },
      @{ interno = 'Orden';                       tipo = 'crudo' },
      @{ interno = 'Url_x0020_Panel';             tipo = 'url' },
      @{ interno = 'UrlDirecta';                  tipo = 'url' }
    )) {
    $bruto = Valor $item $par.interno
    if ($null -eq $bruto -or '' -eq $bruto) { continue }
    switch ($par.tipo) {
      'url'   { $valores[$par.interno] = UrlAValor $bruto $par.interno }
      'texto' { $valores[$par.interno] = [string]$bruto }
      default { $valores[$par.interno] = $bruto }
    }
  }

  if ($Simular) {
    Write-Host "+ (simulado) $titulo  [$($valores['Departamento'])]"
  } else {
    Add-PnPListItem -List $ListaPaneles -Values $valores -Connection $destino | Out-Null
    Write-Host "+ $titulo"
  }
  $creados++
}

$verbo = if ($Simular) { 'se crearian' } else { 'creados' }
Write-Host "`n$creados $verbo, $omitidos omitidos (ya estaban)." -ForegroundColor Green
if ($Simular) { Write-Host "Nada escrito. Re-ejecuta sin -Simular para aplicarlo." }
