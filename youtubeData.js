var data;
//import data
d3.json("/var/www/html/js/posts/vanishing-student/json/classData.json", function(error, json) {
    if (error) return console.warn(error);
    data = json;
    console.log(data);
    drawGraph();
});

function drawGraph(){
    var SVG_WIDTH = 900;            //in px
    var SVG_HEIGHT = 500;           //in px
    var OPTION_PANE_WIDTH = 200;    //in px;
    var GRAPH_LOC = '#data-graph';  //point of graph insertion
    var PRETTY_X_OFFSET = 10;       //push graph right
    
    //holds data for normalization, checkboxes
    var maxY = {};
    var maxX = {};
    var topics = {};//not using sets for backwards compatibility
    var authors = {};

    for(var pl in data){
        var vidObj = data[pl]['videos'];
        index = data[pl]['plId'];
        maxX[index] = vidObj.length;
        maxY[index] = 0;
        topics[data[pl]['topic']] = true;
        authors[data[pl]['plAuthor']] = true;
        for(var vidId in vidObj){
            maxY[index] = Math.max(maxY[index], vidObj[vidId]['viewCount']);
        }
    }

    console.log(topics);
    console.log(authors);

    //line generator function 
    var lineFunction = d3.svg.line()
                        .x(function(d) { return d.x; })
                        .y(function(d) { return d.y; })
                        .interpolate("linear");
   
   //holds point data for line creation
    lineData = {}//holds point data for line creation

    //generate groupings
    var gs = d3.select(GRAPH_LOC)
      .style( {  'height'    : SVG_HEIGHT+'px',
                'width'     : OPTION_PANE_WIDTH+SVG_WIDTH+10+'px' } )
      .append("svg")
      .attr('width', SVG_WIDTH+'px')
      .attr('height', SVG_HEIGHT+'px')
      .style('border', "1px solid black")
      .selectAll("svg").data(data)
      .enter().append("g")
      .attr('class', function(d) {return d['topic'];});

    //add path to hold line
    var paths = gs.append('path')
      .attr("class", function(d) {return d['topic']+"-line"})
      .attr("id", function(d) { lineData[d['plId']] = []; return d['plId']; });

    //generate SVG dots (options: x,y {un}normalized
    gs.selectAll("g").data(function(d) {return d['videos'];})
      .enter().append('circle')
      .classed("dot",true)
      .attr("id", function(d) {return d['videoId'];})
      .attr("cx", function(d, i) {return SVG_WIDTH*i/d3.select(this.parentNode).datum()['videos'].length + PRETTY_X_OFFSET;}) 
      //.attr("cy", function(d) {return SVG_HEIGHT - SVG_HEIGHT*d['viewCount']/maxY})
      .attr("cy", function(d) {return SVG_HEIGHT - SVG_HEIGHT*d['viewCount']/maxY[d3.select(this.parentNode).datum()['plId']]})
      .attr("r", 2)
      .each(function() {
            lineData[d3.select(this.parentNode).datum()['plId']].push(
                  {"x": d3.select(this).attr("cx"),
                   "y": d3.select(this).attr("cy")}
            )}
      );
     
    //generate SVG lines
    paths.each(function() {
        d3.select(this).attr("d", lineFunction(lineData[d3.select(this).attr('id')]))
        .attr("stroke-width", 1)
        .attr("fill", "none");
    });

    d3.select(GRAPH_LOC)
    .append('div')
    .attr('id', 'selector')
    .style( {'width' : OPTION_PANE_WIDTH+'px',
            'height': SVG_HEIGHT+'px'}   );

    var checkVals = [topics, authors, {"Norm X" : true, "Norm Y": true}];
    var checkNames = ["Topics", "Authors", "Options"];
    for(var arr in checkVals) {
        d3.select("#selector")
        .append('div')
        .text(checkNames[arr]);
        for (var i in checkVals[arr]){
            var div = d3.select("#selector")
            .append('div')
            div.append('label')
            .text(i)
            div.append('input')
            .attr('type', 'checkbox')
            .attr('value', i)
            .attr('class', checkNames[arr])
            .attr('id', i+"-box");
        }
    }


}
