#!/bin/sh
#
# script/populate-standalone.sh [path-to-lab-framework-dist]
#

if [ -z "$1" ]
  then
    lab_path="../app/public/lab"
  else
    lab_path=$1
fi

mkdir -p pubic/standalone/lab-interactive

echo "- copy $lab_path to public/standalone/lab-interactive"

rsync -aq $lab_path public/standalone/lab-interactive

echo "- copy necessary files from public to public/standalone/"

for file_to_copy in embeddable.js embeddable.css; do
	cp public/$file_to_copy public/standalone/lab-interactive
done

echo "- copy necessary vendor folders from public to public/standalone/lab-interactive"

VENDOR_FOLDERS="modernizr shutterbug"
for vendor_folder_to_copy in $VENDOR_FOLDERS; do
	cp -r public/vendor/$vendor_folder_to_copy public/standalone/lab-interactive/vendor/
done

tar -zcf public/standalone/lab-interactive.tar.gz --directory=public/standalone/ lab-interactive

