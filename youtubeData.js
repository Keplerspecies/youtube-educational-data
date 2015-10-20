var data;
d3.json("http://localhost/js/posts/vanishing-student/json/classData.json", function(error, json) {
    if (error) return console.warn(error);
    data = json;
    drawGraph();
});

function drawGraph(){
    var GRAPH_LOC = '#data-graph';//point of graph insertion
    //find data necessary for normalization
    var maxY = maxX = 0;
    //consider staggering data loads for big sets (after completion)
    for(var pl in data){
        var line = d3.select(GRAPH_LOC).append("div")
          .classed("line", true)
          .attr("id", pl);
        var vidObj = data[pl]['videos'];
        maxX = Math.max(maxX, vidObj.length);
        for(var vidId in vidObj){
            line.append("div")
              .classed("dot",true)
              .attr("id", vidObj[vidId]['videoId'])
            maxY = Math.max(maxY, vidObj[vidId]['viewCount']);
        }
    }
    console.log("MAX X: "+maxX);
    console.log("MAX Y: "+maxY);
}
