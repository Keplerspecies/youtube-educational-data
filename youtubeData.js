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
    var OPTION_PANE_WIDTH = 200;    //in px
    var VID_PANE_WIDTH = 200;       //in px
    var GRAPH_LOC = '#data-graph';  //point of graph insertion
    var PRETTY_X_OFFSET = 10;       //push graph right
    
    //holds data for normalization, checkboxes
    var maxPlY = {}
    var maxY = maxX = 0;
    var topics = {};//not using sets for backwards compatibility
    var authors = {};

    //holds point data for line creation
    var lineData = {};
    var scale = d3.scale.linear().range([0, SVG_HEIGHT]);
    //line generator function 
    var lineFunction = d3.svg.line()
                        .x(function(d) { return d.x; })
                        .y(function(d) { return d.y; })
                        .interpolate("linear");


    for(var pl in data){
        var vidObj = data[pl]['videos'];
        index = data[pl]['plId'];
        topics[data[pl]['topic']] = true;
        authors[data[pl]['plAuthor']] = true;
        maxPlY[index] = 0;
        maxX = Math.max(maxX, vidObj.length);
        for(var vidId in vidObj){
            maxY = Math.max(maxY, vidObj[vidId]['viewCount']);
            maxPlY[index] = Math.max(maxPlY[index], vidObj[vidId]['viewCount']);
        }
    }

    //generate checkbox container
    d3.select(GRAPH_LOC)
    .append('div')
    .attr('id', 'selector')
    .style( {'width' : OPTION_PANE_WIDTH+'px',
            'height': SVG_HEIGHT+'px'}   );

    //generate checkboxes
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
            var input = div.append('input')
            .attr('type', 'checkbox')
            .attr('value', rms(i))
            .attr('class', checkNames[arr])
            .attr('id', rms(i)+"-box");
            if(arr == 2){
                input.property("checked", true);
                input.on("change", function(){
                    lineData = {};
                    d3.selectAll('g').each(function() {
                        d3.select(this).selectAll('circle').transition()
                        .attr("cx", function(d, i) {return getX(d, i, this);})
                        .attr("cy", function(d) {return getY(d, this);})
                        .each(function(d, i) {
                            var p = d3.select(this.parentNode);
                            var plId = p.datum()['plId'];
                            if(lineData[plId] == null)
                                lineData[plId] = [];
                            lineData[plId].push(
                                {"x": getX(d, i, this),
                                "y": getY(d, this)}
                            );
                            if(i === p.datum()['videos'].length-1){
                                updatePath(this.parentNode);
                            }
                        });
                        console.log("hmm");
                    });
                });
            }
            else{
               input.on("change", function(){
                    var noShowSet = !d3.select(this).property("checked")
                    d3.selectAll("g."+d3.select(this).property("value"))
                    .classed("no-show", noShowSet);
                    //repair intersection with checked boxes (has to be a better way...)
                    d3.selectAll("#selector input:checked").each(function(){
                        d3.selectAll("g."+d3.select(this).property("value"))
                        .classed("no-show", false);
                    });
                });
            }
        }
    } 

    //generate groupings
    var gs = d3.select(GRAPH_LOC)
      .style( {  'height'    : SVG_HEIGHT+'px',
                'width'     : OPTION_PANE_WIDTH+VID_PANE_WIDTH+SVG_WIDTH+100+'px' } )
      .append("svg")
      .on("click", function() {
            if(circles != null)
                circles.attr("r", 4);
            if(path != null) 
                path.attr("stroke-width", 1);
      })
      .attr('width', SVG_WIDTH+'px')
      .attr('height', SVG_HEIGHT+'px')
      .style('border', "1px solid black")
      .selectAll("svg").data(data)
      .enter().append("g")
      .attr('id', function(d) {return d['plId']})
      .attr('class', function(d) {return rms(d['topic']) +" "+rms(d['plAuthor']) + " no-show";});

    var topics = d3.selectAll(".Topics");
    var rand = Math.floor(Math.random()*topics.size());
    var checked =topics.filter(function(d, i){return i === rand}).property('checked', true);
    d3.selectAll("g."+checked.property("value")).classed("no-show", false);

    //generate vidView container
    var vidView = d3.select(GRAPH_LOC)
    .append("div")
    .attr("id", "vid-view")
    .style( {"height"   : SVG_HEIGHT,
             "width"    : VID_PANE_WIDTH });
    vidView.append("div")
    .attr("id", "vid-img")
    vidView.append("div")
    .attr("id", "info-box");
    d3.select("#info-box").selectAll("div")
    .data(["Title", "Link", "View Count", "Author", "Description"])
    .enter().append("div")
    .attr("id", function(d) {return rms(d); })
    .html(function(d){ return "<b>"+d+": </b>"; })
    .append("span");

    //construct paths for each group
    gs.append('path')
      .attr("class", function(d) {return d['topic']+"-line"})
      .attr("id", function(d) { lineData[d['plId']] = []; return d['plId']; });

    var path, circles; //previously moused element (for removal on new mouseover)
    //generate SVG dots (options: x,y {un}normalized 

    gs.selectAll("g").data(function(d, i) {return d['videos'];})
      .enter().append('circle')
      .attr("class", function() {return d3.select(this.parentNode).datum()['topic']})
      .attr("id", function(d) {return d['videoId'];})
      .attr("cx", function(d, i) {return getX(d, i, this);}) 
      .attr("cy", function(d) {return getY(d, this);})
      .attr("r", 4)
      .each(function() {
            lineData[d3.select(this.parentNode).datum()['plId']].push(
                  {"x": d3.select(this).attr("cx"),
                   "y": d3.select(this).attr("cy")}
            )}
      ).on("mouseover", function(d){
            var pd = d3.select(this.parentNode).classed("selected", true).datum();
            d3.select('#vid-img')
            .html('<img src="'+pd['thumbURL']+'"/>');
            d3.selectAll("#Title span").text(d['title']);
            d3.selectAll("#Link").html("<b><a href="+getURL(d, this)+">LINK</a></b>");
            d3.selectAll("#ViewCount span").text(d['viewCount']);
            d3.selectAll("#Author span").text(pd['plAuthor']);
            d3.selectAll("#Description span").text(pd['description']);
    
            if(circles != null)
                circles.attr("r", 4);
            if(path != null) 
                path.attr("stroke-width", 1);

            //generate new mouseover
            circles = d3.selectAll(this.parentNode.getElementsByTagName("circle")).attr("r", 15);
            path = d3.selectAll(this.parentNode.getElementsByTagName("path")).attr("stroke-width", 20);
           
            this.parentNode.parentNode.appendChild(this.parentNode);
    }).on("click", function(d){
        window.open(getURL(d, this));
    });

    d3.selectAll("g").each(function() {updatePath(this)})
        .selectAll("path")
        .attr("stroke-width", 1)
        .attr("fill", "none");

    function getX(d, i, t){
        if(d3.select("#NormX-box").property("checked"))
            return SVG_WIDTH*i/d3.select(t.parentNode).datum()['videos'].length + PRETTY_X_OFFSET;
        else
            return SVG_WIDTH*i/maxX + PRETTY_X_OFFSET;
    }

    function getY(d, t){
        if(d3.select("#NormY-box").property("checked"))
            return SVG_HEIGHT - scale(d['viewCount']/maxPlY[d3.select(t.parentNode).datum()['plId']]);
        else
            return SVG_HEIGHT - scale(d['viewCount']/maxY);
    }

    function getURL(d, t){
        vidId = d["videoId"];
        plId = d3.select(t.parentNode).datum()["plId"];
        return "https://www.youtube.com/watch?v="+vidId+"&list="+plId;
    }
     
    function updatePath(t){
        var plId = d3.select(t).attr('id');
        if(lineData[plId] == null) return; //empty playlist!
        d3.select(t).select("path").transition().attr("d", lineFunction(lineData[plId]));
    }

    //simple space-saving function to remove space from string
    function rms(s){
        return s.replace(/\s+/g, '')
    }
}
