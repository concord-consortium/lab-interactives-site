Building the full lab-interactive-site uses a combination of Ruby, NodeJs, and Make. 

# Full Build Without Docker
1. bundle install
2. npm install
3. make prepare-submodules
4. make public

# Full Build with Docker
1. `docker-compose build`
2. `docker-compose run --rm app /bin/bash -l -c "make everything"`

# What is the build doing?

The majority of the files in this repository are json files describing interactives and models. And then there are some images and other resource files used by these interactives and models. These files do not need to be compiled. They are simply copied into the top level `public` folder. This top level `public` folder is like the `dist` folder in most of Concord's other repositories.

What the build system is really needed for is to create the lab website. This website includes:
- **embeddable.html**: this is the page which loads and runs an interactive.
- **interactives.html**: this page lists all public interactives and has tools for working with them.
- several documentation pages which are stored as markdown and complied to html
- some example web applications demonstrating parts of Lab

# Simplified Build

As a first pass at reducing the complexity of the build process for simple changes, the script `scripts/update-dist-using-copy.mjs` was added. It is used by a github actions workflow to deploy a site that only supports `embeddable.html` and not `interactives.html`. This script has no npm dependencies. However it does require the submodules to be installed. The `interactives.html` page is not included because it requires more dependencies. It also requires a built yml file which describes all of the public interactives.

This simplified process works by relying on three built files being checked into the git repository. These files are in `built-for-simple-copy` folder. These files were built using the full build process and then copied to this folder. They are `embeddable.html`, `embeddable.css`, and `cc-themes.css`. The rest of the files used by `embeddable.html` can just be copied from the source or submodules without and building/compiling.

Updating the checked in files is done with the `update-built-for-simple-copy.mjs` script.

Look at the `update-dist-using-copy.mjs` to see which files it copies.

# TODO

It'd be better if interactives.html was also supported by the simplified build. This way the production site could be updated by GitHub actions.

We could check in all of the compiled files needed by interactives.html and make a NodeJS script to build the interactives yml file it needs. 

Or perhaps some of the compiled files could be handled by some simplified compiler that doesn't rely on Make and Ruby. 

# Notes

A useful way to get started supporting interactives.html is to copy this built file `dist-using-copy` folder and run a webserver to serve this folder. Then try to get the page to load without errors. This is a good way to figure out which dependencies it needs and whether they actually need to be compiled. For example it might be the case that most of the submodules are only needed for compiling, and at runtime very few are needed. Checking the links from interactives.html will take more effort and might not be worth doing this way.

Incomplete review of the public folder:
- **developer-doc**: compiled markdown from developer-doc
- **doc**: these are mostly documentation pages, probably compiled markdown, I'm not sure where they are from
- **doc/interactives/sampler**: this seems more like an actual web application it has a css, js, and html
- **examples/interactives.html**: redirects to /interactives.html for legacy support
- **examples/embeddable.html**: redirects to /embeddable.html for legacy support
- **examples/grapher-bar-graph/bar-graph.html**: is a testing page for the bar graph component, it is in src/examples/grapher-bar-graph it has one sass file which is compiled
- **experiments/** this seems to just ab ea copy of what is in src/experiments, the only "compiled" code is the index.haml file at the top level

## Embeddable.html
This mainly loads its js and css from lab-framework. The `update-dist-using-copy.mjs` documents which other files are needed. 

Here is the list of js and css files:
- themes/cc-themes.css
- embeddable.css
- vendor/modernizr/modernizr.js
- vendor/shutterbug/shutterbug.js
- embeddable.js

The full build system actually builds multiple versions of embeddable.html to represent the different environments of lab (dev, staging, production, and local). The main embeddable.html is built by this comand  `script/generate-embeddable-html.rb default`. This uses the setup.rb render_file function which uses uses the haml compiler with lots of injected variables.

We could build the embeddable page with webpack. This would remove the dependency on ruby at least for building embeddable.html. The biggest challenge might be figuring out how deal will all of the configurations and variables that are passed to it.

The vendor (submodules) files that it uses could be replaced with npm dependencies. Or perhaps they could even be used from Lab itself. 

## Webpack?

From what I can the lab-interactives-site javascript is not compiled. It isn't typescript and it doesn't have import or require statements that require a bundler like webpack. The only stuff that might be compiled are some of the vendor files, but even those look like they are just copied.

Because of this webpack doesn't buy us much because we don't need to bundle anything. So really we would just using webpack to "compile" the haml and css files. But it might help by automatically compiling them and reloading the dev webpage when they change.
