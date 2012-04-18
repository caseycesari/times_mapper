if (typeof TM === 'undefined' || !TM) {
  var TM = {};
}

// Map constructer
TM.Map = function(options) {
  this.options = options;
  this.markers = [];
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

  // Add a single marker to the map
  addMarker: function(options) {
    var markerLocation = new L.LatLng(options.lat, options.lng);
    var marker = new L.Marker(markerLocation);
    this.m.addLayer(marker);

    this.markers.push(marker);
  },

  // Remove all the markers from the map
  removeMarkers: function() {
    for (marker in this.markers) {
      this.removeMarker(this.markers[marker]);
    }
  },

  // Remove a single marker from the map
  removeMarker: function(marker) {
    this.m.removeLayer(marker);
  },

  // Remove and delete all markers
  deleteMarkers: function() {
    for (marker in this.markers) {
      this.removeMarker(this.markers[marker]);
    }
    this.markers.length = 0;
  }

};

// General utility function namespace
TM.utils = {

  // Triggered if a user comes to /search/:topic
  // rather than /. Executes a search for :topic
  // and fills input with :topic
  refresh: function(location) {
    var url;

    url = location.split('/')

    $('.topic').val(url[2]);
    TM.utils.makeQuery(url[2]);
  },

  // Update the url with the search topic
  updateURL: function(topic) {
    history.pushState(null, '', '/search/' + topic);
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
        TM.utils.updateURL(topic);
        console.log(data.results);
        $('.results').html(JSON.stringify(data.results));
      }
    })
  },

  // Resets the page to the default state
  // Clears map, inputs, etc.
  clear: function() {
    $('.topic').val('');
    history.pushState(null, '', '/');
    //clear map
  }

}