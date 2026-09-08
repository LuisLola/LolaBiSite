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
#   .\4-Publicar-Marca.ps1 -DesdeCss -SoloMostrar            # ignora la lista, lee tokens.css

param(
  [switch]$CrearLista,
  [switch]$SoloMostrar,
  [switch]$DesdeCss,
  [string[]]$Sitios = @(),
  [string]$NombreTema = 'Lola Casademunt'
)

. "$PSScriptRoot\PortalBI.Comun.ps1"

$UrlSitioMarca = $UrlTenant          # el sitio raiz: todo el mundo tiene lectura
$ListaMarca    = 'Marca LC'
$RutaTokens    = Join-Path (Resolve-Path "$PSScriptRoot\..\..") 'src\ui\tokens.css'

# Tokens que se siembran en la lista, con su descripcion. Es el subconjunto que
# de verdad se toca; el resto de src/tema/tema.ts sigue valiendo si se anade una
# fila a mano con la misma clave.
$Semilla = [ordered]@{
  'primario'          = 'Color de marca: heroe, botones, enlaces, totales'
  'primario-texto'    = 'Texto y bordes SOBRE el color de marca'
  'acento'            = 'Color de apoyo de la marca'
  'positivo'          = 'Verde de "tienes acceso" / "activo"'
  'negativo'          = 'Rojo de error y acciones destructivas'
  'aviso-texto'       = 'Ambar de "en pruebas"'
  'lienzo'            = 'Fondo general del portal'
  'papel'             = 'Fondo de zonas hundidas y chips neutros'
  'tarjeta'           = 'Fondo de tarjetas, tablas y modales'
  'texto'             = 'Texto principal'
  'texto-secundario'  = 'Texto de apoyo'
}

# --- Leer los colores --------------------------------------------------------

function Leer-Tokens-Css {
  $css = Get-Content -Raw -LiteralPath $RutaTokens
  $valores = @{}
  foreach ($m in [regex]::Matches($css, '--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;')) {
    $valores[$m.Groups[1].Value] = $m.Groups[2].Value.ToLower()
  }
  return $valores
}

$marca = Conectar $UrlSitioMarca

if ($CrearLista) {
  Write-Host "`n[$ListaMarca]"
  Asegurar-Lista -Conexion $marca -Titulo $ListaMarca -UrlInterna 'MarcaLC' | Out-Null
  Renombrar-Title -Conexion $marca -Lista $ListaMarca -Etiqueta 'Token'
  Asegurar-Campo -Conexion $marca -Lista $ListaMarca -Interno 'Valor' `
    -Xml '<Field Type="Text" Name="Valor" StaticName="Valor" DisplayName="Valor" MaxLength="128" Required="FALSE" />'
  Asegurar-Campo -Conexion $marca -Lista $ListaMarca -Interno 'Nota' `
    -Xml '<Field Type="Note" Name="Nota" StaticName="Nota" DisplayName="Nota" NumLines="2" RichText="FALSE" RichTextMode="Compatible" Required="FALSE" />'
  Set-PnPList -Identity $ListaMarca -EnableVersioning $true -MajorVersions 100 -Connection $marca | Out-Null

  $vista = Get-PnPView -List $ListaMarca -Connection $marca | Where-Object { $_.DefaultView }
  Set-PnPView -List $ListaMarca -Identity $vista.Id -Connection $marca -Values @{
    ViewFields = [string[]]@('Title', 'Valor', 'Nota', 'Modified')
  } | Out-Null

  # Se siembra con los valores que viajan en el paquete, para que la lista
  # arranque mostrando exactamente lo que ya se ve en pantalla.
  $desdeCss = Leer-Tokens-Css
  $existentes = (Get-PnPListItem -List $ListaMarca -Fields 'Title' -PageSize 500 -Connection $marca |
    ForEach-Object { $_['Title'] })
  foreach ($token in $Semilla.Keys) {
    if ($existentes -contains $token) { Write-Host "   = $token"; continue }
    Write-Host "   + $token = $($desdeCss[$token])"
    Add-PnPListItem -List $ListaMarca -Connection $marca -Values @{
      Title = $token
      Valor = $desdeCss[$token]
      Nota  = $Semilla[$token]
    } | Out-Null
  }
}

if ($DesdeCss) {
  $colores = Leer-Tokens-Css
  Write-Host "`nColores leidos de src\ui\tokens.css"
} else {
  $colores = @{}
  foreach ($fila in Get-PnPListItem -List $ListaMarca -PageSize 500 -Connection $marca) {
    $clave = [string]$fila['Title']
    $valor = [string]$fila['Valor']
    if ($clave -and $valor) { $colores[$clave.Trim()] = $valor.Trim().ToLower() }
  }
  Write-Host "`n$($colores.Count) colores leidos de la lista '$ListaMarca'"
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
  # Los neutros se mezclan de tarjeta hacia texto, no en gris frio: aqui esta el
  # aspecto corporativo, con los grises calidos del portal.
  neutralLighterAlt    = (Mezclar-Hex $tarjeta $texto 0.02)
  neutralLighter       = (Mezclar-Hex $tarjeta $texto 0.04)
  neutralLight         = (Mezclar-Hex $tarjeta $texto 0.08)
  neutralQuaternaryAlt = (Mezclar-Hex $tarjeta $texto 0.13)
  neutralQuaternary    = (Mezclar-Hex $tarjeta $texto 0.16)
  neutralTertiaryAlt   = (Mezclar-Hex $tarjeta $texto 0.28)
  neutralTertiary      = (Mezclar-Hex $tarjeta $texto 0.38)
  neutralSecondary     = (Mezclar-Hex $tarjeta $texto 0.55)
  neutralPrimaryAlt    = (Mezclar-Hex $tarjeta $texto 0.78)
  neutralPrimary       = (Mezclar-Hex $tarjeta $texto 0.88)
  neutralDark          = (Mezclar-Hex $tarjeta $texto 0.95)
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
