#!/usr/bin/env ruby
require 'bundler/setup'
require 'json'

@required_ruby_version = "2.0.0"
@minimum_ruby_patchlevel = 195
@recommended_ruby_patchlevel = 247
@minimum_node_version = "v0.10.0"

def macosx
  RUBY_PLATFORM.include?('darwin')
end

def linux
  RUBY_PLATFORM.include?('linux')
end

def ruby_check
  minimum = "= #{@required_ruby_version}-p#{@minimum_ruby_patchlevel}"
  recommended = "= #{@required_ruby_version}-p#{@recommended_ruby_patchlevel}"
  if RUBY_VERSION != @required_ruby_version || RUBY_PATCHLEVEL != @recommended_ruby_patchlevel
    @recommendations["Ruby"] = {
      "suggest" => recommended,
      "details" => <<-HEREDOC
  ==> Ruby #{RUBY_VERSION}-p#{RUBY_PATCHLEVEL} installed
      HEREDOC
    }
  end
end

def nodejs_check
  # Check for nodejs
  requirement = ">= #{@minimum_node_version}"
  begin
    node_version = `node --version`.strip
    node_version = node_version[1,node_version.length-1]
    # Convert version strings to array of integers.
    node_version_arr = node_version.split('.').map { |e| e.to_i }
    minimum_node_version_arr = @minimum_node_version.split('.').map { |e| e.to_i }
    # Compare version numbers one by one using array comparison operator.
    unless (node_version_arr <=> minimum_node_version_arr) >= 0
      @errors["Nodejs"] = {
        "requirement" => requirement,
        "details" => <<-HEREDOC
  ==> nodejs #{node_version} installed
        HEREDOC
      }
    end
  rescue Errno::ENOENT
    @notifications["nodejs"] = {
      "requirement" => requirement,
      "details" => <<-HEREDOC
  ==> nodejs not installed ...
      HEREDOC
    }
  end
end

def couchdb_check
  # Check for couchdb
  requirement = ">= #{@minimum_couchdb_version}"
  response = `curl http://localhost:5984 2> /dev/null`
  # => {"couchdb":"Welcome","version":"1.2.0"}
  if response.empty?
    @warnings["Couchdb"] = {
      "requirement" => requirement,
      "details" => <<-HEREDOC
  ==> couchdb not installed or not running, web server persistence won't work ...
      HEREDOC
    }
  else
    couch = JSON.parse(response)
    couch_version = couch["version"]
    if couch_version < @minimum_couchdb_version
      @warnings["Couchdb"] = {
        "requirement" => requirement,
        "details" => <<-HEREDOC
  ==> couchdb #{couch_version} installed, web server persistence might not work
        HEREDOC
      }
    end
  end
end

def xcode_check
  if macosx
    requirement = "Xcode"
    xcode = `xcode-select -print-path  2> /dev/null`
    if xcode.empty?
      @errors["Mac OS X"] = {
        "requirement" => requirement,
        "details" => <<-HEREDOC
  ==> Either you don't have xcode installed ... or you haven't used
      xcode-path to set the location of xcode for command-line tools.
        HEREDOC
      }
    end
  end
end

@warnings = {}
@errors = {}
@recommendations = {}

ruby_check
nodejs_check
xcode_check if macosx

unless @warnings.empty?
  puts <<-HEREDOC

*** Warning: missing optional development dependencies:

  HEREDOC
  @warnings.each { |k, v|
    puts <<-HEREDOC
#{k} #{v["requirement"]}

#{v["details"]}
    HEREDOC
  }
end

unless @errors.empty?
  puts <<-HEREDOC

*** Error: missing development dependencies, building Lab project requires:

  HEREDOC
  @errors.each { |k, v|
    puts <<-HEREDOC
#{k} #{v["requirement"]}

#{v["details"]}
    HEREDOC
  }
  exit 1
end

unless @recommendations.empty?
  puts <<-HEREDOC

*** Recommendation: recommended development dependencies:

  HEREDOC
  @recommendations.each { |k, v|
    puts <<-HEREDOC
#{k} #{v["suggest"]}

#{v["details"]}
    HEREDOC
  }
end
