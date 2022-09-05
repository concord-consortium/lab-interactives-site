FROM ubuntu:xenial

WORKDIR /srv
RUN apt-get update && apt-get upgrade -y && apt-get install -y apt-utils

# Install RVM partially taken from here: https://stackoverflow.com/a/43613426/3195497
RUN apt-get install -y curl gnupg2
# This line came from a suggestion in a rvm error message
RUN gpg2 --keyserver keyserver.ubuntu.com --recv-keys 409B6B1796C275462A1703113804BB82D39DC0E3 7D2BAF1CF37B13E2069D6956105BD0E739499BDB
RUN curl -sSL https://get.rvm.io | bash -s stable
RUN /bin/bash -l -c ". /etc/profile.d/rvm.sh && rvm install 2.6.3"

# Install Node.js
RUN curl -sL https://deb.nodesource.com/setup_16.x -o nodesource_setup.sh
RUN bash nodesource_setup.sh
RUN apt-get install -y nodejs

# Install Yarn
RUN curl -sS http://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb http://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update && apt-get install -y yarn

# Setup app
RUN apt-get install -y locales && locale-gen en_US.UTF-8
ENV LANG en_US.UTF-8
RUN apt-get install -y git libxslt-dev libxml2-dev python-pip
RUN pip install supervisor

# Regain some amount of diskspace
RUN apt-get clean

COPY . /srv/
RUN /bin/bash -c -l "gem install bundle"
RUN /bin/bash -c -l "bundle install"
RUN /bin/bash -c -l "gem install rb-readline"

# This builds all of the files into the docker image's file system
# however when the image is run by docker-compose and /srv/ is mounted
# to the local folder, all of these build products are lost and need to be
# recreated. So it doesn't make sense to build the files here
# RUN /bin/bash -c -l "make everything"

EXPOSE 9292
# Since we are not doing the make everything above, this supervisord command
# has been moved to docker-compose, otherwise just bringing up the container will fail
# CMD ["/bin/bash", "-l", "-c", "/usr/local/bin/supervisord -c /srv/config/supervisord.conf -j /tmp/supervisord.pid"]
CMD ["/bin/bash", "-l"]
