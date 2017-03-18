# See the README for installation instructions.

# Utilities
JS_COMPILER = ./node_modules/uglify-js/bin/uglifyjs -c -m -
COFFEESCRIPT_COMPILER = ./node_modules/coffee-script/bin/coffee
MARKDOWN_COMPILER = bundle exec kramdown
SASS_COMPILER = bundle exec sass -I src -I public
HAML_COMPILER = bundle exec haml

GENERATE_INTERACTIVE_INDEX = ruby src/helpers/process-interactives.rb

FONT_FOLDERS := $(shell find vendor/fonts -mindepth 1 -maxdepth 1)

# targets

INTERACTIVE_FILES := $(shell find src/models src/interactives -name '*.json' -exec echo {} \; | sed s'/src\/\(.*\)/public\/\1/' )
vpath %.json src

HAML_FILES := $(shell find src -name '*.html.haml' -exec echo {} \; | sed s'/src\/\(.*\)\.haml/public\/\1/' )
vpath %.haml src

SASS_FILES := $(shell find src -name '*.sass' -and -not -path "src/sass/*" -exec echo {} \; | sed s'/src\/\(.*\)\.sass/public\/\1.css/' )
SASS_FILES += $(shell find src -name '*.scss' -and -not -path "src/sass/*" -exec echo {} \; | sed s'/src\/\(.*\)\.scss/public\/\1.css/' )
vpath %.sass src
vpath %.scss src

COFFEESCRIPT_FILES := $(shell find src/doc -name '*.coffee' -exec echo {} \; | sed s'/src\/\(.*\)\.coffee/public\/\1.js/' )
COFFEESCRIPT_FILES += $(shell find src/examples -name '*.coffee' -exec echo {} \; | sed s'/src\/\(.*\)\.coffee/public\/\1.js/' )
COFFEESCRIPT_FILES += $(shell find src/experiments -name '*.coffee' -exec echo {} \; | sed s'/src\/\(.*\)\.coffee/public\/\1.js/' )
vpath %.coffee src

MARKDOWN_FILES := $(patsubst %.md, public/%.html, $(wildcard *.md)) public/examples.html
DEV_MARKDOWN_FILES := $(patsubst %.md, public/%.html, $(wildcard developer-doc/*.md))

CURRENT_CONFIG_FILE := $(shell script/branch-config-file.rb)

# default target executed when running make. Run the $(MAKE) public task rather than simply
# declaring a dependency on 'public' because 'bundle install' and 'npm install' might update some
# sources, and we want to recompute stale dependencies after that.
.PHONY: all
all: \
	vendor/d3/d3.js \
	node_modules
	$(MAKE) public

# clean, make
.PHONY: everything
everything:
	$(MAKE) clean
	$(MAKE) all

.PHONY: src
src: \
	$(MARKDOWN_FILES) \
	$(DEV_MARKDOWN_FILES) \
	$(HAML_FILES) \
	$(SASS_FILES) \
	$(COFFEESCRIPT_FILES) \
	$(INTERACTIVE_FILES) \
	public/interactives.html \
	public/interactives-production.html \
	public/interactives-staging.html \
	public/interactives-dev.html \
	public/interactives-local.html \
	public/embeddable.html \
	public/embeddable-production.html \
	public/embeddable-staging.html \
	public/embeddable-dev.html \
	public/embeddable-local.html \
	public/browser-check.html \
	public/interactives.json \
	public/application.js

# rebuild html files that use partials based on settings in project configuration
public/interactives.html: $(CURRENT_CONFIG_FILE) interactives.haml
	script/generate-interactives-html.rb default > $@
public/interactives-production.html: $(CURRENT_CONFIG_FILE) interactives.haml
	script/generate-interactives-html.rb production > $@
public/interactives-staging.html: $(CURRENT_CONFIG_FILE) interactives.haml
	script/generate-interactives-html.rb staging > $@
public/interactives-dev.html: $(CURRENT_CONFIG_FILE) interactives.haml
	script/generate-interactives-html.rb development > $@
public/interactives-local.html: $(CURRENT_CONFIG_FILE) interactives.haml
	script/generate-interactives-html.rb local > $@

public/embeddable.html: $(CURRENT_CONFIG_FILE) embeddable.haml
	script/generate-embeddable-html.rb default > $@
public/embeddable-production.html: $(CURRENT_CONFIG_FILE) embeddable.haml
	script/generate-embeddable-html.rb production > $@
public/embeddable-staging.html: $(CURRENT_CONFIG_FILE) embeddable.haml
	script/generate-embeddable-html.rb staging > $@
public/embeddable-dev.html: $(CURRENT_CONFIG_FILE) embeddable.haml
	script/generate-embeddable-html.rb development > $@
public/embeddable-local.html: $(CURRENT_CONFIG_FILE) embeddable.haml
	script/generate-embeddable-html.rb local > $@

.PHONY: clean
clean:
	ruby script/check-development-dependencies.rb
	# remove the .bundle dir in case we are running this after running: make clean-for-tests
	# which creates a persistent bundle grouping after installing just the minimum
	# necessary set of gems for running tests using the arguments: --without development app
	# Would be nice if bundle install had a --withall option to cancel this persistence.
	rm -rf .bundle
	mkdir -p public
	$(MAKE) clean-public
	# Remove Node modules.
	rm -rf node_modules
	rm -rf .sass-cache
	# install/update Ruby Gems
	bundle install
	$(MAKE) prepare-submodules

# public dir cleanup.
.PHONY: clean-public
clean-public:
	bash -O extglob -c 'rm -rf public/!(.git|version|.|..)'

# versioned archives cleanup.
.PHONY: clean-archives
clean-archives:
	rm -rf version
	rm -rf public/version

.PHONY: prepare-submodules
prepare-submodules:
	-$(MAKE) submodule-update || $(MAKE) submodule-update-tags

%.min.js: %.js
	@rm -f $@
ifndef LAB_DEVELOPMENT
	$(JS_COMPILER) < $< > $@
	@chmod ug+w $@
else
endif


# ------------------------------------------------
#
#   Submodules
#
# ------------------------------------------------

vendor/d3:
	submodule-update

.PHONY: submodule-update
submodule-update:
	git submodule update --init --recursive

.PHONY: submodule-update-tags
submodule-update-tags:
	git submodule sync
	git submodule foreach --recursive 'git fetch --tags'
	git submodule update --init --recursive

# ------------------------------------------------
#
#   Node modules
#
# ------------------------------------------------

node_modules:
	yarn

# ------------------------------------------------
#
#   public/
#
# ------------------------------------------------

public: \
	copy-resources-to-public \
	public/vendor \
	public/examples \
	public/doc \
	public/developer-doc \
	public/experiments \
	public/imports/energy2d
	$(MAKE) src

# copy everything (including symbolic links) except files that are
# used to generate resources from src/ to public/
.PHONY: copy-resources-to-public
copy-resources-to-public:
	rsync -aq --exclude='helpers/' --exclude='layouts/' --exclude='modules/' --exclude='sass/' --exclude='vendor/' --exclude='lab/' --filter '+ */' --exclude='*.haml' --exclude='*.sass' --exclude='*.scss' --exclude='*.yaml' --exclude='*.coffee' --exclude='*.rb' --exclude='*.md' src/ public/

public/examples:
	mkdir -p public/examples

public/doc: \
	public/doc/interactives \
	public/doc/models

public/doc/interactives:
	mkdir -p public/doc/interactives

public/doc/models:
	mkdir -p public/doc/models

public/developer-doc:
	mkdir -p public/developer-doc

.PHONY: public/experiments
public/experiments:
	mkdir -p public/experiments

# ------------------------------------------------
#
#   public/imports
#
# Copy model resources imported from legacy Energy2d
#
# ------------------------------------------------

.PHONY: public/imports/energy2d
public/imports/energy2d:
	mkdir -p public/imports
	rsync -aq imports/energy2d public/imports

# ------------------------------------------------
#
#   public/vendor
#
# External frameworks are built from git submodules checked out into vendor/.
# Just the generated libraries and licenses are copied to public/vendor
#
# ------------------------------------------------

public/vendor: \
	public/vendor/d3 \
	public/vendor/d3-plugins \
	public/vendor/jquery/jquery.min.js \
	public/vendor/jquery-ui/jquery-ui.min.js \
	public/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js \
	public/vendor/jquery-selectBoxIt/jquery.selectBoxIt.min.js \
	public/vendor/tinysort/jquery.tinysort.js \
	public/vendor/jquery-context-menu \
	public/vendor/science.js \
	public/vendor/modernizr \
	public/vendor/sizzle \
	public/vendor/hijs \
	public/vendor/fonts \
	public/vendor/codemirror \
	public/vendor/requirejs \
	public/vendor/text \
	public/vendor/domReady \
	public/vendor/fingerprintjs \
	public/vendor/shutterbug \
	public/vendor/lab-energy2d-java \
	public/vendor/iframe-phone/iframe-phone.js \
	public/vendor/chosen/chosen.jquery.min.js \
	public/vendor/lab-grapher/lab-grapher.css \
	public/favicon.ico


public/vendor/d3: vendor/d3
	mkdir -p public/vendor/d3
	cp vendor/d3/d3*.js public/vendor/d3
	cp vendor/d3/LICENSE public/vendor/d3/LICENSE
	cp vendor/d3/README.md public/vendor/d3/README.md

public/vendor/d3-plugins:
	mkdir -p public/vendor/d3-plugins/cie
	cp vendor/d3-plugins/LICENSE public/vendor/d3-plugins/LICENSE
	cp vendor/d3-plugins/README.md public/vendor/d3-plugins/README.md
	cp vendor/d3-plugins/cie/*.js public/vendor/d3-plugins/cie
	cp vendor/d3-plugins/cie/README.md public/vendor/d3-plugins/cie/README.md

public/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js: \
	public/vendor/jquery-ui-touch-punch \
	vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js \
	vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.js
	cp vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js public/vendor/jquery-ui-touch-punch
	cp vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.js public/vendor/jquery-ui-touch-punch

public/vendor/jquery-ui-touch-punch:
	mkdir -p public/vendor/jquery-ui-touch-punch

public/vendor/jquery-selectBoxIt/jquery.selectBoxIt.min.js: \
	vendor/jquery-selectBoxIt/src/javascripts/jquery.selectBoxIt.js \
	vendor/jquery-selectBoxIt/src/javascripts/jquery.selectBoxIt.min.js \
	vendor/jquery-selectBoxIt/src/stylesheets/jquery.selectBoxIt.css \
	public/vendor/jquery-selectBoxIt
	cp vendor/jquery-selectBoxIt/src/javascripts/jquery.selectBoxIt.js public/vendor/jquery-selectBoxIt
	cp vendor/jquery-selectBoxIt/src/javascripts/jquery.selectBoxIt.min.js public/vendor/jquery-selectBoxIt
	cp vendor/jquery-selectBoxIt/src/stylesheets/jquery.selectBoxIt.css public/vendor/jquery-selectBoxIt

public/vendor/jquery-selectBoxIt:
	mkdir -p public/vendor/jquery-selectBoxIt

public/vendor/chosen/chosen.jquery.min.js: \
	public/vendor/chosen
	cp vendor/chosen/chosen.jquery.min.js public/vendor/chosen
	cp vendor/chosen/chosen.css public/vendor/chosen
	cp vendor/chosen/*.png public/vendor/chosen

public/vendor/chosen:
	mkdir -p public/vendor/chosen

public/vendor/jquery-context-menu:
	mkdir -p public/vendor/jquery-context-menu
	cp vendor/jquery-context-menu/src/jquery.contextMenu.js public/vendor/jquery-context-menu
	cp vendor/jquery-context-menu/src/jquery.contextMenu.css public/vendor/jquery-context-menu

public/vendor/jquery/jquery.min.js: \
	public/vendor/jquery
	cp vendor/jquery/dist/jquery.js public/vendor/jquery
	cp vendor/jquery/dist/jquery.min.js public/vendor/jquery
	cp vendor/jquery/dist/jquery.min.map public/vendor/jquery
	cp vendor/jquery/MIT-LICENSE.txt public/vendor/jquery

public/vendor/jquery:
	mkdir -p public/vendor/jquery

public/vendor/jquery-ui/jquery-ui.min.js: \
	vendor/components-jqueryui \
	public/vendor/jquery-ui
	cp vendor/components-jqueryui/MIT-LICENSE.txt public/vendor/jquery-ui
	mkdir -p public/vendor/jquery-ui/i18n
	cp vendor/components-jqueryui/ui/jquery-ui.js public/vendor/jquery-ui
	cp vendor/components-jqueryui/ui/i18n/jquery-ui-i18n.js public/vendor/jquery-ui/i18n
	cp vendor/components-jqueryui/ui/minified/jquery-ui.min.js public/vendor/jquery-ui
	cp vendor/components-jqueryui/ui/minified/i18n/jquery-ui-i18n.min.js public/vendor/jquery-ui/i18n
	cp vendor/components-jqueryui/themes/base/jquery-ui.css public/vendor/jquery-ui
	cp vendor/components-jqueryui/themes/base/minified/jquery-ui.min.css public/vendor/jquery-ui
	cp -r vendor/components-jqueryui/themes/base/images public/vendor/jquery-ui

public/vendor/jquery-ui:
	mkdir -p public/vendor/jquery-ui

public/vendor/tinysort:
	mkdir -p public/vendor/tinysort

public/vendor/tinysort/jquery.tinysort.js: \
	public/vendor/tinysort
	cp -r vendor/tinysort/src/* public/vendor/tinysort
	cp vendor/tinysort/README.md public/vendor/tinysort

public/vendor/science.js:
	mkdir -p public/vendor/science.js
	cp vendor/science.js/science*.js public/vendor/science.js
	cp vendor/science.js/LICENSE public/vendor/science.js
	cp vendor/science.js/README.md public/vendor/science.js

public/vendor/modernizr:
	mkdir -p public/vendor/modernizr
	cp vendor/modernizr/modernizr.js public/vendor/modernizr
	cp vendor/modernizr/readme.md public/vendor/modernizr

public/vendor/sizzle:
	mkdir -p public/vendor/sizzle
	cp vendor/sizzle/sizzle.js public/vendor/sizzle
	cp vendor/sizzle/LICENSE public/vendor/sizzle
	cp vendor/sizzle/README public/vendor/sizzle

public/vendor/hijs:
	mkdir -p public/vendor/hijs
	cp vendor/hijs/hijs.js public/vendor/hijs
	cp vendor/hijs/LICENSE public/vendor/hijs
	cp vendor/hijs/README.md public/vendor/hijs

public/vendor/fonts: $(FONT_FOLDERS)
	mkdir -p public/vendor/fonts
	cp -R vendor/fonts public/vendor/
	rm -rf public/vendor/fonts/Font-Awesome/.git*
	rm -f public/vendor/fonts/Font-Awesome/.gitignore
	rm -rf public/vendor/fonts/Font-Awesome/less
	rm -rf public/vendor/fonts/Font-Awesome/sass

public/vendor/requirejs:
	mkdir -p public/vendor/requirejs
	cp vendor/requirejs/require.js public/vendor/requirejs
	cp vendor/requirejs/LICENSE public/vendor/requirejs
	cp vendor/requirejs/README.md public/vendor/requirejs

public/vendor/text:
	mkdir -p public/vendor/text
	cp vendor/text/text.js public/vendor/text
	cp vendor/text/LICENSE public/vendor/text
	cp vendor/text/README.md public/vendor/text

public/vendor/domReady:
	mkdir -p public/vendor/domReady
	cp vendor/domReady/domReady.js public/vendor/domReady
	cp vendor/domReady/LICENSE public/vendor/domReady
	cp vendor/domReady/README.md public/vendor/domReady

public/vendor/codemirror:
	mkdir -p public/vendor/codemirror
	cp vendor/codemirror/LICENSE public/vendor/codemirror
	cp vendor/codemirror/README.md public/vendor/codemirror
	cp -R vendor/codemirror/lib public/vendor/codemirror
	cp -R vendor/codemirror/addon public/vendor/codemirror
	cp -R vendor/codemirror/mode public/vendor/codemirror
	cp -R vendor/codemirror/theme public/vendor/codemirror
	cp -R vendor/codemirror/keymap public/vendor/codemirror
	# remove codemirror modules excluded by incompatible licensing
	rm -rf public/vendor/codemirror/mode/go
	rm -rf public/vendor/codemirror/mode/rst
	rm -rf public/vendor/codemirror/mode/verilog

public/vendor/lab-energy2d-java: vendor/lab-energy2d-java
	mkdir -p public/vendor/lab-energy2d-java
	cp -r vendor/lab-energy2d-java/dist/* public/vendor/lab-energy2d-java/

public/vendor/fingerprintjs:
	mkdir -p public/vendor/fingerprintjs
	cp vendor/fingerprintjs/fingerprint.min.js public/vendor/fingerprintjs
	cp vendor/fingerprintjs/README.md public/vendor/fingerprintjs

public/vendor/shutterbug:
	mkdir -p public/vendor/shutterbug
	cp vendor/shutterbug.js/dist/shutterbug.js public/vendor/shutterbug/

public/vendor/iframe-phone/iframe-phone.js: \
	public/vendor/iframe-phone \
	vendor/iframe-phone/dist/iframe-phone.js
	cp vendor/iframe-phone/dist/iframe-phone.js public/vendor/iframe-phone/

public/vendor/iframe-phone:
	mkdir -p public/vendor/iframe-phone

public/vendor/lab-grapher/lab-grapher.css: \
	public/vendor/lab-grapher \
	vendor/lab-grapher/css/lab-grapher.css
	cp vendor/lab-grapher/css/lab-grapher.css public/vendor/lab-grapher/

public/vendor/lab-grapher:
	mkdir -p public/vendor/lab-grapher

public/favicon.ico:
	cp -f src/favicon.ico public/favicon.ico

vendor/jquery:
	git submodule update

vendor/components-jqueryui:
	git submodule update

vendor/lab-energy2d-java:
	git submodule update --init --recursive

# ------------------------------------------------
#
#   targets for generating html, js, and css resources
#
# ------------------------------------------------

test/%.html: test/%.html.haml
	$(HAML_COMPILER) $< $@

public/%.html: src/%.html.haml script/setup.rb
	$(HAML_COMPILER) -r ./script/setup.rb $< $@

public/%.html: src/%.html
	cp $< $@

public/%.css: src/%.css
	cp $< $@

public/%.css: %.scss
	$(SASS_COMPILER) $< $@

public/%.css: %.sass
	@echo $($<)
	$(SASS_COMPILER) $< $@

public/%.js: %.coffee
	@rm -f $@
	$(COFFEESCRIPT_COMPILER) --compile --print $< > $@

# replace relative references to .md files for the static build
# look for pattern like ](*.md) replace with ](*.html)
# the ':' is hack so it doesn't match absolute http:// urls
# the second command is necessary to match anchor references in md files
%.md.static: %.md
	@rm -f $@
	sed -e s';\](\([^):]*\)\.md);\](\1.html);' -e s';\](\([^):]*\)\.md\(#[^)]*\));\](\1.html\2);' $< > $@

public/developer-doc/%.html: developer-doc/%.md.static
	@rm -f $@
	$(MARKDOWN_COMPILER) -i GFM $< --template src/layouts/developer-doc.html.erb > $@

public/examples.html: src/examples.md.static
	@rm -f $@
	$(MARKDOWN_COMPILER) $< --toc-levels 2..6 --template src/layouts/top-level.html.erb > $@

public/%.html: %.md.static
	@rm -f $@
	$(MARKDOWN_COMPILER) $< --toc-levels 2..6 --template src/layouts/top-level.html.erb > $@

public/interactives/%.json: src/interactives/%.json
	@cp $< $@

public/models/%.json: src/models/%.json
	@cp $< $@

.PHONY: public/interactives.json
public/interactives.json: $(INTERACTIVE_FILES)
	$(GENERATE_INTERACTIVE_INDEX)

# delete the .md.static files and don't bother creating them if they don't need to be
.INTERMEDIATE: %.md.static src/examples.md.static

# ------------------------------------------------
#
#   Targets to help debugging/development of Makefile
#
# ------------------------------------------------

.PHONY: h
h:
	@echo $(HAML_FILES)

.PHONY: s
s:
	@echo $(SASS_FILES)

.PHONY: m
m:
	@echo $(MARKDOWN_FILES)

.PHONY: c
c:
	@echo $(COFFEESCRIPT_FILES)

.PHONY: int
int:
	@echo $(INTERACTIVE_FILES)
