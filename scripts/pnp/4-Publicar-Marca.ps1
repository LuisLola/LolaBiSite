# Colores corporativos: crea la lista "Marca LC", y desde esos MISMOS valores
# genera el tema nativo de SharePoint y lo aplica a los sitios que le digas.
#
# Un solo origen de marca, tres consumidores:
#   1. el Portal BI, que lee la lista en caliente (ver docs/marca.md)
#   2. el cromo de SharePoint (cabecera, botones, enlaces) via tema de tenant
#   3. cualquier sitio o web part futuro, leyendo la misma lista
#
#   .\4-Publicar-Marca.ps1 -CrearLista                       # crea y siembra la lista
#   .\4-Publicar-Marca.ps1 -SoloMostrar                      # imprime la paleta, no aplica
#   .\4-Publicar-Marca.ps1 -Sitios https://.../sites/PortalBI
#   .\4-Publicar-Marca.ps1 -DesdeCss -SoloMostrar            # ignora la lista, lee tokens.global.css

param(
  [switch]$CrearLista,
  # Borra la lista antes de crearla. Necesario al venir de la forma clave/valor.
  [switch]$Recrear,
  [switch]$SoloMostrar,
  [switch]$DesdeCss,
  [string[]]$Sitios = @(),
  [string]$NombreTema = 'Lola Casademunt',
  # Fuerza un tema de la lista en vez del que este activo.
  [string]$Tema = ''
)

. "$PSScriptRoot\PortalBI.Comun.ps1"

$UrlSitioMarca = $UrlTenant          # el sitio raiz: todo el mundo tiene lectura
$ListaMarca    = 'Marca LC'
$RutaTokens    = Join-Path (Resolve-Path "$PSScriptRoot\..\..") 'src\ui\tokens.global.css'

# Orden en el que salen las columnas: primero lo que de verdad se toca.
$OrdenPreferido = @(
  'primario', 'primario-texto', 'acento', 'positivo', 'negativo', 'aviso-texto',
  'lienzo', 'papel', 'tarjeta', 'texto', 'texto-secundario'
)

# --- Leer los tokens ---------------------------------------------------------

<#
  Los nombres de token salen de src/ui/tokens.global.css, del bloque BASE (lo
  que hay antes del marcador de DERIVADOS). Asi la lista y el codigo no pueden
  divergir: no hay una segunda lista de nombres que mantener aqui.
#>
function Leer-Tokens-Base {
  $css = Get-Content -Raw -LiteralPath $RutaTokens
  # El marcador exacto de la seccion, no la palabra: "DERIVADOS" tambien sale en
  # el comentario de cabecera, y cortar ahi dejaba la lista de tokens vacia.
  $corte = $css.IndexOf('---------- DERIVADOS')
  if ($corte -gt 0) { $css = $css.Substring(0, $corte) }
  else { throw "No se encuentra el marcador de DERIVADOS en $RutaTokens" }

  $valores = [ordered]@{}
  foreach ($m in [regex]::Matches($css, '--([a-z0-9-]+):\s*([^;]+);')) {
    $valores[$m.Groups[1].Value] = $m.Groups[2].Value.Trim()
  }
  return $valores
}

# Solo los tokens de color, para derivar la paleta de SharePoint.
function Leer-Tokens-Css {
  $valores = @{}
  foreach ($par in (Leer-Tokens-Base).GetEnumerator()) {
    if ($par.Value -match '^#[0-9a-fA-F]{6}$') { $valores[$par.Key] = $par.Value.ToLower() }
  }
  return $valores
}

<#
  SharePoint no admite guiones en los nombres internos: los codifica como
  _x002d_. Se crea la columna con ese nombre interno y con el token como nombre
  visible, y MarcaRepository decodifica al leer. Sin tabla de mapeo.
#>
function Columna-DeToken {
  param([Parameter(Mandatory)][string]$Token)
  return $Token.Replace('-', '_x002d_')
}

$marca = Conectar $UrlSitioMarca

if ($CrearLista) {
  Write-Host "`n[$ListaMarca]"

  $tokensBase = Leer-Tokens-Base
  # Los importantes primero y el resto detras, en el orden del CSS.
  $tokens = @($OrdenPreferido | Where-Object { $tokensBase.Contains($_) })
  $tokens += @($tokensBase.Keys | Where-Object { $OrdenPreferido -notcontains $_ })

  $existe = $null
  try { $existe = Get-PnPList -Identity $ListaMarca -Connection $marca -ErrorAction Stop } catch {}

  if ($existe -and $Recrear) {
    Write-Host "   - borrando '$ListaMarca' (era clave/valor; ahora es una fila por tema)"
    Remove-PnPList -Identity $ListaMarca -Force -Connection $marca
    $existe = $null
  }
  if ($existe) {
    throw "'$ListaMarca' ya existe. Si viene de la forma clave/valor, re-ejecuta con -Recrear (borra la lista; sus valores son los mismos que trae el paquete)."
  }

  # Sin quick launch: vive en la raiz de la intranet y no debe salir en su
  # navegacion. Se llega por la URL o desde docs/marca.md.
  Asegurar-Lista -Conexion $marca -Titulo $ListaMarca -UrlInterna 'MarcaLC' -SinQuickLaunch | Out-Null
  Renombrar-Title -Conexion $marca -Lista $ListaMarca -Etiqueta 'Tema'

  # UNA FILA POR TEMA: Title es el nombre del tema, Activo marca el que esta
  # puesto, y cada token es una columna.
  Asegurar-Campo -Conexion $marca -Lista $ListaMarca -Interno 'Activo' `
    -Xml '<Field Type="Boolean" Name="Activo" StaticName="Activo" DisplayName="Activo" Required="FALSE"><Default>0</Default></Field>'
  Asegurar-Campo -Conexion $marca -Lista $ListaMarca -Interno 'Nota' `
    -Xml '<Field Type="Note" Name="Nota" StaticName="Nota" DisplayName="Nota" NumLines="2" RichText="FALSE" RichTextMode="Compatible" Required="FALSE" />'

  foreach ($token in $tokens) {
    $interno = Columna-DeToken $token
    $xml = "<Field Type=""Text"" Name=""$interno"" StaticName=""$interno"" DisplayName=""$token"" MaxLength=""128"" Required=""FALSE"" />"
    Asegurar-Campo -Conexion $marca -Lista $ListaMarca -Interno $interno -Xml $xml
  }

  Set-PnPList -Identity $ListaMarca -EnableVersioning $true -MajorVersions 100 -Connection $marca | Out-Null

  $vista = Get-PnPView -List $ListaMarca -Connection $marca | Where-Object { $_.DefaultView }
  $columnasVista = @('Title', 'Activo') + @($tokens | ForEach-Object { Columna-DeToken $_ }) + @('Modified')
  Set-PnPView -List $ListaMarca -Identity $vista.Id -Connection $marca -Fields $columnasVista | Out-Null
  Write-Host "   = vista con $($columnasVista.Count) columnas"

  # Fila Base: el juego completo, con los valores que viajan en el paquete, para
  # que la lista arranque mostrando exactamente lo que ya se ve en pantalla.
  $valoresBase = @{
    Title  = 'Base'
    Activo = $true
    Nota   = 'Tema de partida. Los demas temas solo rellenan lo que cambian.'
  }
  foreach ($token in $tokens) { $valoresBase[(Columna-DeToken $token)] = [string]$tokensBase[$token] }
  Add-PnPListItem -List $ListaMarca -Connection $marca -Values $valoresBase | Out-Null
  Write-Host "   + fila 'Base' con $($tokens.Count) tokens, marcada como activa"
}

if ($DesdeCss) {
  $colores = Leer-Tokens-Css
  Write-Host "`nColores leidos de src\ui\tokens.global.css"
} else {
  # Una fila por tema. Mismo orden de capas que el portal: Base y encima el
  # tema activo, que es el que tiene Activo marcado.
  $filas = Get-PnPListItem -List $ListaMarca -PageSize 500 -Connection $marca
  $activo = ($filas | Where-Object { $_['Activo'] -eq $true } | ForEach-Object { [string]$_['Title'] } | Select-Object -First 1)
  if (-not $activo) { $activo = 'Base' }
  if ($Tema) { $activo = $Tema }   # -Tema fuerza uno concreto
  Write-Host "`nTema: $activo"

  $nombresToken = @((Leer-Tokens-Base).Keys)
  $colores = @{}
  foreach ($capa in @('Base', $activo) | Select-Object -Unique) {
    $fila = $filas | Where-Object { [string]$_['Title'] -eq $capa } | Select-Object -First 1
    if (-not $fila) { continue }
    foreach ($token in $nombresToken) {
      $valor = ([string]$fila[(Columna-DeToken $token)]).Trim()
      # Celda vacia = hereda de la capa de abajo.
      if ($valor) { $colores[$token] = $valor.ToLower() }
    }
  }
  Write-Host "$($colores.Count) colores leidos de la lista '$ListaMarca'"
  # Lo que falte en la lista se completa con el paquete.
  foreach ($par in (Leer-Tokens-Css).GetEnumerator()) {
    if (-not $colores.ContainsKey($par.Key)) { $colores[$par.Key] = $par.Value }
  }
}

foreach ($obligatorio in @('primario', 'primario-texto', 'tarjeta', 'texto', 'lienzo')) {
  if (-not $colores.ContainsKey($obligatorio)) { throw "Falta el color '$obligatorio'." }
}

# --- Derivar los 16 slots de Fluent -----------------------------------------
# Interpolacion lineal en sRGB. Las proporciones son las que usa el disenador de
# temas de Fluent; lo que aporta el script es repetirlas en N sitios sin escribir
# 16 hex a mano.

function Mezclar-Hex {
  param([string]$Desde, [string]$Hasta, [double]$Parte)
  $a = $Desde.TrimStart('#'); $b = $Hasta.TrimStart('#')
  $canales = 0..2 | ForEach-Object {
    $ca = [Convert]::ToInt32($a.Substring($_ * 2, 2), 16)
    $cb = [Convert]::ToInt32($b.Substring($_ * 2, 2), 16)
    [int][Math]::Round($ca + ($cb - $ca) * $Parte)
  }
  '#{0:x2}{1:x2}{2:x2}' -f $canales[0], $canales[1], $canales[2]
}

$primario = $colores['primario']
$tarjeta  = $colores['tarjeta']
$texto    = $colores['texto']
$lienzo   = $colores['lienzo']

$paleta = @{
  themePrimary         = $primario
  themeLighterAlt      = (Mezclar-Hex $primario '#ffffff' 0.96)
  themeLighter         = (Mezclar-Hex $primario '#ffffff' 0.84)
  themeLight           = (Mezclar-Hex $primario '#ffffff' 0.70)
  themeTertiary        = (Mezclar-Hex $primario '#ffffff' 0.40)
  themeSecondary       = (Mezclar-Hex $primario '#ffffff' 0.12)
  themeDarkAlt         = (Mezclar-Hex $primario '#000000' 0.05)
  themeDark            = (Mezclar-Hex $primario '#000000' 0.15)
  themeDarker          = (Mezclar-Hex $primario '#000000' 0.28)
  # Los neutros se mezclan desde el LIENZO (crema) hacia el texto, no desde el
  # blanco: mezclar desde blanco da el gris frio de fabrica. Aqui esta el
  # aspecto corporativo, con los grises calidos del portal.
  neutralLighterAlt    = (Mezclar-Hex $lienzo $texto 0.02)
  neutralLighter       = (Mezclar-Hex $lienzo $texto 0.04)
  neutralLight         = (Mezclar-Hex $lienzo $texto 0.08)
  neutralQuaternaryAlt = (Mezclar-Hex $lienzo $texto 0.13)
  neutralQuaternary    = (Mezclar-Hex $lienzo $texto 0.16)
  neutralTertiaryAlt   = (Mezclar-Hex $lienzo $texto 0.28)
  neutralTertiary      = (Mezclar-Hex $lienzo $texto 0.38)
  neutralSecondary     = (Mezclar-Hex $lienzo $texto 0.55)
  neutralPrimaryAlt    = (Mezclar-Hex $lienzo $texto 0.78)
  neutralPrimary       = (Mezclar-Hex $lienzo $texto 0.88)
  neutralDark          = (Mezclar-Hex $lienzo $texto 0.95)
  black                = $texto
  white                = $tarjeta
  primaryBackground    = $colores['lienzo']
  primaryText          = $texto
}

# --- Contraste ---------------------------------------------------------------
# Un azul corporativo claro con el texto crema encima da un portal ilegible.
# Este aviso es la diferencia entre verlo aqui y verlo en produccion.

function Luminancia {
  param([string]$Hex)
  $h = $Hex.TrimStart('#')
  $lineales = 0..2 | ForEach-Object {
    $c = [Convert]::ToInt32($h.Substring($_ * 2, 2), 16) / 255
    if ($c -le 0.03928) { $c / 12.92 } else { [Math]::Pow((($c + 0.055) / 1.055), 2.4) }
  }
  0.2126 * $lineales[0] + 0.7152 * $lineales[1] + 0.0722 * $lineales[2]
}

$l1 = Luminancia $colores['primario-texto']
$l2 = Luminancia $primario
$ratio = ([Math]::Max($l1, $l2) + 0.05) / ([Math]::Min($l1, $l2) + 0.05)
$ratioTexto = [Math]::Round($ratio, 2)

if ($ratio -lt 4.5) {
  Write-Warning "Contraste de 'primario-texto' sobre 'primario' = ${ratioTexto}:1, por debajo del minimo WCAG AA (4.5:1). El texto del heroe y de los botones sera dificil de leer."
} else {
  Write-Host "Contraste primario-texto sobre primario: ${ratioTexto}:1 (OK)" -ForegroundColor Green
}

Write-Host "`nPaleta generada:"
$paleta.GetEnumerator() | Sort-Object Name | ForEach-Object { "  {0,-22} {1}" -f $_.Name, $_.Value }

if ($SoloMostrar) {
  Write-Host "`n-SoloMostrar: nada aplicado."
  return
}

# --- Publicar y aplicar ------------------------------------------------------
# Anadir el tema NO lo aplica: aparece en "Cambiar el aspecto" de cada sitio.
# Requiere rol de Administrador de SharePoint.
$admin = Conectar $UrlAdmin
Write-Host "`n+ publicando tema '$NombreTema'"
Add-PnPTenantTheme -Identity $NombreTema -Palette $paleta -IsInverted:$false -Overwrite -Connection $admin | Out-Null

foreach ($sitio in $Sitios) {
  Write-Host "+ aplicando a $sitio"
  Set-PnPWebTheme -Theme $NombreTema -WebUrl $sitio -Connection $admin | Out-Null
}

if ($Sitios.Count -eq 0) {
  Write-Host "`nTema disponible en 'Cambiar el aspecto'. Pasa -Sitios <url> para aplicarlo." -ForegroundColor Green
} else {
  Write-Host "`nListo." -ForegroundColor Green
}
