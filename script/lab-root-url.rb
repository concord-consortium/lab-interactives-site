#!/usr/bin/env ruby
require 'bundler/setup'
require 'haml'
require_relative 'setup'

lab_env = ARGV[0] ? ARGV[0].to_sym : :default
print "http:#{LAB_ROOT_URL[lab_env]}"