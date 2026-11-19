<?php
$dir = __DIR__ . '/../imagenes';
if (!is_dir($dir)) mkdir($dir, 0777, true);

function crearBanner($archivo, $tipo) {
    $ancho = 1400;
    $alto = 560;
    $img = imagecreatetruecolor($ancho, $alto);

    $negro = imagecolorallocate($img, 12, 12, 14);
    $rojoOscuro = imagecolorallocate($img, 74, 15, 15);
    $rojoBrillante = imagecolorallocate($img, 179, 0, 0);
    $blanco = imagecolorallocate($img, 255, 255, 255);
    $grisClaro = imagecolorallocate($img, 200, 205, 215);
    $grisOscuro = imagecolorallocate($img, 30, 32, 38);
    $amarillo = imagecolorallocate($img, 255, 193, 7);
    $cyan = imagecolorallocate($img, 0, 180, 216);

    // Fondo degradado geométrico deportivo
    imagefill($img, 0, 0, $negro);

    // Patrón de líneas diagonales de velocidad
    for ($i = -200; $i < $ancho + 400; $i += 45) {
        $cDiag = ($i % 90 === 0) ? imagecolorallocate($img, 25, 18, 20) : imagecolorallocate($img, 18, 18, 22);
        imagefilledpolygon($img, [$i, 0, $i + 120, 0, $i + 40, $alto, $i - 80, $alto], $cDiag);
    }

    // Acento lateral rojo GT
    imagefilledpolygon($img, [$ancho - 350, 0, $ancho, 0, $ancho, $alto, $ancho - 150, $alto], $rojoOscuro);
    imagefilledpolygon($img, [$ancho - 180, 0, $ancho - 150, 0, $ancho, $alto, $ancho - 30, $alto], $rojoBrillante);

    if ($tipo === 'estilo') {
        // Banner 1: Rines de Lujo y Deportivos
        // Dibujar silueta estilizada de superauto lateral
        $colorAuto = imagecolorallocate($img, 220, 20, 30);
        $vidrio = imagecolorallocate($img, 10, 15, 25);
        $sombraPiso = imagecolorallocate($img, 8, 8, 10);

        // Sombra en el asfalto
        imagefilledellipse($img, 980, 430, 750, 60, $sombraPiso);

        // Carrocería deportiva
        imagefilledpolygon($img, [
            650, 380, 
            720, 300, 
            820, 250, 
            960, 250, 
            1120, 310, 
            1320, 340, 
            1340, 390, 
            650, 390
        ], $colorAuto);

        // Cabina / Ventana
        imagefilledpolygon($img, [
            830, 255, 
            950, 255, 
            1060, 305, 
            780, 305
        ], $vidrio);

        // Rueda trasera
        imagefilledellipse($img, 760, 390, 160, 160, imagecolorallocate($img, 20, 20, 25));
        imagefilledellipse($img, 760, 390, 115, 115, imagecolorallocate($img, 220, 225, 235));
        imagefilledellipse($img, 760, 390, 35, 35, $rojoBrillante);

        // Rueda delantera
        imagefilledellipse($img, 1200, 390, 160, 160, imagecolorallocate($img, 20, 20, 25));
        imagefilledellipse($img, 1200, 390, 115, 115, imagecolorallocate($img, 220, 225, 235));
        imagefilledellipse($img, 1200, 390, 35, 35, $rojoBrillante);

        // Glow e iluminación
        imagefilledarc($img, 1340, 360, 180, 120, 320, 40, imagecolorallocatealpha($img, 255, 255, 200, 90), IMG_ARC_PIE);

    } elseif ($tipo === 'ia') {
        // Banner 2: Inteligencia Artificial
        // Dibujar ondas de red neuronal / IA
        for ($r = 80; $r <= 320; $r += 50) {
            imageellipse($img, 1050, 280, $r * 2, $r * 2, imagecolorallocatealpha($img, 0, 180, 216, 95));
        }

        // Chip central con IA
        imagefilledrectangle($img, 970, 200, 1130, 360, $grisOscuro);
        imagerectangle($img, 970, 200, 1130, 360, $cyan);
        imagefilledellipse($img, 1050, 280, 90, 90, $rojoBrillante);
        imagestring($img, 5, 1035, 272, "AI", $blanco);

        // Rin montado en proyección holográfica
        imageellipse($img, 850, 360, 190, 190, $cyan);
        imageellipse($img, 1250, 360, 190, 190, $cyan);

    } elseif ($tipo === 'promo') {
        // Banner 3: Promociones Combo Rines + Llantas
        // Placa de Oferta
        imagefilledpolygon($img, [780, 80, 1300, 80, 1260, 460, 740, 460], imagecolorallocate($img, 22, 22, 26));
        imagerectangle($img, 780, 80, 1300, 460, $amarillo);

        // Insignia circular de descuento
        imagefilledellipse($img, 1180, 160, 160, 160, $rojoBrillante);
        imageellipse($img, 1180, 160, 170, 170, $amarillo);
        imagestring($img, 5, 1145, 140, "COMBO", $blanco);
        imagestring($img, 5, 1140, 165, "HASTA 25%", $amarillo);
        imagestring($img, 4, 1150, 188, "OFF", $blanco);

        // Llanta + Rin en exhibición
        imagefilledellipse($img, 920, 280, 230, 230, imagecolorallocate($img, 20, 20, 25));
        imagefilledellipse($img, 920, 280, 150, 150, imagecolorallocate($img, 210, 215, 225));
        imagefilledellipse($img, 920, 280, 45, 45, $rojoBrillante);
    }

    imagepng($img, $archivo);
    imagedestroy($img);
    echo "Banner creado: " . basename($archivo) . "\n";
}

crearBanner($dir . '/banner-carrusel-1.png', 'estilo');
crearBanner($dir . '/banner-carrusel-2.png', 'ia');
crearBanner($dir . '/banner-carrusel-3.png', 'promo');
