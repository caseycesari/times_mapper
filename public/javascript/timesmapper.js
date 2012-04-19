if (typeof TM === 'undefined' || !TM) {
  var TM = {};
}

// Map constructer
TM.Map = function(options, callback) {
  this.options = options;
  this.markers = {};
  this.layers = [];
  var parent = this;

  wax.tilejson('http://a.tiles.mapbox.com/v3/caseypt.map-6gb1zsot.jsonp',
    function(tilejson) {
      parent.m = new L.Map(options.container)
        .addLayer(new wax.leaf.connector(tilejson))
        .setView(new L.LatLng(options.lat, options.lng), options.zoom);
        
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
  // rather than /. Executes a search for :topic
  // and fills input with :topic
  refresh: function(location) {
    var url = location.split('/')

    if(url[1] === 'search') {
      $('.topic').val(url[2]);
      TM.utils.checkForData(url[2]);
    }
  },

  addStateMarkers: function() {
    var state;

    states.forEach(function (state) {
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

  checkForData: function(topic) {
    if (TM.cache[topic]) {
      console.log('cache');
      TM.utils.processResults(topic);
    } else  {
      console.log('query');
      TM.utils.makeQuery(topic)
    }
  },

  processResults: function(topic) {
    if ($.isEmptyObject(map.markers)) {
      TM.utils.addStateMarkers();
    }
    TM.cache[topic].states = {};
    TM.utils.countArticles(topic, TM.cache[topic].data.results);
  },

  countArticles: function(topic, articles) {
    for (article in articles) {
      var geo = articles[article].geo_facet;
      if (geo) {
        if (TM.cache[topic].states[geo[0]]) {
          TM.cache[topic].states[geo[0]]++ 
        } else {
          TM.cache[topic].states[geo[0]] = 1;
        }
      }
    }
    TM.utils.updateStateMarkers(topic);
  },

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

  // Make a query to the NYT Article API
  // If the query is successful, update the URL
  // and pass on the results.
  makeQuery: function(topic) {
    var cleanTopic = escape(topic);

    $.ajax({
      url: '/query/' + topic,
      success: function(data) {
        TM.cache[topic] = {};
        TM.cache[topic].data = data;
        TM.utils.processResults(topic);
      }
    });
  },

  updateMarkerRadius: function(id,size) {
    map.markers[id].setRadius(size); 
  },

  resetMarkerRadius: function() {
    for (marker in map.markers) {
      if (map.markers.hasOwnProperty(marker)) {
        TM.utils.updateMarkerRadius(marker, 0);
      }
    }
  },  

  // Resets the page to the default state
  // Clears map, inputs, etc.
  clear: function() {
    $('.topic').val('');
    TM.utils.resetMarkerRadius();
  }

}