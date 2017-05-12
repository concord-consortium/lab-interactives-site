FROM ubuntu:trusty

WORKDIR /srv
RUN apt-get update && apt-get upgrade -y && apt-get clean

# Install RVM
RUN apt-get install -y curl && apt-get clean
RUN gpg --keyserver hkp://keys.gnupg.net --recv-keys 409B6B1796C275462A1703113804BB82D39DC0E3
RUN curl -sSL https://get.rvm.io | bash -s stable && apt-get clean
RUN /bin/bash -c "source /usr/local/rvm/scripts/rvm; rvm install ruby-2.0.0-p247"
RUN echo "source /usr/local/rvm/scripts/rvm" >> /root/.bashrc

# Install Node.js
RUN apt-get install -y software-properties-common && apt-get clean
RUN apt-add-repository -y ppa:chris-lea/node.js
RUN apt-get install -y nodejs npm && apt-get clean
RUN ln -sf /usr/bin/nodejs /usr/bin/node

# Setup app
RUN locale-gen en_US.UTF-8
ENV LANG en_US.UTF-8
RUN apt-get install -y git libxslt-dev libxml2-dev python-pip && apt-get clean
RUN pip install supervisor
COPY . /srv/
RUN /bin/bash -c "source /usr/local/rvm/scripts/rvm; gem install bundle"
RUN /bin/bash -c "source /usr/local/rvm/scripts/rvm; bundle install"
RUN /bin/bash -c "source /usr/local/rvm/scripts/rvm; gem install rb-readline"
RUN /bin/bash -c "source /usr/local/rvm/scripts/rvm; make everything"

EXPOSE 9292
CMD ["/bin/bash", "-c", "source /usr/local/rvm/scripts/rvm; /usr/local/bin/supervisord -c /srv/config/supervisord.conf -j /tmp/supervisord.pid"]
