function init(args) {
    'use strict';
    var defaults = {
        target: null,
        title: null,
        description: null
    };

    if (!args) { args = {}; }
    args = merge_with_defaults(args, defaults);

    if (d3.select(args.target).empty()) {
        console.warn('The specified target element "' + args.target + '" could not be found in the page. The chart will not be rendered.');
        return;
    }

    //this is how we're dealing with passing in a single array of data,
    //but with the intention of using multiple values for multilines, etc.

    //do we have a time_series?
    if(args.data[0][0][args.x_accessor] instanceof Date) {
        args.time_series = true;
    } else {
        args.time_series = false;
    }

    var svg_width = args.width;
    var svg_height = args.height;

     //are we setting the aspect ratio
    if (args.full_width) {
        // get parent element
        svg_width = get_width(args.target);
    }

    if (args.fill_height) {
        svg_height = get_height(args.target);
    }

    if (args.chart_type === 'bar' && svg_height === null) {
        svg_height = args.height = args.data[0].length * args.bar_height + args.top + args.bottom;
    }

    var container = document.querySelector(args.target);

    //remove the svg if the chart type has changed
    //chart_type => element className
    var hasChanged = [
      {'line': '.main-line'},
      {'point': '.points'},
      {'histogram': '.histogram'},
      {'bar': '.barplot'}
    ].some(function(c) {
      var chart_type = Object.keys(c)[0];
      var className = c[chart_type];

      var e = document.querySelector(args.target + ' ' + className)
      return e && e.length && args.chart_type !== chart_type 
    })

    if(hasChanged === true) {
      container.innerHTML = '';
    }

    //add svg if it doesn't already exist
    //using trim on html rather than :empty to ignore white spaces if they exist
    //trim from http://stackoverflow.com/questions/498970/trim-string-in-javascript
    if(container.innerHTML.replace(/^\s+|\s+$/g, '') == '') {
        //add svg
        d3.select(args.target)
            .append('svg')
                .classed('linked', args.linked)
                .attr('width', svg_width)
                .attr('height', svg_height);
    }

    args.width = svg_width;
    args.height = svg_height;

    var svg = d3.select(args.target).selectAll('svg');

    // add clip path element to svg.
    svg.append('defs')
        .append('clipPath')
            .attr('id', 'mg-plot-window-' + mg_strip_punctuation(args.target))
        .append('svg:rect')
            .attr('x', args.left)
            .attr('y', args.top)
            .attr('width', args.width - args.left - args.right - args.buffer)
            .attr('height', args.height - args.top - args.bottom - args.buffer + 1);

    //has the width or height changed?
    if (svg_width !== Number(svg.attr('width'))) {
        svg.attr('width', svg_width);
    }

    if (svg_height !== Number(svg.attr('height'))) {
        svg.attr('height', svg_height);
    }

    // This is an unfinished feature. Need to reconsider how we handle automatic scaling.
    svg.attr('viewBox', '0 0 ' + svg_width + ' ' + svg_height);

    if (args.full_width || args.full_height) {
        svg.attr('preserveAspectRatio', 'xMinYMin meet');
    }

    // remove missing class
    svg.classed('mg-missing', false);

    // remove missing text
    svg.selectAll('.mg-missing-text').remove();
    svg.selectAll('.mg-missing-pane').remove();

    //add chart title if it's different than existing one
    chart_title(args);

    //draw axes
    args.use_small_class = args.height - args.top - args.bottom - args.buffer
            <= args.small_height_threshold && args.width - args.left-args.right - args.buffer * 2
            <= args.small_width_threshold || args.small_text;

    //if we're updating an existing chart and we have fewer lines than
    //before, remove the outdated lines, e.g. if we had 3 lines, and we're calling
    //data_graphic() on the same target with 2 lines, remove the 3rd line
    var i;
    var mainLine = container.querySelectorAll('svg .mg-main-line');
    if(mainLine && args.data.length < mainLine.length) {
        //now, the thing is we can't just remove, say, line3 if we have a custom
        //line-color map, instead, see which are the lines to be removed, and delete those
        if(args.custom_line_color_map.length > 0) {
            var array_full_series = function(len) {
                var arr = new Array(len);
                for(i = 0; i < arr.length; i++) { arr[i] = i + 1; }
                return arr;
            };

            //get an array of lines ids to remove
            var lines_to_remove = arrDiff(
                array_full_series(args.max_data_size),
                args.custom_line_color_map);

            for(i = 0; i<lines_to_remove.length; i++) {
                var toRemove = container.querySelector('svg .mg-main-line.mg-line' + lines_to_remove[i] + '-color')
                toRemove.parentNode.removeChild(toRemove);
            }
        }
        //if we don't have a customer line-color map, just remove the lines from the end
        else {
            var num_of_new = args.data.length;
            var num_of_existing = !mainLine ? 0 : mainLine.length;

            for(i = num_of_existing; i>num_of_new; i--) {
                var toRemove = container.querySelector('svg .mg-main-line.mg-line' + i + '-color')
                toRemove.parentNode.removeChild(toRemove);
            }
        }
    }

    return this;
}
