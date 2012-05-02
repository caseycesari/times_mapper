if (typeof TM === 'undefined' || !TM) {
  var TM = {};
}

// Map constructer
TM.Map = function(container, options, callback) {
  this.options = options;
  this.markers = {};
  this.layers = [];
  var parent = this;

  wax.tilejson('http://a.tiles.mapbox.com/v3/caseypt.map-6gb1zsot.jsonp',
    function(tilejson) {
      var center = options.center.split(',');

      parent.m = new L.Map(container, options)
        .addLayer(new wax.leaf.connector(tilejson))
        .setView(new L.LatLng(center[0], center[1]), options.zoom);
        
      if (typeof callback === "function" && callback) { callback(); }
  });
};

// TM.Map utlities
TM.Map.prototype = {

  // Create and add a single point marker to the map
  addMarker: function(id, marker) {
    //var markerLocation = new L.LatLng(options.lat, options.lng);
    //var marker = new L.Marker(markerLocation);
    this.m.addLayer(marker);
    this.markers[id] = marker;
  },

  // Create a group of circle markers
  createCircleMarkerLayerGroup: function(locations) {
    var location,
      group = new L.LayerGroup();

    for (location in locations) {
      if (locations.hasOwnProperty(location)) {
        var circle = this.createCircleMarker(locations[location]);
        group.addLayer(circle);
      }
    }

    this.m.addLayer(group);
    this.layers.push(group);
  },

  // Create circle marker
  createCircleMarker: function(loc, size, options) {
    var circleLocation = new L.LatLng(loc.lat, loc.lng);
    var circle = new L.Circle(loc, size, options);

    return circle;
  },

  // Remove all the markers from the map
  removeMarkers: function() {
    var marker;

    for (marker in this.markers) {
      if (this.markers.hasOwnProperty(marker)) {
        this.removeMarker(this.markers[marker]);
      }
    }
  },

  // Remove a single marker from the map
  removeMarker: function(marker) {
    this.m.removeLayer(marker);
  },

  // Remove all layers from the map
  removeLayers: function() {
    var layer;

    for (layer in this.layers) {
      if (this.layers.hasOwnProperty(layer)) {
        this.m.removeLayer(this.layers[layer]);
      }
    }
  },

  // Remove and delete all markers
  deleteMarkers: function() {
    var marker; 

    for (marker in this.markers) {
      if (this.markers.hasOwnProperty(marker)) {
        this.removeMarker(this.markers[marker]);
      }
    }
    this.markers.length = 0;
  }
};

// Holds on to the results data
// from completed searches 
TM.cache = {};

// General utilities namespace
TM.utils = {

  // Triggered when page url changes
  handlePopState: function() {
    var url = location.pathname.split('/');

    if (url[1] && url[1] === 'search') {
      TM.utils.refresh(location.pathname);
    } else {
      TM.utils.clear();
    }
  },

  // Triggered if a user comes to /search/:topic
  // rather than /!. Executes a search for :topic
  // and fills input with :topic
  refresh: function(location) {
    var url = location.split('/');

    if(url[1] === 'search') {
      $('.topic').val(url[2]);
      TM.utils.checkForData(url[2]);
    }
  },

  // Update the url with the search topic
  updateURL: function(topic) {
    history.pushState(null, '', '/search/' + topic);
  },

  // Creates the initial markers for each state
  // with a radius of 0 so they are not visible.
  addStateMarkers: function() {
    var state;

    TM.states.forEach(function (state) {
        var loc = {
          lat: state.lat,
          lng: state.lng
        };
        var options = {
          fillColor: '#222',
          fillOpacity: 0.5,
          stroke: true,
          weight: 0,
          color: '#414141'
        };
    
        var circle = map.createCircleMarker(loc, 0, options);
        map.addMarker(state.name, circle);
    });
  },

  // Checks to see if the topic is already cached
  // or if we need to query the NYT API
  checkForData: function(topic) {
    if (TM.cache[topic]) {
      TM.utils.processResults(topic);
    } else  {
      $('h2').html('Fetching articles...');
      TM.cache[topic] = {};
      TM.cache[topic].articles = [];
      TM.utils.makeQuery(topic, 0);
    }
  },

  // Make a query to the NYT Article API
  makeQuery: function(topic, offset) {
    $.ajax({
      url: '/query/' + topic + '/' + offset,
      success: function(data) {
        TM.cache[topic].articles = TM.cache[topic].articles.concat(data.results);

        if (TM.cache[topic].articles.length === 100 || data.results.length === 0) {
          TM.utils.processResults(topic);
        } else {
          window.setTimeout(function() { TM.utils.makeQuery(topic, offset + 10); }, offset * 10);
        }
      }
      error: function() {
        TM.utils.showResultsMsg('Sorry, there was an error with your search.');
      }
    });
  },

  // Makes sure the state markers exists
  // the moves on to processing the response
  // from the NYT API
  processResults: function(topic) {
    if ($.isEmptyObject(map.markers)) {
      TM.utils.addStateMarkers();
    }
    TM.cache[topic].states = {};
    TM.utils.countArticles(topic, TM.cache[topic].articles);
    if (TM.cache[topic].msg) { 
      TM.utils.showResultsMsg(TM.cache[topic].msg);
    } else {
      TM.utils.buildResultsMsg(topic);
    }
  },

  // Builds and caches the search summary message
  buildResultsMsg: function(topic) {
    var msg,
      art = 'articles',
      ind = 'are',
      rawCount = '100+';

    if (TM.cache[topic].articles.length !== 100) {
      rawCount = TM.cache[topic].articles.length;
    } 

    console.log('rawCount', rawCount);
    console.log('articles.length', TM.cache[topic].articles.length);

    if (rawCount === 1) {
      art = 'article'
    } 

    if (TM.cache[topic].taggedCount === 1) {
      ind = 'is'
    } 

    msg = 'The New York Times published ' +
      ' <em>' + rawCount + '</em> ' +
      art + ' in the past 90 days containing ' +
      ' <em>' + topic + '</em>; ' + 
      '<em>' + TM.cache[topic].taggedCount + '</em>' +
      ' of which ' + ind + ' tagged with a state.';

    TM.cache[topic].msg = msg;
    TM.utils.showResultsMsg(msg);
  },

  // Shows the search summary message
  showResultsMsg: function(msg) {
    $('h2').html(msg);
  },

  // Count the number of articles per state
  countArticles: function(topic, articles) {
    var article;
    TM.cache[topic].taggedCount = 0;

    for (article in articles) {
      if (articles.hasOwnProperty(article)) {
        var state = TM.utils.findState(articles[article].geo_facet);
        
        if (state) {
          if (TM.cache[topic].states[state]) {
            TM.cache[topic].states[state]++;
          } else {
            TM.cache[topic].states[state] = 1;
          }
          TM.cache[topic].taggedCount++;
        }
      }
    }
    TM.utils.updateStateMarkers(topic);
  },

  // Look for a US State in the an article's
  // geo_facet tags
  findState: function(geo_facet) {
    var tag,
      state;

    for (tag in geo_facet) {
      if (geo_facet.hasOwnProperty(tag)) {
        for (state in TM.states) {
          if (geo_facet[tag] === TM.states[state].name) {
            return geo_facet[tag];
          }
        }
      } 
    }
  },

  // Update the state marker radius size with
  // the number of articles per state * a factor
  updateStateMarkers: function(topic) {
    var marker;
    var stateCounts = TM.cache[topic].states;
    
    for (marker in map.markers){
      if (map.markers.hasOwnProperty(marker)) {
        if (TM.cache[topic].states[marker]) {
          var factor = (Math.log(TM.cache[topic].states[marker] + 1) * 100000);

          TM.utils.setRolloverEvents(map.markers[marker], marker, topic);
          TM.utils.updateMarkerRadius(marker, factor);
        } else {
          TM.utils.updateMarkerRadius(marker, 0);
        }
      }
    }
  },

  // Set up marker toolips 
  setRolloverEvents: function (marker, id, topic) {
    var offset = $('.leaflet-control-container').offset();

    marker.on("mouseover", function () {
      TM.utils.setMarkerHighlight(marker);

      var html = TM.utils.makeArticleSnippet(id, topic);
      TM.utils.showToolTip(html);

      $(document).mousemove(function(e){
        $('.tooltip').css({
          left: e.pageX - offset.left - 57,
          top: e.pageY - offset.top - 65
        });
      });
    });

    marker.on("mouseout", function () { 
      TM.utils.removeMarkerHighlight(marker);
      $('.tooltip').hide();
      $(document).unbind('mousemove');
    });
  },

  // Update the given marker's radius
  updateMarkerRadius: function(id,size) {
    map.markers[id].setRadius(size); 
  },

  // Compile the HTML needed for the marker tooltips
  makeArticleSnippet: function(id, topic) {
    var html,
      title,
      article;

    title = id.toLowerCase();
    var articles = (TM.cache[topic].states[id] === 1) ? 'Article' : 'Articles';

    html =  "<h2>" + title + "</h2>" +
            "<p>" + TM.cache[topic].states[id] + 
            ' ' + articles + '<p>'; 

    return html;
  },

  // Set a marker to hightlight style
  setMarkerHighlight: function(marker) {
    marker.setStyle({
      stroke: true,
      weight: 2,
      color: '#414141',
      opacity: 1
    });
  },

  // Set's a marker back to the default style
  removeMarkerHighlight: function(marker) {
    marker.setStyle({
      stroke: true,
      weight: 0
    });
  },

  // Creates and shows the tooltip
  // HTML element
  showToolTip: function (html) {
    if($('.tooltip').length) {
        $('.tooltip').html(html).show();
    } else {
      $('<div/>', {
        class: 'tooltip',
        html: html
      }).appendTo('.leaflet-control-container').show();
    }
  },

  // Resets the page to the default state
  // Clears map, inputs, etc.
  clear: function() {
    $('.topic').val('');
    TM.utils.resetMarkerRadius();
  },

  // Set each marker's radius back to 0
  resetMarkerRadius: function() {
    var marker;

    for (marker in map.markers) {
      if (map.markers.hasOwnProperty(marker)) {
        TM.utils.updateMarkerRadius(marker, 0);
      }
    }
  }
};
