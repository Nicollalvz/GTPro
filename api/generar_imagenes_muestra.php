<?php
$dir = __DIR__ . '/../imagenes';
if (!is_dir($dir)) {
    mkdir($dir, 0777, true);
}

function crearImagenRin($archivo, $colorPrimario, $colorSecundario, $texto, $radios = 5) {
    $ancho = 500;
    $alto = 500;
    $img = imagecreatetruecolor($ancho, $alto);
    imagealphablending($img, false);
    imagesavealpha($img, true);

    $transparente = imagecolorallocatealpha($img, 0, 0, 0, 127);
    imagefill($img, 0, 0, $transparente);
    imagealphablending($img, true);

    $cx = 250;
    $cy = 250;

    // Llanta exterior (caucho oscuro)
    $caucho1 = imagecolorallocate($img, 25, 25, 28);
    $caucho2 = imagecolorallocate($img, 45, 45, 50);
    $caucho3 = imagecolorallocate($img, 15, 15, 18);
    imagefilledellipse($img, $cx, $cy, 480, 480, $caucho1);
    imagefilledellipse($img, $cx, $cy, 460, 460, $caucho2);
    imagefilledellipse($img, $cx, $cy, 430, 430, $caucho3);

    // Ranuras de labrado de la llanta
    $ranuraColor = imagecolorallocate($img, 10, 10, 12);
    for ($a = 0; $a < 360; $a += 12) {
        $rad = deg2rad($a);
        $x1 = $cx + cos($rad) * 220;
        $y1 = $cy + sin($rad) * 220;
        $x2 = $cx + cos($rad) * 236;
        $y2 = $cy + sin($rad) * 236;
        imagesetthickness($img, 3);
        imageline($img, (int)$x1, (int)$y1, (int)$x2, (int)$y2, $ranuraColor);
    }

    // Aro exterior del rin
    $cPrim = imagecolorallocate($img, $colorPrimario[0], $colorPrimario[1], $colorPrimario[2]);
    $cSec = imagecolorallocate($img, $colorSecundario[0], $colorSecundario[1], $colorSecundario[2]);
    $cBrillo = imagecolorallocate($img, 230, 235, 245);
    $cSombra = imagecolorallocate($img, 15, 15, 20);

    imagefilledellipse($img, $cx, $cy, 360, 360, $cSec);
    imagefilledellipse($img, $cx, $cy, 340, 340, $cPrim);
    imageellipse($img, $cx, $cy, 342, 342, $cBrillo);

    // Disco de freno detrás del rin
    $freno = imagecolorallocate($img, 90, 95, 105);
    imagefilledellipse($img, $cx, $cy, 260, 260, $freno);
    // Agujeros de ventilación del disco
    for ($r = 100; $r <= 125; $r += 10) {
        for ($a = 0; $a < 360; $a += 20) {
            $rad = deg2rad($a);
            $fx = (int)($cx + cos($rad) * $r);
            $fy = (int)($cy + sin($rad) * $r);
            imagefilledellipse($img, $fx, $fy, 4, 4, $cSombra);
        }
    }

    // Caliper de freno deportivo rojo a un lado
    $caliper = imagecolorallocate($img, 180, 25, 25);
    $caliperBorde = imagecolorallocate($img, 220, 40, 40);
    imagefilledarc($img, $cx, $cy, 280, 280, 30, 90, $caliper, IMG_ARC_PIE);
    imagearc($img, $cx, $cy, 280, 280, 30, 90, $caliperBorde);

    // Radios / Rayos del Rin
    imagesetthickness($img, 14);
    $pasoAngulo = 360 / $radios;
    for ($a = 0; $a < 360; $a += $pasoAngulo) {
        $rad1 = deg2rad($a);
        $rad2 = deg2rad($a + 6);
        $x1 = (int)($cx + cos($rad1) * 70);
        $y1 = (int)($cy + sin($rad1) * 70);
        $x2 = (int)($cx + cos($rad1) * 168);
        $y2 = (int)($cy + sin($rad1) * 168);

        $x3 = (int)($cx + cos($rad2) * 70);
        $y3 = (int)($cy + sin($rad2) * 70);
        $x4 = (int)($cx + cos($rad2) * 168);
        $y4 = (int)($cy + sin($rad2) * 168);

        imagesetthickness($img, 12);
        imageline($img, $x1, $y1, $x2, $y2, $cSec);
        imagesetthickness($img, 8);
        imageline($img, $x1, $y1, $x2, $y2, $cPrim);
        imageline($img, $x3, $y3, $x4, $y4, $cPrim);
    }

    // Centro del rin (Maza)
    imagefilledellipse($img, $cx, $cy, 120, 120, $cSombra);
    imagefilledellipse($img, $cx, $cy, 100, 100, $cSec);
    imagefilledellipse($img, $cx, $cy, 80, 80, $cPrim);

    // Pernos / Tuercas cromadas
    for ($a = 0; $a < 360; $a += 72) {
        $rad = deg2rad($a);
        $px = (int)($cx + cos($rad) * 35);
        $py = (int)($cy + sin($rad) * 35);
        imagefilledellipse($img, $px, $py, 10, 10, $cBrillo);
        imageellipse($img, $px, $py, 11, 11, $cSombra);
    }

    // Emblema central GT
    $emblemaRojo = imagecolorallocate($img, 140, 31, 31);
    imagefilledellipse($img, $cx, $cy, 36, 36, $emblemaRojo);
    $blanco = imagecolorallocate($img, 255, 255, 255);
    imagestring($img, 3, $cx - 8, $cy - 7, "GT", $blanco);

    imagesavealpha($img, true);
    imagepng($img, $archivo);
    imagedestroy($img);
    echo "Imagen generada: " . basename($archivo) . "\n";
}

function crearImagenAccesorio($archivo, $tipo) {
    $ancho = 500;
    $alto = 500;
    $img = imagecreatetruecolor($ancho, $alto);
    $fondo = imagecolorallocate($img, 240, 242, 245);
    imagefill($img, 0, 0, $fondo);

    $rojo = imagecolorallocate($img, 140, 31, 31);
    $negro = imagecolorallocate($img, 25, 25, 25);
    $blanco = imagecolorallocate($img, 255, 255, 255);
    $azulLed = imagecolorallocate($img, 30, 144, 255);
    $gris = imagecolorallocate($img, 180, 185, 190);

    $cx = 250;
    $cy = 250;

    if ($tipo === 'llanta') {
        // Llanta completa
        imagefilledellipse($img, $cx, $cy, 400, 400, $negro);
        imagefilledellipse($img, $cx, $cy, 260, 260, $fondo);
        for ($a = 0; $a < 360; $a += 15) {
            $rad = deg2rad($a);
            $x1 = (int)($cx + cos($rad) * 135);
            $y1 = (int)($cy + sin($rad) * 135);
            $x2 = (int)($cx + cos($rad) * 195);
            $y2 = (int)($cy + sin($rad) * 195);
            imagesetthickness($img, 5);
            imageline($img, $x1, $y1, $x2, $y2, imagecolorallocate($img, 60, 60, 65));
        }
        imagestring($img, 5, $cx - 85, $cy - 8, "ULTRA GRIP 4X4", $negro);
    } elseif ($tipo === 'led') {
        // Kit Luces LED
        imagefilledrectangle($img, 50, 180, 450, 220, $negro);
        imagefilledrectangle($img, 50, 280, 450, 320, $negro);
        for ($x = 70; $x <= 430; $x += 35) {
            imagefilledellipse($img, $x, 200, 18, 18, $azulLed);
            imagefilledellipse($img, $x, 300, 18, 18, $rojo);
        }
        imagestring($img, 5, $cx - 100, 120, "KIT ILUMINACION LED GT", $negro);
    } elseif ($tipo === 'caliper') {
        // Kit mordazas rojas
        imagefilledrectangle($img, 80, 180, 420, 320, $rojo);
        imagefilledrectangle($img, 110, 210, 390, 290, imagecolorallocate($img, 100, 15, 15));
        imagestring($img, 5, $cx - 50, $cy - 10, "SPORT BRAKE", $blanco);
    } elseif ($tipo === 'pernos') {
        // Pernos cromados
        for ($i = 0; $i < 4; $i++) {
            $px = 100 + ($i * 90);
            imagefilledrectangle($img, $px, 160, $px + 50, 340, $gris);
            imagefilledellipse($img, $px + 25, 160, 50, 30, imagecolorallocate($img, 220, 225, 230));
        }
        imagestring($img, 5, $cx - 110, 380, "PERNOS ANTIRROBO FORJADOS", $negro);
    }

    imagepng($img, $archivo);
    imagedestroy($img);
    echo "Accesorio generado: " . basename($archivo) . "\n";
}

function crearVehiculoMuestra($archivo, $tipo) {
    $ancho = 800;
    $alto = 450;
    $img = imagecreatetruecolor($ancho, $alto);
    $cielo = imagecolorallocate($img, 242, 245, 248);
    imagefill($img, 0, 0, $cielo);

    // Suelo asfalto
    $piso = imagecolorallocate($img, 60, 65, 70);
    $lineaPiso = imagecolorallocate($img, 140, 31, 31);
    imagefilledrectangle($img, 0, 370, 800, 450, $piso);
    imageline($img, 0, 370, 800, 370, $lineaPiso);

    $colorCarro = ($tipo === 'deportivo') ? imagecolorallocate($img, 220, 30, 30) : 
                 (($tipo === 'suv') ? imagecolorallocate($img, 30, 35, 45) : imagecolorallocate($img, 180, 185, 195));
    $vidrio = imagecolorallocate($img, 20, 25, 35);
    $sombra = imagecolorallocate($img, 30, 30, 35);

    // Carrocería
    imagefilledrectangle($img, 120, 220, 680, 350, $colorCarro);
    // Techo
    imagefilledpolygon($img, [240, 220, 320, 140, 540, 140, 610, 220], $colorCarro);
    // Ventanas
    imagefilledpolygon($img, [260, 215, 330, 150, 525, 150, 590, 215], $vidrio);

    // Huecos de las ruedas
    $ruedaDelX = 240;
    $ruedaTraX = 570;
    $ruedaY = 350;

    // Rueda delantera
    imagefilledellipse($img, $ruedaDelX, $ruedaY, 150, 150, $sombra);
    imagefilledellipse($img, $ruedaDelX, $ruedaY, 110, 110, imagecolorallocate($img, 80, 80, 80));

    // Rueda trasera
    imagefilledellipse($img, $ruedaTraX, $ruedaY, 150, 150, $sombra);
    imagefilledellipse($img, $ruedaTraX, $ruedaY, 110, 110, imagecolorallocate($img, 80, 80, 80));

    // Texto descriptivo en la esquina
    $blanco = imagecolorallocate($img, 20, 20, 20);
    imagestring($img, 4, 30, 30, "VEHICULO MUESTRA: " . strtoupper($tipo), $blanco);
    imagestring($img, 3, 30, 50, "Selecciona un rin del catálogo para probar en este vehículo", imagecolorallocate($img, 100, 100, 100));

    imagepng($img, $archivo);
    imagedestroy($img);
    echo "Vehículo de muestra generado: " . basename($archivo) . "\n";
}

// 1. Rines
crearImagenRin($dir . '/rin-titan.png', [180, 185, 195], [60, 65, 75], "Titan", 5);
crearImagenRin($dir . '/rin-clasico.png', [215, 220, 230], [130, 135, 145], "Clasico", 10);
crearImagenRin($dir . '/rin-spider.png', [30, 30, 35], [10, 10, 15], "Spider", 7);
crearImagenRin($dir . '/rin-silver.png', [235, 240, 248], [170, 175, 185], "Silver", 6);
crearImagenRin($dir . '/rin-terreno.png', [50, 55, 60], [25, 28, 32], "Terreno", 8);

// 2. Accesorios y llantas
crearImagenAccesorio($dir . '/llanta-terreno.png', 'llanta');
crearImagenAccesorio($dir . '/llanta-sport.png', 'llanta');
crearImagenAccesorio($dir . '/luces-led.png', 'led');
crearImagenAccesorio($dir . '/acc-calipers.png', 'caliper');
crearImagenAccesorio($dir . '/acc-pernos.png', 'pernos');

// 3. Vehículos muestra
crearVehiculoMuestra($dir . '/auto-deportivo.png', 'deportivo');
crearVehiculoMuestra($dir . '/auto-sedan.png', 'sedan');
crearVehiculoMuestra($dir . '/auto-suv.png', 'suv');

echo "Todas las imágenes creadas correctamente.\n";
