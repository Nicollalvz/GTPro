<?php
require_once __DIR__ . '/config.php';

if (!headers_sent()) {
    header("Content-Type: application/json; charset=UTF-8");
}

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$accion = $_GET['accion'] ?? $_POST['accion'] ?? '';

// Si es GET
if ($metodo === 'GET') {
    $esPublico = isset($_GET['public']) && $_GET['public'] == '1';
    $codigo = trim($_GET['codigo'] ?? $_GET['buscar'] ?? '');
    $id = intval($_GET['id'] ?? 0);

    // Búsqueda por código o ID específico (útil para el POS / Generador de ventas)
    if (!empty($codigo) || $id > 0) {
        if ($id > 0) {
            $stmt = $conexion->prepare("SELECT * FROM productos WHERE id = ? LIMIT 1");
            $stmt->bind_param("i", $id);
        } else {
            $stmt = $conexion->prepare("SELECT * FROM productos WHERE codigo = ? OR id = ? OR nombre LIKE ? LIMIT 1");
            $like = "%" . $codigo . "%";
            $stmt->bind_param("sis", $codigo, $codigo, $like);
        }
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res && $prod = $res->fetch_assoc()) {
            if ($esPublico) {
                $disponible = ($prod['disponible'] == 1 && $prod['stock'] > 0);
                unset($prod['stock']);
                $prod['disponible'] = $disponible;
                $prod['estado'] = $disponible ? 'Disponible' : 'Agotado';
            }
            echo json_encode(["exito" => true, "producto" => $prod]);
        } else {
            echo json_encode(["exito" => false, "mensaje" => "Producto no encontrado con el código especificado."]);
        }
        exit;
    }

    // Listado general
    if ($esPublico) {
        // Para clientes: solo productos activos en inventario
        $sql = "SELECT id, codigo, nombre, categoria, precio, descripcion, imagen, stock, disponible 
                FROM productos 
                WHERE disponible = 1 
                ORDER BY categoria ASC, nombre ASC";
        $res = $conexion->query($sql);
        $productos = [];
        while ($row = $res->fetch_assoc()) {
            $estaDisponible = (intval($row['stock']) > 0);
            $productos[] = [
                "id" => $row['id'],
                "codigo" => $row['codigo'] ?? ('GT-' . str_pad($row['id'], 3, '0', STR_PAD_LEFT)),
                "nombre" => $row['nombre'],
                "categoria" => $row['categoria'],
                "precio" => floatval($row['precio']),
                "descripcion" => $row['descripcion'],
                "imagen" => !empty($row['imagen']) ? $row['imagen'] : 'imagenes/rin-titan.png',
                "disponible" => $estaDisponible,
                "estado" => $estaDisponible ? "Disponible" : "Agotado"
            ];
        }
        echo json_encode($productos);
        exit;
    } else {
        // Para administrador: inventario completo con existencias reales
        $sql = "SELECT * FROM productos ORDER BY id DESC";
        $res = $conexion->query($sql);
        $productos = [];
        while ($row = $res->fetch_assoc()) {
            $row['precio'] = floatval($row['precio']);
            $row['stock'] = intval($row['stock']);
            $row['disponible'] = intval($row['disponible']);
            $productos[] = $row;
        }
        echo json_encode($productos);
        exit;
    }
}

// Si es POST
if ($metodo === 'POST') {
    // 1. Alternar estado activo / inactivo
    if ($accion === 'toggle') {
        $id = intval($_POST['id'] ?? 0);
        if ($id <= 0) {
            $input = json_decode(file_get_contents("php://input"), true);
            $id = intval($input['id'] ?? 0);
        }

        if ($id > 0) {
            $stmt = $conexion->prepare("UPDATE productos SET disponible = IF(disponible=1, 0, 1), fecha_desactivacion = IF(disponible=0, NOW(), NULL) WHERE id = ?");
            $stmt->bind_param("i", $id);
            if ($stmt->execute()) {
                $nuevo = $conexion->query("SELECT disponible FROM productos WHERE id = $id")->fetch_assoc();
                echo json_encode(["exito" => true, "mensaje" => "Estado de producto actualizado.", "disponible" => intval($nuevo['disponible'])]);
            } else {
                echo json_encode(["exito" => false, "mensaje" => "Error al actualizar: " . $conexion->error]);
            }
        } else {
            echo json_encode(["exito" => false, "mensaje" => "ID inválido."]);
        }
        exit;
    }

    // 2. Eliminar producto
    if ($accion === 'eliminar') {
        $id = intval($_POST['id'] ?? 0);
        if ($id <= 0) {
            $input = json_decode(file_get_contents("php://input"), true);
            $id = intval($input['id'] ?? 0);
        }

        if ($id > 0) {
            // Verificar si tiene ventas asociadas
            $check = $conexion->query("SELECT COUNT(*) as c FROM detalle_ventas WHERE producto_id = $id")->fetch_assoc();
            if ($check && $check['c'] > 0) {
                // Si ya tiene ventas, desactivar en lugar de romper integridad referencial
                $conexion->query("UPDATE productos SET disponible = 0, fecha_desactivacion = NOW() WHERE id = $id");
                echo json_encode(["exito" => true, "mensaje" => "El producto tiene ventas históricas asociadas. Se ha desactivado del catálogo."]);
            } else {
                $stmt = $conexion->prepare("DELETE FROM productos WHERE id = ?");
                $stmt->bind_param("i", $id);
                if ($stmt->execute()) {
                    echo json_encode(["exito" => true, "mensaje" => "Producto eliminado exitosamente del inventario."]);
                } else {
                    echo json_encode(["exito" => false, "mensaje" => "Error: " . $conexion->error]);
                }
            }
        } else {
            echo json_encode(["exito" => false, "mensaje" => "ID de producto inválido."]);
        }
        exit;
    }

    // 3. Guardar / Editar producto
    $id = intval($_POST['id'] ?? 0);
    $codigo = trim($_POST['codigo'] ?? '');
    $nombre = trim($_POST['nombre'] ?? '');
    $categoria = trim($_POST['categoria'] ?? 'rines');
    $precio = floatval($_POST['precio'] ?? 0);
    $descripcion = trim($_POST['descripcion'] ?? '');
    $stock = intval($_POST['stock'] ?? 0);
    $disponible = isset($_POST['disponible']) ? intval($_POST['disponible']) : 1;

    if (empty($nombre) || $precio <= 0) {
        echo json_encode(["exito" => false, "mensaje" => "El nombre y el precio deben ser válidos."]);
        exit;
    }

    // Procesar imagen si se subió un archivo
    $imagenRuta = $_POST['imagen_url'] ?? '';
    if (isset($_FILES['imagen_archivo']) && $_FILES['imagen_archivo']['error'] === UPLOAD_ERR_OK) {
        $nombreTmp = $_FILES['imagen_archivo']['tmp_name'];
        $ext = strtolower(pathinfo($_FILES['imagen_archivo']['name'], PATHINFO_EXTENSION));
        $extPermitidas = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        if (in_array($ext, $extPermitidas)) {
            $nuevoNombreImg = 'prod_' . time() . '_' . rand(100, 999) . '.' . $ext;
            $destino = __DIR__ . '/../imagenes/' . $nuevoNombreImg;
            if (move_uploaded_file($nombreTmp, $destino)) {
                $imagenRuta = 'imagenes/' . $nuevoNombreImg;
            }
        }
    }

    // Si es edición
    if ($id > 0) {
        // Si no se proporcionó nuevo código, mantener el que tenía o autogenerar
        if (empty($codigo)) {
            $codigo = 'GT-' . str_pad($id, 3, '0', STR_PAD_LEFT);
        }

        if (!empty($imagenRuta)) {
            $stmt = $conexion->prepare("UPDATE productos SET codigo=?, nombre=?, categoria=?, precio=?, descripcion=?, stock=?, disponible=?, imagen=? WHERE id=?");
            $stmt->bind_param("sssdsiisi", $codigo, $nombre, $categoria, $precio, $descripcion, $stock, $disponible, $imagenRuta, $id);
        } else {
            $stmt = $conexion->prepare("UPDATE productos SET codigo=?, nombre=?, categoria=?, precio=?, descripcion=?, stock=?, disponible=? WHERE id=?");
            $stmt->bind_param("sssdsiii", $codigo, $nombre, $categoria, $precio, $descripcion, $stock, $disponible, $id);
        }

        if ($stmt->execute()) {
            echo json_encode(["exito" => true, "mensaje" => "¡Producto actualizado correctamente en el inventario!"]);
        } else {
            echo json_encode(["exito" => false, "mensaje" => "Error al actualizar: " . $conexion->error]);
        }
    } else {
        // Si es creación de nuevo producto
        if (empty($codigo)) {
            $codigo = 'GT-' . strtoupper(substr($categoria, 0, 3)) . '-' . rand(100, 999);
        }
        if (empty($imagenRuta)) {
            $imagenRuta = 'imagenes/rin-titan.png';
        }

        $stmt = $conexion->prepare("INSERT INTO productos (codigo, nombre, categoria, precio, descripcion, stock, disponible, imagen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssdsiis", $codigo, $nombre, $categoria, $precio, $descripcion, $stock, $disponible, $imagenRuta);

        if ($stmt->execute()) {
            echo json_encode([
                "exito" => true,
                "mensaje" => "¡Producto agregado exitosamente al inventario!",
                "id" => $conexion->insert_id
            ]);
        } else {
            echo json_encode(["exito" => false, "mensaje" => "Error al guardar producto: " . $conexion->error]);
        }
    }
    exit;
}
