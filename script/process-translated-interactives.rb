 #!/usr/bin/env ruby

# This script sets "lang" and "i18nMetadata" in translated and original interactives.
# Accepts two arguments: name of the directory inside 'locales' and language code, e.g.:
# ruby process-translated.interactives.rb nn nn-NO
require 'bundler/setup'
require 'fileutils'
require 'json'                       # http://flori.github.com/json/doc/index.html

PROJECT_ROOT = File.expand_path('../..',  __FILE__)
SRC_PATH  = File.join(PROJECT_ROOT, 'src')
Dir.chdir SRC_PATH

LANG = ARGV[0]
LANG_CODE = ARGV[1] || LANG
LOCALES_PREFIX = "locales/#{LANG}/"
INTERACTIVE_PATH = "#{LOCALES_PREFIX}interactives"
METADATA_PATH = "locales/metadata/interactives"
interactive_paths = Dir["#{INTERACTIVE_PATH}/**/*.json"]

interactive_paths.each do |path|
  metadata_path = path.gsub(INTERACTIVE_PATH, METADATA_PATH)
  # Set lang and i18nMetadata properties in translated itneractive.
  interactive = JSON.load(File.read(path))
  interactive['lang'] = LANG_CODE
  interactive['i18nMetadata'] = metadata_path
  File.open(path, 'w') { |f| f.write(JSON.pretty_generate(interactive)) }
  # Set i18nMetadata in original interactive.
  orig_path = path.sub(LOCALES_PREFIX, '')
  orig_interactive = JSON.load(File.read(orig_path))
  orig_interactive['i18nMetadata'] = metadata_path
  File.open(orig_path, 'w') { |f| f.write(JSON.pretty_generate(orig_interactive)) }
  # Update or generate i18n metadata.
  metadata = if File.file?(metadata_path)
               JSON.load(File.read(metadata_path))
             else
               JSON.load('{}')
             end
  metadata[LANG_CODE] = path
  metadata['en-US'] = orig_path
  FileUtils.mkdir_p(File.dirname(metadata_path))
  File.open(metadata_path, 'w') { |f| f.write(JSON.pretty_generate(metadata)) }
end
