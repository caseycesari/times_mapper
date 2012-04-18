if (typeof TM === 'undefined' || !TM) {
  var TM = {};
}

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

TM.Map.prototype = {

  addMarker: function(options) {
    var markerLocation = new L.LatLng(options.lat, options.lng);
    var marker = new L.Marker(markerLocation);
    this.m.addLayer(marker);

    this.markers.push(marker);
  },

  removeMarkers: function() {
    for (marker in this.markers) {
      this.removeMarker(this.markers[marker]);
    }
  },

  removeMarker: function(marker) {
    this.m.removeLayer(marker);
  },

  deleteMarkers: function() {
    for (marker in this.markers) {
      this.removeMarker(this.markers[marker]);
    }
    this.markers.length = 0;
  }

};

TM.utils = {

}