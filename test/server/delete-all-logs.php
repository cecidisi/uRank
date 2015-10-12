<?php


header('Access-Control-Allow-Origin: *');
include 'error.php';

$output_dir = "./logs";

if(!file_exists($output_dir)) {
    return_error('ERROR directory does not exist', 404);
    exit;
}

chmod($output_dir, 0755);
if(!is_writable($output_dir)) {
    return_error('ERROR no writing permission', 1337);
    exit;
}

$res = array();
$files = glob($output_dir.'/*'); // get all file names
foreach($files as $file){ // iterate files
    if(is_file($file)) {
        unlink($file); // delete file
        array_push($res, $file);
    }
}
echo json_encode($res);
?>

