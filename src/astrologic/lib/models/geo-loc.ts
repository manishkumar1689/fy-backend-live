import { isNumeric } from '../../../lib/validators';

export class GeoLoc {
  lat = 0;
  lng = 0;
  alt = 0;

  constructor(geoData: any = null) {
    if (geoData instanceof Object) {
      Object.entries(geoData).forEach(entry => {
        const [key, value] = entry;
        let flVal = 0;
        let isNumber = false;
        switch (typeof value) {
          case 'string':
            flVal = parseFloat(value);
            isNumber = isNumeric(value);
            break;
          case 'number':
            flVal = value;
            isNumber = true;
            break;
          default:
            if (value instanceof Number) {
              flVal = parseFloat(value.toString());
              isNumber = true;
            }
            break;
        }
        if (isNumber) {
          switch (key) {
            case 'lat':
            case 'latitude':
              this.lat = flVal;
              break;
            case 'lng':
            case 'lon':
            case 'longitude':
              this.lng = flVal;
              break;
            case 'alt':
            case 'altitude':
              this.alt = flVal;
              break;
          }
        }
      });
    }
  }

  get latitude() {
    return this.lat;
  }

  get longitude() {
    return this.lng;
  }

  get altitude() {
    return this.alt;
  }

  get latLng() {
    return { lat: this.lat, lng: this.lng };
  }
}
