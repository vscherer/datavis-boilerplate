import superagent from 'superagent';
import superagentJsonapify from 'superagent-jsonapify';
import * as d3 from 'd3'
import jQuery from 'jquery';
import Plotly from 'plotly.js'
import nj from 'numjs';
superagentJsonapify(superagent);

window.set_epoch = set_epoch;
window.set_layer = set_layer;
window.play_pause = play_pause;
var isPlaying = false;
var DATA;
var META;

loadMetadata();

function loadMetadata() {
    jQuery('.loader').show();
    d3.json("/meta", function (data) {
        META = data;
        jQuery('.loader').hide();
        jQuery('#layer-selection').empty();
        if (META['datasets'] && Object.keys(META['datasets']).length > 0) {
            jQuery.each(Object.keys(META['datasets']), function (val, text) {
                jQuery('#layer-selection').append(jQuery('<option></option>').val(text).html(text))
            });
            set_layer();
        }
        else {
            jQuery('#layer-selection').append(jQuery('<option></option>').html('No data found in folder!'))
        }
    });
}

function loadData(layername, callback) {
    if (!layername) return;
    let epochs = META['epochs'];
    let layer_shape = META['datasets'][layername]['shape'];
    let layername_url = layername.replace(/\//g, '__');

    jQuery('.loader').show();
    d3.json("/data/" + layername_url, function (data) {
        jQuery('.loader').hide();
        // Load JSON flatten array to numjs
        var njdata = nj.array(data);
        // Define shape
        var shape = [epochs, ...layer_shape]; // shape size is 1+dim_tensor (epochs is the additional dimension)
        shape = shape.filter(function(v) {return v !== 1});
        njdata = njdata.reshape(shape);
        if (shape.length === 2) shape.push(1); // if 1D, expand dimension to have a 2D matrix
        else if (shape.length > 3) {
            var dims = prompt("Please enter dimensions (slider, X, Y)", "0, 1, 2");
            if (!dims) return alert('Only 2D data supported (Found [' + shape + '])');
            var dims_list = dims.split(' ');
            if (dims_list.length !== 3) return alert('Please select 3 dimensions for plotting')
        }
        // Store in global var
        DATA = njdata.reshape(shape).tolist();
        // Se slider
        if (shape[0] > 1) {
           jQuery('#epoch-slider').show().attr({'max': shape[0] - 1});
        }
        else {
            jQuery('#epoch-slider').hide().attr({value: 0});
        }
        // Call callback
        if (callback) callback();
    });
}

function render(epochNr) {

    //Grab current epoch data
    var epochData = DATA[epochNr];
    var statData = calc_stats(epochData);
    var idxs = statData.map(function (t) {return t[0]});
    var mean = statData.map(function (t) {return t[1]});
    var mean_low = statData.map(function (t) {return t[1] - 0.5 * t[2]});
    var mean_up = statData.map(function (t) {return t[1] + 0.5 * t[2]});
    //var variance = statData.map(function (t) {return t[2]})

    //The main plot using Plotly
    var max_abs = nj.abs(nj.array(epochData)).max();
    
    var heatmap = {
        z: epochData,
        type: 'heatmap',
        zmin: -max_abs,
        zmax: max_abs
    };


    var plot_lower = {
        x: idxs,
        y: mean_low ,
        line: {width: 0},
        marker: {color: "444"},
        mode: "lines",
        type: "scatter",
        name: "Mean - std",
        xaxis: 'x',
        yaxis: 'y2'
    };

    var plot = {
        x: idxs,
        y: mean,
        xaxis: 'x',
        yaxis: 'y2',
        fill: "tonexty",
        fillcolor: "rgba(68, 68, 68, 0.3)",
        line: {color: "rgb(31, 119, 180)"},
        mode: "lines",
        name: "Mean",
        type: 'scatter'
    };

    var plot_upper = {
        x: idxs,
        y: mean_up ,
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


    var layout = {
        yaxis: {domain: [0.3, 1]},
        yaxis2: {domain: [0, 0.25]},
        showlegend: false
    };

    var data = [heatmap, plot_lower, plot, plot_upper];

    Plotly.newPlot('heatmap-div', data, layout);

    //The graphs
    //plot_stats(epochData);
}


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

function calc_stats(data) {
    var dataAmount = data[0].length;
    var dataSize = data.length;
    console.log("Data size: " + dataSize + "x" + dataAmount);

    //Array: Index, Avg, Var
    var stats = [];

    for ( var i = 0; i < dataAmount; i++) {
        //Grab a column
        var col = [];
        for (var j = 0; j<dataSize; j++) {
            col.push(data[j][i]);
        }

        //Average
        var sum = 0;
        for (var j = 0; j<col.length; j++) {
            sum += parseFloat(col[j]);
        }
        var avg = sum / col.length;

        //Variance
        var varsum = 0;
        for (var j = 0; j<col.length; j++) {
            var diff = parseFloat(col[j])-avg;
            varsum += diff*diff;
        }
        var variance = varsum / col.length;

        stats.push([i, avg, Math.sqrt(variance)]);
    }


    return stats;
}

function set_epoch() {
    var epochnr = document.getElementById("epoch-slider").value;
    document.getElementById("slider-output").textContent = epochnr;
    render(epochnr);
}

function set_layer() {
    var layername = document.getElementById("layer-selection").value;
    loadData(layername, function() {
        var epochnr = document.getElementById("epoch-slider").value;
        render(epochnr);
    });
}

var epochInterval;

function play_pause() {
    if (isPlaying)
    {
        //Stop playing
        clearInterval(epochInterval);
        isPlaying = false;
        document.getElementById("play-button").innerHTML = "Play";

    }
    else
    {
        //Start playing
        epochInterval = setInterval(function() {
            var currEpoch = +document.getElementById("epoch-slider").value;
            var epochSize = +document.getElementById("epoch-slider").max;

            //Increase and loop if max
            document.getElementById("epoch-slider").value = (currEpoch+1)%(epochSize+1);
            set_epoch();
        }, 500);

        isPlaying = true;
        document.getElementById("play-button").innerHTML = "Pause";
    }
}