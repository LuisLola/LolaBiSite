# Pone la lista "Marca LC" al dia con src/ui/tokens.global.css SIN borrarla.
#
# 4-Publicar-Marca.ps1 -CrearLista solo sabe crear la lista de cero, y -Recrear
# la borra. Cuando aparecen tokens nuevos en el paquete hace falta un tercer
# camino: anadir lo que falte y dejar los valores como los trae el paquete.
#
#   .\5-Sincronizar-Marca.ps1 -Simular   # dice que haria, no toca nada
#   .\5-Sincronizar-Marca.ps1            # crea columnas y actualiza el tema Base
#
# Solo toca el tema indicado en -Tema (Base por defecto). Los demas temas de la
# lista, que son los que alguien ha personalizado, no se tocan nunca.

param(
  [switch]$Simular,
  [string]$Tema = 'Base'
)

. "$PSScriptRoot\PortalBI.Comun.ps1"

$UrlSitioMarca = $UrlTenant
$ListaMarca    = 'Marca LC'
$RutaTokens    = Join-Path (Resolve-Path "$PSScriptRoot\..\..") 'src\ui\tokens.global.css'

function Columna-DeToken {
  param([Parameter(Mandatory)][string]$Token)
  return $Token.Replace('-', '_x002d_')
}

# Mismo corte que 4-Publicar-Marca.ps1: solo el bloque BASE, lo editable.
function Leer-Tokens-Base {
  $css = Get-Content -Raw -LiteralPath $RutaTokens
  $corte = $css.IndexOf('---------- DERIVADOS')
  if ($corte -lt 0) { throw "No se encuentra el marcador de DERIVADOS en $RutaTokens" }
  $css = $css.Substring(0, $corte)

  $valores = [ordered]@{}
  foreach ($m in [regex]::Matches($css, '--([a-z0-9-]+):\s*([^;]+);')) {
    $valores[$m.Groups[1].Value] = $m.Groups[2].Value.Trim()
  }
  return $valores
}

$marca  = Conectar $UrlSitioMarca
$tokens = Leer-Tokens-Base
Write-Host "`n[$ListaMarca] $($tokens.Count) tokens en el paquete"

# --- 1. Columnas que faltan --------------------------------------------------

$existentes = (Get-PnPField -List $ListaMarca -Connection $marca).InternalName
$nuevas = @()

foreach ($token in $tokens.Keys) {
  $interno = Columna-DeToken $token
  if ($existentes -contains $interno) { continue }
  $nuevas += $token
  if ($Simular) { Write-Host "   + (simulado) columna $token"; continue }
  $xml = "<Field Type=""Text"" Name=""$interno"" StaticName=""$interno"" DisplayName=""$token"" MaxLength=""128"" Required=""FALSE"" />"
  Asegurar-Campo -Conexion $marca -Lista $ListaMarca -Interno $interno -Xml $xml
}
if ($nuevas.Count -eq 0) { Write-Host '   = no falta ninguna columna' }

# --- 2. El tema, al valor del paquete ---------------------------------------

# Solo se piden las columnas que ya existen: en -Simular las nuevas todavia no
# estan, y pedir una columna inexistente hace fallar la consulta entera.
$ahora = (Get-PnPField -List $ListaMarca -Connection $marca).InternalName
$internos = @($tokens.Keys | ForEach-Object { Columna-DeToken $_ } | Where-Object { $ahora -contains $_ })

$fila = Get-PnPListItem -List $ListaMarca -PageSize 100 -Fields (@('Title') + $internos) -Connection $marca |
  Where-Object { $_['Title'] -eq $Tema }

if (-not $fila) { throw "No hay ninguna fila '$Tema' en '$ListaMarca'." }

$cambios = @{}
foreach ($token in $tokens.Keys) {
  $interno = Columna-DeToken $token
  $actual  = if ($internos -contains $interno) { [string]$fila[$interno] } else { '' }
  $nuevo   = [string]$tokens[$token]
  if ($actual -eq $nuevo) { continue }
  $cambios[$interno] = $nuevo
  Write-Host "   ~ $token : '$actual' -> '$nuevo'"
}

if ($cambios.Count -eq 0) {
  Write-Host "   = '$Tema' ya coincide con el paquete"
} elseif ($Simular) {
  Write-Host "   (simulado) $($cambios.Count) celdas por actualizar en '$Tema'"
} else {
  Set-PnPListItem -List $ListaMarca -Identity $fila.Id -Values $cambios -Connection $marca | Out-Null
  Write-Host "   OK '$Tema': $($cambios.Count) celdas actualizadas"
}

# --- 3. Que las columnas nuevas se vean en la lista --------------------------

if (-not $Simular -and $nuevas.Count -gt 0) {
  $vista = Get-PnPView -List $ListaMarca -Connection $marca | Where-Object { $_.DefaultView }
  if ($vista) {
    foreach ($token in $nuevas) {
      $interno = Columna-DeToken $token
      if ($vista.ViewFields -notcontains $interno) { $vista.ViewFields.Add($interno) }
    }
    $vista.Update()
    Invoke-PnPQuery -Connection $marca
    Write-Host "   = vista por defecto con las $($nuevas.Count) columnas nuevas"
  }
}

Write-Host "`nListo."
