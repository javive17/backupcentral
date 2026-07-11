<?php
$backendPort = 3080;
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$isApi = preg_match('#^/backupcentral/api/#', $requestUri);

if ($isApi) {
    $nodeReady = false;
    for ($i = 0; $i < 10; $i++) {
        $fp = @fsockopen('localhost', $backendPort, $errno, $errstr, 1);
        if ($fp) { $nodeReady = true; fclose($fp); break; }
        if ($i === 0) {
            $appDir = str_replace('\\', '/', __DIR__ . '/backend');
            shell_exec("cd \"$appDir\" && PORT=$backendPort nohup node src/index.js > /tmp/backupcentral.log 2>&1 &");
        }
        usleep(500000);
    }

    if (!$nodeReady) {
        http_response_code(502);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Backend not available']);
        exit;
    }

    $target = "http://localhost:$backendPort";
    $path = preg_replace('#^/backupcentral#', '', $requestUri);
    $url = $target . $path;

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 120);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);

    $contentType = '';
    foreach (getallheaders() as $name => $value) {
        if (strtolower($name) === 'content-type') { $contentType = $value; break; }
    }
    $isMultipart = stripos($contentType, 'multipart/form-data') !== false;

    if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH'])) {
        if ($isMultipart) {
            $postData = $_POST;
            foreach ($_FILES as $key => $file) {
                if ($file['error'] === UPLOAD_ERR_OK) {
                    $postData[$key] = new CURLFile($file['tmp_name'], $file['type'], $file['name']);
                }
            }
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        } else {
            curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
        }
    }

    $headers = [];
    foreach (getallheaders() as $name => $value) {
        $h = strtolower($name);
        if (!in_array($h, ['host', 'content-length', 'connection', 'accept-encoding'])) {
            if ($isMultipart && $h === 'content-type') continue;
            $headers[] = "$name: $value";
        }
    }
    $hasAuth = false;
    foreach ($headers as $h) {
        if (stripos($h, 'Authorization:') === 0) { $hasAuth = true; break; }
    }
    if (!$hasAuth) {
        $authVal = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
        if ($authVal) {
            $headers[] = 'Authorization: ' . $authVal;
        }
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_ENCODING, '');

    $response = curl_exec($ch);
    $info = curl_getinfo($ch);
    curl_close($ch);

    if ($response === false) {
        http_response_code(502);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Could not connect to backend']);
        exit;
    }

    $http_code = $info['http_code'];
    $header_size = $info['header_size'];
    $response_headers = substr($response, 0, $header_size);
    $response_body = substr($response, $header_size);

    foreach (explode("\r\n", $response_headers) as $h) {
        if (!empty($h) && !preg_match('/^(Transfer-Encoding|Connection|Keep-Alive|Proxy-|Upgrade):/i', $h)) {
            header($h, false);
        }
    }

    http_response_code($http_code);
    echo $response_body;
    exit;
}

$path = preg_replace('#^/backupcentral#', '', $requestUri);
if (empty($path) || $path === '/') $path = '/index.html';

$root = __DIR__;
$file = $root . $path;

if (is_file($file)) {
    $mimeTypes = [
        'html' => 'text/html', 'css' => 'text/css', 'js' => 'application/javascript',
        'json' => 'application/json', 'svg' => 'image/svg+xml', 'png' => 'image/png',
        'jpg' => 'image/jpeg', 'gif' => 'image/gif', 'ico' => 'image/x-icon',
        'woff' => 'font/woff', 'woff2' => 'font/woff2', 'ttf' => 'font/ttf',
    ];
    $ext = pathinfo($file, PATHINFO_EXTENSION);
    $mime = $mimeTypes[$ext] ?? mime_content_type($file) ?: 'application/octet-stream';
    header('Content-Type: ' . $mime);
    readfile($file);
    exit;
}

header('Content-Type: text/html');
readfile($root . '/index.html');
