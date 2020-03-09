/*global SITE_CONFIG, Lab, iframePhone, $, Shutterbug, CodeMirror, Fingerprint, Embeddable, alert, AUTHORING: true */
/*jshint boss:true */

(function() {
      // Default interactive aspect ratio.
  var DEF_ASPECT_RATIO = 1.3,
      BENCHMARK_API_URL = "https://script.google.com/macros/s/AKfycbzosXAVPdVRFUrF6FRI42dzQb2IGLnF9GlIbj9gUpeWpXALKgM/exec",
      LAB_ENV = window.location.href.match(/interactives-?([a-z]*)\.html/)[1],

      origin,
      interactiveDescriptions,
      descriptionByPath,
      interactives,
      groups,
      parentPhone,

      $content = $("#content"),
      $interactiveTitle = $("#interactive-title"),
      $selectInteractive = $("#select-interactive"),
      $selectInteractiveGroups = $("#select-interactive-groups"),
      $selectInteractiveSize = $("#select-interactive-size"),
      $selectLabEnvironment = $("#select-lab-environment"),

      $showEditor = $("#show-editor"),
      $showModelEditor = $("#show-model-editor"),
      $showModelEnergyGraph = $("#show-model-energy-graph"),
      $showModelDatatable = $("#show-model-datatable"),

      $previousInteractive = $("#previous-interactive"),
      $nextInteractive = $("#next-interactive"),

      $serializedControls = $("#header *.serialize"),

      chosenApplied = false,

      applicationCallbacks,

      indent = 2,

      interactiveUrl,
      interactive,
      hash,

      editor,
      modelEditor,

      jsonModelPath,
      $jsonModelLink = $("#json-model-link"),

      $jsonInteractiveLink = $("#json-interactive-link"),

      interactivesPromise,

      buttonHandlersAdded = false,

      widthBeforeEditMode,
      editMode = false;

  interactivesPromise = $.get('interactives.json');

  interactivesPromise.done(function(results) {
    if (typeof results === 'string') {
      results = JSON.parse(results);
    }
    interactiveDescriptions = results;

    descriptionByPath = {};
    interactiveDescriptions.interactives.forEach(function (i) {
      descriptionByPath[i.path] = i;
    });
    // Aspect ratios are now available, so it can affect container dimensions.
    selectInteractiveSizeHandler();
  });

  // TODO: some of the Deferred, ajax call have no error handlers?
  interactivesPromise.fail(function(){
    // TODO: need a better way to display errors
    var mesg = "Failed to retrieve interactives.json";
    if (Lab.benchmark.what_browser().browser === "Chrome") {
      mesg += "\n";
      mesg += "\nNote: Chrome prevents loading content directly";
      mesg += "\nfrom the file system.";
      mesg += "\n";
      mesg += "\nIf you are using Chrome to load Lab Interatives";
      mesg += "\nfrom the file system you will need to start a";
      mesg += "\nlocal web server instead.";
      mesg += "\n";
      mesg += "\nOne solution is to start a simple local web";
      mesg += "\nserver using Python in the same directory where";
      mesg += "\nthe static resources are located";
      mesg += "\n";
      mesg += "\n    python -m SimpleHTTPServer";
      mesg += "\n";
      mesg += "\nNow open this page in your browser:";
      mesg += "\n";
      mesg += "\n    http://localhost:8000/interactives.html";
      mesg += "\n";
    }
    console.log(mesg);
    alert(mesg);
  });

  if (!document.location.hash) {
    if ($selectInteractive.val()) {
      selectInteractiveHandler();
    } else {
      interactivesPromise.done(function(){
        // set the default interactive, from the first interactive in
        // the first group returned from the server
        var firstGroupPath = interactiveDescriptions.groups[0].path;
        var firstInteractive = interactiveDescriptions.interactives.find(function(interactive){
          return interactive.groupKey === firstGroupPath;
        });
        document.location.hash = firstInteractive.path;
      });
    }
  }

  function redirectHandler(path) {
    document.location.hash = "#" + path;
  }

  hash = document.location.hash;
  if (hash) {
    interactiveUrl = hash.substr(1, hash.length);

    restoreOptionsFromCookie();
    selectInteractiveSizeHandler();

    origin = document.location.href.match(/(.*?\/\/.*?)\//)[1];

    AUTHORING = true;
    applicationCallbacks = [setupFullPage];

    interactivesPromise.done(function() {
      restoreOptionsFromCookie();
      setupSelectList();
      $("#select-filters input").click(setupSelectList);
      $("#select-filters input").click(setupSelectGroups);
      $("#render-controls input").click(function() {
        saveOptionsToCookie();
        location.reload();
      });
    });

    embedIframeInteractive();
    Embeddable.sendGAPageview();
  }

  function embedIframeInteractive() {
    var $iframeWrapper = $('#iframe-wrapper');
    // Dynamically insert the model iframe to avoid a Firefox bug that sometimes causes the iframe
    // src to be restored from session history, ignoring the the src attribute set dynamically
    // by the parent frame.
    var $iframe = $("<iframe id='iframe-interactive' src='" + SITE_CONFIG.EMBEDDABLE_PAGE + hash + "' width='100%' height='100%' frameborder=0 scrolling='no' allowfullscreen webkitallowfullscreen mozallowfullscreen></iframe>");

    $iframeWrapper
      .addClass($selectInteractiveSize.val())
      .append($iframe);

    selectInteractiveSizeHandler();
    $selectInteractiveSize.removeAttr('disabled');
    $iframeWrapper.resizable({
      helper: "ui-resizable-helper",
      stop: function (event, ui) {
        if (editMode) {
          var aspectRatio = ui.size.width / ui.size.height,
              fontScale = widthBeforeEditMode / ui.size.width;
          interactive.fontScale = fontScale;
          interactive.aspectRatio = aspectRatio;
          descriptionByPath[interactiveUrl].aspectRatio = aspectRatio;
          parentPhone.post('loadInteractive', interactive);
          // Update editor.
          editor.setValue(JSON.stringify(interactive, null, indent));
          console.log("new aspect ratio: " + aspectRatio);
        }
      }
    });
    $content.css("border", "none");
    // initiate communication with Interactive in iframe and setup callback
    parentPhone = new iframePhone.ParentEndpoint($iframe[0]);
    parentPhone.addListener("modelLoaded", function() {
      parentPhone.post('setFocus');
      parentPhone.post('getInteractiveState');
      parentPhone.addListener('interactiveState', function(content) {
        interactive = content;
        setupFullPage();
      });
      // example of how to get the a versioned learner url --
      // where the URL is decorated with query params, and possibly
      // the url points to versioned release of the framework.
      parentPhone.post('getLearnerUrl');
      parentPhone.addListener('setLearnerUrl', function(content) {
        $("#learner_url").attr('href',content);
      });
    });

    // add basic redirect listener, this might be called before the iframe-phone even
    // receives a 'hello' message
    parentPhone.addListener('redirect', redirectHandler);
  }

  function setupFullPage() {
    var $interactiveHeader = $("#interactive-header");

    if(interactive) document.title = "Lab Interactive Browser: " + interactive.title;

    interactivesPromise.done(function() {
      if (interactive) {
        $interactiveTitle.text(interactive.title);
        if (interactive.publicationStatus === 'draft') {
          $interactiveTitle.append(" <i>(draft)</i>");
        }
        if (interactive.subtitle) {
          $("#interactive-subtitle").remove();
          $interactiveHeader.append('<div id="interactive-subtitle">' + interactive.subtitle + '</div>');
        }
      }
      finishSetupFullPage();
    });
  }

  function finishSetupFullPage() {
    var $embeddableLink = $("#embeddable-link"),
        $codapLink = $("#codap-link"),
        $codapStagingLink = $("#codap-staging-link"),
        codapGameSpecification,
        url;

    setupNextPreviousInteractive();

    // construct link to embeddable version of Interactive
    $embeddableLink.attr("href", function(i, href) { return href + hash; });
    $embeddableLink.attr("title", "Open this Interactive in a new page suitable for embedding.");

    $jsonInteractiveLink.attr("href", interactiveUrl);

    $jsonModelLink.attr("title", "View model JSON in another window");

    // construct link to JSON version of model
    if (interactive) {
      jsonModelPath = interactive.models[0].url;
      $jsonModelLink.attr("href", jsonModelPath);
      $jsonModelLink.attr("title", "View model JSON in another window");
    }

    // encode small JSON hash to be passed as query parameter to CODAP

    // construct url to interactive, to be passed to CODAP
    // (need origin *and* the pathname up to the interactives.html part so that we retain branch,
    // as in: http://lab.concord.org/branch/<branchname>/interactives.html#<interactive>)
    url = document.location.origin +
      document.location.pathname.replace(/interactives(-.+)?\.html/, SITE_CONFIG.EMBEDDABLE_PAGE) +
     '?codap=true' +
     hash;

    codapGameSpecification = encodeURIComponent(JSON.stringify([{
      "name": $selectInteractive.find("option:selected").text(),
      "dimensions": {
        "width": 600,
        "height": 400
      },
      "url": url
    }]));

    $codapLink.attr("href",
      "http://codap.concord.org/releases/latest/?moreGames=" + codapGameSpecification);
    $codapLink.attr("title", "Run this Interactive inside CODAP");

    $codapStagingLink.attr("href",
      "http://codap.concord.org/releases/staging/?moreGames=" + codapGameSpecification);
    $codapStagingLink.attr("title", "Run this Interactive inside the CODAP staging server");

    setupOriginalImportLinks();
    setupExtras();
  }

  //
  // Extras
  //
  function setupExtras() {
    if (interactive) {
      $('#extras-bottom').show();
    } else {
      // Should we also disable the editors?
      $('#extras-bottom').hide();
      return;
    }

    // Interactive Browser with Interactive embedding in iframe
    // data table not working in iframe embedding mode yet
    $("#model-datatable").hide();

    setupCodeEditor();
    setupModelCodeEditor();
    setupSnapshotButton();
    setupBenchmarks();
    setupOfflineDownload();
    setupEnergyGraph();
    // All the extra items are sortable
    // $(".sortable").sortable({
    //   axis: "y",
    //   containment: "parent",
    //   cursor: "row-resize"
    // });
  }

  $(window).bind('hashchange', function() {
    if (document.location.hash !== hash) {
      location.reload();
    }
  });

  function selectInteractiveHandler() {
    document.location.hash = '#' + $selectInteractive.val();
  }

  $selectInteractive.change(selectInteractiveHandler);

  function selectInteractiveSizeHandler() {
    var selection = $selectInteractiveSize.val(),
        intAspectRatio = descriptionByPath && interactiveUrl && descriptionByPath[interactiveUrl] &&
                         descriptionByPath[interactiveUrl].aspectRatio || DEF_ASPECT_RATIO,
        widths = {
          "tiny":         "318px",
          "small":        "364px",
          "medium-small": "420px",
          "medium":       "565px",
          "large":        "960px"
        },
        width  = widths[selection],
        height = parseInt(width, 10) / intAspectRatio + "px";

    saveOptionsToCookie();
    $("#iframe-wrapper").width(width).height(height);
  }

  $selectInteractiveSize.change(selectInteractiveSizeHandler);

  function selectLabEnvironmentHandler() {
    var val = $selectLabEnvironment.val();
    var newPage = "interactives" + (val ? "-" : "") + val + ".html";
    var newHref = window.location.href.replace(/interactives-?[a-z]*\.html/, newPage);
    window.location = newHref;
  }
  // Set Lab environment select based on the current URL (interactives.html page version).
  $selectLabEnvironment.val(LAB_ENV);
  $selectLabEnvironment.change(selectLabEnvironmentHandler);

  function setupSelectList() {
    if (chosenApplied) {
      $selectInteractive.chosen('destroy');
    }
    $selectInteractive.empty();
    $selectInteractive.append($("<option>")
          .attr('value', 'select')
          .text("Select an Interactive ...")
          .attr('disabled', true));
    saveOptionsToCookie();
    interactives = interactiveDescriptions.interactives;
    groups = interactiveDescriptions.groups.filter(function(group) {
      var curriculumFilter = $("#curriculum-filter").is(':checked'),
          examplesFilter = $("#examples-filter").is(':checked'),
          benchmarksFilter = $("#benchmarks-filter").is(':checked'),
          testsFilter = $("#tests-filter").is(':checked');
      if (group.category === "Samples") return true;
      if (curriculumFilter && group.category === "Curriculum") return true;
      if (examplesFilter && group.category === "Examples") return true;
      if (benchmarksFilter && group.category === "Benchmarks") return true;
      if (testsFilter && group.category === "Tests") return true;
      return false;
    });
    groups.forEach(function (group) {
      var publicFilter = $("#public").is(':checked'),
          draftFilter = $("#draft").is(':checked'),
          brokenFilter = $("#broken").is(':checked'),
          interactiveGroup = interactives.filter(function (interactive) {
            var env = interactive.labEnvironment;
            // LAB_ENV is a global variable set by interactives.haml template.
            if (SITE_CONFIG.LAB_ENV === "production" && env !== "production") return false;
            if (SITE_CONFIG.LAB_ENV === "staging" && env !== "production" && env !== "staging") return false;
            if (interactive.groupKey !== group.path) return false;
            if (interactive.publicationStatus === 'sample') return true;
            if (publicFilter && interactive.publicationStatus === 'public') return true;
            if (draftFilter && interactive.publicationStatus === 'draft') return true;
            if (brokenFilter && interactive.publicationStatus === 'broken') return true;
          }),
          $optgroup = $("<optgroup>").attr('label', group.name);
      interactiveGroup.forEach(function (interactive) {
        var title;
        switch(interactive.publicationStatus) {
          case "draft":
          title = "* " + interactive.title;
          break;
          case "broken":
          title = "** " + interactive.title;
          break;
          default:
          title = interactive.title;
          break;
        }
        $optgroup.append($("<option>")
          .attr('value', interactive.path)
          .text(title)
          .attr('data-path', interactive.path));
      });
      if (interactiveGroup.length > 0) {
        $selectInteractive.append($optgroup);
      }
    });
    if ($selectInteractive.find('option[value="' + interactiveUrl + '"]').length === 0) {
      $selectInteractive.val("select");
    } else {
      $selectInteractive.val(interactiveUrl);
    }
    // create searchable dropdown using Chosen
    $selectInteractive.chosen();
    chosenApplied = true;
    updateNextPreviousInteractiveStatus();
  }

  function restoreOptionsFromCookie() {
    var cookie = document.cookie.match(/lab-interactive-options=(.*)(;|$)/),
        str,
        settings;
    if (cookie) {
      str = cookie[1].split(";")[0];
      settings = str.split('&').map(function (i) { return i.split('='); });
      $serializedControls.each(function(i, el) {
        var match = settings.find(function(e) { return e[0] === el.id; }, this);
        switch(el.tagName) {
          case "INPUT":
          if (match && el.id === match[0]) {
            el.checked = true;
          } else {
            el.checked = false;
          }
          break;
          case "SELECT":
          if (match) {
            $(el).val(match[1]);
          }
          break;
        }
      });
    }
  }

  function saveOptionsToCookie() {
    var cookie;
    cookie = $serializedControls.serialize() + " ; max-age=" + 30*60*60*24;
    document.cookie = "lab-interactive-options=" + cookie;
  }

  function setupOriginalImportLinks() {
    var $originalImportLink = $("#original-import-link"),
        $originalModelLink = $("#original-model-link"),
        e2dModelPath;

    function disableOriginalImportLink() {
      $originalImportLink.removeAttr("href");
      $originalImportLink.attr("title", "link to original model not available for this interactive");
      $originalImportLink.addClass("na");
    }
    function disableOriginalModelLink() {
      $originalModelLink.removeAttr("href");
      $originalModelLink.attr("title", "original import model file not available for this model");
      $originalModelLink.addClass("na");
    }
    function disableJsonModelLink() {
      $jsonModelLink.removeAttr("href");
      $jsonModelLink.attr("title", "link to JSON model not available for this interactive");
      $jsonModelLink.addClass("na");
    }
    if (jsonModelPath) {
      switch(interactive.models[0].type) {
        case "md2d":
        $originalImportLink.hide();
        disableOriginalImportLink();
        disableOriginalModelLink();
        break;
        case "energy2d":
        e2dModelPath = interactive.models[0].importedFrom;
        $originalImportLink.attr("target", "_blank");
        if (interactive.importedFrom) {
          // The Energy2D model exist on a separate HTML page
          $originalImportLink.attr("href", interactive.importedFrom);
          $originalImportLink.attr("title", "View original html page with Java Energy2D applet in another window");
        } else if (e2dModelPath) {
          // The Energy2D model exists only as an e2d file, there is no associated HTML page,
          // use Generic Energy2D applet page instead:
          //    /imports/energy2d/energy2d-applet.html?e2dPath=content/compare-capacity.e2d&title=Compare%20Capacity
          $originalImportLink.attr("href", "imports/energy2d/energy2d-applet.html?" +
            encodeURI("e2dPath=" + e2dModelPath.replace("imports/energy2d/", "") + "&title=" + interactive.title.replace(/\*+$/, '')));
          $originalImportLink.attr("title", "View original Java Energy2D applet in generic HTML page in another window");
        } else {
          disableOriginalImportLink();
        }
        if (e2dModelPath) {
          $originalModelLink.attr("href", interactive.models[0].importedFrom);
          $originalModelLink.attr("title", "View original Java Energy2D applet e2d model file in another window");
        } else {
          disableOriginalModelLink();
        }
        break;
        default:
        disableOriginalImportLink();
        disableOriginalModelLink();
        break;
      }
    } else {
      disableOriginalImportLink();
      disableOriginalModelLink();
      disableJsonModelLink();
    }
    $originalImportLink.show();
  }

  function setupSelectGroups(){

    $selectInteractiveGroups.empty();
    groups.forEach(function(group) {
      var publicFilter = $("#public").is(':checked');
      var draftFilter = $("#draft").is(':checked');

      interactives.filter(function (interactive) {
        if (interactive.groupKey !== group.path) return false;
        if (interactive.publicationStatus === 'sample') return true;
        if (publicFilter && interactive.publicationStatus === 'public') return true;
        if (draftFilter && interactive.publicationStatus === 'draft') return true;
      });

      $selectInteractiveGroups.append($("<option>")
                                      .attr('value', group.id)
                                      .text(group.name));

    });
    $selectInteractiveGroups.val(interactive.groupKey).attr('selected', true);
  }

  //
  // Setup and enable next and previous Interactive buttons
  //
  function setupNextPreviousInteractive() {
    updateNextPreviousInteractiveStatus();
    $previousInteractive.click(function() {
      var $selectInteractive = $("#select-interactive"),
          $options = $selectInteractive.find("option:enabled"),
          $selection = $options.filter(":selected"),
          index = $options.index($options.filter(":selected"));
      // reset index if current Interactive not in select list
      if (index === -1) index = 1;
      if (index > 0) {
        $selection.prop('selected', false);
        $($options[index-1]).prop('selected', true);
        selectInteractiveHandler();
      } else {
        $previousInteractive.addClass("disabled");
      }
    });

    $nextInteractive.click(function() {
      var $selectInteractive = $("#select-interactive"),
          $options = $selectInteractive.find("option:enabled"),
          $selection = $options.filter(":selected"),
          index = $options.index($options.filter(":selected"));
      if (index+1 < $options.length) {
        $selection.prop('selected', false);
        $($options[index+1]).prop('selected', true);
        selectInteractiveHandler();
      } else {
        this.addClass("disabled");
      }
    });
  }

  function updateNextPreviousInteractiveStatus() {
    var $options = $selectInteractive.find("option:enabled"),
        index = $options.index($options.filter(":selected"));

    if (index === 0) {
      $previousInteractive.addClass("disabled");
    }

    if (index+1 >= $options.length) {
      $nextInteractive.addClass("disabled");
    }
  }

  //
  // Interactive Code Editor
  //
  function setupCodeEditor() {
    var $updateInteractiveButton = $("#update-interactive-button"),
        $updateJsonFromInteractiveButton = $("#update-json-from-interactive-button"),
        $autoFormatInteractiveJsonButton = $("#autoformat-interactive-json-button"),
        $editModeCheckbox = $("#edit-mode"),
        $interactiveTextArea = $("#interactive-text-area"),
        $editorContent = $("#editor-content"),
        foldFunc = CodeMirror.newFoldFunction(CodeMirror.braceRangeFinder);

    $interactiveTextArea.text(JSON.stringify(interactive, null, indent));

    if (!editor) {
      editor = CodeMirror.fromTextArea($interactiveTextArea.get(0), {
        mode: { name: "javascript", json: true },
        indentUnit: indent,
        lineNumbers: true,
        lineWrapping: false,
        matchBrackets: true,
        autoCloseBrackets: true,
        collapseRange: true,
        onGutterClick: foldFunc
      });
    }

    if (!buttonHandlersAdded) {
      buttonHandlersAdded = true;
      $updateInteractiveButton.on('click', function() {
        var aspectRatioChanged = false;
        try {
          interactive = JSON.parse(editor.getValue());
          if (typeof interactive.aspectRatio !== "undefined") {
            // Update aspect ratio.
            descriptionByPath[interactiveUrl].aspectRatio = interactive.aspectRatio;
            aspectRatioChanged = true;
          }
        } catch (e) {
          alert("Interactive JSON syntax error: " + e.message);
          throw new Error("Interactive JSON syntax error: " + e.message);
        }
        parentPhone.post('loadInteractive', interactive);
        $interactiveTitle.text(interactive.title);
        $('#interactive-subtitle').text(interactive.subtitle);
        if (aspectRatioChanged) selectInteractiveSizeHandler();
      });

      $autoFormatInteractiveJsonButton.on('click', function() {
        autoFormatEditorContent(editor);
      });

      $updateJsonFromInteractiveButton.on('click', function() {
        parentPhone.post('getInteractiveState');
        parentPhone.addListener('interactiveState', function(content) {
          editor.setValue(JSON.stringify(content, null, indent));
        });
      });

      $editModeCheckbox.on('change', function () {
        var $wrapper = $("#iframe-wrapper"),
            w = $wrapper.width(),
            h = $wrapper.height(),
            aspectRatio = w / h;

        widthBeforeEditMode = w;
        editMode = $editModeCheckbox.prop("checked");

        if (editMode) {
          interactive.aspectRatio = aspectRatio;
          descriptionByPath[interactiveUrl].aspectRatio = aspectRatio;
          parentPhone.post('loadInteractive', interactive);
          parentPhone.addListener("modelLoaded", function() {
            parentPhone.post('set', { name: 'isBeingEdited', value: true });
          });
          // Update editor.
          editor.setValue(JSON.stringify(interactive, null, indent));
          console.log("new aspect ratio: " + aspectRatio);
        } else {
          parentPhone.post('set', { name: 'isBeingEdited', value: false });
        }
      });

      $showEditor.change(function() {
        if (this.checked) {
          $editorContent.show(100);
        } else {
          $editorContent.hide(100);
        }
      }).change();
    }
  }

  //
  // Model Code Editor
  //
  function setupModelCodeEditor() {
    var $updateModelButton = $("#update-model-button"),
        $updateJsonFromModelButton = $("#update-json-from-model-button"),
        $autoFormatModelJsonButton = $("#autoformat-model-json-button"),
        $modelTextArea = $("#model-text-area"),
        $modelEditorContent = $("#model-editor-content"),
        modelButtonHandlersAdded,
        foldFunc = CodeMirror.newFoldFunction(CodeMirror.braceRangeFinder),
        modelJson;

    function serializeModelAndUpdateEditor() {
      parentPhone.post('getModelState');
      parentPhone.addListener('modelState', function(content) {
        modelEditor.setValue(JSON.stringify(content, null, indent));
      });
    }

    if (!modelEditor) {
      modelEditor = CodeMirror.fromTextArea($modelTextArea.get(0), {
        mode: { name: "javascript", json: true },
        indentUnit: indent,
        lineNumbers: true,
        lineWrapping: false,
        onGutterClick: foldFunc
      });
    }

    serializeModelAndUpdateEditor();

    if (!modelButtonHandlersAdded) {
      modelButtonHandlersAdded = true;

      $updateModelButton.on('click', function() {
        try {
          modelJson = JSON.parse(modelEditor.getValue());
        } catch (e) {
          alert("Model JSON syntax error: " + e.message);
          throw new Error("Model JSON syntax error: " + e.message);
        }
        parentPhone.post('loadModel', { modelId: interactive.models[0].id, modelObject: modelJson });
      });

      $autoFormatModelJsonButton.on('click', function() {
        autoFormatEditorContent(modelEditor);
      });

      $updateJsonFromModelButton.on('click', serializeModelAndUpdateEditor);

      $showModelEditor.change(function() {
        if (this.checked) {
          $modelEditorContent.show(100);
        } else {
          $modelEditorContent.hide(100);
        }
      }).change();
    }
  }

  function setupSnapshotButton() {
    var $showSnapshot = $("#show-snapshot"),
        $snapshotContent = $("#snapshot-content");

    $showSnapshot.change(function() {
      if (this.checked) {
        $snapshotContent.show(100);
      } else {
        $snapshotContent.hide(100);
      }
    }).change();
    if(interactive.screenshot) {
      $('#authored_screenshot_img').attr('src',interactive.screenshot);
      $('#authored_screenshot_img').show();
    }
    else {
      $('#authored_screenshot_img').attr('src','');
      $('#authored_screenshot_img').hide();
    }
    $('#export_interactive').on('click', function(e) {
      e.preventDefault();
      if (typeof Shutterbug !== 'undefined') {
        Shutterbug.snapshot("#iframe-interactive", "#image_output");
      }
    });
  }

  // general format helper for both editors
  function autoFormatEditorContent(ed) {
    var cursorStart = ed.getCursor("start"),
        cursorEnd = ed.getCursor("end"),
        lastLine = ed.lineCount(),
        viewPort = ed.getViewport();
    ed.autoFormatRange({ ch:0, line: 0 }, { ch:0, line: lastLine });
    ed.setSelection(cursorStart, cursorEnd);
    ed.scrollIntoView({ ch:0, line: viewPort.from });
  }

  //
  // Benchmarks
  //
  function getFingerprint() {
    if (SITE_CONFIG.SITE_ENV === 'production') {
      // fake fingerprint on production because library won't be loaded
      return "mock fingerprint";
    } else {
      return new Fingerprint().get(); // semi-unique browser id
    }
  }

  function setupBenchmarks() {
    var $showBenchmarks = $("#show-benchmarks"),
        $benchmarksContent = $("#benchmarks-content"),
        $runBenchmarksButton = $("#run-benchmarks-button"),
        $submitBenchmarksButton = $("#submit-benchmarks-button"),
        $submissionInfo = $("#browser-submission-info"),
        $showSubmissionInfo = $("#show-browser-submission-info"),
        $browserFingerprint = $("#browser-fingerprint"),
        fingerprint = getFingerprint();

    $showBenchmarks.change(function() {
      if (this.checked) {
        $benchmarksContent.show(100);
        $showModelEnergyGraph.attr("checked", false).change();
        $showModelDatatable.attr("checked", false).change();
        $showEditor.attr("checked", false).change();
      } else {
        $benchmarksContent.hide(100);
      }
    }).change();

    $runBenchmarksButton.on('click', function() {
      var benchmarksTable = document.getElementById("model-benchmark-results");

      if (!$showBenchmarks.prop("checked")) {
        $("#show-benchmarks").prop("checked", true).change();
      }

      parentPhone.post('runBenchmarks');
      parentPhone.addListener('returnBenchmarks', function(content) {
        Lab.benchmark.renderToTable(benchmarksTable, content.benchmarks, content.results);
      });
    });

    $browserFingerprint.text(fingerprint);

    $showSubmissionInfo.on('click', function() {
      $submissionInfo.toggle();
      return false;
    });

    $submitBenchmarksButton.on('click', function() {
      var data = {},
          headers = $('#model-benchmark-results th');

      // create data object directly from the table element
      headers.each(function(i) {
        data[this.innerHTML] = $('#model-benchmark-results tr.average td:nth-child('+(i+1)+')').text();
      });

      data["browser id"] = fingerprint;

      $.ajax({
        type: "POST",
        url: BENCHMARK_API_URL,
        data: data,
        complete: function() { $('#submit-success').text("Sent!"); }
      });
    });
  }

  function setupOfflineDownload() {
    var API = 'https://tv4jg3zewi.execute-api.us-east-1.amazonaws.com/production/interactive?interactivePath=';
    var $button = $('#download-offline');

    function archiveGenerated(result) {
      if (result.url) {
        $button.html('<a href="' + result.url + '" target="_blank">Download</a>');
        $button.removeClass('disabled');
      } else {
        error(result);
      }
    }

    function error(err) {
      $button.html('Download failed');
      console.error(err);
    }

    function initDownload() {
      var interactivePath = window.location.hash.substr(1);
      $.ajax({
        url: API + interactivePath,
        success: archiveGenerated,
        error: error
      });
      $button.addClass('disabled');
      $button.text('Please wait...');
    }

    // Offline archive includes production version of Lab only.
    if (LAB_ENV === '' || LAB_ENV === 'production') {
      $button.off('click');
      $button.one('click', initDownload);
    } else {
      $button.addClass('disabled');
    }
  }

  //
  // Energy Graph
  // If an Interactive is instanced on this page pass in the model object,
  // otherwize we'll assume the Interactive is embedded in an iframe.
  //
  function setupEnergyGraph() {
    var $modelEnergyGraphContent = $("#model-energy-graph-content"),
        energyGraphSamplePeriod,
        modelEnergyGraph,
        modelEnergyData = [];

    function addEventHook(name, func, props) {
      var privateName = name + '.modelEnergyGraph';
      if (parentPhone) {
        parentPhone.addListener(privateName, func);
        parentPhone.post('listenForDispatchEvent', {
          eventName: privateName,
          properties: props
        });
      }
    }

    function removeEventHook(name) {
      var privateName = name + '.modelEnergyGraph';
      if (parentPhone) {
        parentPhone.post('removeListenerForDispatchEvent', privateName);
        parentPhone.removeListener(privateName);
      }
    }

    function addIframeEventListeners() {
      addEventHook("tick", function(props) {
        updateModelEnergyGraph(props);
      }, ['kineticEnergy', 'potentialEnergy']);

      addEventHook('play', function(props) {
        if (modelEnergyGraph.numberOfPoints() && props.tickCounter < modelEnergyGraph.numberOfPoints()) {
          resetModelEnergyData(props.tickCounter);
          modelEnergyGraph.resetSamples(modelEnergyData);
        }
      }, ['tickCounter']);

      addEventHook('reset', function() {
        renderModelEnergyGraph();
      }, ['displayTimePerTick']);

      addEventHook('stepForward', function(props) {
        if (props.newStep) {
          updateModelEnergyGraph();
        } else {
          modelEnergyGraph.updateOrRescale(props.tickCounter);
        }
      }, ['tickCounter', 'newStep']);

      addEventHook('stepBack', function(props) {
        modelEnergyGraph.updateOrRescale(props.tickCounter);
      }, ['tickCounter']);
    }

    function addEventListeners() {
      addIframeEventListeners();
    }

    function removeEventListeners() {
      // remove listeners
      removeEventHook("tick");
      removeEventHook('play');
      removeEventHook('reset');
      removeEventHook('stepForward');
      removeEventHook('stepBack');
    }

    function updateModelEnergyGraph(props) {
      modelEnergyGraph.addSamples(updateModelEnergyData(props));
    }

    function renderModelEnergyGraph() {
      var options = {
            title:     "Energy of the System (KE:red, PE:green, TE:blue)",
            xlabel:    "Model Time (ps)",
            xmin:       0,
            xmax:      50,
            sampleInterval:    energyGraphSamplePeriod,
            ylabel:    "eV",
            ymin:     -25.0,
            ymax:      25.0,
            fontScaleRelativeToParent: false,
            realTime:  true
          };

      $.extend(options, interactive.models[0].energyGraphOptions || []);
      resetModelEnergyData();
      options.dataSamples = modelEnergyData;
      removeEventListeners();
      if (modelEnergyGraph) {
        modelEnergyGraph.reset('#model-energy-graph-chart', options);
      } else {
        modelEnergyGraph = Lab.grapher.Graph('#model-energy-graph-chart', options);
      }
      addEventListeners();
    }

    // Add another sample of model KE, PE, and TE to the arrays in resetModelEnergyData
    function updateModelEnergyData(props) {

      var ke = props ? props.kineticEnergy   : undefined,
          pe = props ? props.potentialEnergy : undefined,
          te = ke + pe;
      modelEnergyData[0].push(ke);
      modelEnergyData[1].push(pe);
      modelEnergyData[2].push(te);
      return [ke, pe, te];
    }

    // Reset the resetModelEnergyData arrays to a specific length by passing in an index value,
    // or empty the resetModelEnergyData arrays and initialize the first sample.
    function resetModelEnergyData(index) {
      var i,
          len;

      if (index && modelEnergyData[0].length > index) {
        for (i = 0, len = modelEnergyData.length; i < len; i++) {
          modelEnergyData[i].length = index;
        }
        return index;
      } else {
        modelEnergyData = [[0],[0],[0]];
        return 0;
      }
    }

    // Sets up show/hide listener
    function setupShowHideLHandler() {
      // Setup expansion/visibility listener
      $showModelEnergyGraph.change(function() {
        if (this.checked) {
          addEventListeners();
          $modelEnergyGraphContent.show(100);
        } else {
          removeEventListeners();
          $modelEnergyGraphContent.hide(100);
        }
      }).change();
    }

    // Intitialization
    energyGraphSamplePeriod = 1;
    if (parentPhone) {
      parentPhone.addListener('propertyValue', function(content) {
        if (content.name === 'displayTimePerTick') {
          energyGraphSamplePeriod = content.value;
          renderModelEnergyGraph();
          setupShowHideLHandler();
        }
      });
      parentPhone.post('get', 'displayTimePerTick');
    } else {
      renderModelEnergyGraph();
    }
  }
}());
