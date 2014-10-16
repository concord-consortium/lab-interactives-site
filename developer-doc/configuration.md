# Project Configuration

Configuration is handled by:

1. YAML files storing branch-specific configuration (`config/<branch-name>.yml`).
2. Environment variables storing deployment-specific configuration.

It is processed by [`script/setup.rb`](https://github.com/concord-consortium/lab-interactives-site/blob/master/script/setup.rb), so this is the place to look at when you have some doubts.

## Branch-specific configuration

Build process will look for `config/<branch-name>.yml` file and when it can't find it, [`config/master.yml`](https://github.com/concord-consortium/lab-interactives-site/blob/master/config/master.yml) is used as a fallback. This configuration can specify following options:

- `environment` - *development* or *production*, it affects whether JS libraries will be minified or not. Example:

        :environment: development

- `lab_root_url` - specifies paths to Lab Framework. It's optional and you also don't have to specify all environments. It can be especially useful if you want to deploy topic branch of Lab Interactive Site which also uses topic branch of Lab Framework. Example:

        :lab_root_url:
           :default       //lab-framework.concord.org/branch/bug-hotfix/lab
           # :production: //lab-framework.concord.org/version/1.0.1/lab
           # :staging:    //lab-framework.concord.org/version/1.0.1/lab
           # :dev:        //lab-framework.concord.org/branch/master/lab
           # :local:      //localhost:9191/lab

## Supported environment variables

They are mostly related to depoyment process. They are set in [`.travis.yml`](https://github.com/concord-consortium/lab-interactives-site/blob/master/.travis.yml) file (some as secure variables).

- `GA_ACCOUNT_ID` - when set, it enables embedding google analytics script into the head of the HTML pages.
