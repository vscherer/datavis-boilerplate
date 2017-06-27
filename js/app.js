import superagent from 'superagent';
import superagentJsonapify from 'superagent-jsonapify';
import * as d3 from 'd3'
import Plotly from 'plotly.js'
superagentJsonapify(superagent);

plot_epoch("dense_1",0);
window.set_epoch = set_epoch;
window.play_pause = play_pause;
var isPlaying = false;

function plot_epoch(layername, epochnr) {
// Use D3.js csv function to load and parse CSV data
    d3.csv("/data/"+layername+"/"+epochnr, function (data) {
        // Plot using the powerful plotly.js
        // Alternatively, we could now use D3.js to plot whatever we need
        //console.log(data)
        var matrix = data.map((row) => Object.values(row).slice(0, Object.values(row).length - 1));
        var data = [{
            z: matrix,
            type: 'heatmap'
        }];
        Plotly.newPlot('heatmap-div', data);
        plot_stats(matrix);
    });
}


function plot_stats(data) {
    d3.select('#statplot').selectAll("*").remove();
    var svg = d3.select('#statplot'),
        margin = {top: 20, right: 20, bottom: 30, left: 50},
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    console.log("Graph size: " + width + "x" + height);

    var statData = calc_stats(data);

    var x = d3.scaleLinear()
        .domain([0, statData.length])
        .range([0, width]);

    var y = d3.scaleLinear()
        .domain([-0.05, 0.05])
        .range([height, 0]);

    var line = d3.line()
        .x(function(d) { return x(d[0]); })
        .y(function(d) { return y(d[1]); });

        g.append("g")
            .attr('class', 'x axis')
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x).ticks(4))
            .select(".domain")
            .remove();

        g.append("g")
            .call(d3.axisLeft(y).ticks(3))
            .append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "0.71em")
            .attr("text-anchor", "end")
            .text("AVG");

        g.append("path")
            .datum(statData)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 1.5)
            .attr("d", line);
}

function calc_stats(data) {
    var dataAmount = data[0].length;
    var dataSize = data.length;
    console.log("Data size: " + dataSize + "x" + dataAmount);

    //Array: Index, Avg, (Var)
    var stats = [];

    //Index
    var indexes = [];
    indexes.push(Array.from(new Array(dataAmount), (x,i) => i));

    //Average
    for ( var i = 0; i < dataAmount; i++) {
        var col = [];
        for (var j = 0; j<dataSize; j++) {
            col.push(data[j][i]);
        }
        var sum = 0;
        for (var j = 0; j<col.length; j++) {
            sum = sum + parseInt(col[j]);
        }
        var avg = sum / col.length;
        stats.push([i, avg]);
    }
    return stats;
}

function set_epoch() {
    var epochnr = document.getElementById("epoch-slider").value;
    document.getElementById("slider-output").textContent = epochnr;
    var layername = document.getElementById("layer-selection").value;
    plot_epoch(layername,epochnr);
}

function play_pause() {
    if (isPlaying)
    {
        //Stop playing
        isPlaying = false;
        document.getElementById("play-button").innerHTML = "Play";

    }
    else
    {
        //Start playing
        isPlaying = true;
        document.getElementById("play-button").innerHTML = "Pause";
    }
}