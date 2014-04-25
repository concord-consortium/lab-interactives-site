#!/bin/sh

# this will deploy the current public folder to a subfolder in the s3 bucket
# the subfolder is the name of the TRAVIS_BRANCH
if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
  echo "skiping deploy to S3: this is a pull request"
  exit 0
fi

# TODO: CHANGE BACK TO MASTER!
if [ "$TRAVIS_BRANCH" = "s3cmd-upload" ]; then
  SITE_VERSION=`cat site-version`
  echo "deploying master branch (production): updating root dir, version/$SITE_VERSION and version/$SITE_VERSION.tar.gz"
  echo "- copy public to _site"
  cp -R public _site
  mkdir -p _site/version

  echo "- move public to _site/version/$SITE_VERSION"
  mv public _site/version/$SITE_VERSION

  lab_url=`script/lab-root-url.rb`
  echo "- download the default Lab archive at $lab_url.tar.gz and uncompress to _site/version/$SITE_VERSION"
  curl -O $lab_url.tar.gz
  tar xzf lab.tar.gz -C _site/version/$SITE_VERSION
  rm lab.tar.gz

  echo "- remove unnecessary HTML pages"
  rm _site/version/$SITE_VERSION/interactives*.html
  rm _site/version/$SITE_VERSION/embeddable*.html

  echo "- generate HTML pages with correct Lab root URL"
  LAB_ROOT_URL="lab" script/generate-interactives-html.rb default > _site/version/$SITE_VERSION/interactives.html
  LAB_ROOT_URL="lab" script/generate-embeddable-html.rb default > _site/version/$SITE_VERSION/embeddable.html

  echo "- generate archive _site/version/$SITE_VERSION.tar.gz"
  tar -cf _site/version/$SITE_VERSION.tar --directory=_site/version/ $SITE_VERSION
  # Divide tar and gzipping so we can pass --no-name argument to gzip.
  gzip --no-name _site/version/$SITE_VERSION.tar
else
  echo "deploying $TRAVIS_BRANCH branch: updating branch/$TRAVIS_BRANCH"
  mkdir -p _site/branch
  echo "- move public to _site/branch/$TRAVIS_BRANCH"
  mv public _site/branch/$TRAVIS_BRANCH
fi

echo "- gzip HTML, JS, CSS and JSON files"
# find _site/ -type f -iname '*.html' -exec gzip --no-name {} \; -exec mv {}.gz {} \;
# find _site/ -type f -iname '*.js' -exec gzip --no-name {} \; -exec mv {}.gz {} \;
# find _site/ -type f -iname '*.css' -exec gzip --no-name {} \; -exec mv {}.gz {} \;
# find _site/ -type f -iname '*.json' -exec gzip --no-name {} \; -exec mv {}.gz {} \;

echo "- sync gzipped and non-gzipped content"
# Sync non-gzipped content and prepare regexp for gzipped content sync.
if [ "$TRAVIS_BRANCH" = "s3cmd-upload" ]; then
  s3cmd sync -c config/s3cmd -q --no-mime-magic --delete-removed --no-preserve --rexclude '^(version/(?!'"$SITE_VERSION"')|branch/)' \
    --exclude '*.html' --exclude '*.js' --exclude '*.css' --exclude '*.json' \
    _site/ s3://interactives-s3.concord.org/ &
  inc='^(?!(version/(?!'"$SITE_VERSION"')|branch/))'
else
  s3cmd sync -c config/s3cmd -q --no-mime-magic --delete-removed --no-preserve --rexclude '^(?!branch/'"$TRAVIS_BRANCH"'/)' \
    --exclude '*.html' --exclude '*.js' --exclude '*.css' --exclude '*.json' \
    _site/ s3://interactives-s3.concord.org/ &
  inc='^branch/'"$TRAVIS_BRANCH"'/'
fi
# Sync gziped content.
s3cmd sync -c config/s3cmd -q --delete-removed --no-preserve \
  --exclude '*' --rinclude "$inc"'.+\.html' --mime-type=text/html _site/ s3://interactives-s3.concord.org/ &
s3cmd sync -c config/s3cmd -q --delete-removed --no-preserve \
  --exclude '*' --rinclude "$inc"'.+\.js' --mime-type=application/javascript _site/ s3://interactives-s3.concord.org/ &
s3cmd sync -c config/s3cmd -q --delete-removed --no-preserve \
  --exclude '*' --rinclude "$inc"'.+\.css' --mime-type=text/css _site/ s3://interactives-s3.concord.org/ &
s3cmd sync -c config/s3cmd -q --delete-removed --no-preserve \
  --exclude '*' --rinclude "$inc"'.+\.json' --mime-type=application/json _site/ s3://interactives-s3.concord.org/ &

wait
echo "sync finished"
