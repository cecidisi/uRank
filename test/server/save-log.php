<?php
header('Access-Control-Allow-Origin: *');
include 'error.php';
if(empty($_POST['data']) || empty($_POST['filename'])){
    return_error('POST parameter missing', 1001);
    exit;
}

$output_dir = "./logs";
if(!file_exists($output_dir)) {
    mkdir($output_dir, 0755, true);
}
chmod($output_dir, 0755);

if(!is_writable($output_dir)) {
    return_error('ERROR no writing permission', 1337);
    exit;
}

$filename = $_POST['filename'].'.json';
$data = $_POST['data'];
$file = fopen($output_dir.'/'.$filename, 'w') or die('Unable to open file!');
fwrite($file, json_encode($data));
fclose($file);
echo "data saved succesfully";

?>
