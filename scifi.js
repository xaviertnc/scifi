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

  constructor(id, parent, ux, uy, r)
  {
    this.id = id
    this.parent = parent
    this.ux = ux;
    this.uy = uy;
    this.rc = r;
    this.rf = r * 1.3;
    this.subParticles = [];
    this.elm = document.createElement('div');
    this.elm.className = 'particle';
    this.speed = 1 + Math.random()*50;
    this.dir = Math.random()*Math.PI*2;
    this.width = r;
    this.height = r;
    this.visible = true;
    this.bgColor = 'background-color:rgb('
      + Math.floor(Math.random()*255) + ','
      + Math.floor(Math.random()*255) + ','
      + Math.floor(Math.random()*255) + ');';
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
    let style = this.bgColor+'width:' + this.width + 'px;height:' + this.height + 'px;'
      + 'left:' + viewX + 'px;top:' + viewY + 'px;' + (this.visible ? '' : 'display:none;');
    this.elm.style = style;
    //this.elm.innerText = 'id:' + this.id + ', ' + (viewX|0) + ', y:' + (viewY|0);
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
    let particle = new Particle(this.nextId++, this, Math.random()*this.width, Math.random()*this.height, 1+Math.random()*100);
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
    for (let i=0, n=Math.floor(1+Math.random()*500); i < n; i++) {
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
    this.draw(now);
    if (this.state === 'Running') {
      this.stepTimer = window.requestAnimationFrame(this.step.bind(this));
    }
  }

  update(now) {
    //console.log('Update...');
    this.particles.forEach(function(particle) {
      particle.update(now);
    });
    this.debugView.messages['ticksCount'].value = 'Ticks: ' + this.ticks;
    this.debugView.update();
  }

  draw(now) {
    //console.log('Draw...');
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

  destroyChild(child) {
    child.elm.remove();
    this.particles = Lib.removeItem(this.particles, child);
  }

}


window.sciFi = {};

sciFi.universe = new Universe(2000, 1000);
sciFi.universe.debugView = new DebugView('debug-view');
sciFi.universe.debugView.addMessage('ticksCount', 'Ticks: 0');
