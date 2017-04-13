#!/usr/bin/env ruby
require 'bundler/setup'
require 'fileutils'
require 'json'                       # http://flori.github.com/json/doc/index.html

PROJECT_ROOT = File.expand_path('../..',  __FILE__)
SRC_PATH  = File.join(PROJECT_ROOT, 'src')
INTERACTIVE_PATH = File.join(SRC_PATH, "interactives")

interactive_paths = Dir["#{INTERACTIVE_PATH}/**/*.json"]

interactive_paths.each do |path|
  puts path
  interactive = JSON.load(File.read(path))
  models = interactive['models']
  puts "models: #{models.length}"
  models.each_with_index do |model_ref, i|
    begin
      if model_path = model_ref['url']
        model = JSON.load(File.read(File.join(PUBLIC_PATH, model_path)))
        model_ref = {"type" => model['type']}.merge(model_ref)
        interactive['models'][i] = model_ref
      end
    rescue Errno::ENOENT
      puts "model not found at: #{model_path}"
    end
  end
  File.open(path, 'w') do |f|
    f.write(JSON.pretty_generate(interactive))
  end
end