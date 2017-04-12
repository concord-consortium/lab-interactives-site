#!/bin/sh
#
# script/populate-standalone.sh [environment]
#

if [ -z "$1" ]; then
  lab_env="default"
else
  lab_env=$1
fi

mkdir -p public/standalone/lab-interactive

if [ -f lab.tar.gz ];
then
  echo "- lab.tar.gz archive found"
else
  lab_url=`script/lab-root-url.rb $lab_env`
  echo "- download the $lab_env archive at $lab_url.tar.gz"
  curl -O $lab_url.tar.gz
fi

echo "- uncompress lab archive to public/standalone/lab-interactive"
tar xzf lab.tar.gz -C public/standalone/lab-interactive

echo "- copy necessary files from public to public/standalone/"

for file_to_copy in embeddable.js embeddable.css; do
	cp public/$file_to_copy public/standalone/lab-interactive
done

echo "- copy necessary vendor folders from public to public/standalone/lab-interactive"

mkdir -p public/standalone/lab-interactive/vendor
VENDOR_FOLDERS="shutterbug"
for vendor_folder_to_copy in $VENDOR_FOLDERS; do
	cp -r public/vendor/$vendor_folder_to_copy public/standalone/lab-interactive/vendor/
done

echo "- copy CC themes from public to public/standalone/lab-interactive"

mkdir -p public/standalone/lab-interactive/themes
cp public/themes/cc-themes.css public/standalone/lab-interactive/themes/

tar -zcf public/standalone/lab-interactive.tar.gz --directory=public/standalone/ lab-interactive
rm -rf public/standalone/lab-interactive
