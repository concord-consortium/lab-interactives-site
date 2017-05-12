# Docker Container

## Introduction

[Docker](https://www.docker.com/) is an open platform for distributed applications for developers and sysadmins. It can be used to quickly develop and deploy web applications.

You will need to first install Docker. Instructions can be found here:

 - [Linux](https://docs.docker.com/linux/started/)
 - [Mac](https://docs.docker.com/mac/started/)
 - [Windows](https://docs.docker.com/windows/started/)

## Build and Run a Container

To build and run a container:

1. `docker build -t lab-interactives-site .`
2. `docker run --name interactives -p 9292:9292 -p 35729:35729 lab-interactives-site`

If you have `docker-compose` installed, this process is even easier:

1. `docker-compose build`
2. `docker-compose up`

Once the container is running you will find it at: http://labinteractives.docker

You can open a second terminal and run:

    docker exec -ti <container_name> /bin/bash

This will allow you to run other commands like `make all`.

## Extra Notes For `docker-machine`/`boot2docker`

To connect to the [LiveReload](http://livereload.com/extensions/#installing-sections) server, you'll have to create an SSH tunnel after the container has started.

1. Run `docker-machine env default` to get the machine's IP address
2. Run `ssh -N -L 35729:localhost:35729 docker@<ip_addr_for_docker_machine>` to start the ssh tunnel

If you don't want to bother with SSH tunnels, you can use [RemoteLiveReload](https://github.com/bigwave/livereload-extensions) instead. However, you'll have to run the following command before building and starting the container.

    sed -i "s/guard 'livereload'/guard 'livereload', host: '0.0.0.0', port: '35729'/" Guardfile
