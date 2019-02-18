# Docker Container

## Introduction

[Docker](https://www.docker.com/) is an open platform for distributed applications for developers and sysadmins. It can be used to quickly develop and deploy web applications.

You will need to first install Docker. Instructions can be found here:

 - [Linux](https://docs.docker.com/linux/started/)
 - [Mac](https://docs.docker.com/mac/started/)
 - [Windows](https://docs.docker.com/windows/started/)

## Build and Run a Container

1. `docker-compose build`
2. `docker-compose up`

By default you can connect to the site at http://localhost:9292

## Opening an additional terminal

You can open a second terminal and run:

    docker-compose app /bin/bash -l

This will allow you to run other commands like `make all`.

## Using a docker proxy

With a docker proxy you can avoid port conflicts with 9292, and the domain name of the site is friendlier.  Once setup, you can access the site at: http://labinteractives.docker

To use this approach you need to:
- install and setup the proxy
- configure docker-compose to use a random port instead of 9292

The proxy we use is https://github.com/codekitchen/dinghy-http-proxy it has support for OS X, Linux, and Windows. At the link above you need to look at the section: [Using Outside of Dinghy](https://github.com/codekitchen/dinghy-http-proxy#using-outside-of-dinghy)

docker-compose can be configured by adding a `.env` file at the top of the repository with the contents

    COMPOSE_FILE=docker-compose.yml:docker/dev/docker-compose-random-ports.yml

## Notes for running without docker-compose

To build and run a container:

1. `docker build -t lab-interactives-site .`
2. `docker run --name interactives -p 9292:9292 -p 35729:35729 lab-interactives-site`

Now you can connect to the server with http://localhost:9292

## Notes For `docker-machine`/`boot2docker`

To connect to the [LiveReload](http://livereload.com/extensions/#installing-sections) server, you'll have to create an SSH tunnel after the container has started.

1. Run `docker-machine env default` to get the machine's IP address
2. Run `ssh -N -L 35729:localhost:35729 docker@<ip_addr_for_docker_machine>` to start the ssh tunnel

If you don't want to bother with SSH tunnels, you can use [RemoteLiveReload](https://github.com/bigwave/livereload-extensions) instead. However, you'll have to run the following command before building and starting the container.

    sed -i "s/guard 'livereload'/guard 'livereload', host: '0.0.0.0', port: '35729'/" Guardfile
