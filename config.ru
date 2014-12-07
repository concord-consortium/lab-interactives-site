require 'rack-livereload'
require "./script/setup"

ENVIRONMENT = CONFIG[:environment]
puts "environment: #{ENVIRONMENT}"

use Rack::ConditionalGet
use Rack::ContentLength

Rack::Mime::MIME_TYPES.merge!({
  ".ttf" => "font/ttf",
  ".mml" => "application/xml",
  ".cml" => "application/xml",
  ".e2d" => "application/xml"
})

# see: https://github.com/johnbintz/rack-livereload
if ENVIRONMENT == 'development'
  puts "using rack-live-reload"
  map '/vendor/lab-sensor-applet-interface-dist/jars' do
    # so no cache headers aren't added to the jars
    run Rack::Directory.new PUBLIC_PATH + "/vendor/lab-sensor-applet-interface-dist/jars"
  end
  map '/vendor/lab-energy2d-java' do
    # so no cache headers aren't added to the jars
    run Rack::Directory.new PUBLIC_PATH + "/vendor/lab-energy2d-java"
  end
  map '/' do
    use Rack::LiveReload
    require "rack-nocache"
    use Rack::Nocache
    use Rack::Static, :urls => [""], :root => PUBLIC_PATH , :index =>'index.html'
    run Rack::Directory.new PUBLIC_PATH
  end
else
  run Rack::Directory.new PUBLIC_PATH
end

