import superagent from 'superagent';
import superagentJsonapify from 'superagent-jsonapify';
import * as d3 from 'd3'
import jQuery from 'jquery';
import Plotly from 'plotly.js'
import nj from 'numjs';
superagentJsonapify(superagent);

//Link the functions for the html elements
window.set_epoch = set_epoch;
window.set_layer = set_layer;
window.play_pause = play_pause;

//Globals
var DATA; //Used to preload the data
var META; //Stores information about DATA, most importantly tensor dimensions
var isPlaying = false; //For the play button
var epochInterval; //Stores the interval function if currently playing

loadMetadata(); //Initial page loading

/**
 * Grabs meta information from the server and stores it into the global META var,
 * then calls set_layer.
 */
function loadMetadata() {
    jQuery('.loader').show(); //Show loading icon

    //Main http request using the /meta flask route
    d3.json("/meta", function (data) {
        META = data; //Here data is the metadata
        jQuery('.loader').hide(); //Hide loader when request complete
        jQuery('#layer-selection').empty();
        if (META['datasets'] && Object.keys(META['datasets']).length > 0) {

            //Add layers to dropdown menu
            jQuery.each(Object.keys(META['datasets']), function (val, text) {
                jQuery('#layer-selection').append(jQuery('<option></option>').val(text).html(text))
            });

            //Load and render the actual data
            set_layer();
        }
        else {
            jQuery('#layer-selection').append(jQuery('<option></option>').html('No data found in folder!'))
        }
    });
}
/**
 * Loads the actual weight data from the server and stores it in the global var DATA.
 * Use callback function to ensure rendering does not happen before data is loaded completely.
 */
function loadData(layername, callback) {
    if (!layername) return;

    //Grab meta information about selected layer
    let epochs = META['epochs'];
    let layer_shape = META['datasets'][layername]['shape'];

    let layername_url = layername.replace(/\//g, '__');
    jQuery('.loader').show(); //Show loading icon

    //Main http request using the /data/<layername> flask route.
    d3.json("/data/" + layername_url, function (data) {
        jQuery('.loader').hide(); //Hide loading icon once done

        // Load JSON flatten array to numjs
        data = nj.array(data);
        // Define shape
        var shape = [epochs, ...layer_shape]; // shape size is 1+dim_tensor (epochs is the additional dimension)
        shape = shape.filter(function(v) {return v !== 1});  // dimension squeeze
        if (shape.length === 2) shape.push(1); // if 1D, expand dimension to have a 2D matrix
        else if (shape.length > 3) {
            //Support for higher dimensions by selecting three dimensions, one of which will be mapped onto the slider
            var dims = prompt("Please enter dimensions (slider, X, Y)", "0, 1, 2");
            if (!dims) return alert('Only 2D data supported (Found [' + shape + '])');
            var dims_list = dims.split(' ');
            if (dims_list.length !== 3) return alert('Please select 3 dimensions for plotting')
        }
        // Reshape according to metadata and store in global var
        DATA = data.reshape(shape);
        // Set slider
        if (shape[0] > 1) {
           jQuery('#epoch-slider').show().attr({'max': shape[0] - 1});
        }
        else {
            jQuery('#epoch-slider').hide().attr({value: 0}); //Hide slide if not needed
        }
        // Call callback
        if (callback) callback();
    });
}
/**
 * Renders the actual plots using Plotly and the information stored in DATA
 */
function render(epochNr) {

    epochNr = parseInt(epochNr);
    var shape = DATA.shape;
    var epochData = DATA.slice([epochNr, epochNr+1]).reshape(shape.slice(1));
    var max_abs = nj.abs(epochData).max();

    //Calculate statistical information about the data for the horizontal graph
    var statData = calc_stats(epochData.tolist());
    var idxs_x = statData.map(function (t) {return t[0]});
    var mean_x = statData.map(function (t) {return t[1]});
    var mean_x_low = statData.map(function (t) {return t[1] - 0.5 * t[2]});
    var mean_x_up = statData.map(function (t) {return t[1] + 0.5 * t[2]});

    //The same for the vertical graph
    statData = calc_stats(epochData.T.tolist());
    var idxs_y = statData.map(function (t) {return t[0]});
    var mean_y = statData.map(function (t) {return t[1]});
    var mean_y_low = statData.map(function (t) {return t[1] - 0.5 * t[2]});
    var mean_y_up = statData.map(function (t) {return t[1] + 0.5 * t[2]});

    //The main heatmap
    var heatmap = {
        z: epochData.tolist(),
        type: 'heatmap',
        zmin: -max_abs,
        zmax: max_abs
    };

    //Horizontal plot
    //Mean - std
    var plotx_lower = {
        x: idxs_x,
        y: mean_x_low ,
        line: {width: 0},
        marker: {color: "444"},
        mode: "lines",
        type: "scatter",
        name: "Mean - std",
        xaxis: 'x',
        yaxis: 'y2'
    };

    //Mean
    var plotx = {
        x: idxs_x,
        y: mean_x,
        xaxis: 'x',
        yaxis: 'y2',
        fill: "tonexty",
        fillcolor: "rgba(68, 68, 68, 0.3)",
        line: {color: "rgb(31, 119, 180)"},
        mode: "lines",
        name: "Mean",
        type: 'scatter'
    };

    //Mean + std
    var plotx_upper = {
        x: idxs_x,
        y: mean_x_up ,
        fill: "tonexty",
        fillcolor: "rgba(68, 68, 68, 0.3)",
        line: {width: 0},
        marker: {color: "444"},
        mode: "lines",
        type: "scatter",
        name: "Mean + std",
        xaxis: 'x',
        yaxis: 'y2'
    };
    
    //Vertical plot
    //Mean - std
    var ploty_lower = {
        x: mean_y_low,
        y: idxs_y ,
        line: {width: 0},
        marker: {color: "444"},
        mode: "lines",
        type: "scatter",
        name: "Mean - std",
        xaxis: 'x2',
        yaxis: 'y'
    };

    //Mean
    var ploty = {
        x: mean_y,
        y: idxs_y,
        xaxis: 'x2',
        yaxis: 'y',
        fill: "tonexty",
        fillcolor: "rgba(68, 68, 68, 0.3)",
        line: {color: "rgb(31, 119, 180)"},
        mode: "lines",
        name: "Mean",
        type: 'scatter'
    };

    //Mean + std
    var ploty_upper = {
        x: mean_y_up,
        y: idxs_y ,
        fill: "tonexty",
        fillcolor: "rgba(68, 68, 68, 0.3)",
        line: {width: 0},
        marker: {color: "444"},
        mode: "lines",
        type: "scatter",
        name: "Mean + std",
        xaxis: 'x2',
        yaxis: 'y'
    };

    //Define layout for arranging the three plots
    //Values are percentages of entire graph area
    var layout = {
        yaxis: {domain: [0.3, 1]},
        yaxis2: {domain: [0, 0.25]},
        xaxis: {domain: [0.20, 1]},
        xaxis2: {domain: [0, 0.15]},
        showlegend: false
    };

    //Combine graph data and render using plotly
    var data = [heatmap, plotx_lower, plotx, plotx_upper, ploty_lower, ploty, ploty_upper];
    Plotly.newPlot('heatmap-div', data, layout);
}

/**
 * Calculate mean and variance of the given data
 * @param data
 * @returns {Array} arranged as {Index, Mean, Variance}
 */
function calc_stats(data) {
    var dataAmount = data[0].length; //Number of rows/columns
    var dataSize = data.length; //Number of entries in rows/columns

    var stats = [];

    //For each row/column
    for ( var i = 0; i < dataAmount; i++) {
        //Grab a the row/column
        var col = [];
        for (var j = 0; j<dataSize; j++) {
            col.push(data[j][i]);
        }

        //Calculate Mean
        var sum = 0;
        for (var j = 0; j<col.length; j++) {
            sum += parseFloat(col[j]);
        }
        var avg = sum / col.length;

        //Calculate Variance separately since it depends on the mean
        var varsum = 0;
        for (var j = 0; j<col.length; j++) {
            var diff = parseFloat(col[j])-avg;
            varsum += diff*diff;
        }
        var variance = varsum / col.length;

        //Add entry to result array
        stats.push([i, avg, Math.sqrt(variance)]);
    }
    return stats;
}
/**
 * Called by the epoch slider element.
 * Sets the new epoch number and renders corresponding data.
 */
function set_epoch() {
    var epochnr = document.getElementById("epoch-slider").value;
    document.getElementById("slider-output").textContent = epochnr; //Update slider output
    render(epochnr);
}

/**
 * Called by the layer dropdown menu element.
 * Loads data of the new layer and then renders it.
 */
function set_layer() {
    var layername = document.getElementById("layer-selection").value;

    //Using callback function to ensure entire data has been loaded before rendering
    loadData(layername, function() {
        var epochnr = document.getElementById("epoch-slider").value;
        render(epochnr);
    });
}

/**
 * Called by the play/pause button element.
 * If currently playing stops, if not creates interval that calls set_epoch() every 500ms.
 */
function play_pause() {
    if (isPlaying) {
        //Stop playing
        clearInterval(epochInterval);
        isPlaying = false;
        document.getElementById("play-button").innerHTML = "Play";

    } else {
        //Start playing
        epochInterval = setInterval(function() {
            //Grab epoch information
            var currEpoch = +document.getElementById("epoch-slider").value;
            var epochSize = +document.getElementById("epoch-slider").max;

            //Increase epoch and loop if over max
            document.getElementById("epoch-slider").value = (currEpoch+1)%(epochSize+1);
            set_epoch();
        }, 500); //Repeat every 500ms

        isPlaying = true;
        document.getElementById("play-button").innerHTML = "Pause";
    }
}

/**
 * This is an experimental implementation of the stats graphs using d3.js.
 * Kept here for potential future work.
 */
// function plot_stats(data) {
//     //Remove old plots
//     d3.select('#avgplot').selectAll("*").remove();
//     d3.select('#varplot').selectAll("*").remove();
//
//     //Grab svg elements
//     var avgsvg = d3.select('#avgplot');
//     var varsvg = d3.select('#varplot');
//
//     //Calculate stats to display
//     var statData = calc_stats(data);
//
//     //Console dump for debugging purposes
//     /*console.log("StatData:\n" +
//         "Index; Average; Variance\n" +
//         statData[0][0] + "; " + statData[0][1] + "; " + statData[0][2] + "\n" +
//         statData[1][0] + "; " + statData[1][1] + "; " + statData[1][2] + "\n" +
//         statData[2][0] + "; " + statData[2][1] + "; " + statData[2][2] + "\n" +
//         "...");
//     */
//
//     //Draw the graphs
//     drawHorizontalGraph(avgsvg, statData, "AVG", 1, "steelblue");
//     drawHorizontalGraph(varsvg, statData, "VAR", 2, "coral");
// }
//
// function drawHorizontalGraph (svg, data, name, colIndex, color) {
//
//     var margin = {top: 20, right: 20, bottom: 30, left: 50},
//         width = +svg.attr("width") - margin.left - margin.right,
//         height = +svg.attr("height") - margin.top - margin.bottom,
//         g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
//
//     //console.log("Graph size: " + width + "x" + height);
//
//     var x = d3.scaleLinear()
//         .domain([0, data.length])
//         .range([0, width]);
//
//     var y = d3.scaleLinear()
//         .domain([-0.03, 0.03])
//         .range([height, 0]);
//
//     var line = d3.line()
//         .x(function(d) { return x(d[0]); })
//         .y(function(d) { return y(d[colIndex]); });
//
//     //X Axis
//     g.append("g")
//         .attr('class', 'x axis')
//         .attr("transform", "translate(0," + height + ")")
//         .call(d3.axisBottom(x).ticks(4))
//         .select(".domain")
//         .remove();
//
//     //Y Axis
//     g.append("g")
//         .call(d3.axisLeft(y).ticks(3))
//         .append("text")
//         .attr("fill", "#000")
//         //.attr("transform", "rotate(-90)")
//         .attr("y", -15)
//         .attr("dy", "0.71em")
//         .attr("text-anchor", "end")
//         .text(name);
//
//     //Graph
//     g.append("path")
//         .datum(data)
//         .attr("fill", "none")
//         .attr("stroke", color)
//         .attr("stroke-linejoin", "round")
//         .attr("stroke-linecap", "round")
//         .attr("stroke-width", 1.5)
//         .attr("d", line);
//
// }