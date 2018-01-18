class View {

  constructor(id)
  {
    this.id = id
    this.elm = document.getElementById(id);
    this.ux = 0;
    this.uy = 0;
    this.width = 0;
    this.height = 0;
  }

  isVisible(sprObj) {
    return ! Lib.outOfBounds(
      { x: this.ux, y: this.uy, width: this.getWidth(), height: this.getHeight()},
      { x: sprObj.ux, y: sprObj.uy, width: sprObj.width, height: sprObj.height }
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
    return spriteObj.ux - this.ux;
  }

  getYOnView(spriteObj) {
    return spriteObj.uy - this.uy;
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

  constructor(id, parent, ux, uy, mass, r, speed, dir)
  {
    this.id = id;
    this.state = 'Normal';
    this.parent = parent;
    this.ux = ux;
    this.uy = uy;
    this.r = r;         // core radius
    this.rm = r/2;      // merge radius
    this.rf = r * 1.3;  // influence radius
    this.mass = mass || 1;
    this.density = 1;
    this.restitution = 1;
    this.subParticles = [];
    this.elm = document.createElement('div');
    this.elm.className = 'particle';
    this.speed = speed || Math.random()*sciFi.universe.MAX_PARTICLE_SPEED;
    this.dir = dir || Math.random()*Math.PI*2;
    this.width = r*2;
    this.height = r*2;
    this.visible = true;
    let bgShade = Math.floor(Math.random()*192);
    this.bgColor = 'border-color:#222;'; // rgb('
//       + bgShade + ','
//       + bgShade + ','
//       + bgShade + ');';
  }

  detectCollision(otherParticles) {
    //console.log('Particle::detectCollision...');
    let thisParticle = this;
    let otherParticle = undefined;
    let r1 = thisParticle.r
    let r2 = 0

    if (thisParticle.state === 'Hit' || thisParticle.state === 'Destroy') {
      return;
    }

    let mergeIntoNewParticle = false;

    for (let i=0, n=otherParticles.length; i < n; i++) {

      otherParticle = otherParticles[i];
      r2 = otherParticle.r


      if (otherParticle.state === 'Hit' || otherParticle.state === 'Destroy') {
        continue;
      }

      if (otherParticle.id !== thisParticle.id) {

        let d = Lib.distance(thisParticle.ux, thisParticle.uy, otherParticle.ux, otherParticle.uy);

        if (d < (r1 + r2)) { // r = particle radius

          //console.log('d:', d, ', r1:', r1, ', r2:', r2); //, ', p1:', thisParticle, ', p2:', otherParticle);

          if (d < (thisParticle.rm + otherParticle.rm)) { // rm = merge radius

            mergeIntoNewParticle = true;

          } else {

            otherParticle.state = 'Hit';
            thisParticle.state = 'Hit';

          }

          break; // If Hit or Merge, stop scanning the rest.
        }
      }
    }

    if (mergeIntoNewParticle) {

      //console.log('Merging p1.id:', thisParticle.id, thisParticle.state, ' and p2.id:', otherParticle.id, otherParticle.state);
      let spx1 = thisParticle.speed  * Math.cos(thisParticle.dir);
      let spy1 = thisParticle.speed  * Math.sin(thisParticle.dir);
      let spx2 = otherParticle.speed * Math.cos(otherParticle.dir);
      let spy2 = otherParticle.speed * Math.sin(otherParticle.dir);
      let m1 = thisParticle.r;  // we declare mass == radius
      let m2 = otherParticle.r;
      let combinedMass = m1 + m2;
      let nspx = (spx1*m1 + spx2*m2)/combinedMass;
      let nspy = (spy1*m1 + spy2*m2)/combinedMass;
      let newDir = Math.atan2(nspy, nspx); // newDir in radians
      if (newDir < 0) { newDir += 2*Math.PI; }
      let newSpeed = Math.sqrt(nspx*nspx + nspy*nspy);

      let newParticle = new Particle(
        sciFi.universe.nextId++,
        sciFi.universe,
        (m1 > m2 ? thisParticle.ux : otherParticle.ux),
        (m1 > m2 ? thisParticle.uy : otherParticle.uy),
        combinedMass,
        combinedMass, // combinedMass == combinedRadius
        newSpeed,
        newDir
      );

      otherParticles.push(newParticle);

      sciFi.universe.view.add(newParticle);

      otherParticle.state = 'Destroy';
      thisParticle.state = 'Destroy';

    }

  }

  update(now) {
    let dx = this.speed * Math.cos(this.dir);
    let dy = this.speed * Math.sin(this.dir);
    let u = sciFi.universe;
    this.ux += dx;
    this.uy += dy;
    if (this.ux >= u.width) { this.ux = this.ux - u.width; }
    if (this.ux < 0) { this.ux = u.width + this.ux; }
    if (this.uy >= u.height) { this.uy = this.uy - u.height; }
    if (this.uy < 0) { this.uy = u.height + this.uy; }
  }

  draw(viewX, viewY) {
    let thisParticle = this;
    let bgColor = thisParticle.bgColor;
    if (thisParticle.state === 'Hit') {
      bgColor = 'border-color:red;';
      thisParticle.state = 'Normal';
    }
    let style = bgColor+'width:' + this.width + 'px;height:' + this.height + 'px;'
      + 'left:' + (viewX-thisParticle.r)   + 'px;top:' + (viewY-thisParticle.r) + 'px;' + (this.visible ? '' : 'display:none;');
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
    this.ticks = 0;
    this.nextId = 0;
  }

  createParticle() {
    let radius = sciFi.universe.BASE_PARTICLE_RADIUS; // 1+Math.random()*100
    let mass = sciFi.universe.BASE_PARTICLE_MASS;
    let particle = new Particle(this.nextId++, this, Math.random()*this.width, Math.random()*this.height, mass, radius);
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
    for (let i=0, n=Math.floor(1+Math.random()*sciFi.universe.MAX_PARTICLES); i < n; i++) {
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

sciFi.universe = new Universe(600, 500);
sciFi.universe.debugView = new DebugView('debug-view');
sciFi.universe.debugView.addMessage('ticksCount', 'Ticks: 0');

sciFi.universe.MAX_PARTICLES = 1000;
sciFi.universe.MAX_PARTICLE_SPEED = 10;
sciFi.universe.BASE_PARTICLE_RADIUS = 5;
sciFi.universe.BASE_PARTICLE_MASS = sciFi.universe.BASE_PARTICLE_RADIUS;
