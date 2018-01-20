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
    return r2.x > (r1.x + r1.width) || r2.x < r1.x ||
      r2.y > (r1.y + r1.height) || r2.y < r1.y;
//  return r2.x > (r1.x + r1.width - r2.width) || r2.x < r1.x ||
//    r2.y > (r1.y + r1.height - r2.height) || r2.y < r1.y;
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
    var dy = y2 - y1;

    return Math.sqrt(dx*dx + dy*dy);

  },


  getAngle: function(x1, y1, x2, y2) {
    return (this.getAngleRad(x1, y1, x2, y2) / Math.PI) * 180;
  },


  collideParticles: function(thisParticle, otherParticle, collisionVector, sumOfRadii, sumOfMass, seperation) {

      // normalize the collision vector
      collisionVector.normalize();

      // avoid double collisions by "un-deforming" balls (larger mass == less tx)
      // this is susceptible to rounding errors, "jiggle" behavior and anti-gravity
      // suspension of the object get into a strange state
      let overlap = sumOfRadii - seperation;
      let mTranslateOutOfOverlap = collisionVector.multiply(overlap);

      //if (thisParticle.radius > otherParticle.radius) {
      //  otherParticle.pos.tx(mTranslateOutOfOverlap.multiply(-1));
      //} else {
      //  thisParticle.pos.tx(mTranslateOutOfOverlap);
      //}

      thisParticle.pos.tx(mTranslateOutOfOverlap.multiply(otherParticle.mass / sumOfMass));
      otherParticle.pos.tx(mTranslateOutOfOverlap.multiply(-thisParticle.mass / sumOfMass));

      //if (thisParticle.id !== 'mother') { thisParticle.pos.tx(mTranslateOutOfOverlap); }
      //if (otherParticle.id !== 'mother') { otherParticle.pos.tx(mTranslateOutOfOverlap.multiply(-1)); }

      // cr: Coefficient_of_restitution or Coefficient_or_elasticity
      // this interaction is strange, as the CR describes more than just
      // the ball's bounce properties, it describes the level of conservation
      // observed in a collision and to be "true" needs to describe, rigidity,
      // elasticity, level of energy lost to deformation or adhesion, and crazy
      // values (such as cr > 1 or cr < 0) for stange edge cases obviously not
      // handled here (see: http://en.wikipedia.org/wiki/Coefficient_of_restitution)
      // for now assume the ball with the least amount of elasticity describes the
      // collision as a whole:
      let cr = Math.min(thisParticle.cr, otherParticle.cr);

      // cache the magnitude of the applicable component of the relevant velocity
      let v1 = collisionVector.multiply(thisParticle.velocity.dot(collisionVector)).magnitude();
      let v2 = collisionVector.multiply(otherParticle.velocity.dot(collisionVector)).magnitude();

      // get the collision vector tangential
      let collisionTangent = new Vector2D(collisionVector.y, -collisionVector.x);

      // maintain the unapplicatble component of the relevant velocity
      // then apply the formula for inelastic collisions
      thisParticle.velocity = collisionTangent.multiply(thisParticle.velocity.dot(collisionTangent));
      thisParticle.velocity.tx(
        collisionVector.multiply(
          (cr * otherParticle.mass * (v2 - v1) + thisParticle.mass * v1 + otherParticle.mass * v2) / sumOfMass
        )
      );

      // do this once for each object, since we are assuming collide will be called
      // only once per "frame" and its also more effiecient for calculation cacheing
      // purposes
      otherParticle.velocity = collisionTangent.multiply(otherParticle.velocity.dot(collisionTangent));
      otherParticle.velocity.tx(
        collisionVector.multiply(
          (cr * thisParticle.mass * (v1 - v2) + otherParticle.mass * v2 + thisParticle.mass * v1) / sumOfMass
        )
      );

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

  },


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
