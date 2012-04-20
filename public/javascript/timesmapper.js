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
}

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
      var circle = this.createCircleMarker(locations[location]);
      group.addLayer(circle)
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
      this.removeMarker(this.markers[marker]);
    }
  },

  // Remove a single marker from the map
  removeMarker: function(marker) {
    this.m.removeLayer(marker);
  },

  removeLayers: function() {
    var layer;

    for (layer in this.layers) {
      this.m.removeLayer(this.layers[layer]);
    }
  },

  // Remove and delete all markers
  deleteMarkers: function() {
    for (marker in this.markers) {
      this.removeMarker(this.markers[marker]);
    }
    this.markers.length = 0;
  }
};

// Holds on to the results data
// from completed searches 
TM.cache = {};

// General utilities namespace
TM.utils = {

  // Triggered if a user comes to /search/:topic
  // rather than /!. Executes a search for :topic
  // and fills input with :topic
  refresh: function(location) {
    var url = location.split('/')

    if(url[1] === 'search') {
      $('.topic').val(url[2]);
      TM.utils.checkForData(url[2]);
    }
  },

  // Update the url with the search topic
  updateURL: function(topic) {
    history.pushState(null, '', '/search/' + topic);
  },

  handlePopState: function() {
    var url = location.pathname.split('/');

    if (url[1] && url[1] === 'search') {
      TM.utils.refresh(location.pathname);
    } else {
      TM.utils.clear();
    }
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
          stroke: false
        };
    
        var circle = map.createCircleMarker(loc, 0, options);
        map.addMarker(state.name, circle);
    });
  },

  checkForData: function(topic) {
    if (TM.cache[topic]) {
      console.log('cache');
      TM.utils.processResults(topic);
    } else  {
      console.log('query');
      TM.cache[topic] = {};
      TM.cache[topic].articles = [];
      TM.utils.makeQuery(topic, 0)
    }
  },

  processResults: function(topic) {
    if ($.isEmptyObject(map.markers)) {
      TM.utils.addStateMarkers();
    }
    TM.cache[topic].states = {};
    TM.utils.countArticles(topic, TM.cache[topic].articles);
  },

  // Make a query to the NYT Article API
  makeQuery: function(topic, offset) {
    var cleanTopic = escape(topic);

    $.ajax({
      url: '/query/' + topic + '/' + offset,
      success: function(data) {
        TM.cache[topic].articles = TM.cache[topic].articles.concat(data.results);

        if (TM.cache[topic].articles.length === 50 || data.results.length === 0) {
          TM.utils.processResults(topic);
        } else {
          window.setTimeout(function() { TM.utils.makeQuery(topic, offset + 10); }, 250);
        }
      }
    });
  },

  // Count the number of articles per state
  countArticles: function(topic, articles) {
    for (article in articles) {
      var state = TM.utils.findState(articles[article].geo_facet);
      if (state) {
        if (TM.cache[topic].states[state]) {
          TM.cache[topic].states[state]++ 
        } else {
          TM.cache[topic].states[state] = 1;
        }
      }
    }
    TM.utils.updateStateMarkers(topic);
  },

  findState: function(geo_facet) {
    var tag,
      state;

    for (tag in geo_facet) {
      for (state in TM.states) {
        if (geo_facet[tag] === TM.states[state].name) {
          return geo_facet[tag];
        }
      }
    }
  },

  // Update the state marker radius size with
  // the number of articles per state * a factor
  updateStateMarkers: function(topic) {
    var stateCounts = TM.cache[topic].states;
    
    for (marker in map.markers){
      if (map.markers.hasOwnProperty(marker)) {
        if (TM.cache[topic].states[marker]) {
          TM.utils.updateMarkerRadius(marker, TM.cache[topic].states[marker] * 75000);
        } else {
          TM.utils.updateMarkerRadius(marker, 0);
        }
      }
    }

  },

  // Update the given marker's radius
  updateMarkerRadius: function(id,size) {
    map.markers[id].setRadius(size); 
  },

  // Resets the page to the default state
  // Clears map, inputs, etc.
  clear: function() {
    $('.topic').val('');
    TM.utils.resetMarkerRadius();
  },

  // Set each marker's radius back to 0
  resetMarkerRadius: function() {
    for (marker in map.markers) {
      if (map.markers.hasOwnProperty(marker)) {
        TM.utils.updateMarkerRadius(marker, 0);
      }
    }
  }
}