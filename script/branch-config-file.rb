#!/usr/bin/env ruby
CONFIG_PATH = File.join(File.expand_path('../..',  __FILE__), 'config')

branch = ENV['TRAVIS_BRANCH']
if branch.nil?
  branch = File.open('.git/HEAD') { |f| f.read }.delete!("\n")
  branch.slice!('ref: refs/heads/')
end
branch_config = File.join(CONFIG_PATH, "#{branch}.yml")
print File.file?(branch_config) ? branch_config : File.join(CONFIG_PATH, 'master.yml')
