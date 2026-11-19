<?php
require_once __DIR__ . '/config.php';

if (!headers_sent()) {
    header("Content-Type: application/json; charset=UTF-8");
}

$accion = $_GET['accion'] ?? $_POST['accion'] ?? '';
$input = json_decode(file_get_contents("php://input"), true) ?? $_POST;

if (empty($accion) && isset($input['accion'])) {
    $accion = $input['accion'];
}

switch ($accion) {
    case 'login':
        $usuario = trim($input['usuario'] ?? '');
        $clave = trim($input['clave'] ?? '');

        if (empty($usuario) || empty($clave)) {
            echo json_encode(["exito" => false, "mensaje" => "Por favor ingresa usuario/correo y contraseña."]);
            exit;
        }

        // 1. Probar como Administrador
        $stmtAdmin = $conexion->prepare("SELECT * FROM usuarios_admin WHERE usuario = ? LIMIT 1");
        $stmtAdmin->bind_param("s", $usuario);
        $stmtAdmin->execute();
        $resAdmin = $stmtAdmin->get_result();

        if ($resAdmin && $resAdmin->num_rows === 1) {
            $admin = $resAdmin->fetch_assoc();
            // Validar clave (texto plano o hash)
            if ($clave === $admin['clave'] || password_verify($clave, $admin['clave'])) {
                $_SESSION['sesion_activa'] = true;
                $_SESSION['rol'] = 'admin';
                $_SESSION['admin_id'] = $admin['id'];
                $_SESSION['usuario'] = $admin['usuario'];
                $_SESSION['nombre'] = $admin['nombre_completo'] ?? 'Administrador GT';

                echo json_encode([
                    "exito" => true,
                    "rol" => "admin",
                    "mensaje" => "¡Bienvenido Administrador!",
                    "usuario" => [
                        "id" => $admin['id'],
                        "usuario" => $admin['usuario'],
                        "nombre" => $admin['nombre_completo'] ?? 'Administrador GT',
                        "rol" => "admin"
                    ]
                ]);
                exit;
            }
        }

        // 2. Probar como Cliente
        $stmtCliente = $conexion->prepare("SELECT * FROM usuarios_clientes WHERE email = ? LIMIT 1");
        $stmtCliente->bind_param("s", $usuario);
        $stmtCliente->execute();
        $resCliente = $stmtCliente->get_result();

        if ($resCliente && $resCliente->num_rows === 1) {
            $cliente = $resCliente->fetch_assoc();
            if ($clave === $cliente['clave'] || password_verify($clave, $cliente['clave'])) {
                $_SESSION['sesion_activa'] = true;
                $_SESSION['rol'] = 'cliente';
                $_SESSION['cliente_id'] = $cliente['id'];
                $_SESSION['nombre'] = $cliente['nombre'];
                $_SESSION['email'] = $cliente['email'];

                echo json_encode([
                    "exito" => true,
                    "rol" => "cliente",
                    "mensaje" => "¡Bienvenido, " . $cliente['nombre'] . "!",
                    "usuario" => [
                        "id" => $cliente['id'],
                        "nombre" => $cliente['nombre'],
                        "email" => $cliente['email'],
                        "telefono" => $cliente['telefono'] ?? '',
                        "direccion" => $cliente['direccion'] ?? '',
                        "ciudad" => $cliente['ciudad'] ?? '',
                        "rol" => "cliente"
                    ]
                ]);
                exit;
            }
        }

        echo json_encode(["exito" => false, "mensaje" => "Usuario o contraseña incorrectos."]);
        break;

    case 'google_auth':
        $credential = trim($input['credential'] ?? '');
        $googleId = trim($input['google_id'] ?? $input['sub'] ?? '');
        $email = trim($input['email'] ?? '');
        $nombre = trim($input['nombre'] ?? $input['name'] ?? '');
        $avatar = trim($input['avatar'] ?? $input['picture'] ?? '');

        // Si se envió el token JWT oficial de Google Identity Services
        if (!empty($credential)) {
            $partesJwt = explode('.', $credential);
            if (count($partesJwt) === 3) {
                $payloadJson = base64_decode(str_replace(['-', '_'], ['+', '/'], $partesJwt[1]));
                $payloadData = json_decode($payloadJson, true);
                if (is_array($payloadData)) {
                    $googleId = $payloadData['sub'] ?? $googleId;
                    $email = $payloadData['email'] ?? $email;
                    $nombre = $payloadData['name'] ?? $nombre;
                    $avatar = $payloadData['picture'] ?? $avatar;
                }
            }
        }

        if (empty($email)) {
            echo json_encode(["exito" => false, "mensaje" => "No se pudo obtener un correo electrónico válido de Google."]);
            exit;
        }

        // Asegurar que las columnas google_id y avatar existan en la tabla
        $checkCol = $conexion->query("SHOW COLUMNS FROM usuarios_clientes LIKE 'google_id'");
        if ($checkCol && $checkCol->num_rows === 0) {
            $conexion->query("ALTER TABLE usuarios_clientes ADD COLUMN google_id VARCHAR(100) NULL AFTER ciudad, ADD COLUMN avatar VARCHAR(255) NULL AFTER google_id");
        }

        // 1. Buscar si ya existe por email o por google_id
        $stmt = $conexion->prepare("SELECT * FROM usuarios_clientes WHERE email = ? OR (google_id IS NOT NULL AND google_id = ?) LIMIT 1");
        $stmt->bind_param("ss", $email, $googleId);
        $stmt->execute();
        $res = $stmt->get_result();

        if ($res && $res->num_rows === 1) {
            $cliente = $res->fetch_assoc();

            // Si no tenía google_id o avatar, vincularlo
            if (empty($cliente['google_id']) && !empty($googleId)) {
                $up = $conexion->prepare("UPDATE usuarios_clientes SET google_id = ?, avatar = IF(avatar IS NULL OR avatar='', ?, avatar) WHERE id = ?");
                $up->bind_param("ssi", $googleId, $avatar, $cliente['id']);
                $up->execute();
            }

            $_SESSION['sesion_activa'] = true;
            $_SESSION['rol'] = 'cliente';
            $_SESSION['cliente_id'] = $cliente['id'];
            $_SESSION['nombre'] = $cliente['nombre'];
            $_SESSION['email'] = $cliente['email'];
            $_SESSION['avatar'] = !empty($cliente['avatar']) ? $cliente['avatar'] : $avatar;

            echo json_encode([
                "exito" => true,
                "rol" => "cliente",
                "es_nuevo" => false,
                "mensaje" => "¡Bienvenido de nuevo, " . $cliente['nombre'] . "!",
                "usuario" => [
                    "id" => $cliente['id'],
                    "nombre" => $cliente['nombre'],
                    "email" => $cliente['email'],
                    "telefono" => $cliente['telefono'] ?? '',
                    "direccion" => $cliente['direccion'] ?? '',
                    "ciudad" => $cliente['ciudad'] ?? '',
                    "avatar" => $avatar,
                    "rol" => "cliente"
                ]
            ]);
            exit;
        } else {
            // 2. Si no existe, registrarlo automáticamente con su cuenta de Google
            $claveAleatoria = 'google_' . bin2hex(random_bytes(6));
            $telefono = '';
            $direccion = '';
            $ciudad = '';

            $insert = $conexion->prepare("INSERT INTO usuarios_clientes (nombre, email, clave, telefono, direccion, ciudad, google_id, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $insert->bind_param("ssssssss", $nombre, $email, $claveAleatoria, $telefono, $direccion, $ciudad, $googleId, $avatar);

            if ($insert->execute()) {
                $nuevoId = $conexion->insert_id;
                $_SESSION['sesion_activa'] = true;
                $_SESSION['rol'] = 'cliente';
                $_SESSION['cliente_id'] = $nuevoId;
                $_SESSION['nombre'] = $nombre;
                $_SESSION['email'] = $email;
                $_SESSION['avatar'] = $avatar;

                echo json_encode([
                    "exito" => true,
                    "rol" => "cliente",
                    "es_nuevo" => true,
                    "mensaje" => "¡Tu cuenta ha sido creada exitosamente con Google!",
                    "usuario" => [
                        "id" => $nuevoId,
                        "nombre" => $nombre,
                        "email" => $email,
                        "telefono" => '',
                        "direccion" => '',
                        "ciudad" => '',
                        "avatar" => $avatar,
                        "rol" => "cliente"
                    ]
                ]);
                exit;
            } else {
                echo json_encode(["exito" => false, "mensaje" => "Error al registrar cuenta con Google: " . $conexion->error]);
                exit;
            }
        }
        break;

    case 'registro':
        $nombre = trim($input['nombre'] ?? '');
        $email = trim($input['email'] ?? '');
        $clave = trim($input['clave'] ?? '');
        $telefono = trim($input['telefono'] ?? '');
        $direccion = trim($input['direccion'] ?? '');
        $ciudad = trim($input['ciudad'] ?? '');

        if (empty($nombre) || empty($email) || empty($clave)) {
            echo json_encode(["exito" => false, "mensaje" => "Nombre, correo y contraseña son obligatorios."]);
            exit;
        }

        if (strlen($clave) < 6) {
            echo json_encode(["exito" => false, "mensaje" => "La contraseña debe tener al menos 6 caracteres."]);
            exit;
        }

        // Verificar si el correo ya existe
        $check = $conexion->prepare("SELECT id FROM usuarios_clientes WHERE email = ? LIMIT 1");
        $check->bind_param("s", $email);
        $check->execute();
        if ($check->get_result()->num_rows > 0) {
            echo json_encode(["exito" => false, "mensaje" => "Este correo electrónico ya está registrado. Inicia sesión."]);
            exit;
        }

        $stmt = $conexion->prepare("INSERT INTO usuarios_clientes (nombre, email, clave, telefono, direccion, ciudad) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssss", $nombre, $email, $clave, $telefono, $direccion, $ciudad);

        if ($stmt->execute()) {
            $nuevoId = $conexion->insert_id;
            $_SESSION['sesion_activa'] = true;
            $_SESSION['rol'] = 'cliente';
            $_SESSION['cliente_id'] = $nuevoId;
            $_SESSION['nombre'] = $nombre;
            $_SESSION['email'] = $email;

            echo json_encode([
                "exito" => true,
                "mensaje" => "¡Cuenta creada exitosamente!",
                "usuario" => [
                    "id" => $nuevoId,
                    "nombre" => $nombre,
                    "email" => $email,
                    "telefono" => $telefono,
                    "direccion" => $direccion,
                    "ciudad" => $ciudad,
                    "rol" => "cliente"
                ]
            ]);
        } else {
            echo json_encode(["exito" => false, "mensaje" => "Error al registrar: " . $conexion->error]);
        }
        break;

    case 'sesion':
        if (isset($_SESSION['sesion_activa']) && $_SESSION['sesion_activa'] === true) {
            $rol = $_SESSION['rol'] ?? 'cliente';
            $usuarioData = [
                "autenticado" => true,
                "rol" => $rol,
                "nombre" => $_SESSION['nombre'] ?? '',
            ];

            if ($rol === 'cliente') {
                $clienteId = $_SESSION['cliente_id'] ?? 0;
                $stmt = $conexion->prepare("SELECT id, nombre, email, telefono, direccion, ciudad FROM usuarios_clientes WHERE id = ?");
                $stmt->bind_param("i", $clienteId);
                $stmt->execute();
                $res = $stmt->get_result();
                if ($res && $c = $res->fetch_assoc()) {
                    $usuarioData = array_merge($usuarioData, $c);
                }
            } else {
                $usuarioData['id'] = $_SESSION['admin_id'] ?? 1;
                $usuarioData['usuario'] = $_SESSION['usuario'] ?? 'admin';
            }

            echo json_encode(["exito" => true, "usuario" => $usuarioData]);
        } else {
            echo json_encode(["exito" => false, "autenticado" => false]);
        }
        break;

    case 'perfil':
        $clienteId = $_SESSION['cliente_id'] ?? intval($_GET['id'] ?? 0);
        if (!$clienteId) {
            echo json_encode(["exito" => false, "mensaje" => "No has iniciado sesión."]);
            exit;
        }

        $stmt = $conexion->prepare("SELECT id, nombre, email, telefono, direccion, ciudad, fecha_registro FROM usuarios_clientes WHERE id = ?");
        $stmt->bind_param("i", $clienteId);
        $stmt->execute();
        $res = $stmt->get_result();

        if ($res && $cliente = $res->fetch_assoc()) {
            echo json_encode(["exito" => true, "cliente" => $cliente]);
        } else {
            echo json_encode(["exito" => false, "mensaje" => "Cliente no encontrado."]);
        }
        break;

    case 'actualizar_perfil':
        $clienteId = $_SESSION['cliente_id'] ?? intval($input['id'] ?? 0);
        if (!$clienteId) {
            echo json_encode(["exito" => false, "mensaje" => "No has iniciado sesión."]);
            exit;
        }

        $nombre = trim($input['nombre'] ?? '');
        $email = trim($input['email'] ?? '');
        $telefono = trim($input['telefono'] ?? '');
        $direccion = trim($input['direccion'] ?? '');
        $ciudad = trim($input['ciudad'] ?? '');
        $clave = trim($input['clave'] ?? '');

        if (empty($nombre) || empty($email)) {
            echo json_encode(["exito" => false, "mensaje" => "Nombre y correo son obligatorios."]);
            exit;
        }

        // Verificar correo duplicado
        $check = $conexion->prepare("SELECT id FROM usuarios_clientes WHERE email = ? AND id != ? LIMIT 1");
        $check->bind_param("si", $email, $clienteId);
        $check->execute();
        if ($check->get_result()->num_rows > 0) {
            echo json_encode(["exito" => false, "mensaje" => "El correo ya está en uso por otra cuenta."]);
            exit;
        }

        if (!empty($clave)) {
            if (strlen($clave) < 6) {
                echo json_encode(["exito" => false, "mensaje" => "La contraseña debe tener mínimo 6 caracteres."]);
                exit;
            }
            $stmt = $conexion->prepare("UPDATE usuarios_clientes SET nombre = ?, email = ?, telefono = ?, direccion = ?, ciudad = ?, clave = ? WHERE id = ?");
            $stmt->bind_param("ssssssi", $nombre, $email, $telefono, $direccion, $ciudad, $clave, $clienteId);
        } else {
            $stmt = $conexion->prepare("UPDATE usuarios_clientes SET nombre = ?, email = ?, telefono = ?, direccion = ?, ciudad = ? WHERE id = ?");
            $stmt->bind_param("sssssi", $nombre, $email, $telefono, $direccion, $ciudad, $clienteId);
        }

        if ($stmt->execute()) {
            $_SESSION['nombre'] = $nombre;
            $_SESSION['email'] = $email;
            echo json_encode(["exito" => true, "mensaje" => "Perfil actualizado exitosamente."]);
        } else {
            echo json_encode(["exito" => false, "mensaje" => "Error al actualizar: " . $conexion->error]);
        }
        break;

    case 'logout':
        $_SESSION = [];
        if (session_id() != "" || isset($_COOKIE[session_name()])) {
            setcookie(session_name(), '', time() - 3600, '/');
        }
        session_destroy();
        echo json_encode(["exito" => true, "mensaje" => "Sesión cerrada correctamente."]);
        break;

    default:
        echo json_encode(["exito" => false, "mensaje" => "Acción no reconocida."]);
        break;
}
$conexion->close();
