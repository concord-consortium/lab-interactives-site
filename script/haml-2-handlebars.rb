#!/usr/bin/env ruby
require "haml"

class MethodMissingString < String
  def method_missing(m, *args, &block)
    args = args.collect do |arg|
      arg.is_a?(MethodMissingString) ? arg : "\"#{arg}\""
    end

    if args.any?
      arguments = "(#{args.join(', ')})"
      arguments.gsub!("{{ ", "")
      arguments.gsub!(" }}", "")
    end

    MethodMissingString.new("{{{ #{self[3..(self.size - 4)]}.#{m}#{arguments} }}}")
  end
end

def self.method_missing(m, *args, &block)
  args = args.collect do |arg|
    arg.is_a?(MethodMissingString) ? arg : "\"#{arg}\""
  end

  if args.any?
    arguments = "(#{args.join(', ')})"
    arguments.gsub!("{{ ", "")
    arguments.gsub!(" }}", "")
  end

  MethodMissingString.new("{{{ #{m}#{arguments} }}}")
end

# Convert all haml files in this repo:
# find src -name "*.haml" -exec script/haml-2-handlebars.rb {} \;

filename = ARGV[0]
puts filename
file = IO.read(filename)
# Replace all constants (LIKE_THIS) with lowercase strings. It'd crash the main script otherwise.
file.gsub!(/=\s+([A-Z_]+)/) { "= #{$1.downcase}" }
file.gsub!(/#\{([A-Z_]+)/) { "= #{$1.downcase}" }
result = Haml::Engine.new(file).render(self, {})
IO.write(filename.sub(/(\.html)?\.haml/, '.html.handlebars'), result)
