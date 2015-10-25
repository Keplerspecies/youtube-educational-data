//url, selector for graph to append to, graph width, graph height, left pane width, left pane height
function importAndGraph(url, gl, svgw, svgh, opw, vpw){ 
    d3.json(url, function(error, json) {
    if (error) return console.warn(error);
        var data = json;
        var yd = new ydGraph(data,gl,svgw,svgh,opw,vpw);
        yd.drawGraph(data, gl, svgw, svgh, opw, vpw);
    });
}

//basic graph constructor
function ydGraph(d, gl, svgw, svgh, opw, vpw){
    
    var data = d;
    var SVG_WIDTH = svgw;           //in px
    var SVG_HEIGHT = svgh;          //in px
    var OPTION_PANE_WIDTH = opw;    //in px
    var VID_PANE_WIDTH = vpw;       //in px
    var GRAPH_LOC = gl;             //point of graph insertion
    var PRETTY_X_OFFSET = 3;        //push graph right
    var PRETTY_Y_OFFSET = 10;       //push graph down
    
    //holds data for normalization, checkboxes
    var maxPlY = {}
    var maxY = maxX = 0;
    var topics = {};//not using sets for backwards compatibility
    var authors = {};

    //holds point data for line creation
    var lineData = {};
    var scaleY = d3.scale.linear();
    var axisX = d3.svg.axis().scale(d3.scale.linear().range([0, SVG_WIDTH]));
    var axisY = d3.svg.axis().scale(d3.scale.linear().range([SVG_HEIGHT, 0])).orient("left")
   

    //line generator function 
    var lineFunction = d3.svg.line()
                        .x(function(d) { return d.x; })
                        .y(function(d) { return d.y; })
                        .interpolate("linear");

    var colors = //for auto-coloring, change as needed
    ["red", "green", "blue", "orange", "purple", "darkblue", "fuchsia", 
    "maroon", "silver", "slateblue", "darkgoldenrod", "indigo", "plum", "magenta",
    "olive", "orangered", "teal", "darkorchid", "brown", "azure"];
 
    ydGraph.id++;
    var id = ydGraph.id;

    var mousedPath, mousedCircles; //previously moused element (for removal on new mouseover)

    /******************************************************************
    *                           Helpers                               *
    ******************************************************************/
    //get x value for circle
    var getX = function(d, i, t){
        if(d3.select("#_NormX-box"+id).property("checked"))
            return SVG_WIDTH * i/d3.select(t.parentNode).datum()['videos'].length + PRETTY_X_OFFSET;
        else
            return SVG_WIDTH * i/maxX + PRETTY_X_OFFSET;
    }

    //get y value for circle
    var getY = function(d, t){

        if(d3.select("#_NormY-box"+id).property("checked")){
            var localMaxY = maxPlY[d3.select(t.parentNode).datum()['plId']+id];
            newScale(localMaxY);
            return SVG_HEIGHT - (SVG_HEIGHT-PRETTY_Y_OFFSET)*scaleY(d['viewCount'])/scaleY(localMaxY);
        }
        else{
            newScale(maxY);
            return SVG_HEIGHT - (SVG_HEIGHT-PRETTY_Y_OFFSET)*scaleY(d['viewCount'])/scaleY(maxY);             
        }
        function newScale(endDomain){
            if(d3.select("#_LnPlot-box"+id).property("checked"))
                scaleY = d3.scale.log().base(Math.E).domain([1, endDomain]).range([0, 1]);
            else
                scaleY = d3.scale.linear();
        }
    }
    
    //simple url return function
    var getURL = function(d, t){
        vidId = d["videoId"];
        plId = d3.select(t.parentNode).datum()["plId"];
        return "https://www.youtube.com/watch?v="+vidId+"&list="+plId;
    }

    //make valid CSS class/id name
    var validify = function(s){
        return "_"+s.replace(/[^A-Za-z0-9]/g, "");
    }

    //calculate maximums for shown graphs
    var newMax = function(){
        maxX = 1;
        maxY = 1;
        d3.select("#data-svg"+id).selectAll("g.non-axis").each(function(d, i) {
            var t = d3.select(this);
            if(!t.classed("no-show")){
                maxX = Math.max(t.datum()['videos'].length, maxX);
                maxY = Math.max(maxY, maxPlY[t.attr("id")]);
            }
        });
    }

    var updatePlot = function(){
        lineData = {};
        d3.select("#data-svg"+id).selectAll('g.non-axis').each(function() {
            d3.select(this).selectAll('circle').transition().duration(500)
            .attr("cx", function(d, i) {return getX(d, i, this);})
            .attr("cy", function(d) {return getY(d, this);})
            .each(function(d, i) {
                var p = d3.select(this.parentNode);
                var plId = p.datum()['plId'];
                if(lineData[plId+id] == null)
                    lineData[plId+id] = [];
                lineData[plId+id].push(
                    {"x": getX(d, i, this),
                    "y": getY(d, this)}
                );
                if(i === p.datum()['videos'].length-1){//check needed for concurrency
                    updatePath(this.parentNode);
                }
            });
        });
    }

    var updatePath = function(t){
        var plId = d3.select(t).attr('id');
        if(lineData[plId] == null) return; //empty playlist!
        d3.select(t).select("path").transition().duration(500).attr("d", lineFunction(lineData[plId]));
    }


    var updateAxes = function(){
        if(d3.select("#_NormX-box"+id).property("checked"))
            axisX.scale(d3.scale.linear().range([0, SVG_WIDTH]));
        else
            axisX.scale(d3.scale.linear().domain([0, maxX]).range([0, SVG_WIDTH]));
        if(d3.select("#_NormY-box"+id).property("checked"))
            axisY.scale(d3.scale.linear().range([SVG_HEIGHT, 0]));
        else if(d3.select("#_LnPlot-box"+id).property("checked"))
            axisY.scale(d3.scale.log().domain([1, maxY]).range([SVG_HEIGHT, 0]));  
        else
            axisY.scale(d3.scale.linear().domain([0, maxY]).range([SVG_HEIGHT, 0]));
        d3.select("#x-axis"+id).call(axisX);
        d3.select("#y-axis"+id).attr("transform", "translate("+SVG_WIDTH+", 0)").call(axisY);
    }

    //generate checkboxes
    /*INPUT: css selector to append to,
             labels for checkboxes,
             name for labels container,
             function checkbox does on click*/
    var genChecks = function(loc, vals, name, f){
        d3.select(loc)
        .append('div')
        .html("<b>"+name+"</b>");
        for (var i in vals){
            var div = d3.select("#selector"+id)
            .append('div')
            div.append('label')
            .text(vals[i])
            var input = div.append('input')
            .attr('type', 'checkbox')
            .attr('value', validify(vals[i]))
            .attr('class', validify(name))
            .attr('id', validify(vals[i])+"-box"+id);
            //norm box behavior
            input.on("change", f);
        }
    }

    //generate vidView container
    /*INPUT: vvd:           Text data to be displayed in viewer
             imgShow:       Display img thumbnail*/
    var genVidView= function(vvd, imgShow){
        var vidView = d3.select(GRAPH_LOC)
        .append("div")
        .attr("id", "vid-view"+id)
        .classed("vid-view", true)
        .style( {"height"   : SVG_HEIGHT,
                 "width"    : VID_PANE_WIDTH });
        if(imgShow){
            vidView.append("div")
            .attr("id", "vid-img"+id)
            .classed("vid-img", true);
        }
        vidView.append("div")
        .attr("id", "info-box"+id)
        .classed("info-box", true);
        d3.select("#info-box"+id).selectAll("div")
        .data(vvd)
        .enter().append("div")
        .attr("id", function(d) {return validify(d)+id; })
        .html(function(d){ return "<b>"+d+": </b>"; })
        .append("span");
    }

    //which checkboxes to initialize on
    /*INPUT: ind:       array of checkbox selectors to start checked*/
    var startChecked = function(ind){
        for(i in ind){
            var checked = d3.selectAll(ind[i]).property('checked', true);
            d3.select("#data-svg"+id).selectAll("g."+checked.property("value")).classed("no-show", false);
        }
        newMax();
    }

    var genGroups = function(){
    //generate groupings
    return d3.select(GRAPH_LOC)
      .style( {  'height'    : SVG_HEIGHT+'px',
                'width'     : OPTION_PANE_WIDTH+VID_PANE_WIDTH+SVG_WIDTH+100+'px' } )
      .append("svg")
      .attr("id", "data-svg"+id)
      //deselect if clicked off selection
      .on("click", function() {
            if(mousedCircles != null)
                mousedCircles.attr("r", 4);
            if(mousedPath != null) 
                mousedPath.attr("stroke-width", 1);
      })
      .attr('width', SVG_WIDTH+'px')
      .attr('height', SVG_HEIGHT+'px')
      .style('border', "1px solid black")
      .selectAll("#data-svg"+id).data(data)
      .enter().append("g")
      .attr('id', function(d) {return d['plId']+id})
      .attr('class', function(d) {return validify(d['topic']) +" "+validify(d['plAuthor']) + " non-axis no-show";});
    }

    //generate circles
    /*INPUT:    toAppend:   d3 selection on which to append circles*/
    var genCircles = function(appendTo){
        appendTo.selectAll("g").data(function(d, i) {return d['videos'];})
          .enter().append('circle')
          .attr("class", function() {return validify(d3.select(this.parentNode).datum()['topic'])})
          .attr("id", function(d) {return d['videoId']+id;})
          .attr("cx", function(d, i) {return getX(d, i, this);}) 
          .attr("cy", function(d) {return getY(d, this);})
          .attr("r", 4)
          .each(function() {
                var plId = d3.select(this.parentNode).datum()['plId']+id;
                if(lineData[plId] == null)
                    lineData[plId] = [];
                lineData[plId].push(
                      {"x": d3.select(this).attr("cx"),
                       "y": d3.select(this).attr("cy")}
                );}
          //expand line and add description on node mouseover
          ).on("mouseover", function(d){
                var pd = d3.select(this.parentNode).classed("selected", true).datum();
                d3.select('#vid-img'+id)
                .html('<img src="'+pd['thumbURL']+'"/>');
                d3.selectAll("#_Title"+id+" span").text(d['title']);
                d3.selectAll("#_Link"+id).html("<b><a href="+getURL(d, this)+">LINK</a></b>");
                d3.selectAll("#_ViewCount"+id+" span").text(d['viewCount']);
                d3.selectAll("#_Author"+id+" span").text(pd['plAuthor']);
                d3.selectAll("#_Description"+id+" span").text(pd['description']);
                if(mousedCircles != null)
                    mousedCircles.attr("r", 4);
                if(mousedPath != null) 
                    mousedPath.attr("stroke-width", 1);

                //generate new mouseover
                mousedCircles = d3.selectAll(this.parentNode.getElementsByTagName("circle")).attr("r", 15);
                mousedPath = d3.selectAll(this.parentNode.getElementsByTagName("path")).attr("stroke-width", 20);
               
                this.parentNode.parentNode.appendChild(this.parentNode); //repaint
        }).on("click", function(d){
            window.open(getURL(d, this));
        });
    }

    //generates paths
    /*Input:    toAppend    d3 selection on which to append paths*/
    var genPaths = function(appendTo){
        appendTo.append('path')
          .attr("class", function(d) {return validify(d['topic'])+"-line data-line"})
          .attr("id", function(d) { lineData[d['plId']] = []; return d['plId']; });

        var i = 0;
        for(var t in topics){
            t = validify(t);
            d3.selectAll("."+t).attr("fill", colors[i%colors.length]);
            d3.selectAll("."+t+"-line").attr("stroke", colors[i%colors.length]);
            i++;
        }
    }

    this.drawGraph = function(d, gl, svgw, svgh, opw, vpw){
        //initialize data, helping variables
        for(var pl in data){
            var vidObj = data[pl]['videos'];
            index = data[pl]['plId'];
            topics[data[pl]['topic']] = true;
            authors[data[pl]['plAuthor']] = true;
            maxPlY[index+id] = 0;
            for(var vidId in vidObj){
                maxPlY[index+id] = Math.max(maxPlY[index+id], vidObj[vidId]['viewCount']);
            }   
        }

        /******************************************************************
        *                           PROGRAM                               *
        ******************************************************************/

        //generate checkbox container
        d3.select(GRAPH_LOC)
        .append('div')
        .attr('id', "selector"+id)
        .classed("selector", true)
        .style( {'width' : OPTION_PANE_WIDTH+'px',
                'height': SVG_HEIGHT+'px'}   );

        //generate checkboxes
        var toPass = function() {updatePlot(), updateAxes()};
        genChecks("#selector"+id, ["Norm X", "Norm Y", "Ln Plot"], "Options",  toPass);
        toPass = function () {
            var noShowSet = !d3.select(this).property("checked")
            d3.select("#data-svg"+id).selectAll("g."+d3.select(this).property("value"))
            .classed("no-show", noShowSet);
            //repair intersection with checked boxes (has to be a better way...)
            d3.selectAll("#selector"+id+" input:checked").each(function(){
                d3.select("#data-svg"+id).selectAll("g."+d3.select(this).property("value"))
                .classed("no-show", false);
            });
            newMax();
            updatePlot();
            updateAxes();
        };
        genChecks("#selector" + id, Object.keys(topics).sort(), "Topics", toPass);
        genChecks("#selector" + id, Object.keys(authors).sort(), "Authors", toPass);
        var gs = genGroups();
        genPaths(gs);

        var topicsList = Object.keys(topics);
        var rand = Math.floor(Math.random()*topicsList.length);
        startChecked(["#"+validify(topicsList[rand])+"-box"+id]);

        var vidViewData = ["Title", "Link", "View Count", "Author", "Description"];
        genVidView(vidViewData, true);

        genCircles(gs);
        //initialize paths
        d3.selectAll("g").each(function() {updatePath(this)})
            .selectAll(".data-line")
            .attr("stroke-width", 1)
            .attr("fill", "none");
        updateAxes();
        d3.select("#data-svg"+id).append("g").call(axisX).attr("id", "x-axis"+id);
        d3.select("#data-svg"+id).append("g").call(axisY).attr("transform", "translate("+SVG_WIDTH+", 0)").attr("id", "y-axis"+id);
   
   }
}

ydGraph.id = 0;

