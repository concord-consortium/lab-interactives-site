# Lab Interactives Site

Set of interactives built using the [Lab Framework](http://lab-framework.concord.org) from the [Concord Consortium](http://www.concord.org). This site is deployed to:

**[lab.concord.org](http://lab.concord.org)**

## Licensing

Lab Interactives Site is Copyright 2012 (c) by the Concord Consortium and is distributed under
the [MIT](http://www.opensource.org/licenses/MIT) license.

The complete licensing details can be read [here](license.md).

If you have have received a **distribution archive** of the
[Concord Consortium Lab project](https://github.com/concord-consortium/lab)
our copyright applies to all resources **except** the files in the
`vendor/` directory. The files in the `vendor/` directory are from
third-parties and are distributed under either BSD, MIT, or Apache 2.0 licenses.

## Setup Development

### Prerequisites:

- [RVM, Ruby 2.0 and Bundler](developer-doc/setup-ruby.md)
- [node.js and npm](developer-doc/setup-node.md)
- [additional Linux notes](developer-doc/linux-notes.md)

### Setup the local Lab repository for development

1. Clone the git repository
2. `cd lab-interactives-site`
3. `bundle install`
4. `make everything`
5. open another new terminal and run `rackup`
6. open http://localhost:9292
7. (optional) open a new terminal and run `guard`

It is recommended that you review the [initial setup details](developer-doc/initial-setup-details.md).
They describe what each of the steps above does.

## Contributing to Lab Interactives Site

If you think you'd like to contribute to Lab Interactives Site as an external developer:

1. Create a local clone from the repository located here: http://github.com/concord-consortium/lab-interactives-site.
   This will by default have the git-remote name: **origin**.

2. Make a fork of http://github.com/concord-consortium/lab-interactives-site to your account on github.

3. Make a new git-remote referencing your fork. I recommend making the remote name your github user name.
   For example my username is `stepheneb` so I would add a remote to my fork like this:

        git remote add stepheneb git@github.com:stepheneb/lab-interactives-site.git

4. Create your changes on a topic branch. Please include tests if you can. When your commits are ready
   push your topic branch to your fork and send a pull request.

## `src/models`, `src/models-converted` and `imports` directories

* [`src/models`](https://github.com/concord-consortium/lab-interactives-site/tree/master/src/models) should be a default directory for models that are created or updated manually by authors.

* [`src/models-converted`](https://github.com/concord-consortium/lab-interactives-site/tree/master/src/models-converted) should contain only models that are created using automated conversion tool, for example [MML Converter](http://lab-framework.concord.org/mml-converter.html).
  If you modify model JSON after conversion, such model should be moved to `src/models`! You should assume that each model that lives in `src/models-converted` may be
  converted again in the future (e.g. when MML Converter is updated). In such case you would lose your manual tweaks.

* [`imports`](https://github.com/concord-consortium/lab-interactives-site/tree/master/imports) should contain original models (e.g. `.MML` and `.E2D` files) that are related to JSONs in `src/models-converted`
  and **optionally** models related to JSONs in `src/models` (if author thinks it may be useful in the future).


## More Documentation

- [Project Configuration](developer-doc/configuration.md)
- [Deployment](developer-doc/deployment.md)
- [Working with different Lab Framework versions](developer-doc/lab-framework-versions.md)
- [Localization](developer-doc/localization.md)
