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

  constructor(id, parent, elasticity, x, y, radius, mass, velocity, speed, angle) {
    this.id = id;
    this.parent = parent;
    this.cr = elasticity;
    this.bgColor = 'border-color:#222;';
    this.elm = document.createElement('div');
    this.elm.className = 'particle';
    this.pos = new Vector2D(x, y); // position
    this.radius = radius || 1;
    this.mergeRadius = this.radius / 2;
    this.influenceRadius = this.radius * 1.3;
    this.mass = mass || this.radius;
    if (velocity) {
      this.velocity = velocity;
      this.speed = this.velocity.magnitude();
      this.angle = Math.atan2(this.velocity.y, this.velocity.x); // newAngle in +-PI radians
      if (this.angle < 0) { this.angle += 2*Math.PI; }
    } else {
      this.speed = speed || 1;
      this.angle = angle || 0;
      this.velocity = new Vector2D(this.speed * Math.cos(this.angle), this.speed * Math.sin(this.angle));
    }
    this.height = this.radius * 2;
    this.width = this.radius * 2;
    this.subParticles = [];
    this.state = 'Normal';
    this.visible = true;
  }


  detectCollision(otherParticles) {

    let thisParticle = this;
    let thisRadius = thisParticle.radius;

    //console.log('Particle::detectCollision...');

    if (thisParticle.state === 'Hit' || thisParticle.state === 'Destroy') { return; }

    let collisionVector = undefined; // A vector connecting the particle centres.
    let otherParticle = undefined;
    let otherRadius = undefined;
    let sumOfRadii = undefined;
    let seperation = undefined;
    let sumOfMass = undefined;

    let mergeIntoNewParticle = false;
    let bounceParticles = false;

    for (let i=0, n=otherParticles.length; i < n; i++) {

      otherParticle = otherParticles[i];

      if (otherParticle.state === 'Hit' || otherParticle.state === 'Destroy') { continue; }

      if (otherParticle.id !== thisParticle.id) {

        collisionVector = new Vector2D(
          thisParticle.pos.x - otherParticle.pos.x,
          thisParticle.pos.y - otherParticle.pos.y
        );

        seperation = collisionVector.magnitude();
        sumOfRadii = thisRadius + otherParticle.radius;
        sumOfMass = thisParticle.mass + otherParticle.mass;

        if (seperation < sumOfRadii) { // If YES, we have a collision!

          let sumOfMergeRadii = thisParticle.mergeRadius + otherParticle.mergeRadius;
          let wantsToMerge = (seperation < sumOfMergeRadii) && (Math.random() > 0.95);

          if (wantsToMerge) {
            otherParticle.state = 'Destroy';
            thisParticle.state = 'Destroy';
            mergeIntoNewParticle = true;
            break;
          }

          otherParticle.state = 'Hit';
          thisParticle.state = 'Hit';
          bounceParticles = true;
          break;
        }
      }
    }

    if (mergeIntoNewParticle) {

      let m1 = thisParticle.mass;
      let m2 = otherParticle.mass;
      let v1 = thisParticle.velocity;
      let v2 = otherParticle.velocity;
      let v3 = new Vector2D((v1.x*m1 + v2.x*m2) / sumOfMass, (v1.y*m1 + v2.y*m2) / sumOfMass);

      let newParticle = new Particle(
        sciFi.universe.nextId++,
        sciFi.universe,
        Math.min(thisParticle.cr, otherParticle.cr),
        (m1 > m2 ? thisParticle.pos.x : otherParticle.pos.x),
        (m1 > m2 ? thisParticle.pos.y : otherParticle.pos.y),
        sumOfRadii,
        sumOfMass,
        v3
      );

      otherParticles.push(newParticle);
      sciFi.universe.view.add(newParticle);

    } else if (bounceParticles) {

      // normalize the collision vector and get its tangential
      collisionVector.normalize();
      let collisionTangent = new Vector2D(collisionVector.y, -collisionVector.x);

      // avoid double collisions by "un-deforming" balls (larger mass == less tx)
      // this is susceptible to rounding errors, "jiggle" behavior and anti-gravity
      // suspension of the object get into a strange state
      let mTranslateOutOfCollision = collisionVector.multiply(sumOfRadii - seperation);

      thisParticle.pos.tx(mTranslateOutOfCollision.multiply(otherParticle.mass / sumOfMass));
      otherParticle.pos.tx(mTranslateOutOfCollision.multiply(-thisParticle.mass / sumOfMass));

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

  getMaxParticles() {
    return 100 + Math.floor(Math.random() * (this.MAX_PARTICLES - 100));
  }

  createParticle() {
    let particle = new Particle(
      this.nextId++,
      this,
      this.BASE_PARTICLE_ELASTICITY,
      this.width * Math.random(),
      this.height * Math.random(),
      this.BASE_PARTICLE_RADIUS,
      this.BASE_PARTICLE_MASS,
      undefined,                               // No initial velocity vector
      this.MAX_PARTICLE_SPEED * Math.random(), // Use speed and angle instead
      Math.random()*Math.PI*2
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
    for (let i=0, n=this.getMaxParticles(); i < n; i++) {
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
    this.debugView.messages['paritcles'].value = 'Particles: ' + this.particles.length;
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

//sciFi.universe = new Universe(800, 600);
//sciFi.universe = new Universe(640, 480);
sciFi.universe = new Universe(320, 200);

sciFi.universe.BASE_PARTICLE_ELASTICITY = 1;
sciFi.universe.BASE_PARTICLE_RADIUS = 1;
sciFi.universe.BASE_PARTICLE_MASS = 1;

sciFi.universe.MAX_PARTICLE_SPEED = 1;

sciFi.universe.MAX_PARTICLES = 3000;

sciFi.universe.debugView = new DebugView('debug-view');
sciFi.universe.debugView.addMessage('ticksCount', 'Ticks: 0');
sciFi.universe.debugView.addMessage('paritcles', 'Particles: 0');
