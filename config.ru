PUBLIC_PATH  = File.join(File.dirname(__FILE__), 'public')

use Rack::ConditionalGet
use Rack::ContentLength

Rack::Mime::MIME_TYPES.merge!({
  ".ttf" => "font/ttf",
  ".mml" => "application/xml",
  ".cml" => "application/xml",
  ".e2d" => "application/xml"
})

run Rack::Directory.new PUBLIC_PATH
