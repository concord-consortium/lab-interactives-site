# Lab Framework Versions

Basic [interactives.html](/interactives.html) and [embeddable.html](/embeddable.html) pages use production version of the Lab Framework.

However you can test your interactive against staging or development version of Lab Framework too.
There are additional interactives.html and embeddable.html pages:

- [interactives-staging.html](/interactives-staging.html) and [embeddable-staging.html](/embeddable-staging.html) use staging version of Lab.
- [interactives-dev.html](/interactives-dev.html) and [embeddable-dev.html](/embeddable-dev.html) use development version of Lab.
- [interactives-local.html](/interactives-local.html) and [embeddable-local.html](/embeddable-local.html) use Lab that is hosted on `localhost:9191`.
- [interactives.html](/interactives-local.html) and [embeddable.html](/embeddable-local.html) use "default" Lab that is defined in configuration.

All these pages can be customized by editing `config/config.yml` which contains following section:

        # :lab_root_url:
        #   :production:  //lab-framework-s3.concord.org/version/<ver>/lab
        #   :staging:     //lab-framework-s3.concord.org/version/<ver>/lab
        #   :development: //lab-framework-s3.concord.org/branch/<branch>/lab
        #   :default:     //lab-framework-s3.concord.org/branch/<branch>/lab
        #   :local:       //localhost:9191/lab

Typically you won't have to change these paths, as the default configuration is good enough for most tasks. It may be useful to overwrite one of these paths e.g. when you want to deploy topic branch of Lab Interactives Site that uses topic branch of Lab Framework. See [configuration section](developer-doc/configuration.md).

## Working with local Lab Framework

[interactives-local.html](/interactives-local.html) and [embeddable-local.html](/embeddable-local.html) assume that local Lab is available at `//localhost:9191/lab`.

You will have to clone and setup [Lab repository](https://github.com/concord-consortium/lab), e.g.following its [readme](http://lab-framework.concord.org/readme.html). Run Lab local server using `9191` port (default):

    cd lab
    rackup

Then run Lab Interactives Site local server:

    cd lab-interactives-site
    rackup

and finally open:

    http://localhost:9292/interactives-local.html

Now you can modify Lab Framework and Lab Interactives Site at the same time and immediately see changes without need to deploy Lab Framework to development server.