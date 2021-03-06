/*globals Viva, recenterDOM, resetAllNodes, storeRecenterDom,
 buildCircleNodeShader, requestPlasmidTable, WebglCircle, selector,
  hideAllOtherPlots, toggleManager, repetitivePlotFunction,
   resRepetitivePlotFunction, pfRepetitivePlotFunction,
    virRepetitivePlotFunction, statsParser, nodeColorReset,
     resetDisplayTaxaBox, showDiv, pfSubmitFunction, layoutGet,
      centerToggleQuery, toggleOnSearch, singleDropdownPopulate,
       filterDisplayer, slider, resSubmitFunction, virSubmitFunction,
        defaultZooming, removeFirstCharFromArray, colorList, resetLinkColor,
         readColoring, handleFileSelect, downloadSeqByColor,
          downloadSeq, setupPopupDisplay, multiDownload, heatmapMaker,
           colorNodes, abortRead, makeTable, arrayToCsv, resGetter,
            plasmidFamilyGetter, virulenceGetter, linkColoring,
             slideToRight, slideToLeft, Mousetrap, initCallback,
              taxaRequest, pushToMasterReadArray, getArrayMapping,
               getArrayMash, colorLegendFunction, noUiSlider, actualRemoval,
                getArrayAssembly, startMultiSelect, requesterDB,
                 addAllNodes, addAllLinks, quickFixString, fileChecks*/

/**
* A bunch of global functions to be used throughout patlas
*/

// if this is a developer session please enable the below line of code
const devel = false

// boolean that controls the prerender function if rerun
// is activated
// let rerun = false

// helps set menu to close status
let firstClickMenu = true

// checks if vivagraph should load first initial dataset or the filters
let firstInstace = true
// variable to check if page was reloaded
let pageReload = false
// variable to check if page was rerun for pffamilies and resistance
// filtering to work properly
let pageReRun = false

// starts a global instance for checking if button was clicked before
let clickedPopupButtonRes = false
let clickedPopupButtonCard = false
let clickedPopupButtonFamily = false
let clickedPopupButtonVir = false

// variable to control stats displayer
let areaSelection = false


const getArray = (devel === true) ? $.getJSON("/test") : $.getJSON("/fullDS")
// an array to store bootstrap table related list for downloads and coloring
// nodes on submit
let bootstrapTableList = []
// dictionary to store all the connections between species and other taxa
// level available. This needs to be stored here because there is no reason
// to execute the getArrayTaxa twice.
const dictGenera = {}
// buttonSubmit current node
let currentQueryNode = false

let masterReadArray = []

let readFilejson = false
let mashJson = false
let assemblyJson = false

let readIndex = 0

let clickedHighchart

let graphSize

let toggleRatioStatus = false

let totalNumberOfLinks

let multiSelectOverlayObj

let legendInst

// object that lets collect plot data and that enable to click on bars and
// retrieve selected nodes in vivagraph
let associativeObj = {}

// globals to control plot instances
let clickerButton, listPlots

let requestDBList

/**
 * load JSON file with taxa dictionary
 * @returns {Object} - return is an object that perform matches between taxa
 * levels species, genera, families and orders.
 */
const getArrayTaxa = () => {
  return $.getJSON("/taxa")
}

/**
 * load JSON file with resistance dictionary
 * @returns {Object} - returns an object that allows resistance menus to be
 * populated
 */
const getArrayRes = () => {
  return $.getJSON("/resistance")
}

/**
 * load JSON file with plasmidfinder dictionary
 * @returns {Object} - returns an object that allows plasmidfinder menus
 * to be populated
 */
const getArrayPf = () => {
  return $.getJSON("/plasmidfinder")
}

/**
 * load JSON file with virulence dictionary
 * @returns {Object} - returns an object that allows virulence menus
 * to be populated
 */
const getArrayVir = () => {
  return $.getJSON("/virulence")
}

// list used to store for re-run button (apply filters)
let listGiFilter = []
let reloadAccessionList = []

// variable to store previous list of accessions that iterate through table
// is the same or not
let previousTableList = []

let sliderMinMax = [] // initiates an array for min and max slider entries
// and stores it for reloading instances of onload()
let listGi = []
// define render on the scope of onload in order to be used by buttons
// outside renderGraph
let renderer

// variable used to control if div is shown or not
let multiSelectOverlay = false
// store the node with more links
let storeMasterNode = []    //cleared every instance of onload
// start array that controls taxa filters
const idsArrays = ["p_Order", "p_Family", "p_Genus", "p_Species"]

let counter = -1 //sets a counter for the loop between the inputs nodes
// Sets parameters to be passed to WebglCircle in order to change
// node shape, setting color and size.
const nodeColor = 0x666370 // hex rrggbb
const minNodeSize = 4 // a value that assures that the node is
// displayed without increasing the size of big nodes too much

let list = []   // list to store references already ploted as nodes
// links between accession numbers
let listLengths = [] // list to store the lengths of all nodes

/**
 * forces welcomeModal to be the first thing the user sees when the page
 * is loaded.
 * @param {function} callback - uses onLoad function as callback in order to
 * allow for welcomeModal to be displayer before rendering everything else with
 * a delay of 1 sec.
 */
const onLoadWelcome = (callback) => {
  // forces welcomeModal to be the first thing the user sees when the page
  // is loaded
  $("#welcomeModal").modal("show")
  //then onLoad is run as a callback
  // for modal to show before page potential page freeze I made it wait half
  // a second before starting the load
  setTimeout( () => {
    callback()
  }, 1000)
}

/**
 * initiates vivagraph main functions
 * onLoad consists of mainly three functions: init, precompute and renderGraph
 * This function is executed after onLoadWelcome function
 */
const onLoad = () => {
  // variable to freeze shift
  let freezeShift = true
  // initiate vivagraph instance
  const g = Viva.Graph.graph()
  // define layout
  const layout = Viva.Graph.Layout.forceDirected(g, {
    springLength: 100,
    springCoeff: 0.0001,
    dragCoeff: 0.001, // sets how fast nodes will separate from origin,
    // the higher the value the slower
    gravity: -10,
    theta: 1,
    // This is the main part of this example. We are telling force directed
    // layout, that we want to change length of each physical spring
    // by overriding `springTransform` method:
    springTransform(link, spring) {
      spring.length = 100 * Math.log10(1 - link.data.distance) + 100
    }
  })

  const graphics = Viva.Graph.View.webglGraphics()

  //* Starts graphics renderer *//
  const renderGraph = (graphics) => {
    //const graphics = Viva.Graph.View.webglGraphics()
    //** block #1 for node customization **//
    // first, tell webgl graphics we want to use custom shader
    // to render nodes:
    const circleNode = buildCircleNodeShader()
    graphics.setNodeProgram(circleNode)
    // second, change the node ui model, which can be understood
    // by the custom shader:
    graphics.node( (node) => {
      let nodeSize = minNodeSize * node.data.logLength
      return new WebglCircle(nodeSize, nodeColor)
    })

    //* * END block #1 for node customization **//
    // rerun precomputes 500
    const prerender = (devel === true) ? 500 :
        parseInt(Math.log(listGiFilter.length)) * 50//prerender depending on the size of the listGiFilter

    renderer = Viva.Graph.View.renderer(g, {
      layout,
      graphics,
      container: document.getElementById("couve-flor"),
      prerender,
      preserveDrawingBuffer: true
    })

    renderer.run()
    // by default the animation on forces is paused since it may be
    // computational intensive for old computers
    renderer.pause()
    //* * Loading Screen goes off **//
    $("#loading").hide()
    $("#couve-flor").css("visibility", "visible")

    /*******************/
    /* MULTI-SELECTION */
    /*******************/

    $("#refreshButton").unbind("click").bind("click", () => {
      if (freezeShift === false) {
        freezeShift = true
        multiSelectOverlayObj.destroy()
        $("#refreshButton").removeClass("btn-success").addClass("btn-default")
      } else {
        freezeShift = false
        $("#refreshButton").removeClass("btn-default").addClass("btn-success")
      }
    })

    // event for shift key down
    // shows overlay div and exectures startMultiSelect
    document.addEventListener("keydown", (e) => {
      if (e.which === 16 && multiSelectOverlay === false && freezeShift === false) { // shift key
        // should close popup open so it doesn't get into listGiFilter
        $("#closePop").click()
        $(".graph-overlay").show()
        multiSelectOverlay = true
        multiSelectOverlayObj = startMultiSelect(g, renderer, layout)
        $("#Re_run, #go_back, #download_ds, #tableShow, #heatmapButtonTab," +
          " #plotButton").show()
        areaSelection = true
        listGiFilter = [] //if selection is made listGiFilter should be empty
        previousTableList = []
        // transform selector object that handles plots and hide their
        // respective divs
        Object.keys(selector).map( (el) => { selector[el].state = false })
        hideAllOtherPlots()
        resetAllNodes(graphics, g, nodeColor, renderer, idsArrays)
        // also reset file handlers that interfere with Re_run
        readFilejson = false
        assemblyJson = false
      }
    })
    // event for shift key up
    // destroys overlay div and transformes multiSelectOverlay to false
    document.addEventListener("keyup", (e) => {
      if (e.which === 16 && multiSelectOverlay !== "disable") {
        $(".graph-overlay").hide()
        $("#colorLegend").hide()
        if (multiSelectOverlay !== false) {
          multiSelectOverlayObj.destroy()
        }
        multiSelectOverlay = false
      }
    })

    defaultZooming(layout, renderer)

    // used to center on the node with more links
    // this is used to skip if it is a re-run button execution
    if (storeMasterNode.length > 0) {
      recenterDOM(renderer, layout, storeMasterNode)
    }

    //* ************//
    //* **ZOOMING***//
    //* ************//

    // opens events in webgl such as mouse hoverings or clicks

    $("#zoom_in").unbind("click").bind("click", (event) => {
      event.preventDefault()
      renderer.zoomIn()
      renderer.rerender()   // rerender after zoom avoids glitch with
      // duplicated nodes
    })
    $("#zoom_out").unbind("click").bind("click", (event) => {
      event.preventDefault()
      renderer.zoomOut()
      renderer.rerender()   // rerender after zoom avoids glitch with
      // duplicated nodes
    })

    //* *************//
    //* ** TOGGLE ***//
    //* *************//
    //* * This section controls the connection between the toggle button on the leftside ***//
    //* * and the dropdown on the right side **//

    let toggleStatus = false // default state
    // $("#toggle-event").bootstrapToggle("off") // set to default off
    $("#toggle-event").change(function () {   // jquery seems not to support es6
      toggleStatus = $(this).prop("checked")
      toggleManager(toggleStatus)
    })

    //* *************//
    //* ** EVENTS ***//
    //* *************//

    const events = Viva.Graph.webglInputEvents(graphics, g)

    //* * mouse click on nodes **//
    events.click( (node, e) => {
      pageReRun = false
      $("#resTab").removeClass("active")
      $("#resButton").removeClass("active")
      $("#pfTab").removeClass("active")
      $("#plasmidButton").removeClass("active")
      $("#virButton").removeClass("active")
      $("#virTab").removeClass("active")
      // this resets previous selected node to previous color
      if (currentQueryNode) {
        graphics.getNodeUI(currentQueryNode).color = graphics.getNodeUI(currentQueryNode).backupColor
      }
      // then starts making new changes to the newly geerated node
      currentQueryNode = node.id
      let nodeUI1 = graphics.getNodeUI(node.id)
      const domPos = {
        x: nodeUI1.position.x,
        y: nodeUI1.position.y
      }
      // if statement used to check if backup color is set
      if (nodeUI1.backupColor) { nodeUI1.backupColor = nodeUI1.color }

      nodeUI1.color = 0xFFC300
      renderer.rerender()

      // allows the control of the click appearing and locking

      // And ask graphics to transform it to DOM coordinates:
      graphics.transformGraphToClientCoordinates(domPos)
      domPos.x = (domPos.x + nodeUI1.size) + "px"
      domPos.y = (domPos.y) + "px"

      // this sets the popup internal buttons to allow them to run,
      // otherwise they won't run because its own function returns this
      // variable to false, preventing the popup to expand with its
      // respective functions
      clickedPopupButtonCard = true
      clickedPopupButtonRes = true
      clickedPopupButtonFamily = true
      // requests table for sequences metadata
      requestPlasmidTable(node, setupPopupDisplay)
    })

    //* **************//
    //* ** BUTTONS ***//
    //* **************//
    // $("#closePop").on('click', () => {
    $("#closePop").unbind("click").bind("click", () => { //TODO ISSUE
      $("#resTab").removeClass("active")
      $("#resButton").removeClass("active")
      $("#pfTab").removeClass("active")
      $("#plasmidButton").removeClass("active")
      $("#popup_description").hide()

      if (currentQueryNode !== false) {
        graphics.getNodeUI(currentQueryNode).color = graphics.getNodeUI(currentQueryNode).backupColor
      }
      currentQueryNode = false
      renderer.rerender()
    })

    //**** BUTTONS THAT CONTROL PLOTS ****//

    // Button to open modal for plots
    // all these buttons require that the modalPlot modal opens before
    // executing the function and that is the reason why they wait half a
    // second before executing repetitivePlotFunction's
    $("#plotButton").unbind("click").bind("click", () => {
      $("#modalPlot").modal()
      clickerButton = "species"
      $("#sortGraph, #sortGraphAlp").removeAttr("disabled")
      listGiFilter = (reloadAccessionList.length !== 0) ?
        // reduces listGiFilter to reloadAccessionList
        listGiFilter.filter( (n) => reloadAccessionList.includes(n)) :
        // otherwise maintain listGiFilter untouched
        listGiFilter
      setTimeout( () => {
        listPlots = repetitivePlotFunction(g, graphics, renderer, areaSelection, listGiFilter, clickerButton)
      }, 500)
    })

    $("#genusStats, #speciesStats, #familyStats, #orderStats," +
      " #resistanceStats, #pfamilyStats, #virStats, #clusterStats, " +
      "#lengthStats").unbind("click").bind("click", (event) => {
      // this gets the clicked selector, gets its html, converts it to lower
      // case and trims for white spaces and new line chars
      clickerButton = $(event.target).html().toLowerCase().trim().replace(" ", "")
      if (event.target.id === "lengthStats") {
        $("#sortGraph, #sortGraphAlp").attr("disabled", true)
      } else {
        $("#sortGraph, #sortGraphAlp").attr("disabled", false)
      }
      setTimeout( () => {
        listPlots = repetitivePlotFunction(g, graphics, renderer, areaSelection, listGiFilter, clickerButton)
      }, 500)
    })

    // sort by values
    $("#sortGraph").unbind("click").bind("click", () => {
      const sortVal = true
      selector[clickerButton.replace(" ", "")].state = false
      listPlots = selector[clickerButton.replace(" ", "")].listPlots
      const layoutPlot = layoutGet(clickerButton)
      if (listPlots) { statsParser(g, graphics, renderer, false, listPlots, layoutPlot, clickerButton, false, sortVal, associativeObj) }
    })

    // sort alphabetically
    $("#sortGraphAlp").unbind("click").bind("click", () => {
      const sortAlp = true
      selector[clickerButton.replace(" ", "")].state = false
      listPlots = selector[clickerButton.replace(" ", "")].listPlots
      const layoutPlot = layoutGet(clickerButton)
      if (listPlots) { statsParser(g, graphics, renderer, false, listPlots, layoutPlot, clickerButton, sortAlp, false, associativeObj) }
    })

    // BUTTONS INSIDE PLOT MODAL THAT ALLOW TO SWITCH B/W PLOTS //

    // if buttons inside modalPlot are pressed

    $("#lengthPlot, #speciesPlot, #genusPlot, #familyPlot, #orderPlot, " +
      "#clusterPlot, #resPlot, #pfPlot, #virPlot").unbind("click").bind("click", (event) => {
      // this gets the clicked selector, gets its html, converts it to lower
      // case and trims for white spaces and new line chars
      clickerButton = $(event.target).html().toLowerCase().trim().replace(" ", "")
      if (event.target.id === "lengthPlot") {
        $("#sortGraph, #sortGraphAlp").attr("disabled", true)
      } else {
        $("#sortGraph, #sortGraphAlp").attr("disabled", false)
      }
      listPlots = repetitivePlotFunction(g, graphics, renderer, areaSelection, listGiFilter, clickerButton)
    })

    //**** BUTTONS THAT CONTROL VIVAGRAPH DISPLAY ****//

    // Buttons to control force play/pause using bootstrap navigation bar
    let paused = true
    $("#playpauseButton").unbind("click").bind("click", () => {
      $("#playpauseButton").empty()
      if (paused === true) {
        renderer.resume()
        $("#playpauseButton").append("<span class='glyphicon glyphicon-pause'></span>")
          .removeClass("btn-default").addClass("btn-success")
        paused = false
      } else {
        renderer.pause()
        $("#playpauseButton").append("<span class='glyphicon glyphicon-play'></span>")
          .removeClass("btn-success").addClass("btn-default")
        paused = true
      }
    })

    // Form and button for search box
    $("#submitButton").unbind("click").bind("click", (event) => {
      $("#resTab").removeClass("active")
      $("#resButton").removeClass("active")
      $("#pfTab").removeClass("active")
      $("#plasmidButton").removeClass("active")
      $("#virTab").removeClass("active")
      $("#virButton").removeClass("active")

      event.preventDefault()    // prevents page from reloading
      if (toggleStatus === false) {
        // const query !==)
        const formvalueId = $("#formValueId").val()
        const query = (formvalueId === "") ? clickedHighchart :
          formvalueId.replace(".", "_")

        currentQueryNode = centerToggleQuery(g, graphics, renderer, query,
          currentQueryNode, clickedPopupButtonCard, clickedPopupButtonRes,
          clickedPopupButtonFamily)
      } else {
        // executed for plasmid search
        toggleOnSearch(g, graphics, renderer,
          currentQueryNode, clickedPopupButtonCard, clickedPopupButtonRes,
          clickedPopupButtonFamily)
          // then is here used to parse the results from async/await function
          .then( (result) => {
            currentQueryNode = result
          })
      }
      // this sets the popup internal buttons to allow them to run,
      // otherwise they won't run because its own function returns this
      // variable to false, preventing the popup to expand with its
      // respective functions
      clickedPopupButtonCard = true
      clickedPopupButtonRes = true
      clickedPopupButtonFamily = true
      clickedPopupButtonVir = true
    })
    // Button to clear the selected nodes by form
    $("#clearButton").unbind("click").bind("click", () => {
      document.getElementById("formValueId").value = ""
    })

    //* ******************//
    //* ***plasmidfinder Filters****//
    //* ******************//

    if (firstInstace === true && pageReload === false) {
      getArrayPf().done((json) => {
        // first parse the json input file
        const listPF = []
        // iterate over the file
        $.each(json, (accession, entry) => {
          const geneEntries = entry.gene
          for (let i in geneEntries) {
            if (geneEntries.hasOwnProperty(i)) {
              if (listPF.indexOf(geneEntries[i]) < 0) {
                listPF.push(geneEntries[i])
              }
            }
          }
        })
        // populate the menus
        singleDropdownPopulate("#plasmidFamiliesList", listPF, "PlasmidfinderClass")

        $(".PlasmidfinderClass").on("click", function() {
          // fill panel group displaying current selected taxa filters //
          const stringClass = this.className.slice(0, -5)
          const tempVar = this.firstChild.innerHTML
          // checks if a taxon is already in display
          const divStringClass = "#p_" + stringClass

          filterDisplayer(tempVar, stringClass, divStringClass)
        })
      })
    }

    // setup clear button for plasmidfinder functions
    $("#pfClear").unbind("click").bind("click", (event) => {
      document.getElementById("reset-sliders").click()
      // clear = true;
      event.preventDefault()
      // this needs an array for reusability purposes
      resetDisplayTaxaBox(["p_Plasmidfinder"])

      // resets dropdown selections
      $("#plasmidFamiliesList").selectpicker("deselectAll")

      slider.noUiSlider.set([min, max])
      nodeColorReset(graphics, g, nodeColor, renderer)
      previousTableList = []
      // transform selector object that handles plots and hide their
      // respective divs
      Object.keys(selector).map( (el) => { selector[el].state = false })
      hideAllOtherPlots()
      areaSelection = false
      if ($("#scaleLegend").html() !== "") {
        $("#Re_run, #go_back, #download_ds, #tableShow, #heatmapButtonTab," +
          " #plotButton, #colorLegend").hide()
      } else {
        $("#colorLegendBox").empty()
        $("#taxa_label").hide()
        $("#Re_run, #go_back, #download_ds, #tableShow, #heatmapButtonTab," +
          " #plotButton").hide()
      }
    })

    $("#pfSubmit").unbind("click").bind("click", (event) => {
      event.preventDefault()
      resetDisplayTaxaBox(
        ["p_Resfinder", "p_Card", "p_Virulence", "p_Order", "p_Family", "p_Genus", "p_Species"]
      )
      $("#orderList").selectpicker("deselectAll")
      $("#familyList").selectpicker("deselectAll")
      $("#genusList").selectpicker("deselectAll")
      $("#speciesList").selectpicker("deselectAll")
      $("#resList").selectpicker("deselectAll")
      $("#cardList").selectpicker("deselectAll")
      $("#virList").selectpicker("deselectAll")
      // clears previous selected nodes
      nodeColorReset(graphics, g, nodeColor, renderer)
      previousTableList = []
      // transform selector object that handles plots and hide their
      // respective divs
      Object.keys(selector).map( (el) => { selector[el].state = false })
      hideAllOtherPlots()
      areaSelection = false
      // empties taxa and plasmidfinder legend
      $("#taxa_label").hide()
      $("#colorLegendBox").empty()
      $("#res_label").hide()
      $("#colorLegendBoxRes").empty()
      $("#vir_label").hide()
      $("#colorLegendBoxVir").empty()
      // reset nodes before submitting new colors
      const tempPageReRun = pageReRun
      showDiv().then( () => {
        pfSubmitFunction(g, graphics, renderer, tempPageReRun).then( (results) =>  {
          legendInst = results
          pageReRun = false
          // just show legend if any selection is made at all
          if (legendInst === true) {
            $("#Re_run, #go_back, #download_ds, #tableShow, #heatmapButtonTab," +
              " #plotButton, #colorLegend").show()
          }
          // enables button group again
          $("#toolButtonGroup button").removeAttr("disabled")
          $("#loading").hide()
        })
      })
    })

    //* ******************//
    //* ***Resistance Filters****//
    //* ******************//

    // first parse the json input file
    if (firstInstace === true && pageReload === false) {
      getArrayRes().done((json) => {
        const listCard = [],
          listRes = []
        // iterate over the file
        $.each(json, (accession, entry) => {
          const databaseEntries = entry.database
          const geneEntries = entry.gene
          for (let i in databaseEntries) {
            if (databaseEntries.hasOwnProperty(i)) {
              if (databaseEntries[i] === "card" && listCard.indexOf(geneEntries[i]) < 0) {
                listCard.push(geneEntries[i])
              } else {
                if (listRes.indexOf(geneEntries[i]) < 0) {
                  listRes.push(geneEntries[i])
                }
              }
            }
          }
        })
        // populate the menus
        singleDropdownPopulate("#cardList", listCard, "CardClass")
        singleDropdownPopulate("#resList", listRes, "ResfinderClass")

        const classArray = [".CardClass", ".ResfinderClass"]
        for (let i = 0; i < classArray.length; i++) {
          $(classArray[i]).on("click", function() {
            // fill panel group displaying current selected taxa filters //
            const stringClass = this.className.slice(0, -5)
            const tempVar = this.firstChild.innerHTML

            // checks if a taxon is already in display
            const divStringClass = "#p_" + stringClass

            filterDisplayer(tempVar, stringClass, divStringClass)
          })
        }
      })
    }

    $("#resClear").unbind("click").bind("click", (event) => {
      event.preventDefault()
      document.getElementById("reset-sliders").click()
      resetDisplayTaxaBox(["p_Resfinder", "p_Card"])

      // resets dropdown selections
      $("#cardList").selectpicker("deselectAll")
      $("#resList").selectpicker("deselectAll")

      slider.noUiSlider.set([min, max])
      nodeColorReset(graphics, g, nodeColor, renderer)
      previousTableList = []
      // transform selector object that handles plots and hide their
      // respective divs
      Object.keys(selector).map( (el) => { selector[el].state = false })
      hideAllOtherPlots()
      areaSelection = false
      if ($("#scaleLegend").html() !== "") {
        // showLegend.style.display = "none"
        $("#Re_run, #go_back, #download_ds, #tableShow, #heatmapButtonTab," +
          " #plotButton, #colorLegend").hide()
      } else {
        $("#colorLegendBox").empty()
        document.getElementById("taxa_label").style.display = "none" // hide label
        $("#Re_run, #go_back, #download_ds, #tableShow, #heatmapButtonTab," +
          " #plotButton").hide()
      }
    })
    $("#resSubmit").unbind("click").bind("click", (event) => {
      event.preventDefault()
      resetDisplayTaxaBox(
        ["p_Plasmidfinder", "p_Virulence", "p_Order", "p_Family", "p_Genus", "p_Species"]
      )
      $("#orderList").selectpicker("deselectAll")
      $("#familyList").selectpicker("deselectAll")
      $("#genusList").selectpicker("deselectAll")
      $("#speciesList").selectpicker("deselectAll")
      $("#plasmidFamiliesList").selectpicker("deselectAll")
      $("#virList").selectpicker("deselectAll")

      // clears previously selected nodes
      nodeColorReset(graphics, g, nodeColor, renderer)
      previousTableList = []
      // transform selector object that handles plots and hide their
      // respective divs
      Object.keys(selector).map( (el) => { selector[el].state = false })
      hideAllOtherPlots()
      areaSelection = false
      // empties taxa and plasmidfinder legend
      $("#taxa_label").hide()
      $("#colorLegendBox").empty()
      $("#pf_label").hide()
      $("#colorLegendBoxPf").empty()
      $("#vir_label").hide()
      $("#colorLegendBoxVir").empty()
      // same should be done for taxa filters submit button
      const tempPageReRun = pageReRun
      showDiv().then( () => {
        resSubmitFunction(g, graphics, renderer, tempPageReRun).then( (results) => {
          legendInst = results
          pageReRun = false
          // just show legend if any selection is made at all
          if (legendInst === true) {
            $("#Re_run, #go_back, #download_ds, #tableShow, #heatmapButtonTab," +
              " #plotButton, #colorLegend").show()
          }
          // enables button group again
          $("#toolButtonGroup button").removeAttr("disabled")
          $("#loading").hide()
        })
      })
    })

    //* ******************//
    //* ***Virulence Filters****//
    //* ******************//

    if (firstInstace === true && pageReload === false) {
      getArrayVir().done( (json) => {
        // first parse the json input file
        const listVir = []
        // iterate over the file
        $.each(json, (accession, entry) => {
          const geneEntries = entry.gene
          for (let i in geneEntries) {
            if (geneEntries.hasOwnProperty(i)) {
              if (listVir.indexOf(geneEntries[i]) < 0) {
                listVir.push(geneEntries[i])
              }
            }
          }
        })

        // populate the menus
        singleDropdownPopulate("#virList", listVir, "VirulenceClass")

        $(".VirulenceClass").on("click", function() {
          // fill panel group displaying current selected taxa filters //
          const stringClass = this.className.slice(0, -5)
          const tempVar = this.firstChild.innerHTML
          // checks if a taxon is already in display
          const divStringClass = "#p_" + stringClass

          filterDisplayer(tempVar, stringClass, divStringClass)
        })
      })
    }

    // setup clear button for plasmidfinder functions
    $("#virClear").unbind("click").bind("click", (event) => {
      document.getElementById("reset-sliders").click()
      // clear = true;
      event.preventDefault()
      // this needs an array for reusability purposes
      resetDisplayTaxaBox(["p_Virulence"])

      // resets dropdown selections
      $("#virList").selectpicker("deselectAll")

      slider.noUiSlider.set([min, max])
      nodeColorReset(graphics, g, nodeColor, renderer)
      previousTableList = []
      // transform selector object that handles plots and hide their
      // respective divs
      Object.keys(selector).map( (el) => { selector[el].state = false })
      hideAllOtherPlots()
      areaSelection = false
      if ($("#scaleLegend").html() !== "") {
        $("#Re_run, #go_back, #download_ds, #tableShow, #heatmapButtonTab," +
          " #plotButton, #colorLegend").hide()
      } else {
        $("#colorLegendBox").empty()
        document.getElementById("taxa_label").style.display = "none" // hide label
        $("#Re_run, #go_back, #download_ds, #tableShow, #heatmapButtonTab," +
          " #plotButton").hide()
      }
    })

    $("#virSubmit").unbind("click").bind("click", (event) => {
      event.preventDefault()
      resetDisplayTaxaBox(
        ["p_Resfinder", "p_Card", "p_Plasmidfinder", "p_Order", "p_Family", "p_Genus", "p_Species"]
      )
      $("#orderList").selectpicker("deselectAll")
      $("#familyList").selectpicker("deselectAll")
      $("#genusList").selectpicker("deselectAll")
      $("#speciesList").selectpicker("deselectAll")
      $("#resList").selectpicker("deselectAll")
      $("#cardList").selectpicker("deselectAll")
      $("#plasmidFamiliesList").selectpicker("deselectAll")
      // clears previous selected nodes
      nodeColorReset(graphics, g, nodeColor, renderer)
      previousTableList = []
      // transform selector object that handles plots and hide their
      // respective divs
      Object.keys(selector).map( (el) => { selector[el].state = false })
      hideAllOtherPlots()
      areaSelection = false
      // empties taxa and plasmidfinder legend
      $("#taxa_label").hide()
      $("#colorLegendBox").empty()
      $("#res_label").hide()
      $("#colorLegendBoxRes").empty()
      $("#pf_label").hide()
      $("#colorLegendBoxPf").empty()
      // reset nodes before submitting new colors
      const tempPageReRun = pageReRun
      showDiv().then( () => {
        virSubmitFunction(g, graphics, renderer, tempPageReRun).then( (results) =>  {
          legendInst = results
          pageReRun = false
          // just show legend if any selection is made at all
          if (legendInst === true) {
            // showLegend.style.display = "block"
            $("#Re_run, #go_back, #download_ds, #tableShow, #heatmapButtonTab," +
              " #plotButton, #colorLegend").show()
          }
          // enables button group again
          $("#toolButtonGroup button").removeAttr("disabled")
          $("#loading").hide()
        })
      })
    })


    //* ******************//
    //* ***Taxa Filter****//
    //* ******************//

    const listOrders = [],
      listFamilies = [],
      listGenera = [],
      listSpecies = []
    if (firstInstace === true && pageReload === false) {
      getArrayTaxa().done((json) => {
        $.each(json, (sps, other) => {    // sps aka species
          const species = sps.split("_").join(" ")
          const genus = other[0]
          const family = other[1]
          const order = other[2]
          dictGenera[species] = [genus, family, order] // append the list to
          // this dict to be used later
          if (listGenera.indexOf(genus) < 0) {
            listGenera.push(genus)
          }
          if (listFamilies.indexOf(family) < 0) {
            listFamilies.push(family)
          }
          if (listOrders.indexOf(order) < 0) {
            listOrders.push(order)
          }
          if (listSpecies.indexOf(species) < 0) {
            listSpecies.push(species)
          }
        })

        // populate the menus
        singleDropdownPopulate("#orderList", listOrders, "OrderClass")
        singleDropdownPopulate("#familyList", listFamilies, "FamilyClass")
        singleDropdownPopulate("#genusList", listGenera, "GenusClass")
        singleDropdownPopulate("#speciesList", listSpecies, "SpeciesClass")

        // clickable <li> and control of displayer of current filters
        const classArray = [".OrderClass", ".FamilyClass", ".GenusClass", ".SpeciesClass"]
        for (let i = 0; i < classArray.length; i++) {
          $(classArray[i]).on("click", function() {
            // fill panel group displaying current selected taxa filters //
            const stringClass = this.className.slice(0, -5)
            const tempVar = this.firstChild.innerHTML

            // checks if a taxon is already in display
            const divStringClass = "#p_" + stringClass

            filterDisplayer(tempVar, stringClass, divStringClass)
          })
        }
      })
    }

    //* **** Clear selection button *****//
    // clear = false; //added to control the colors being triggered after clearing
    $("#taxaModalClear").unbind("click").bind("click", (event) => {
      document.getElementById("reset-sliders").click()
      // clear = true;
      event.preventDefault()
      resetDisplayTaxaBox(idsArrays)

      // resets dropdown selections
      $("#orderList").selectpicker("deselectAll")
      $("#familyList").selectpicker("deselectAll")
      $("#genusList").selectpicker("deselectAll")
      $("#speciesList").selectpicker("deselectAll")

      slider.noUiSlider.set([min, max])
      nodeColorReset(graphics, g, nodeColor, renderer)
      previousTableList = []
      // transform selector object that handles plots and hide their
      // respective divs
      Object.keys(selector).map( (el) => { selector[el].state = false })
      hideAllOtherPlots()
      areaSelection = false
      if ($("#scaleLegend").html() !== "") {
        // showLegend.style.display = "none"
        $("#Re_run, #go_back, #download_ds, #tableShow, #heatmapButtonTab," +
          " #plotButton, #colorLegend").hide()
      } else {
        $("#colorLegendBox").empty()
        document.getElementById("taxa_label").style.display = "none" // hide label
        $("#Re_run, #go_back, #download_ds, #tableShow, #heatmapButtonTab," +
          " #plotButton").hide()
      }
    })

    //* **** Submit button for taxa filter *****//

    // perform actions when submit button is clicked.

    $("#taxaModalSubmit").unbind("click").bind("click", (event) => {
      pageReRun = false
      // clear legend from reads
      $("#readString").empty()
      $("#readLegend").empty()
      $("#read_label").hide()
      event.preventDefault()
      resetDisplayTaxaBox(["p_PlasmidFinder", "p_Resfinder", "p_Card", "p_Virulence"])
      $("#plasmidFamiliesList").selectpicker("deselectAll")
      $("#resList").selectpicker("deselectAll")
      $("#cardList").selectpicker("deselectAll")
      $("#virList").selectpicker("deselectAll")
      // changed nodes is reset every instance of taxaModalSubmit button
      listGiFilter = []   // makes listGiFilter an empty array
      // now processes the current selection
      const speciesQuery = document.getElementById("p_Species").innerHTML,
        genusQuery = document.getElementById("p_Genus").innerHTML,
        familyQuery = document.getElementById("p_Family").innerHTML,
        orderQuery = document.getElementById("p_Order").innerHTML
      let selectedSpecies = speciesQuery.replace("Species:", "").split(",").filter(Boolean),
        selectedGenus = genusQuery.replace("Genus:", "").split(",").filter(Boolean),
        selectedFamily = familyQuery.replace("Family:", "").split(",").filter(Boolean),
        selectedOrder = orderQuery.replace("Order:", "").split(",").filter(Boolean)
      // remove first char from selected* arrays
      selectedSpecies = removeFirstCharFromArray(selectedSpecies)
      selectedGenus = removeFirstCharFromArray(selectedGenus)
      selectedFamily = removeFirstCharFromArray(selectedFamily)
      selectedOrder = removeFirstCharFromArray(selectedOrder)

      //* *** Alert for taxa filter ****//
      // print alert if no filters are selected
      let counter = 0 // counts the number of taxa type that has not been
      // selected

      const alertArrays = {
        "order": selectedOrder,
        "family": selectedFamily,
        "genus": selectedGenus,
        "species": selectedSpecies
      }

      const divAlert = document.getElementById("alertId")
      let Alert = false
      for (const i in alertArrays) {
        if (alertArrays.hasOwnProperty(i)) {
          if (alertArrays[i].length > 0) {
            counter = counter + 1
            Alert = false
          } else if (alertArrays.order.length === 0 &&
            alertArrays.family.length === 0 &&
            alertArrays.genus.length === 0 &&
            alertArrays.species.length === 0) {
            Alert = true
          }
        }
      }
      if (Alert === true) {
        divAlert.style.display = "block"
        $("#colorLegend").hide()
        // warning is raised
        Alert = false
      }

      // auto hide after 5 seconds without closing the div
      window.setTimeout( () => { $("#alertId").hide() }, 5000)

      //* *** End Alert for taxa filter ****//

      let assocFamilyGenus = {}
      let assocOrderGenus = {}
      let assocGenus = {}

      // appends genus to selectedGenus according with the family and order for single-color selection
      // also appends to associative arrays for family and order for multi-color selection
      $.each(dictGenera, (species, pair) => {
        const genus = pair[0]
        const family = pair[1]
        const order = pair[2]
        if (selectedFamily.indexOf(family) >= 0) {
          selectedGenus.push(species)
          if (!(family in assocFamilyGenus)) {
            assocFamilyGenus[family] = []
            assocFamilyGenus[family].push(species)
          } else {
            assocFamilyGenus[family].push(species)
          }
        } else if (selectedOrder.indexOf(order) >= 0) {
          selectedGenus.push(species)
          if (!(order in assocOrderGenus)) {
            assocOrderGenus[order] = []
            assocOrderGenus[order].push(species)
          } else {
            assocOrderGenus[order].push(species)
          }
        } else if (selectedGenus.indexOf(genus) >= 0) {
          if (!(genus in assocGenus)) {
            assocGenus[genus] = []
            assocGenus[genus].push(species)
          } else {
            assocGenus[genus].push(species)
          }
        }
      })

      // renders the graph for the desired taxon if more than one taxon type is selected
      let storeLis = "" // a variable to store all <li> generated for legend
      let firstIteration = true // boolean to control the upper taxa level
      // (order or family)

      // first restores all nodes to default color
      nodeColorReset(graphics, g, nodeColor, renderer)
      previousTableList = []
      // transform selector object that handles plots and hide their
      // respective divs
      Object.keys(selector).map( (el) => { selector[el].state = false })
      hideAllOtherPlots()
      areaSelection = false
      // empties taxa and plasmidfinder legend
      $("#res_label").hide()
      $("#colorLegendBoxRes").empty()
      $("#pf_label").hide()
      $("#colorLegendBoxPf").empty()
      $("#vir_label").hide()
      $("#colorLegendBoxVir").empty()

      // if multiple selections are made in different taxa levels
      if (counter > 1 && counter <= 4) {
        const styleColor = "background-color:" + colorList[2]
        storeLis = storeLis + "<li" +
          " class='centeredList'><button class='jscolor btn" +
          " btn-default' style=" + styleColor + "></button>&nbsp;multi taxa" +
          " selection</li>"
        showDiv().then( () => {
          const promises = []
          const currentColor = 0xf71735   // sets color of all changes_nodes to
          // be red
          storeLis = "<li class='centeredList'><button class='jscolor btn btn-default'" +
            " style='background-color:#f71735'></button>&nbsp;multi-level" +
            " selected taxa</li>"
          let currentSelectionOrder = alertArrays.order
          for (const i in currentSelectionOrder) {
            if (currentSelectionOrder.hasOwnProperty(i)) {
              const tempArray = assocOrderGenus[currentSelectionOrder[i]]
              for (const sp in tempArray) {
                if ({}.hasOwnProperty.call(tempArray, sp)) {
                  promises.push(
                    taxaRequest(g, graphics, renderer, tempArray[sp], currentColor)
                  )
                }
              }
            }
          }
          let currentSelectionFamily = alertArrays.family
          for (const i in currentSelectionFamily) {
            if (currentSelectionFamily.hasOwnProperty(i)) {
              const tempArray = assocFamilyGenus[currentSelectionFamily[i]]
              for (const sp in tempArray) {
                if (tempArray.hasOwnProperty(sp)) {
                  promises.push(
                    taxaRequest(g, graphics, renderer, tempArray[sp], currentColor)
                  )
                }
              }
            }
          }
          let currentSelectionGenus = alertArrays.genus
          for (const i in currentSelectionGenus) {
            if (currentSelectionGenus.hasOwnProperty(i)) {
              const tempArray = assocGenus[currentSelectionGenus[i]]
              for (const sp in tempArray) {
                if (tempArray.hasOwnProperty(sp)) {
                  promises.push(
                    taxaRequest(g, graphics, renderer, tempArray[sp], currentColor)
                  )
                }
              }
            }
          }
          let currentSelectionSpecies = alertArrays.species
          for (const i in currentSelectionSpecies) {
            if (currentSelectionSpecies.hasOwnProperty(i)) {
              promises.push(
                taxaRequest(g, graphics, renderer, currentSelectionSpecies[i], currentColor)
              )
            }
          }
          Promise.all(promises)
            .then( () => {
              $("#loading").hide()
              $("#colorLegend").show()
              document.getElementById("taxa_label").style.display = "block" // show label
              $("#colorLegendBox").empty()
                .append(storeLis +
                  "<li class='centeredList'><button class='jscolor btn btn-default'" +
                  "style='background-color:#666370' ></button>&nbsp;unselected</li>")
              $("#Re_run, #go_back, #download_ds, #tableShow, #heatmapButtonTab," +
                " #plotButton").show()
              // enables button group again
              $("#toolButtonGroup button").removeAttr("disabled")
            })
        })
      }
      // renders the graph for the desired taxon if one taxon type is selected
      // allows for different colors between taxa of the same level
      else if (counter === 1) {
        let currentSelection
        // first cycle between all the arrays to find which one is not empty
        for (const array in alertArrays) {
          // selects the not empty array
          if (alertArrays[array].length !== 0 && firstIteration === true) {
            currentSelection = alertArrays[array]
            // performs the actual interaction for color picking and assigning
            showDiv().then( () => {
              const promises = []
              for (const i in currentSelection) {
                // orders //
                if (currentSelection.hasOwnProperty(i)) {
                  if (alertArrays.order.length !== 0) {
                    const currentColor = colorList[i].replace("#", "0x")
                    const tempArray = assocOrderGenus[currentSelection[i]]
                    const styleColor = "background-color:" + colorList[i]
                    storeLis = storeLis + "<li" +
                      " class='centeredList'><button class='jscolor btn" +
                      " btn-default' style=" + styleColor + "></button>&nbsp;" +
                      currentSelection[i] + "</li>"
                    // executres node function for family and orders
                    for (const sp in tempArray) {
                      if (tempArray.hasOwnProperty(sp)) {
                        promises.push(
                          taxaRequest(g, graphics, renderer, tempArray[sp], currentColor)
                        )
                      }
                    }
                  }

                  // families //
                  else if (alertArrays.family.length !== 0) {
                    const currentColor = colorList[i].replace("#", "0x")
                    const tempArray = assocFamilyGenus[currentSelection[i]]
                    const styleColor = "background-color:" + colorList[i]
                    storeLis = storeLis + "<li" +
                      " class='centeredList'><button class='jscolor btn" +
                      " btn-default' style=" + styleColor +
                      "></button>&nbsp;" + currentSelection[i] + "</li>"
                    // executres node function for family
                    for (const sp in tempArray) {
                      if (tempArray.hasOwnProperty(sp)) {
                        promises.push(
                          taxaRequest(g, graphics, renderer, tempArray[sp], currentColor)
                        )
                      }
                    }
                  }

                  // genus //
                  else if (alertArrays.genus.length !== 0) {
                    const currentColor = colorList[i].replace("#", "0x")
                    const tempArray = assocGenus[currentSelection[i]]
                    const styleColor = "background-color:" + colorList[i]
                    storeLis = storeLis + "<li class='centeredList'><button" +
                      " class='jscolor btn btn-default' style=" +
                      styleColor + "></button>&nbsp;" + currentSelection[i] +
                      "</li>"

                    // requests taxa associated accession from db and colors
                    // respective nodes
                    for (const sp in tempArray) {
                      if (tempArray.hasOwnProperty(sp)) {
                        promises.push(
                          taxaRequest(g, graphics, renderer, tempArray[sp], currentColor)
                        )
                      }
                    }
                  }

                  // species //
                  else if (alertArrays.species.length !== 0) {
                    const currentColor = colorList[i].replace("#", "0x")
                    const styleColor = "background-color:" + colorList[i]
                    storeLis = storeLis + "<li class='centeredList'><button" +
                      " class='jscolor btn btn-default' style=" +
                      styleColor + "></button>&nbsp;" + currentSelection[i] +
                      "</li>"

                    // requests taxa associated accession from db and colors
                    // respective nodes
                    promises.push(
                      taxaRequest(g, graphics, renderer, currentSelection[i], currentColor)
                    )
                  }
                }
              }
              Promise.all(promises)
                .then( () => {
                  $("#loading").hide()
                  // showLegend.style.display = "block"
                  $("#colorLegend").show()
                  document.getElementById("taxa_label").style.display = "block" // show label
                  $("#colorLegendBox").empty()
                    .append(storeLis +
                      "<li class='centeredList'><button class='jscolor btn btn-default'" +
                      " style='background-color:#666370' ></button>&nbsp;unselected</li>")
                  $("#Re_run, #go_back, #download_ds, #tableShow, #heatmapButtonTab," +
                    " #plotButton").show()
                  // enables button group again
                  $("#toolButtonGroup button").removeAttr("disabled")
                })
            }) // ends showDiv

            firstIteration = false // stops getting lower levels
          }
        }
      }
    })

    //* ************//
    //* ***READS****//
    //* ************//

    $("#fileSubmit").unbind("click").bind("click", (event) => {
      event.preventDefault()
      if (readFilejson !== false) {
        masterReadArray = []
        assemblyJson = false
        // feeds the first file
        const readString = JSON.parse(Object.values(readFilejson)[0])
        fileChecks(readString)
        $("#fileNameDiv").html(Object.keys(readFilejson)[0])
          .show()
        // readIndex will be used by slider buttons
        //readIndex = 0
        resetAllNodes(graphics, g, nodeColor, renderer, idsArrays)
        previousTableList = []
        // transform selector object that handles plots and hide their
        // respective divs
        Object.keys(selector).map((el) => {
          selector[el].state = false
        })
        hideAllOtherPlots()
        areaSelection = false
        $("#loading").show()
        setTimeout(() => {
          // colors each node for first element of readFilejson
          const outLists = readColoring(g, listGi, graphics, renderer, readString)
          listGi = outLists[0]
          listGiFilter = outLists[1]
          masterReadArray = pushToMasterReadArray(readFilejson)
        }, 100)

        // }
        // used to hide when function is not executed properly
        setTimeout(() => {
          $("#loading").hide()
        }, 100)
        $("#slideRight").prop("disabled", false)
        $("#slideLeft").prop("disabled", false)
      } else {
        // alert user that file may be empty or there is no imported file at all
        fileChecks(readFilejson)
      }
    })

    $("#cancel_infile").unbind("click").bind("click", () => {
      readFilejson = abortRead()
    })

    $("#sampleMapping").unbind("click").bind("click", (event) => {
      event.preventDefault()
      masterReadArray = []
      assemblyJson = false
      // readIndex will be used by slider buttons
      //readIndex = 0
      resetAllNodes(graphics, g, nodeColor, renderer, idsArrays)
      previousTableList = []
      // transform selector object that handles plots and hide their
      // respective divs
      Object.keys(selector).map( (el) => { selector[el].state = false })
      hideAllOtherPlots()
      areaSelection = false
      $("#loading").show()
      setTimeout( () => {
        getArrayMapping().done( (result) => {
          // puts to readFilejson object that may store many files
          readFilejson = {
            // has to be stringifyed to be passed to pushToMasterReadArray
            "mapping_sample1": JSON.stringify(result)
          }
          const outLists = readColoring(g, listGi, graphics, renderer, result)
          listGi = outLists[0]
          listGiFilter = outLists[1]
          masterReadArray = pushToMasterReadArray(readFilejson)
        })
      })
      // used to hide when function is not executed properly
      setTimeout( () => {
        $("#loading").hide()
      }, 100)
    })

    //* ************//
    //* ***MASH****//
    //* ************//

    $("#fileSubmit_mash").unbind("click").bind("click", (event) => {
      event.preventDefault()
      if (mashJson !== false) {
        masterReadArray = []
        assemblyJson = false
        readFilejson = mashJson // converts mashJson into readFilejson to
        const readString = JSON.parse(Object.values(mashJson)[0])
        fileChecks(readString)
        $("#fileNameDiv").html(Object.keys(mashJson)[0])
          .show()
        // readIndex will be used by slider buttons
        //readIndex += 1
        // it and use the same function (readColoring)
        resetAllNodes(graphics, g, nodeColor, renderer, idsArrays)
        previousTableList = []
        // transform selector object that handles plots and hide their
        // respective divs
        Object.keys(selector).map((el) => {
          selector[el].state = false
        })
        hideAllOtherPlots()
        areaSelection = false
        $("#loading").show()
        setTimeout(() => {
          const outputList = readColoring(g, listGi, graphics, renderer, readString)
          listGi = outputList[0]
          listGiFilter = outputList[1]
          masterReadArray = pushToMasterReadArray(readFilejson)
        }, 100)

        // }
        // used to hide when function is not executed properly
        setTimeout(() => {
          $("#loading").hide()
        }, 100)
        $("#slideRight").prop("disabled", false)
        $("#slideLeft").prop("disabled", false)
      } else {
        // alert user that file may be empty or there is no imported file at all
        fileChecks(mashJson)
      }
    })

    $("#cancel_infile_mash").unbind("click").bind("click", () => {
      mashJson = abortRead()
    })

    $("#sampleMash").unbind("click").bind("click", (event) => {
      event.preventDefault()
      masterReadArray = []
      assemblyJson = false
      // readIndex will be used by slider buttons
      //readIndex = 0
      resetAllNodes(graphics, g, nodeColor, renderer, idsArrays)
      previousTableList = []
      // transform selector object that handles plots and hide their
      // respective divs
      Object.keys(selector).map( (el) => { selector[el].state = false })
      hideAllOtherPlots()
      areaSelection = false
      $("#loading").show()
      setTimeout( () => {
        getArrayMash().done( (result) => {
          // puts to readFilejson object that may store many files
          mashJson = {
            // has to be stringifyed to be passed to pushToMasterReadArray
            "mash_sample1": JSON.stringify(result)
          }
          readFilejson = mashJson
          const outLists = readColoring(g, listGi, graphics, renderer, result)
          listGi = outLists[0]
          listGiFilter = outLists[1]
          masterReadArray = pushToMasterReadArray(mashJson)
        })
      })
      // used to hide when function is not executed properly
      setTimeout( () => {
        $("#loading").hide()
      }, 100)
    })

    //* ********* ***//
    //* * Assembly **//
    //* ********* ***//
    $("#assemblySubmit").unbind("click").bind("click", (event) => {
      event.preventDefault()
      if (assemblyJson !== false) {
        const readString = JSON.parse(Object.values(assemblyJson)[0])
        fileChecks(readString)
        $("#fileNameDiv").html(Object.keys(readFilejson)[0])
          .show()
        masterReadArray = []
        readFilejson = assemblyJson
        resetAllNodes(graphics, g, nodeColor, renderer, idsArrays)
        previousTableList = []
        // transform selector object that handles plots and hide their
        // respective divs
        Object.keys(selector).map( (el) => { selector[el].state = false })
        hideAllOtherPlots()
        areaSelection = false
        $("#loading").show()
        setTimeout(() => {
          const outputList = readColoring(g, listGi, graphics, renderer, readString)
          listGi = outputList[0]
          listGiFilter = outputList[1]
          masterReadArray = pushToMasterReadArray(assemblyJson)
        }, 100)

        $("#slideRight").prop("disabled", false)
        $("#slideLeft").prop("disabled", false)
        // used to hide when function is not executed properly
        setTimeout( () => {
          $("#loading").hide()
        }, 100)
      } else {
        // alert user that file may be empty or there is no imported file at all
        fileChecks(assemblyJson)
      }
    })

    $("#cancel_assembly").unbind("click").bind("click", () => {
      assemblyJson = abortRead()
    })

    $("#sampleAssembly").unbind("click").bind("click", (event) => {
      event.preventDefault()
      masterReadArray = []
      readFilejson = false
      resetAllNodes(graphics, g, nodeColor, renderer, idsArrays)
      previousTableList = []
      // transform selector object that handles plots and hide their
      // respective divs
      Object.keys(selector).map( (el) => { selector[el].state = false })
      hideAllOtherPlots()
      areaSelection = false
      $("#loading").show()
      getArrayAssembly().then( (results) => {
        readFilejson = assemblyJson = results
        const readString = JSON.parse(Object.values(results)[0])
        fileChecks(readString)
        $("#fileNameDiv").html(Object.keys(readFilejson)[0])
          .show()        //listGiFilter = assembly(listGi, results, g, graphics, masterReadArray, listGiFilter)
        const outputList = readColoring(g, listGi, graphics, renderer, readString)
        listGi = outputList[0]
        listGiFilter = outputList[1]
        masterReadArray = pushToMasterReadArray(assemblyJson)
      })

      $("#slideRight").prop("disabled", false)
      $("#slideLeft").prop("disabled", false)
      // used to hide when function is not executed properly
      setTimeout( () => {
        $("#loading").hide()
      }, 100)
    })

    //* *********************//
    //* * Distances filter **//
    //* *********************//
    $("#distancesSubmit").unbind("click").bind("click", (event) => {
      event.preventDefault()
      // $("#loading").show()
      $("#scaleLegend").empty()
      showDiv().then( () => {
        linkColoring(g, graphics, renderer, "distance", toggleRatioStatus)
        // enables button group again
        $("#toolButtonGroup button").removeAttr("disabled")
      })
      const readMode = false
      colorLegendFunction(readMode)
    })

    $("#reset-links").unbind("click").bind("click", (event) => {
      event.preventDefault()
      const arrayOfDivs = [
        $("#colorLegendBox").html(),
        $("#colorLegendBoxRes").html(),
        $("#colorLegendBoxPf").html(),
        $("#readLegend").html(),
        $("#assemblyLegend").html(),

      ]
      let divCounter = 0
      for (const div of arrayOfDivs) {
        if (div === "") {
          divCounter += 1
          if (divCounter === 5) {
            $("#colorLegend").hide()
          }
        }
      }
      $("#scaleLegend").empty()
      $("#scaleString").empty()
      $("#distance_label").hide()
      setTimeout(function () {
        resetLinkColor(g, graphics, renderer)
      }, 100)
    })

    //* ********************//
    //* ***Length filter****//
    //* ********************//

    //* * slider button and other options **//

    // sets the limits of buttons and slider
    // this is only triggered on first instance because we only want to get
    // the limits of all plasmids once
    if (sliderMinMax.length === 0) {
      sliderMinMax = [Math.log(Math.min.apply(null, listLengths)),
        Math.log(Math.max.apply(null, listLengths))]
      // generates and costumizes slider itself
      const slider = document.getElementById("slider")

      noUiSlider.create(slider, {
        start: sliderMinMax,  //this is an array
        behaviour: "snap",   // snaps the closest slider
        connect: true,
        range: {
          "min": sliderMinMax[0],
          "max": sliderMinMax[1]
        }
      })
    }

    // event handler for slider
    // trigger only if clicked to avoid looping through the nodes again
    $("#length_filter").unbind("click").bind("click", () => {
      slider.noUiSlider.on("set", function() {
        let sliderMax = Math.exp(slider.noUiSlider.get()[1]),
          sliderMin = Math.exp(slider.noUiSlider.get()[0])
        g.forEachNode( (node) => {
          // check if node is not a singleton
          // singletons for now do not have size set so they cannot be
          // filtered with this method
          // only changes nodes for nodes with seqLength data
          if (node.data.seqLength) {
            const nodeLength = node.data.seqLength.split(">").slice(-1).toString()
            let nodeUI = graphics.getNodeUI(node.id)
            if (parseInt(nodeLength) < parseInt(sliderMin) || parseInt(nodeLength) > parseInt(sliderMax)) {
              nodeUI.color = 0xcdc8b1 // shades nodes
            } else if (parseInt(nodeLength) >= parseInt(sliderMin) || parseInt(nodeLength) <= parseInt(sliderMax)) {
              nodeUI.color = nodeUI.backupColor // return nodes to original color
            }
          }
        })
        renderer.rerender()
      })
    })

    // inputs mins and maxs for slider
    const inputMin = document.getElementById("slider_input_min"),
      inputMax = document.getElementById("slider_input_max"),
      inputs = [inputMin, inputMax]
    slider.noUiSlider.on("update", function (values, handle) {
      inputs[handle].value = Math.trunc(Math.exp(values[handle]))
    })

    // resets the slider
    $("#reset-sliders").unbind("click").bind("click", () => {
      listGiFilter = [] //resets listGiFilter
      previousTableList = []
      // transform selector object that handles plots and hide their
      // respective divs
      Object.keys(selector).map( (el) => { selector[el].state = false })
      hideAllOtherPlots()
      areaSelection = false
      readFilejson = false // makes file selection empty again
      assemblyJson = false
      mashJson = false
      currentQueryNode = false
      slider.noUiSlider.set(sliderMinMax)
      resetAllNodes(graphics, g, nodeColor, renderer, idsArrays)
      previousTableList = []
      // transform selector object that handles plots and hide their
      // respective divs
      Object.keys(selector).map( (el) => { selector[el].state = false })
      hideAllOtherPlots()
    })
    // runs the re run operation for the selected species
    $("#Re_run").unbind("click").bind("click", () => {
      // resets areaSelection
      areaSelection = false
      firstInstace = false
      // rerun = true
      reloadAccessionList = []  // needs to be killed every instance in
      // order for reload to allow reloading again
      //* * Loading Screen goes on **//
      showDiv().then( () => {
        // removes nodes
        setTimeout( () => {
          actualRemoval(g, graphics, onLoad, false)
          freezeShift = true
          // enables button group again
          $("#toolButtonGroup button").removeAttr("disabled")
        }, 100)
      })
    })

    // returns to the initial tree by reloading the page
    $("#go_back").unbind("click").bind("click", () => {
      // window.location.reload()   // a temporary fix to go back to full dataset
      firstInstace = true
      pageReload = true
      list = []
      listGi = []
      listLengths = []
      listGiFilter = []
      showDiv().then( () => {
        // removes nodes and forces adding same nodes
        setTimeout( () => {
          actualRemoval(g, graphics, onLoad, true)
          // enables button group again
          $("#toolButtonGroup button").removeAttr("disabled")
        }, 100)
      })
    })
    // sets a counter for welcome div
    if (($("#welcomeModal").data("bs.modal") || {}).isShown) {
      let logger = 30
      let countDown = setInterval( () => {
        if ($("#counter").html() !== "") {
          logger -= 1
          $("#counter").html(`Closing in: ${logger.toString()}s`)
          if (logger === 0) {
            clearInterval(countDown)
            $("#welcomeModal").modal("hide")
            $("#counter").html("")
          }
        }
      }, 1000)
    }
    // button to cancel cowntdown control
    $("#counterClose").unbind("click").bind("click", () => {
      $("#counter").html("")
      $("#counterClose").hide()
    })

  } // closes renderGraph
  //}) //end of getArray

  const init = () => {
    if (firstInstace === true) {
      // the next if statement is only executed on development session, it
      // is way less efficient than the non development session.
      if (devel === true) {
        getArray.done(function (json) {
          $.each(json, function (sequenceInfo, dictDist) {
            counter++
            // next we need to retrieve each information type independently
            const sequence = sequenceInfo.split("_").slice(0, 3).join("_")

            // and continues
            const seqLength = sequenceInfo.split("_").slice(-1).join("")
            const logLength = Math.log(parseInt(seqLength)) //ln seq length
            listLengths.push(seqLength) // appends all lengths to this list
            listGi.push(sequence)
            //checks if sequence is not in list to prevent adding multiple nodes for each sequence
            if (list.indexOf(sequence) < 0) {
              g.addNode(sequence, {
                sequence: "<span style='color:#468499'>Accession:" +
                " </span><a" +
                " href='https://www.ncbi.nlm.nih.gov/nuccore/" + sequence.split("_").slice(0, 2).join("_") + "' target='_blank'>" + sequence + "</a>",
                //species:"<font color='#468499'>Species:
                // </font>" + species,
                seqLength: "<span" +
                " style='color:#468499'>Sequence length:" +
                " </span>" + seqLength,
                logLength
              })
              list.push(sequence)

              if (dictDist !== null) {
                // loops between all arrays of array pairing sequence and distances
                for (let i = 0; i < dictDist.length; i++) {
                  const reference = Object.keys(dictDist[i])[0]  // stores
                  // references in a unique variable
                  const distance = Object.values(dictDist[i])[0].distance   // stores distances in a unique variable
                  g.addLink(sequence, reference, { distance })
                }
              } else {
                dictDist = []
              }
            }
            // centers on node with more links
            storeMasterNode = storeRecenterDom(storeMasterNode, dictDist, sequence, counter)
          })
          // precompute before rendering
          renderGraph(graphics)
        }) //new getArray end
      } else {
        // this renders the graph when not in development session
        // this is a more efficient implementation which takes a different
        // file for loading the graph.
        getArray.done(function (json) {
          graphSize = json.nodes.length
          // sequentially runs the following functions
          // this in fact runs sequentially
          addAllNodes(g, json.nodes, layout)
          addAllLinks(g, json.links)
          renderGraph(graphics)
        })
      }
    } else {
      // storeMasterNode is empty in here
      if (readFilejson !== false) {
        const readReload = JSON.parse(Object.values(readFilejson)[readIndex])
        $("#fileNameDiv").html(Object.keys(readFilejson)[readIndex])
          .show()
        requestDBList = requesterDB(g, listGiFilter, counter, renderGraph,
          graphics, reloadAccessionList, renderer, listGi, readReload,
          assemblyJson)
      } else {
        // sets pageReRun to true
        pageReRun = true
        $("#fileNameDiv").html(Object.keys(assemblyJson)[readIndex])
          .show()
        // used when no reads are used to filter
        requestDBList = requesterDB(g, listGiFilter, counter, renderGraph,
          graphics, reloadAccessionList, renderer, listGi, false,
          assemblyJson)
      }
      listGiFilter = requestDBList[0] // list with the nodes used to filter
      reloadAccessionList = requestDBList[1] //list stores all nodes present
      // this listGi isn't the same as the initial but has information on
      // all the nodes that were used in filters
      // wait a while before showing the colors
      setTimeout( () => {
        renderer.rerender()
      }, 100)
    }
  }

  //* ***********************************************//
  // control the infile input and related functions //
  //* ***********************************************//

  handleFileSelect("infile", "#file_text", (newReadJson) => {
    readFilejson = newReadJson
    // $("#infile").val("")
  })

  handleFileSelect("mashInfile", "#file_text_mash", (newMashJson) => {
    mashJson = newMashJson
    // $("#mashInfile").val("")
  })

  handleFileSelect("assemblyfile", "#assembly_text", (newAssemblyJson) => {
    assemblyJson = newAssemblyJson
    // $("#assemblyfile").val("")
  })

  //* ****************************** *//
  //      Menu Button controls       //
  //* ****************************** *//

  $("#menu-toggle").on("click", function() {
    if (firstClickMenu === true) {
      $("#menu-toggle").css( {"color": "#fff"} )
      firstClickMenu = false
    } else {
      $("#menu-toggle").css( {"color": "#999999"} )
      firstClickMenu = true
    }
  })

  // download button //
  $("#download_ds").unbind("click").bind("click", () => {
    // for now this is just taking what have been changed by taxa coloring
    if (areaSelection === true) {
      // downloads if area selection is triggered
      downloadSeqByColor(g, graphics)
    } else {
      // downloads when listGiFilter is defined, namely in taxa filters,
      // mapping results
      downloadSeq(listGiFilter, g)
    }
  })

  //*********//
  //* TABLE *//
  //*********//
  // function to add accession to bootstrapTableList in order to use in
  // downloadTable function or in submitTable button
  $("#metadataTable").on("check.bs.table", (e, row) => {
    if (bootstrapTableList.indexOf(row.id) < 0) {
      bootstrapTableList.push(row.id)
    }
  })
  // function to remove accession from bootstrapTableList in order to use in
  // downloadTable function or in submitTable button
    .on("uncheck.bs.table", (e, row) => {
      for (const value in bootstrapTableList) {
        if (bootstrapTableList[value] === row.id) {
          bootstrapTableList.splice(value, 1)
        }
      }
    })
    // function to handle when all are selected
    .on("check-all.bs.table", (e, rows) => {
      for (const row of rows) {
        if (bootstrapTableList.indexOf(row) < 0) {
          bootstrapTableList.push(row.id)
        }
      }
    })
    // function to remove when all are selected
    .on("uncheck-all.bs.table", () => {
      bootstrapTableList = []
    })

  // function to control cell click
    .on("dbl-click-cell.bs.table", (field, value, row, element) => {
      recenterDOM(renderer, layout, [element.id, false])
      requestPlasmidTable(g.getNode(element.id), setupPopupDisplay)
      currentQueryNode = element.id
    })

  // function to download dataset selected in table
  $("#downloadTable").unbind("click").bind("click", () => {
    // transform internal accession numbers to ncbi acceptable accesions
    const acc = bootstrapTableList.map((uniqueAcc) => {
      return uniqueAcc.split("_").splice(0,2).join("_")
    })
    multiDownload(acc, "nuccore", "fasta")
  })

  // function to display heatmap dataset selected in table
  $("#heatmapButtonTab").unbind("click").bind("click", () => {
    $("#heatmapModal").modal()
    // transform internal accession numbers to ncbi acceptable accesions
    if (readFilejson !== false) {
      heatmapMaker(masterReadArray, readFilejson)
      mashJson = false
      assemblyJson = false
    } else if (assemblyJson !== false) {
      heatmapMaker(masterReadArray, assemblyJson)
      readFilejson = false
      mashJson = false
    }
  })
  // button to color selected nodes by check boxes
  $("#tableSubmit").unbind("click").bind("click", () => {
    $("#reset-sliders").click()
    $("#colorLegend").hide()
    // if bootstraTableList contains only one accession then showPopup
    if (bootstrapTableList.length === 1) {
      recenterDOM(renderer, layout, [bootstrapTableList[0], false])
      requestPlasmidTable(g.getNode(bootstrapTableList[0]), setupPopupDisplay)
    }
    showDiv().then( () => {
      colorNodes(g, graphics, renderer, bootstrapTableList, "0xFF7000")

      // handles hidden buttons
      $("#Re_run, #go_back, #download_ds, #tableShow, #heatmapButtonTab," +
        " #plotButton").show()
      // showRerun.style.display = "block"
      // showGoback.style.display = "block"
      // showDownload.style.display = "block"
      // showTable.style.display = "block"
      // heatMap.style.display = "block"
      // plotButton.style.display = "block"
      // sets listGiFilter to the selected nodes
      listGiFilter = bootstrapTableList
      bootstrapTableList = []
      // enables button group again
      $("#toolButtonGroup button").removeAttr("disabled")
      $("#loading").hide()
      renderer.rerender()
    })
  })

  // function to create table
  $("#tableShow").unbind("click").bind("click", () => {
    $("#tableModal").modal()
    showDiv()
      .then( () => {
        previousTableList = makeTable(areaSelection, listGiFilter,
          previousTableList, g, graphics, graphSize)
        // enables button group again
        $("#toolButtonGroup button").removeAttr("disabled")
      })
  })

  // function to close table
  $("#cancelTable").unbind("click").bind("click", () => {
    $("#tableModal").modal("toggle")
  })

  // popup button for download csv
  // this only does single entry exports, for more exports table should be used
  $("#downloadCsv").unbind("click").bind("click", () => {
  // $(document).on("click", "#downloadCsv", () => {

    // execute the same replacement function for all this divs
    const targetArray = quickFixString([
      "#accessionPop",
      "#speciesNamePop",
      "#lengthPop",
      "#plasmidNamePop",
      "#percentagePop",
      "#copyNumberPop",
      "#cardPop",
      "#cardGenePop",
      "#cardGenbankPop",
      "#cardAroPop",
      "#cardCoveragePop",
      "#cardIdPop",
      "#cardRangePop",
      "#resfinderPop",
      "#resfinderGenePop",
      "#resfinderGenbankPop",
      "#resfinderCoveragePop",
      "#resfinderIdPop",
      "#resfinderRangePop",
      "#pfPop",
      "#pfGenePop",
      "#pfGenbankPop",
      "#pfCoveragePop",
      "#pfIdentityPop",
      "#pfRangePop",
      "#clusterIdPop"
    ])
    // then convert the resulting array to a csv file
    arrayToCsv(targetArray)
  })

  const emptyFiles = () => {
    $("#infile").val("")
    $("#mashInfile").val("")
    $("#assemblyfile").val("")
    readFilejson = false
    mashJson = false
    assemblyJson = false
  }

  $("#uploadFile").unbind("click").bind("click", () => {
    emptyFiles()
  })
  $("#uploadFileMash").unbind("click").bind("click", () => {
    emptyFiles()
  })
  $("#uploadFileAssembly").unbind("click").bind("click", () => {
    emptyFiles()
  })

  // resistance button control //
  $("#resButton").unbind("click").bind("click", () => {
    clickedPopupButtonCard = resGetter(currentQueryNode)
  })

  // plasmid finder button control
  $("#plasmidButton").unbind("click").bind("click", () => {
    clickedPopupButtonFamily = plasmidFamilyGetter(currentQueryNode)
  })

  // plasmid finder button control
  $("#virButton").unbind("click").bind("click", () => {
    clickedPopupButtonVir = virulenceGetter(currentQueryNode)
  })

  // control the alertClose button
  $("#alertClose").unbind("click").bind("click", () => {
    $("#alertId").hide()  // hide this div
  })

  $("#alertNoSelectionClose").unbind("click").bind("click", () => {
    $("#alertNoSelection").hide()  // hide this div
  })

  $("#alertClose_search").unbind("click").bind("click", () => {
    $("#alertId_search").hide()  // hide this div
  })

  $("#alertCloseNCBI").unbind("click").bind("click", () => {
    $("#alertNCBI").hide()  // hide this div
  })

  $("#alertCloseAssembly").unbind("click").bind("click", () => {
    $("#alertAssembly").hide()  // hide this div
  })

  $("#alertClose_noFile").unbind("click").bind("click", () => {
    $("#alertId_noFiles").hide()  // hide this div
  })

  $("#alertCloseJsonFile").unbind("click").bind("click", () => {
    $("#alertJsonFile").hide()  // hide this div
  })

  // sets toggle for size ratio and handles status of this toggle
  // this is used in "ratioSubmit" button
  $("#toggleRatio").change(function () {   // jquery seems not to support es6
    toggleRatioStatus = $(this).prop("checked")
  })

  // function that submits the selection made in the modal
  $("#ratioSubmit").unbind("click").bind("click", () => {
    event.preventDefault()
    // clears all links before doing this
    $("#reset-links").click()
    // $("#reset-links").click()
    // $("#loading").show()
    $("#scaleLegend").empty()
    showDiv().then(
      setTimeout( () => {
        linkColoring(g, graphics, renderer, "size", toggleRatioStatus, totalNumberOfLinks)
        // enables button group again
        $("#toolButtonGroup button").removeAttr("disabled")
      }, 100)
    )
    // const readMode = false
    // color_legend(readMode)
  })

  /** control the visualization of multiple files for read mode
  * The default idea is that the first file in this readFilejson object is the
  * one to be loaded when uploading then everything else should use cycler
  */
  $("#slideRight").unbind("click").bind("click", () => {
    resetAllNodes(graphics, g, nodeColor, renderer, idsArrays)
    previousTableList = []
    // transform selector object that handles plots and hide their
    // respective divs
    Object.keys(selector).map( (el) => { selector[el].state = false })
    hideAllOtherPlots()
    areaSelection = false
    const outArray = slideToRight(readFilejson, readIndex, g, listGi, graphics, renderer)
    readIndex = outArray[0]
    listGiFilter = outArray[1][1]
    listGi = outArray[1][0]
  })

  $("#slideLeft").unbind("click").bind("click", () => {
    resetAllNodes(graphics, g, nodeColor, renderer, idsArrays)
    previousTableList = []
    // transform selector object that handles plots and hide their
    // respective divs
    Object.keys(selector).map( (el) => { selector[el].state = false })
    hideAllOtherPlots()
    areaSelection = false
    const outArray = slideToLeft(readFilejson, readIndex, g, listGi, graphics, renderer)
    readIndex = outArray[0]
    listGiFilter = outArray[1][1]
    listGi = outArray[1][0]
  })

  // changes the behavior of tooltip to show only on click
  $("#questionPlots").popover()
  $("#questionTable").popover()
  $("#questionHeatmap").popover()
  $("#questionMap").popover()
  $("#questionRatio").popover()

  $("#infoMap").popover( { container: "body" } )
  $("#infoMash").popover( { container: "body" } )
  $("#infoAssembly").popover( { container: "body" } )

  // function to avoid shift key to be triggered when any modal is open
  $(".modal").on("shown.bs.modal", () => {
    multiSelectOverlay = "disable"
  })

  /**
  * function to allow shift key to select nodes again, on modal close
  */
    .on("hidden.bs.modal", () => {
      multiSelectOverlay = false
      // this force question buttons to close if tableModal and modalPlot are
      // closed
      $("#questionTable").popover("hide")
      $("#questionHeatmap").popover("hide")
      $("#questionPlots").popover("hide")
      $("#questionMap").popover("hide")
      $("#questionRatio").popover("hide")
      $("#infoMap").popover("hide")
      $("#infoMash").popover("hide")
      $("#infoAssembly").popover("hide")
    })

  // this forces the entire script to run
  init() //forces main json or the filtered objects to run before
  // rendering the graph

  /**
   * function for keyboard shortcut to save file with node positions
   * This is only useful if devel is true and should be disabled by default
   * for users
   */
  Mousetrap.bind("shift+ctrl+space", () => {
    initCallback(g, layout, devel)
  })
} // closes onload
