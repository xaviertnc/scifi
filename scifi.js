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

  getDistance(v) {
    return Math.sqrt((v.x - this.x) * (v.x - this.x) + 
      (v.y - this.y) * (v.y - this.y));
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

  add(v) {
    return new Vector2D(this.x + v.x, this.y + v.y);
  }

  subtract(v) {
    return new Vector2D(this.x - v.x, this.y - v.y);
  }

  tx(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

}



class View {

  /**
   * View width, height, ux, uy are optional.
   * getHeight() + getWidth() is needed to get height/width if the
   * view style specifies the width as a percentage for example.
   */
  constructor(id, width, height, x, y)
  {
    this.id = id;
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
    this.elm = document.getElementById(id);
    this.visible = true;
    this.ux = 0;
    this.uy = 0;
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
    return (this.width || this.elm.clientWidth);
  }

  getHeight() {
    return (this.height || this.elm.clientHeight);
  }

  getCenterX() {
    return this.ux + this.getWidth() / 2;
  }

  getCenterY() {
    return this.uy + this.getHeight() / 2;
  }

  getXOnView(spriteObj) {
    return spriteObj.pos.x - this.ux;
  }

  getYOnView(spriteObj) {
    return spriteObj.pos.y - this.uy;
  }

  draw() {
    let style = 'width:' + this.getWidth() + 'px;height:' + this.getHeight() + 'px;' +
      'left:' + this.x + 'px;top:' + this.y + 'px;' +
        (this.visible ? '' : 'display:none;');
    this.elm.style = style;
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

  constructor(id, parent, elasticity, x, y, radius, mass, velocity, speed, angle, asMother) {
    this.id = id;
    this.parent = parent;
    this.cr = elasticity;
    this.bgColor = 'border-color:#333;';
    this.elm = document.createElement('div');
    this.elm.className = 'particle';
    this.elm.id = id;
    this.pos = new Vector2D(x, y); // position
    this.radius = radius || 1;
    this.mergeRadius = this.radius * 1;
    //this.influenceRadius = this.radius * 1.3;
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
    this.isBaseParticle = (this.radius === sciFi.universe.BASE_PARTICLE_RADIUS);
    this.mother = asMother ? this : sciFi.universe.mother;
    this.isMother = asMother ? true : false;
    this.inMother = false;
  }


  respawn(universe) {
    let angle = Math.random() * Math.PI * 2;
    this.pos.x = universe.mother.pos.x + universe.mother.radius * 2 + universe.mother.radius * Math.random() * Math.cos(angle);
    this.pos.y = universe.mother.pos.y + universe.mother.radius * 2 + universe.mother.radius * Math.random() * Math.sin(angle);
    this.radius = universe.BASE_PARTICLE_RADIUS;
    this.mergeRadius = this.radius;
    this.influenceRadius = this.radius * 1.3;
    this.mass = universe.BASE_PARTICLE_MASS;
    this.height = this.radius * 2;
    this.width = this.radius * 2;
    this.isBaseParticle = true;
    this.speed = 0.5 + universe.MAX_PARTICLE_SPEED * Math.random(); // Use speed and angle instead
    this.angle = Math.random() * Math.PI * 2;
    this.velocity = new Vector2D(this.speed * Math.cos(this.angle), this.speed * Math.sin(this.angle));
    //console.log('re-deployed particle:', this);
  }


  detectCollision(otherParticles) {

    let thisParticle = this;
    let universe = sciFi.universe;
    let mergeIntoNewParticle = false;
    let thisRadius = thisParticle.radius;
    let collisionVector = undefined; // A vector connecting the particle centres.
    let otherParticle = undefined;
    let otherRadius = undefined;
    let sumOfRadii = undefined;
    let separation = undefined;
    let sumOfMass = undefined;

    for (let i=(thisParticle.isMother ? 0 : -1), n=otherParticles.length; i < n; i++) {

      otherParticle = (i < 0) ? thisParticle.mother : otherParticles[i];

      if (otherParticle === thisParticle || otherParticle.state === 'Destroy') { continue; }

      collisionVector = thisParticle.pos.subtract(otherParticle.pos);

      separation = collisionVector.magnitude();
      sumOfRadii = thisRadius + otherParticle.radius;
      sumOfMass = thisParticle.mass + otherParticle.mass;

      if (separation < sumOfRadii) { // If YES, we have a collision!

        let wantToMerge = false;
        let motherIsInvolved = thisParticle.isMother || otherParticle.isMother;

        //console.log('Collision in Mother... thisParticle:', thisParticle, ', otherParticle:', otherParticle);

        if ( ! motherIsInvolved) { // We can't merge with mother!

          if (thisParticle.inMother) {

            wantToMerge = thisParticle.isBaseParticle && otherParticle.isBaseParticle; // Math.random() < 0.5 &&

          } else {

            //console.log('Collision outside mother... thisParticle:', thisParticle, ', otherParticle:', otherParticle);

            //let maxRadius = Math.max(thisParticle.radius, otherParticle.radius);
            //let minRadius = Math.min(thisParticle.radius, otherParticle.radius);
            //let ratio = maxRadius / minRadius;
            if (universe.bpc < universe.MAX_BPC) {

              wantToMerge = sumOfRadii <= universe.MAX_PARTICLE_RADIUS; // ratio > 1 &&

            }

          }

        }

        if (wantToMerge) {
          thisParticle.state = 'Destroy';
          otherParticle.state = 'Destroy';
          mergeIntoNewParticle = true;
          break;
        }


        let canCollide = true;

        if (thisParticle.isMother) {

          canCollide = !otherParticle.isBaseParticle;

        } else if (otherParticle.isMother) {

          canCollide = !thisParticle.isBaseParticle;

        }

        if (canCollide) {

          otherParticle.state = 'Hit';
          thisParticle.state = 'Hit';

          Lib.collideParticles(
            thisParticle,
            otherParticle,
            collisionVector,
            sumOfRadii,
            sumOfMass,
            separation
          );

        }

      }

    }

    if (mergeIntoNewParticle) {

      if (universe.bpc < universe.MAX_BPC) {

        let m1 = thisParticle.mass;
        let m2 = otherParticle.mass;
        let v1 = thisParticle.velocity;
        let v2 = otherParticle.velocity;

        //let v3 = new Vector2D((v1.x*m1 + v2.x*m2) / sumOfMass, (v1.y*m1 + v2.y*m2) / sumOfMass);

        let angle = Math.random() * Math.PI * 2;
        let px = universe.mother.pos.x + (universe.mother.radius*1.1 + universe.mother.radius * Math.random()) * Math.cos(angle);
        let py = universe.mother.pos.y + (universe.mother.radius*1.1 + universe.mother.radius * Math.random()) * Math.sin(angle);

        // *** CREATE NEW PARTICLE ***
        let newParticle = new Particle(
          universe.nextId++,
          universe,
          1, //Math.min(thisParticle.cr, otherParticle.cr),
          px, //(m1 > m2 ? thisParticle.pos.x : otherParticle.pos.x),
          py, //(m1 > m2 ? thisParticle.pos.y : otherParticle.pos.y),
          universe.MAX_PARTICLE_RADIUS,
          universe.MAX_PARTICLE_MASS,
          new Vector2D(Math.random(), Math.random())
        );

        newParticle.elm.className = 'big particle';

        otherParticles.push(newParticle);
        universe.view.add(newParticle);

        universe.bpc++;

      }

      otherParticle.respawn(universe);
      thisParticle.respawn(universe);

    }

  }


  update(now) {
    this.pos.tx(this.velocity);
    let universe = sciFi.universe;
    if (this.pos.x >= universe.width) { this.pos.x = this.pos.x - universe.width; }
    if (this.pos.x < 0) { this.pos.x = universe.width + this.pos.x; }
    if (this.pos.y >= universe.height) { this.pos.y = this.pos.y - universe.height; }
    if (this.pos.y < 0) { this.pos.y = universe.height + this.pos.y; }
    if ( ! this.isMother && this.isBaseParticle) {
      this.inMother = Lib.distance(this.mother.pos.x, this.mother.pos.y, this.pos.x, this.pos.y) < this.mother.mergeRadius;
      if (this.inMother) {
        this.state = 'Destroy';
        this.respawn(universe);
      }
    }
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

  constructor(width, height, viewW, viewH) {
    this.width = width;
    this.height = height;
    this.view = new View('view', viewW, viewH);
    this.view.ux = (this.width  - viewW) / 2;
    this.view.uy = (this.height - viewH) / 2;
    this.view.draw();
    this.stepTimer = undefined;
    this.particles = [];
    this.state = 'Idle';
    this.nextId = 0;
    this.ticks = 0;
    this.mother = undefined;
    this.bpc = 0;
  }


  getMaxParticles() {
    return (this.MAX_PARTICLES * 2/3) + Math.floor(Math.random() * (this.MAX_PARTICLES * 1/3));
  }


  createParticle(i, p, c, x, y, r, m, v) {
    let angle = Math.random() * Math.PI * 2;
    let px = this.mother.pos.x + (this.mother.radius*2 + this.mother.radius * Math.random()) * Math.cos(angle);
    let py = this.mother.pos.y + (this.mother.radius*2 + this.mother.radius * Math.random()) * Math.sin(angle);
    let particle = new Particle(
      i || this.nextId++,
      p || this,
      c || this.BASE_PARTICLE_ELASTICITY,
      x || px, //this.width * Math.random(),
      y || py, //this.height * Math.random(),
      r || this.BASE_PARTICLE_RADIUS,
      m || this.BASE_PARTICLE_MASS,
      v || undefined,
      0.5 + this.MAX_PARTICLE_SPEED * Math.random(), // Use speed and angle instead
      Math.random()*Math.PI*2
    );
    this.particles.push(particle);
    this.view.add(particle);
    return particle;
  }


  start() {
    console.log('Start');
    document.getElementById('start-button').disabled = true;
    document.getElementById('stop-button').disabled = false;
    document.getElementById('pause-button').disabled = false;
    if (this.state === "Idle") {
      this.bpc = 0;
      this.ticks = 0;
      this.nextId = 0;
      this.view.clear();
      this.particles = [];
      this.mother = new Particle(
        'mother',
        this,
        this.MOTHER_ELASTICITY,
        this.view.getCenterX(),
        this.view.getCenterY(),
        this.MOTHER_RADIUS,
        this.MOTHER_MASS,
        new Vector2D(0, 0),
        undefined,
        undefined,
        'isMother'
      );
      this.view.add(this.mother);
      for (let i=0, n=this.getMaxParticles(); i < n; i++) {
        this.createParticle();
      }
    }
    this.state = 'Running';
    this.step(Lib.getTime());
  }


  stop(pause) {
    console.log('Stop');
    document.getElementById('start-button').disabled = false;
    document.getElementById('pause-button').disabled = true;
    document.getElementById('stop-button').disabled = true;
    this.state = pause ? 'Paused' : 'Idle';
    window.cancelAnimationFrame(this.stepTimer);
  }


  step(now) {
    //if (!confirm('Continue?')) { return; }
    this.ticks++;
    this.update(now);
    this.detectCollisions(now);
    this.draw(now);
    this.afterDraw(now);
    if (this.state === 'Running') {
      this.stepTimer = window.requestAnimationFrame(this.step.bind(this));
    }
  }


  update(now) {
    //console.log('Universe::update');
    this.mother.update(now);
    this.particles.forEach(function(particle) {
      if (particle.state !== 'Destroy') {
        particle.update(now);
      }
    });
    this.debugView.messages.ticksCount.value = 'Ticks: ' + this.ticks;
    this.debugView.messages.paritcles.value = 'Particles: ' + this.particles.length;
    this.debugView.update();
  }


  detectCollisions(now) {
    //console.log('Universe::detectCollisions');
    let allParticles = this.particles;
    this.mother.detectCollision(allParticles);
    this.particles.forEach(function(particle) {
      if (particle.state !== 'Destroy') {
        particle.detectCollision(allParticles);
      }
    });
  }


  draw(now) {
    //console.log('Universe::draw');
    let view = this.view;
    this.mother.draw(
      view.getXOnView(this.mother),
      view.getYOnView(this.mother)
    );
    this.particles.forEach(function(particle) {
      if (particle.state !== 'Destroy' && view.isVisible(particle)) {
        particle.visible = true;
      }
      else
      {
        particle.visible = false;
      }
      //console.log('particle.pos.x:', particle.pos.x, ', prt:', particle);
      particle.draw(
        view.getXOnView(particle),
        view.getYOnView(particle)
      );
    });
    this.debugView.draw();
  }


  afterDraw(now) {
    //console.log('Universe::afterDraw');

    //this.particles.forEach(function(particle) {
    //  particle.afterDraw(now);
    //});

    // let allParticles = this.particles;

    // Remove destroyed particles
    //this.particles = allParticles.filter(function(particle) {
    //  if (particle.state === 'Destroy') {
    //    particle.elm.remove();
    //    return false;
    //  } else {
    //    return true;
    //  }
    //});

    let universe = this;

    this.particles.forEach(function(particle) {
      if (particle.state === 'Destroy') {
        particle.state = 'Normal';
        //console.log('Destoryed particle:', particle);
      }
    });
  }


  destroyChild(child) {
    child.elm.remove();
    this.particles = Lib.removeItem(this.particles, child);
  }

}


window.sciFi = {};

sciFi.universe = new Universe(1000, 1000, 600, 600);
//sciFi.universe = new Universe(800, 600);
//sciFi.universe = new Universe(640, 480);
//sciFi.universe = new Universe(320, 200);

sciFi.universe.BASE_PARTICLE_ELASTICITY = 1;
sciFi.universe.BASE_PARTICLE_RADIUS = 2;
sciFi.universe.BASE_PARTICLE_MASS = 2;

sciFi.universe.MAX_PARTICLE_SPEED = 10;
sciFi.universe.MAX_PARTICLE_RADIUS = 22;
sciFi.universe.MAX_PARTICLE_MASS = sciFi.universe.MAX_PARTICLE_RADIUS * 1;
sciFi.universe.MAX_PARTICLES = 2000;
sciFi.universe.MAX_BPC = 3;

sciFi.universe.MOTHER_ELASTICITY = 0.5;
sciFi.universe.MOTHER_RADIUS = 220;
sciFi.universe.MOTHER_MASS = 9990000;

sciFi.universe.debugView = new DebugView('debug-view');
sciFi.universe.debugView.addMessage('ticksCount', 'Ticks: 0');
sciFi.universe.debugView.addMessage('paritcles', 'Particles: 0');
