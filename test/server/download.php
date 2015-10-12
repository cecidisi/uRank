<?php
header('Access-Control-Allow-Origin: *');
include 'error.php';

$dir = './logs';

if(!file_exists($dir)) {
    return_error('ERROR directory does not exist', 404);
    exit;
}

$files = glob($dir.'/*'); // get all file names
$zipname = 'urank-test-logs.zip';
$zip = new ZipArchive;

$zip->open($zipname, ZipArchive::CREATE);

foreach($files as $file){ // iterate files
    $zip->addFile($file);
}
$zip->close();

// Outputting headers:
header('Content-Type: application/zip');
header('Content-disposition: attachment; filename='.$zipname);
header('Content-Length: ' . filesize($zipname));
readfile($zipname);
?>
