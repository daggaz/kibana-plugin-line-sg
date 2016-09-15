define(function (require) {

  var d3 = require('d3');
  var c3 = require('./bower_components/c3');
  var moment = require('./bower_components/moment/moment');
  var module = require('ui/modules').get('kibana/line_sg', ['kibana']);

  module.controller('KbnLineVisController', function ($scope, $element, $window, Private) {

    var tabifyAggResponse = Private(require('ui/agg_response/tabify/tabify'));

    // Initialization of plugin settings
    $scope.$root.editorLine = {}; 
    $scope.$root.editorLine.axisy = ["y","y2"];
    $scope.$root.editorLine.group = ["none","grouped"];
    $scope.$root.editorLine.typeOptions = ["line","bar","spline","step","area","area-step","area-spline"];
    $scope.$root.editorLine.typeformat = ["Time","Percents","Seconds","Octets","Euros"];
    $scope.$root.editorLine.gridpos = ["start","middle","end"];
    $scope.$root.editorLine.gridcolor = {"black":"gridblack","grey":"gridgrey","blue":"gridblue","green":"gridgreen","red":"gridred","yellow":"gridyellow"};

    // Choice of the data format
    var fty = [];
    fty[0] = { format: function (d) { return moment((d-3600)*1000).format("HH:mm"); }};
    fty[1] = { format: function (d) { var formatValue = d3.format(".3s"); return formatValue(d) + "%"; }};
    fty[2] = { format: function (d) { var formatValue = d3.format(".3s"); return formatValue(d) + "s"; }};
    fty[3] = { format: function (d) { var formatValue = d3.format(".3s"); return formatValue(d) + "o"; }};
    fty[4] = { format: function (d) { var formatValue = d3.format(",.0f"); return formatValue(d) + "€"; }};

    // Initialization of variables
    var metrics = $scope.metrics = [];
    var label = {};
    var typex = "timeseries";
    var group = [];
    var idchart = "";
    var hold ="";
    var wold= "";
    moment.locale('fr');

    // Generation graphics C3.js
    $scope.chart = null;
    $scope.showGraph = function() {
	console.log("----chart generator----");
        idchart = $element.children().find(".chartc3");
        var config = {};

	var generateTrendline = $scope.vis.params.configLine.trendline;
	if (generateTrendline) {
		var n = metrics[0].length-1;
                var start = metrics[0][1];
                var end = metrics[0][n];
                var range = end - start;
		var a = 0;
		var x_sum = 0;
		var y_sum = 0;
		var c = 0;
		for (var i = 1; i < n+1; i++) {
			a += i*metrics[1][i];
			x_sum += i;
			y_sum += metrics[1][i];
			c += i*i;	
		}
		a = a*n;
		var b = x_sum*y_sum;
		c = c*n;
		var d = x_sum*x_sum;
		var slope = (a-b)/(c-d);
		var intercept = (y_sum - slope*x_sum)/n;
                
                var forecast = $scope.vis.params.configLine.trendlineforecast;
                if (forecast) {
                    var forecastEnd;
                    if (forecast.slice(-1) == '%') {
                        var forecastPercent = parseInt(forecast)/100;
                        forecastEnd = end + (forecastPercent * range);
                    } else {
                        forecastEnd = end + parseInt(forecast);
                    }
                    if (forecastEnd) {
                        n++;
                        metrics[0][n] = forecastEnd;
                        metrics[1][n] = null;
                    }
                }

		config.line = {connectNull: true};
                function createLine(label, y1, y2) {
		    var line = [label];
                    for (var z = 2; z < n+1; z++)
                        line[z] = null;
                    line[1] = y1;
                    line[n] = y2;                                                 
                    return line;
                }
		metrics.push(createLine('Trend', slope + intercept, (slope * n) + intercept));
                if ($scope.vis.params.configLine.trendlinelimit1)
                    metrics.push(createLine('Limit 1', $scope.vis.params.configLine.trendlinelimit1, $scope.vis.params.configLine.trendlinelimit1));
                if ($scope.vis.params.configLine.trendlinelimit2)
                    metrics.push(createLine('Limit 2', $scope.vis.params.configLine.trendlinelimit2, $scope.vis.params.configLine.trendlinelimit2));
	}

        config.bindto = idchart[0];
        config.data = {};
        config.data.x = 'data0'; 
        config.data.columns = metrics;
	config.data.names = $scope.vis.params.configLine.names;
        config.data.types = $scope.vis.params.configLine.type;
	config.data.groups = ( $scope.vis.params.configLinegrouped != "none" ) ? [group] : "";
        config.data.colors = $scope.vis.params.configLine.colors;
	config.data.color = ( $scope.vis.params.configLine.threshold_enable ) ? function (color, d) { 
		if ( d.id && d.id === $scope.vis.params.configLine_threshold_data ) {
			if (d.value >= $scope.vis.params.configLine_threshold_value1 && d.value < $scope.vis.params.configLine_threshold_value2) {
				color = $scope.vis.params.configLine_threshold_color1;
			} else if (d.value >= $scope.vis.params.configLine_threshold_value2) {
				color = $scope.vis.params.configLine_threshold_color2;
			} 
		}
		return color; 
	} : {};
        config.data.axes = $scope.vis.params.configLine.axisy;
        config.axis = {};
        config.axis.rotated = $scope.vis.params.configLine.rotated;
	if ( typex == "timeseries" ) {
	        config.axis.x = {type: 'timeseries', tick: { rotate: $scope.vis.params.configLine_xrotate, format: ( typeof $scope.vis.params.configLine.formatx != "undefined" ) ? $scope.vis.params.configLine.formatx : "%d-%m-%Y" }};
        } else {
        	config.axis.x = {type: 'category'};
	}
        config.axis.y = {tick: ( typeof $scope.vis.params.configLine.formaty != "undefined" ) ? fty[$scope.vis.params.configLine.formaty] : "{}" };
        config.axis.y.min = ( typeof $scope.vis.params.configLine.rangeminy != "undefined" ) ? $scope.vis.params.configLine.rangeminy : "";
        config.axis.y.max = ( typeof $scope.vis.params.configLine.rangemaxy != "undefined" ) ? $scope.vis.params.configLine.rangemaxy : "";
        config.axis.y2 = {show: $scope.vis.params.configLine.enableY2, tick: ( typeof $scope.vis.params.configLine.formaty2 != "undefined" ) ? fty[$scope.vis.params.configLine.formaty2] : "{}" };
        config.axis.y2.min = ( typeof $scope.vis.params.configLine.rangeminy2 != "undefined" ) ? $scope.vis.params.configLine.rangeminy2 : "";
        config.axis.y2.max = ( typeof $scope.vis.params.configLine.rangemaxy2 != "undefined" ) ? $scope.vis.params.configLine.rangemaxy2 : "";
	config.grid = {};
	config.grid.y = ( typeof $scope.vis.params.configLine.gridyval != "undefined" ) ? {lines: [{value: $scope.vis.params.configLine.gridyval, text: $scope.vis.params.configLine.gridytxt, position: $scope.vis.params.configLine.gridypos, class: $scope.vis.params.configLine.gridycolor}]} : {};
        $scope.chart = c3.generate(config);
	var elem = $(idchart[0]).closest('div.visualize-chart');
        var h = elem.height();
        var w = elem.width();
        $scope.chart.resize({height: h - 50, width: w - 50});
    }

    $scope.processTableGroups = function (tableGroups) {
      tableGroups.tables.forEach(function (table) {
        table.columns.forEach(function (column, i) {
        	var tmp = [];
		var data = table.rows;
		if (i > 0){
			group[i] = column.title;
			label[column.title] = column.title;
			tmp.push(column.title);
		} else {
			tmp.push('data0');
		}
		for (var key in data) {
        	  	tmp.push(data[key][i]);
			if ( typeof data[key][i] === 'string') {
				typex = "category";
			}
		};
		metrics.push(tmp);
	});
      });
      $scope.$root.editorLine.label = label;
    };

    // Get query results ElasticSearch
    $scope.$watch('esResponse', function (resp) {
      if (resp) {
        metrics.length = 0;
        $scope.processTableGroups(tabifyAggResponse($scope.vis, resp));
        $scope.showGraph();
      }
    });

    // Automatic resizing of graphics
    $scope.$watch(
         function () {
	   var elem = $(idchart[0]).closest('div.visualize-chart');
           var h = elem.height();
           var w = elem.width();
	   if (idchart.length > 0 && h > 0 && w > 0) {
		   if (hold != h || wold != w) {
	            	 $scope.chart.resize({height: h - 50, width: w - 50});
	           	 hold = elem.height();
	          	 wold = elem.width();
		   }
           }      
         }, 
         true
    );

  })
});
