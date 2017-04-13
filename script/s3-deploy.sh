#!/bin/sh

# this will deploy the current public folder to a subfolder in the s3 bucket
# the subfolder is the name of the TRAVIS_BRANCH
if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
  echo "skiping deploy to S3: this is a pull request"
  exit 0
fi

echo "running ./script/populate-standalone.sh script"
sh ./script/populate-standalone.sh

if [ "$TRAVIS_BRANCH" = "master" ]; then
  SITE_VERSION=`cat site-version`
  echo "deploying master branch (production): updating root dir, version/$SITE_VERSION and version/$SITE_VERSION.tar.gz"
  echo "- copy public to _site"
  cp -R public _site
  mkdir -p _site/version

  echo "- move public to _site/version/$SITE_VERSION"
  mv public _site/version/$SITE_VERSION

  if [ -f lab.tar.gz ];
  then
    echo "- lab.tar.gz archive found"
  else
    lab_url=`script/lab-root-url.js`
    echo "- download the default Lab archive at $lab_url.tar.gz"
    curl -O $lab_url.tar.gz
  fi

  echo "- uncompress lab archive to _site/version/$SITE_VERSION"
  tar xzf lab.tar.gz -C _site/version/$SITE_VERSION

  echo "- remove unnecessary HTML pages"
  rm _site/version/$SITE_VERSION/interactives*.html
  rm _site/version/$SITE_VERSION/embeddable*.html

  echo "- generate HTML pages with correct Lab root URL"
  LAB_ROOT_URL="lab" LAB_ENV="default" script/compile-handlebars.js src/interactives.html.handlebars _site/version/$SITE_VERSION/interactives.html
  LAB_ROOT_URL="lab" LAB_ENV="default" script/compile-handlebars.js src/embeddable.html.handlebars > _site/version/$SITE_VERSION/embeddable.html

  echo "- generate archive _site/version/$SITE_VERSION.tar.gz"
  tar -cf _site/version/$SITE_VERSION.tar --directory=_site/version/ $SITE_VERSION
  # Pass --no-name option so timestamp is not included in gzipped file and the S3_website diff
  # can correctly detect whether this file has been changed or not.
  gzip --no-name _site/version/$SITE_VERSION.tar
  export SITE_VERSION
else
  echo "deploying $TRAVIS_BRANCH branch: updating branch/$TRAVIS_BRANCH"
  mkdir -p _site/branch
  DEPLOY_DIR=branch/$TRAVIS_BRANCH
  mv public _site/$DEPLOY_DIR
  export DEPLOY_DIR
fi

# It was downloaded either by ./script/popluate-standalone.sh or this script.
rm lab.tar.gz

bundle exec s3_website push --site _site --config-dir config
