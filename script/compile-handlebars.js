#!/usr/bin/env node

const fs = require('fs');
const Handlebars = require('handlebars');
const LAB_ROOT_URL = require('./lab-urls');

const inputPath = process.argv[2];
const outputPath = process.argv[3];

// config

const EMBEDDABLE_PAGE = {
  default:     "embeddable.html",
  production:  "embeddable-production.html",
  staging:     "embeddable-staging.html",
  development: "embeddable-dev.html",
  local:       "embeddable-local.html"
};

// 'production' or 'development'. It used to be loaded dynamically, based on the per-branch config file.
// I don't think it's been used too much.
const SITE_ENV = 'production';

const env = process.env;
const labEnv = env.LAB_ENV || 'default';
const labRootUrl = env.LAB_ROOT_URL || LAB_ROOT_URL[labEnv];
const embeddablePage = EMBEDDABLE_PAGE[labEnv];
const labJsDependencies = SITE_ENV === 'production' ?
`<script src="${labRootUrl}/vendor/d3/d3.min.js" type="text/javascript"></script>
<script src="${labRootUrl}/vendor/jquery/jquery.min.js" type="text/javascript"></script>
<script src="${labRootUrl}/vendor/jquery-ui/jquery-ui.min.js" type="text/javascript"></script>
<script src="${labRootUrl}/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js" type="text/javascript"></script>
<script src="${labRootUrl}/vendor/jquery-context-menu/jquery.contextMenu.js" type="text/javascript"></script>
<script src="${labRootUrl}/vendor/jquery-selectBoxIt/jquery.selectBoxIt.min.js" type="text/javascript"></script>
<script src='${labRootUrl}/vendor/tinysort/jquery.tinysort.min.js' type='text/javascript'></script>`
    :
`<script src="${labRootUrl}/vendor/d3/d3.js" type="text/javascript"></script>
<script src="${labRootUrl}/vendor/jquery/jquery.js" type="text/javascript"></script>
<script src="${labRootUrl}/vendor/jquery-ui/jquery-ui.js" type="text/javascript"></script>
<script src="${labRootUrl}/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.js" type="text/javascript"></script>
<script src="${labRootUrl}/vendor/jquery-context-menu/jquery.contextMenu.js" type="text/javascript"></script>
<script src="${labRootUrl}/vendor/jquery-selectBoxIt/jquery.selectBoxIt.js" type="text/javascript"></script>
<script src='${labRootUrl}/vendor/tinysort/jquery.tinysort.js' type='text/javascript'></script>`;

const labJsAdditionalDependencies = SITE_ENV === 'production' ?
`<script src='vendor/iframe-phone/iframe-phone.js' type='text/javascript'></script>
<script src='vendor/codemirror/lib/codemirror.js' type='text/javascript'></script>
<script src='vendor/codemirror/mode/javascript/javascript.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/fold/foldcode.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/fold/collapserange.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/format/formatting.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/edit/matchbrackets.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/edit/closebrackets.js' type='text/javascript'></script>
<script src='vendor/chosen/chosen.jquery.min.js' type='text/javascript'></script>`
  :
`<script src='vendor/iframe-phone/iframe-phone.js' type='text/javascript'></script>
<script src='vendor/codemirror/lib/codemirror.js' type='text/javascript'></script>
<script src='vendor/codemirror/mode/javascript/javascript.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/fold/foldcode.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/fold/collapserange.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/format/formatting.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/edit/matchbrackets.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/edit/closebrackets.js' type='text/javascript'></script>
<script src='vendor/fingerprintjs/fingerprint.min.js' type='text/javascript'></script>
<script src='vendor/chosen/chosen.jquery.min.js' type='text/javascript'></script>`;

const jsSiteConfig =
`<script>
  var SITE_CONFIG = {
    LAB_ENV: "${labEnv}",
    EMBEDDABLE_PAGE: "${embeddablePage}",
    SITE_ENV: "${SITE_ENV}"
  };
</script>`;

const analytics = env.GA_ACCOUNT_ID ?
`<script type="text/javascript">
  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', '${env.GA_ACCOUNT_ID}']);
  _gaq.push(['_setAllowAnchor', true]);
  (function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();
</script>` : '';

const locals = {
  lab_env: labEnv,
  lab_root_url: labRootUrl,
  lab_js_url: labRootUrl + (labEnv === 'production' ? '/lab.min.js' : '/lab.js'),
  lab_css_url: labRootUrl + '/lab.css',
  embeddable_page: embeddablePage,
  lab_js_dependencies: labJsDependencies,
  js_site_config: jsSiteConfig,
  analytics,
  fontface_link: "<link href='//fonts.googleapis.com/css?family=Lato:300italic,700italic,300,400,400italic,700' rel='stylesheet' type='text/css'>",
  lab_js_additional_dependencies: labJsAdditionalDependencies
};

const template = Handlebars.compile(fs.readFileSync(inputPath, 'utf-8'));
fs.writeFileSync(outputPath, template(locals));
