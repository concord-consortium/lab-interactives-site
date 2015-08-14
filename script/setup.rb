#!/usr/bin/env ruby
require 'fileutils'
require 'yaml'

PROJECT_ROOT = File.expand_path('../..',  __FILE__)                if !defined? PROJECT_ROOT
SRC_PATH  = File.join(PROJECT_ROOT, 'src')                         if !defined? SRC_PATH
SRC_LAB_PATH  = File.join(PROJECT_ROOT, 'src', 'lab')              if !defined? SRC_LAB_PATH
CONFIG_PATH  = File.join(PROJECT_ROOT, 'config')                   if !defined? CONFIG_PATH
SCRIPT_PATH = File.join(PROJECT_ROOT, 'script')                    if !defined? SCRIPT_PATH
BIN_PATH  = File.join(PROJECT_ROOT, 'bin')                         if !defined? BIN_PATH
PUBLIC_PATH  = File.join(PROJECT_ROOT, 'public')                   if !defined? PUBLIC_PATH

SITE_VERSION = File.read(File.join(PROJECT_ROOT, 'site-version'))

def render_file(filename, locals)
  contents = File.read(filename)
  lab_env = locals[:LAB_ENV]
  lab_root_url = ENV['LAB_ROOT_URL'] || locals[:CUSTOM_LAB_ROOT_URL] || LAB_ROOT_URL[lab_env]
  embeddable_page = EMBEDDABLE_PAGE[lab_env]
  Haml::Engine.new(contents).render(Object.new, {
    :lab_env => lab_env,
    :lab_root_url => lab_root_url,
    :lab_js_url => lab_root_url + (if lab_env == :production then "/lab.min.js" else "/lab.js" end),
    :lab_css_url => lab_root_url + "/lab.css",
    :fallback_fonts_from_lab => lab_env == :local,
    :embeddable_page => embeddable_page,
    :lab_js_dependencies => case CONFIG[:environment]
      when 'production'
        <<-HEREDOC
      <script src="#{lab_root_url}/vendor/d3/d3.min.js" type="text/javascript"></script>
      <script src="#{lab_root_url}/vendor/jquery/jquery.min.js" type="text/javascript"></script>
      <script src="#{lab_root_url}/vendor/jquery-ui/jquery-ui.min.js" type="text/javascript"></script>
      <script src="#{lab_root_url}/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js" type="text/javascript"></script>
      <script src="#{lab_root_url}/vendor/jquery-context-menu/jquery.contextMenu.js" type="text/javascript"></script>
      <script src="#{lab_root_url}/vendor/jquery-selectBoxIt/jquery.selectBoxIt.min.js" type="text/javascript"></script>
      <script src='#{lab_root_url}/vendor/tinysort/jquery.tinysort.min.js' type='text/javascript'></script>
        HEREDOC
      else
        <<-HEREDOC
      <script src="#{lab_root_url}/vendor/d3/d3.js" type="text/javascript"></script>
      <script src="#{lab_root_url}/vendor/jquery/jquery.js" type="text/javascript"></script>
      <script src="#{lab_root_url}/vendor/jquery-ui/jquery-ui.js" type="text/javascript"></script>
      <script src="#{lab_root_url}/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.js" type="text/javascript"></script>
      <script src="#{lab_root_url}/vendor/jquery-context-menu/jquery.contextMenu.js" type="text/javascript"></script>
      <script src="#{lab_root_url}/vendor/jquery-selectBoxIt/jquery.selectBoxIt.js" type="text/javascript"></script>
      <script src='#{lab_root_url}/vendor/tinysort/jquery.tinysort.js' type='text/javascript'></script>
        HEREDOC
      end,
    :js_site_config => <<-HEREDOC,
      <script>
        var SITE_CONFIG = {
          LAB_ENV: "#{lab_env}",
          EMBEDDABLE_PAGE: "#{embeddable_page}",
          SITE_ENV: "#{CONFIG[:environment]}"
        };
      </script>
      HEREDOC
  })
end

# Find config appropriate for current branch.
branch_config = `script/branch-config-file.rb`
CONFIG = YAML.load_file(branch_config)

config_lab_root_url = CONFIG[:lab_root_url] || {}

LAB_ROOT_URL = {
  :default     => config_lab_root_url[:default]     || "//lab-framework.concord.org/version/1.7.0/lab",
  :production  => config_lab_root_url[:production]  || "//lab-framework.concord.org/version/1.7.0/lab",
  :staging     => config_lab_root_url[:staging]     || "//lab-framework.concord.org/version/1.7.0/lab",
  :development => config_lab_root_url[:development] || "//lab-framework.concord.org/branch/master/lab",
  :local       => config_lab_root_url[:local]       || "//localhost:9191/lab"
}

EMBEDDABLE_PAGE = {
  :default     => "embeddable.html",
  :production  => "embeddable-production.html",
  :staging     => "embeddable-staging.html",
  :development => "embeddable-dev.html",
  :local       => "embeddable-local.html"
}

# setup partial for Google Analytics
if ENV['GA_ACCOUNT_ID']
  ANALYTICS = <<-HEREDOC
  <script type="text/javascript">
    var _gaq = _gaq || [];
    _gaq.push(['_setAccount', '#{ENV['GA_ACCOUNT_ID']}']);
    _gaq.push(['_setAllowAnchor', true]);
    (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();
  </script>
  HEREDOC
else
  ANALYTICS = ""
end

FONTFACE_LINK =
  <<-HEREDOC
<link href='//fonts.googleapis.com/css?family=Lato:300italic,700italic,300,400,400italic,700' rel='stylesheet' type='text/css'>
  HEREDOC

# setup partials for 'production' (minimized resources) or 'development'
LAB_JS_ADDITIONAL_DEPENDENCIES = case CONFIG[:environment]
when 'production'
  <<-HEREDOC
<script src='vendor/iframe-phone/iframe-phone.js' type='text/javascript'></script>
<script src='vendor/codemirror/lib/codemirror.js' type='text/javascript'></script>
<script src='vendor/codemirror/mode/javascript/javascript.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/fold/foldcode.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/fold/collapserange.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/format/formatting.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/edit/matchbrackets.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/edit/closebrackets.js' type='text/javascript'></script>
<script src='vendor/chosen/chosen.jquery.min.js' type='text/javascript'></script>
  HEREDOC
else
  <<-HEREDOC
<script src='vendor/iframe-phone/iframe-phone.js' type='text/javascript'></script>
<script src='vendor/codemirror/lib/codemirror.js' type='text/javascript'></script>
<script src='vendor/codemirror/mode/javascript/javascript.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/fold/foldcode.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/fold/collapserange.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/format/formatting.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/edit/matchbrackets.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/edit/closebrackets.js' type='text/javascript'></script>
<script src='vendor/fingerprintjs/fingerprint.min.js' type='text/javascript'></script>
<script src='vendor/chosen/chosen.jquery.min.js' type='text/javascript'></script>
  HEREDOC
end
