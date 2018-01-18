class Vector2D {

  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  magnitude() {
    return this.length();
  }

  normalize() {
    var s = 1 / this.length();
    this.x *= s;
    this.y *= s;
    return this;
  }

  multiply(s) {
    return new Vector2D(this.x * s, this.y * s);
  }

  tx(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

}



class View {

  constructor(id)
  {
    this.id = id
    this.elm = document.getElementById(id);
    this.pos = new Vector2D;
    this.uy = 0;
    this.width = 0;
    this.height = 0;
  }

  isVisible(sprObj) {
    return ! Lib.outOfBounds(
      {x: this.ux, y: this.uy, width: this.getWidth(), height: this.getHeight()},
      {x: sprObj.pos.x, y: sprObj.pos.y, width: sprObj.width, height: sprObj.height}
    );
  }

  add(spriteObj) {
    this.elm.appendChild(spriteObj.elm);
  }

  clear() {
    this.elm.innerHTML = '';
  }

  getWidth() {
    this.width = this.elm.clientWidth;
    return this.width;
  }

  getHeight() {
    this.height = this.elm.clientHeight;
    return this.height;
  }

  getXOnView(spriteObj) {
    return spriteObj.pos.x - this.ux;
  }

  getYOnView(spriteObj) {
    return spriteObj.pos.y - this.uy;
  }

}



class Text {

  constructor(text) {
    this.elm = document.createElement('div');
    this.elm.className = 'text';
    this.value = text;
    this.lastValue = undefined;
    this.valueChanged = false;
  }

  update(now) {
    this.valueChanged = (this.value !== this.lastValue);
    this.lastValue = this.value;
  }

  draw() {
    if (this.valueChanged) {
      this.elm.innerText = this.value;
      this.valueChanged = false;
    }
  }

}



class DebugView extends View {

  constructor(id) {
    super(id);
    this.messages = {};
  }

  addMessage(name, text) {
    let message = new Text(text);
    this.messages[name] = message;
    this.add(message);
  }

  updateMessage(name, message) {
    this.messages[name].value = message;
  }

  update(now) {
    //console.log('DebugView Update');
    for (let name in this.messages) {
      this.messages[name].update(now);
    }
  }

  draw() {
    //console.log('DebugView Draw');
    for (let name in this.messages) {
      this.messages[name].draw();
    }
  }

}



class Particle {

  constructor(id, parent, elasticity, ux, uy, angle, speed, radius, mass) {
    this.id = id;
    this.parent = parent;
    this.bgColor = 'border-color:#222;';
    this.elm = document.createElement('div');
    this.elm.className = 'particle';
    this.angle = angle || 0;
    this.speed = speed || 1;
    this.velocity = new Vector2D(this.speed * Math.cos(this.angle), this.speed * Math.sin(this.angle));
    this.pos = new Vector2D(ux, uy); // position
    this.radius = radius || 1;
    this.mergeRadius = this.radius / 2;
    this.influenceRadius = this.radius * 1.3;
    this.mass = mass || this.radius;
    this.height = this.radius * 2;
    this.width = this.radius * 2;
    this.subParticles = [];
    this.cr = elasticity;
    this.state = 'Normal';
    this.visible = true;
  }


  detectCollision(otherParticles) {

    //console.log('Particle::detectCollision...');

    let thisParticle = this;
    let otherParticle = undefined;
    let thisRadius = thisParticle.radius
    let otherRadius = 0

    if (thisParticle.state === 'Hit' || thisParticle.state === 'Destroy') { return; }

    let mergeIntoNewParticle = false;
    let collideParticles = false;

    for (let i=0, n=otherParticles.length; i < n; i++) {

      otherParticle = otherParticles[i];

      if (otherParticle.state === 'Hit' || otherParticle.state === 'Destroy') { continue; }

      if (otherParticle.id !== thisParticle.id) {

        let seperation = Lib.distance(thisParticle.pos.x, thisParticle.pos.y, otherParticle.pos.x, otherParticle.pos.y);

        if (seperation < thisRadius + otherParticle.radius) {

          if (seperation < thisParticle.mergeRadius + otherParticle.mergeRadius && Math.random() > 0.95) {

            otherParticle.state = 'Destroy';
            thisParticle.state = 'Destroy';
            mergeIntoNewParticle = true;
            break;
          }

          otherParticle.state = 'Hit';
          thisParticle.state = 'Hit';
          collideParticles = true;
          break;
        }
      }
    }

    if (mergeIntoNewParticle) {

      let m1 = thisParticle.mass;
      let m2 = otherParticle.mass;
      let v1 = thisParticle.velocity;
      let v2 = otherParticle.velocity;
      let newRadius = thisParticle.radius + otherParticle.radius
      let newMass = m1 + m2;
      let newVelocity = new Vector2D((v1.x*m1 + v2.x*m2) / newMass, (v1.y*m1 + v2.y*m2) / newMass);
      let newAngle = Math.atan2(newVelocity.y, newVelocity.x); // newAngle in +-PI radians
      if (newAngle < 0) { newAngle += 2*Math.PI; }
      let newSpeed = newVelocity.magnitude();

      let newParticle = new Particle(
        sciFi.universe.nextId++,
        sciFi.universe,
        1,
        (m1 > m2 ? thisParticle.pos.x : otherParticle.pos.x),
        (m1 > m2 ? thisParticle.pos.y : otherParticle.pos.y),
        newAngle,
        newSpeed,
        newRadius,
        newMass
      );

      otherParticles.push(newParticle);
      sciFi.universe.view.add(newParticle);

    } else if (collideParticles) {

      let dt, mT, v1, v2, cr, combinedMass,
          dn = new Vector2D(thisParticle.pos.x - otherParticle.pos.x, thisParticle.pos.y - otherParticle.pos.y),
          sr = thisParticle.radius + otherParticle.radius, // sum of radii
          dx = dn.magnitude(); // pre-normalized magnitude

      if (dx > sr) { return; } // no collision

      // sum the masses, normalize the collision vector and get its tangential
      combinedMass = thisParticle.mass + otherParticle.mass;
      dn.normalize();
      dt = new Vector2D(dn.y, -dn.x);

      // avoid double collisions by "un-deforming" balls (larger mass == less tx)
      // this is susceptible to rounding errors, "jiggle" behavior and anti-gravity
      // suspension of the object get into a strange state
      mT = dn.multiply(thisParticle.radius + otherParticle.radius - dx);
      thisParticle.pos.tx(mT.multiply(otherParticle.mass / combinedMass));
      otherParticle.pos.tx(mT.multiply(-thisParticle.mass / combinedMass));

      // this interaction is strange, as the CR describes more than just
      // the ball's bounce properties, it describes the level of conservation
      // observed in a collision and to be "true" needs to describe, rigidity,
      // elasticity, level of energy lost to deformation or adhesion, and crazy
      // values (such as cr > 1 or cr < 0) for stange edge cases obviously not
      // handled here (see: http://en.wikipedia.org/wiki/Coefficient_of_restitution)
      // for now assume the ball with the least amount of elasticity describes the
      // collision as a whole:
      cr = Math.min(thisParticle.cr, otherParticle.cr);

      // cache the magnitude of the applicable component of the relevant velocity
      v1 = dn.multiply(thisParticle.velocity.dot(dn)).magnitude();
      v2 = dn.multiply(otherParticle.velocity.dot(dn)).magnitude();

      // maintain the unapplicatble component of the relevant velocity
      // then apply the formula for inelastic collisions
      thisParticle.velocity = dt.multiply(thisParticle.velocity.dot(dt));
      thisParticle.velocity.tx(dn.multiply((cr * otherParticle.mass * (v2 - v1) + thisParticle.mass * v1 + otherParticle.mass * v2) / combinedMass));

      // do this once for each object, since we are assuming collide will be called
      // only once per "frame" and its also more effiecient for calculation cacheing
      // purposes
      otherParticle.velocity = dt.multiply(otherParticle.velocity.dot(dt));
      otherParticle.velocity.tx(dn.multiply((cr * thisParticle.mass * (v1 - v2) + otherParticle.mass * v2 + thisParticle.mass * v1) / combinedMass));

    }

  }

  update(now) {
    this.pos.tx(this.velocity);
    let universe = sciFi.universe;
    if (this.pos.x >= universe.width) { this.pos.x = this.pos.x - universe.width; }
    if (this.pos.x < 0) { this.pos.x = universe.width + this.pos.x; }
    if (this.pos.y >= universe.height) { this.pos.y = this.pos.y - universe.height; }
    if (this.pos.y < 0) { this.pos.y = universe.height + this.pos.y; }
  }

  draw(viewX, viewY) {
    let thisParticle = this;
    let radius = thisParticle.radius;
    let bgColor = thisParticle.bgColor;
    if (thisParticle.state === 'Hit') {
      bgColor = 'border-color:red;';
      thisParticle.state = 'Normal';
    }
    let style = bgColor+'width:' + this.width + 'px;height:' + this.height + 'px;' +
      'left:' + (viewX-radius) + 'px;top:' + (viewY-radius) + 'px;' +
        (this.visible ? '' : 'display:none;');
    this.elm.style = style;
  }

  destroy() {
    this.parent.destroyChild(this);
  }

  destroyChild(child) {
    child.elm.remove();
    this.subParticles = Lib.removeItem(this.subParticles, child);
  }

}


class Universe {

  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.view = new View('view');
    this.view.ux = Math.random()*(this.width-this.view.getWidth());
    this.view.uy = Math.random()*(this.height-this.view.getHeight());
    this.stepTimer = undefined;
    this.particles = [];
    this.state = 'Idle';
    this.nextId = 0;
    this.ticks = 0;
  }

  createParticle() {
    let angle = Math.random()*Math.PI*2;
    let speed = Math.random() * sciFi.universe.MAX_PARTICLE_SPEED;
    let radius = sciFi.universe.BASE_PARTICLE_RADIUS; // 1+Math.random()*100
    let mass = sciFi.universe.BASE_PARTICLE_MASS;
    let particle = new Particle(
      this.nextId++,
      this,
      1,
      Math.random() * this.width,
      Math.random() * this.height,
      angle,
      speed,
      radius,
      mass
    );
    this.particles.push(particle);
    this.view.add(particle);
  }

  start() {
    console.log('Start');
    document.getElementById('start-button').disabled = true;
    document.getElementById('stop-button').disabled = false;
    this.ticks = 0;
    this.view.clear();
    this.particles = [];
    for (let i=0, n=Math.floor(1000 + Math.random() * sciFi.universe.MAX_PARTICLES); i < n; i++) {
      this.createParticle();
    }
    this.state = 'Running';
    this.step(Lib.getTime());
  }

  stop() {
    console.log('Stop');
    document.getElementById('start-button').disabled = false;
    document.getElementById('stop-button').disabled = true;
    this.state = 'Idle';
    window.cancelAnimationFrame(this.stepTimer);
  }

  step(now) {
    this.ticks++;
    this.update(now);
    this.detectCollisions(now);
    this.draw(now);
    this.afterDraw(now)
    if (this.state === 'Running') {
      this.stepTimer = window.requestAnimationFrame(this.step.bind(this));
    }
  }

  update(now) {
    //console.log('Universe::update');
    this.particles.forEach(function(particle) {
      particle.update(now);
    });
    this.debugView.messages['ticksCount'].value = 'Ticks: ' + this.ticks;
    this.debugView.update();
  }

  detectCollisions(now) {
    //console.log('Universe::detectCollisions');
    let allParticles = this.particles;
    this.particles.forEach(function(particle) {
      particle.detectCollision(allParticles);
    });
  }

  draw(now) {
    //console.log('Universe::draw');
    let view = this.view;
    this.particles.forEach(function(particle) {
      if (view.isVisible(particle)) {
        particle.visible = true;
      }
      else
      {
        particle.visible = false;
      }
      particle.draw(
        view.getXOnView(particle),
        view.getYOnView(particle)
      );
    });
    this.debugView.draw();
  }

  afterDraw(now) {
    //console.log('Universe::afterDraw');
    let allParticles = this.particles;

    //this.particles.forEach(function(particle) {
    //  particle.afterDraw(now);
    //});

    // Remove destroyed particles
    this.particles = allParticles.filter(function(particle) {
      if (particle.state === 'Destroy') {
        particle.elm.remove();
        return false;
      } else {
        return true;
      }
    });
  }

  destroyChild(child) {
    child.elm.remove();
    this.particles = Lib.removeItem(this.particles, child);
  }

}


window.sciFi = {};

sciFi.universe = new Universe(800, 600);
sciFi.universe.debugView = new DebugView('debug-view');
sciFi.universe.debugView.addMessage('ticksCount', 'Ticks: 0');

sciFi.universe.MAX_PARTICLES = 1000;
sciFi.universe.MAX_PARTICLE_SPEED = 100;
sciFi.universe.BASE_PARTICLE_RADIUS = 3;
sciFi.universe.BASE_PARTICLE_MASS = sciFi.universe.BASE_PARTICLE_RADIUS;
