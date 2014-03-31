#!/bin/sh
#
# script/create-archived-public-dir.sh [name-of-versioned-dir] [path-to-lab-framework-dist]
#

if [ -z "$1" ]
  then
    lab_path="../app/public/lab"
  else
    lab_path=$1
fi

echo "- create public/standalone-template/ directory"

mkdir -p public/standalone-template/

echo "- copy $lab_path to public/standalone-template/"

rsync -aq $lab_path public/standalone-template/

echo "- copy necessary vendor folders from lab to public/standalone-template/"

mkdir -p public/standalone-template/vendor
LAB_VENDOR_FOLDERS="d3 jquery jquery-ui jquery-ui-touch-punch jquery-context-menu jquery-selectBoxIt tinysort fonts"
for vendor_folder_to_copy in $LAB_VENDOR_FOLDERS; do
	cp -r $lab_path/../vendor/$vendor_folder_to_copy public/standalone-template/vendor/
done

echo "- copy necessary files from public to public/standalone-template/"

for file_to_copy in embeddable.js embeddable.css; do
	cp public/$file_to_copy public/standalone-template/
done

echo "- copy necessary vendor folders from public to public/standalone-template/"

VENDOR_FOLDERS="modernizr"
for vendor_folder_to_copy in $VENDOR_FOLDERS; do
	cp -r public/vendor/$vendor_folder_to_copy public/standalone-template/vendor/
done

echo "- generate HTML pages with correct Lab root URL and STATIC=false"

LAB_ROOT_URL="lab" bin/haml -r ./script/setup.rb src/embeddable-standalone.html.haml public/standalone-template/template.html

# Inorder to make this specfic to a particular interactive you need to define a global JS varaible INTERACTIVE
# and you need to also include the model files.
# TODO: figure out where model resources are
# TODO: try making a client-side tool for generating the correct html page for any interactive then the steps
#  would be: download the standalone-template folder (as an archive), generate the interactive html that you want using
#  a client side tool, save it into the folder.