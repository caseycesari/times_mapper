if (typeof TM === 'undefined' || !TM) {
  var TM = {};
}

// Map constructer
TM.Map = function(options) {
  this.options = options;
  this.markers = [];
  this.layers = [];
  var parent = this;

  wax.tilejson('http://a.tiles.mapbox.com/v3/caseypt.map-6gb1zsot.jsonp',
    function(tilejson) {
      parent.m = new L.Map(options.container)
        .addLayer(new wax.leaf.connector(tilejson))
        .setView(new L.LatLng(options.lat, options.lng), options.zoom);
  });
}

// TM.Map utlities
TM.Map.prototype = {

  // Create and add a single point marker to the map
  addMarker: function(options) {
    var markerLocation = new L.LatLng(options.lat, options.lng);
    var marker = new L.Marker(markerLocation);
    this.m.addLayer(marker);

    this.markers.push(marker);
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
  createCircleMarker: function(options) {
    var circleLocation = new L.LatLng(options.lat, options.lng),
    circleOptions = {
        color: '#333',
        fillColor: '#222',
        fillOpacity: 0.5
    };

    var circle = new L.Circle(circleLocation, 100000, circleOptions);

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
  },

  fitToMarkers: function() {

  },

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
    var url;

    url = location.split('/')

    if(url[1] === 'search') {
      $('.topic').val(url[2]);
      TM.utils.checkForData(url[2]);
    }
  },

  // Update the url with the search topic
  updateURL: function(topic) {
    history.pushState(null, '', '/search/' + topic);
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
    TM.utils.parseArticles(TM.cache[topic].data.results);
  },

  parseArticles: function(articles) {
    var locations = [];

    for (article in articles) {
      if (articles[article].nytd_geo_facet) {
        var location = {};
        var geo;

        //geo = articles[article].nytd_geo_facet[0];
        location.lat = TM.cache.locations['FLORIDA'].lat;
        location.lng = TM.cache.locations['FLORIDA'].lng;
        location.title = articles[article].title;

        locations.push(location);
      }
    }

    map.createCircleMarkerLayerGroup(locations);
  },

  cacheLocations: function(callback) {
    $.ajax({
      url: '/locations',
      dataType: 'json',
      success: function(data) {
        TM.cache.locations = data;
      }
    });
  },

  // Make a query to the NYT Article API
  // If the query is successful, update the URL
  // and pass on the results.
  makeQuery: function(topic) {
    var cleanTopic;

    cleanTopic = escape(topic);

    $.ajax({
      url: '/query/' + topic,
      success: function(data) {
        TM.cache[topic] = {};
        TM.cache[topic].data = data;
        TM.utils.processResults(topic);
      }
    });
  },

  // Saves a location along with its coordinats 
  // to the database
  saveLocation: function(location) {
    var params;

    params = location.name + "/" + location.lat + "/" + location.lng + "/";

    $.ajax({
      type: 'POST',
      url: '/location/' + params,
      success: function() {
        console.log('saved');
      }
    });
  },

  // Resets the page to the default state
  // Clears map, inputs, etc.
  clear: function() {
    $('.topic').val('');
    map.removeLayers();
    map.removeMarkers();
  }

}