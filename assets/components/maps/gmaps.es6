/**
 * Google Maps
 * @param  {Element} el
 * @param  {Object} props
 */
function GMaps(el, props) {
  this.el = el;
  this.props = props;

  this.props.width = parseInt(this.el.getAttribute('data-width')) || 400;
  this.props.height = parseInt(this.el.getAttribute('data-height')) || 300;
  this.props.zoom = parseInt(this.el.getAttribute('data-zoom')) || 17;
  this.props.pins = this.el.getAttribute('data-pin');

  if (this.el.hasAttribute('data-address')) {
    this.geolookup();
  } else if (this.el.hasAttribute('data-latlng')) {
    var [lat, lng] = this.el.getAttribute('data-latlng').split(',');
    this.props.options = {
      center:      new google.maps.LatLng(lat, lng),
      zoom:        this.props.zoom,
      scrollwheel: false,
      mapTypeId:   google.maps.MapTypeId.ROADMAP
    };
    this.draw();
  }
}

GMaps.label = 'GMaps';
GMaps.selector = '[data-latlng], [data-address]';
GMaps.dependencies = {
  scripts: [`https://maps.googleapis.com/maps/api/js?key=${process.env.GMAPSJSAPIKEY}`],
  shouldLoadScripts: function () {
    return !window.google;
  }
};

GMaps.prototype.draw = function() {
  this.el.style.width = this.props.width + 'px';
  this.el.style.height = this.props.height + 'px';

  this.map = new google.maps.Map(this.el, this.props.options);

  if (this.props.pins) {
    this.markers();
  }

  if (this.el.hasAttribute('data-grayscale')) {
    this.stylemap();
  }
};

GMaps.prototype.geolookup = function() {
  var geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: this.el.getAttribute('data-address') }, this.handleResult.bind(this));
};

GMaps.prototype.handleResult = function(results, status) {
  if (status == google.maps.GeocoderStatus.OK) {
    this.props.options = {
      center:      results[0].geometry.location,
      zoom:        this.props.zoom,
      scrollwheel: false,
      mapTypeId:   google.maps.MapTypeId.ROADMAP
    };
    this.draw();
  }
};

GMaps.prototype.markers = function() {
  var pins = this.props.pins.split('|');
  for (var i = pins.length - 1; i >= 0; i--) {
    var ll = pins[i].split(',');
    new google.maps.Marker({
      map:      this.map,
      position: new google.maps.LatLng(ll[0], ll[1])
    });
  }
};

GMaps.prototype.stylemap = function() {
  var styleOptions = [{
    stylers: [
     { hue: '#203D65' }, { saturation: -80 }
    ]
  }];
  var styledMap = new google.maps.StyledMapType(styleOptions, { name: 'Styled Map' });
  this.map.mapTypes.set('map_style', styledMap);
  this.map.setMapTypeId('map_style');
};

module.exports = GMaps;
