/*globals window */

window.Lib = {

  extend: function(obj, extendWith) {

    if ( ! extendWith) { return; }

    for (var prop in extendWith) {
      if (extendWith.hasOwnProperty(prop)) {
        obj[prop] = extendWith[prop];
      }
    }

  },


  lpad: function(str,len,pad) {

    if (!pad) { pad = "0"; }

    if (typeof str === "number") {
      str = str.toString();
    }

    if (len > str.length) {
      return new Array(len + 1 - str.length).join(pad) + str;
    } else {
      return str;
    }

  },


  approach: function(val, limit, increment, touchLimit) {

    var dV = val - limit;

    if (dV > 0) {
      if (dV > increment) { return val - increment; }
    } else {
      if (-dV > increment) { return val + increment; }
    }

    return touchLimit ? limit : val;

  },


  intersectRect: function(r1, r2) {
    return !(r2.x > (r1.x + r1.width) || (r2.x + r2.width) < r1.x ||
      r2.y > (r1.y + r1.height) || (r2.y + r2.height) < r1.y);
  },


  outOfBounds: function(r1, r2) {
    // r1 == Bounds Rect, r2 = Object Rect
    return r2.x > (r1.x + r1.width - r2.width) || r2.x < r1.x ||
      r2.y > (r1.y + r1.height - r2.height) || r2.y < r1.y;
  },


  getAngleRad: function(x1, y1, x2, y2) {

    var dx = x2 - x1;
    var dy = y1 - y2;
    var rads = Math.atan2(dy, dx);

    // 'rad' range = 0 to Math.PI (clockwise), 0 to -Math.PI (anti-clockwise)
    return (rads < 0) ? 2*Math.PI + rads : rads; // Fix +- result of Math.atan2()

  },


  distance: function(x1, y1, x2, y2) {

    var dx = x2 - x1;
    var dy = y1 - y2;

    return Math.sqrt(dx*dx + dy*dy);

  },


  getAngle: function(x1, y1, x2, y2) {
    return (this.getAngleRad(x1, y1, x2, y2) / Math.PI) * 180;
  },


  rateLimit: function(func, wait, immediate) {

      var delayTimer;

      return function() {

        // If busy with delay, exit.
        if (delayTimer) { return; }

        var context = this;
        var args = arguments;

        // If it's the first call and "immediate" is set,
        // don't wait, just run the function and exit.
        if (immediate) {
          // Note: "immediate" is persistent between calls (just like "delayTimer")
          // and will remember its value in future calls. I.e. future calls will be delayed!
          immediate = false;
          return func.apply(context, args);
        }

        delayTimer = setTimeout(function() {
           delayTimer = false;
           func.apply(context, args);
        }, wait);

      };

  },


  // Get the best timestamp depending on browser capabilities!

  getTime: function() {

    if (window.performance.now) {

      return window.performance.now();

    } else {

      if (window.performance.webkitNow) {

        return window.performance.webkitNow();

      } else {

        return new window.Date().getTime();

      }

    }

  },


  clone: function(obj) {
    return JSON.parse(JSON.stringify(obj));
  },


  removeItem(list, val) {

    var i, n = list.length, rlist = [];

    for (i = 0; i < n; i++) {
      if (list[i] !== val) { rlist.push(list[i]); }
    }

    return rlist;

  }

}; // end: Lib



// ----------------
// Custom Polyfills
// ----------------

if ( ! Array.prototype.indexOf) { //IE8 does not support "indexOf"

  Array.prototype.indexOf = function(obj, start) {

     for (var i = (start || 0), j = this.length; i < j; i++) {
       if (this[i] === obj) { return i; }
     }

     return -1;

  };

}


if ( ! Array.prototype.includes) {

  Array.prototype.includes = function(value) {

    for (var i = 0, n = this.length; i < n; i++) {
      if (value === this[i]) { return true; }
    }

  };

}


window.requestAnimationFrame =
  window.requestAnimationFrame        ||
  window.mozRequestAnimationFrame     ||
  window.webkitRequestAnimationFrame  ||
  window.msRequestAnimationFrame      ||
  function(f){
    return setTimeout(f, 1000/60);
  }; // simulate calling code 60


window.cancelAnimationFrame =
  window.cancelAnimationFrame     ||
  window.mozCancelAnimationFrame  ||
  function(requestID){
    clearTimeout(requestID);
  }; //fall back
