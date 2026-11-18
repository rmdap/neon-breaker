// NEON BREAKER — input: keyboard and mouse state, plus click handling for
// the canvas-drawn buttons. One clear job: turn raw DOM events into the
// simple answers the game asks for (is a key down? where is the mouse?).

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseX = canvas.width / 2;
    this.mouseY = canvas.height / 2;
    this.mouseInside = false;
    this.clickQueue = []; // {x, y} in canvas coordinates, consumed by the game

    window.addEventListener('keydown', (event) => {
      if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
      // Handled keys are consumed once by the game via wasPressed().
      this.pressed = this.pressed ?? new Set();
      this.pressed.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('mousemove', (event) => {
      const pos = this.toCanvas(event);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
      this.mouseInside = true;
    });
    canvas.addEventListener('mouseleave', () => {
      this.mouseInside = false;
    });
    canvas.addEventListener('mousedown', (event) => {
      const pos = this.toCanvas(event);
      this.clickQueue.push(pos);
    });
    // Touch: drag moves the paddle, tap counts as a click.
    canvas.addEventListener('touchmove', (event) => {
      event.preventDefault();
      const pos = this.toCanvas(event.touches[0]);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
      this.mouseInside = true;
    }, { passive: false });
    canvas.addEventListener('touchstart', (event) => {
      const pos = this.toCanvas(event.touches[0]);
      this.clickQueue.push(pos);
    }, { passive: true });
  }

  // Convert a client-space pointer event into canvas coordinates.
  toCanvas(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * this.canvas.height,
    };
  }

  isDown(code) {
    return this.keys.has(code);
  }

  // True once for a key pressed since the last frame; the game clears it.
  wasPressed(code) {
    return this.pressed?.has(code) ?? false;
  }

  endFrame() {
    this.pressed = new Set();
    this.clickQueue.length = 0;
  }

  get leftDown() {
    return this.isDown('ArrowLeft') || this.isDown('KeyA');
  }

  get rightDown() {
    return this.isDown('ArrowRight') || this.isDown('KeyD');
  }
}
