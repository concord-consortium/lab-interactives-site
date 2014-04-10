#!/bin/sh
#
# script/create-archived-public-dir.sh [name-of-versioned-dir] [path-to-lab-framework-dist]
#

if [ -z "$1" ]; then
  version=`cat site-version`
else
  version=$1
fi

if [ -z "$2" ]; then
  lab_env="default"
else
  lab_env=$2
fi
archivename="$version.tar.gz"

echo "- create version/$version/public/ directory"

mkdir -p version/$version/public/

echo "- copy public to version/$version/public/"

# Exclude:
# .git - public folder used to be a git repo (previous version of this script was creating it),
# version - symbolic links to other versions,
# jnlp - following convention of the previous script, we also don't want to include that in archive.
rsync -aq --exclude='.git/' --exclude='version/' --exclude='jnlp/' public version/$version/

lab_url=`script/lab-root-url.rb $lab_env`
echo "- download the $lab_env archive at $lab_url.tar.gz and uncompress to version/$version/public/"

curl -O $lab_url.tar.gz
tar xzf lab.tar.gz -C version/$version/public
rm lab.tar.gz

echo "- remove unnecessary HTML pages"

rm version/$version/public/interactives.html
rm version/$version/public/interactives-staging.html
rm version/$version/public/interactives-dev.html
rm version/$version/public/interactives-local.html
rm version/$version/public/embeddable.html
rm version/$version/public/embeddable-staging.html
rm version/$version/public/embeddable-dev.html
rm version/$version/public/embeddable-local.html

echo "- generate HTML pages with correct Lab root URL and STATIC=true"

LAB_ROOT_URL="lab" LAB_STATIC=true script/generate-interactives-html.rb default > version/$version/public/interactives.html
LAB_ROOT_URL="lab" script/generate-embeddable-html.rb default > version/$version/public/embeddable.html

echo "- generate $archivename archive"

mv version/$version/public/ version/$version/$version/
tar -zcf version/$archivename --directory=version/$version/ $version
mv version/$version/$version/ version/$version/public/

echo "- generate HTML pages with correct Lab root URL and STATIC=false"

LAB_ROOT_URL="lab" script/generate-interactives-html.rb default > version/$version/public/interactives.html
LAB_ROOT_URL="lab" script/generate-embeddable-html.rb default > version/$version/public/embeddable.html
