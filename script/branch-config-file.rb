#!/usr/bin/env ruby
CONFIG_PATH = File.join(File.expand_path('../..',  __FILE__), 'config')

head = File.open('.git/HEAD') do |f|
         f.read
       end
head.delete!("\n").slice!('ref: refs/heads/')
branch_config = File.join(CONFIG_PATH, "#{head}.yml")
print File.file?(branch_config) ? branch_config : File.join(CONFIG_PATH, 'master.yml')
