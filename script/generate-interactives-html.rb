#!/usr/bin/env ruby
require 'haml'
require_relative 'setup'

print render_file('src/interactives.haml', :LAB_ENV => ARGV[0].to_sym)
