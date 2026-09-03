import { VERTEX_SHADER } from './shaders';

export interface PlaneRenderer {
  setHue(hueDegrees: number): void;
  /** Re-issues the last draw at the canvas's current pixel size. Call after resizing the canvas. */
  resize(): void;
  destroy(): void;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create WebGL shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

function linkProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create WebGL program.');
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }
  return program;
}

/** Compiles a fullscreen-quad WebGL2 renderer for one plane-family fragment shader. Raw WebGL2,
 * no helper library — see ADR discussion in the grilling thread: this is the only WebGL code in
 * the project, and the boilerplate is small and static. */
export function createPlaneRenderer(canvas: HTMLCanvasElement, fragmentSource: string): PlaneRenderer {
  const context = canvas.getContext('webgl2');
  if (!context) throw new Error('WebGL2 is not supported in this browser.');
  const gl: WebGL2RenderingContext = context;

  const program = linkProgram(gl, VERTEX_SHADER, fragmentSource);
  const positionLoc = gl.getAttribLocation(program, 'aPosition');
  const hueLoc = gl.getUniformLocation(program, 'uHue');

  const buffer = gl.createBuffer();
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  let currentHue = 0;

  function draw() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniform1f(hueLoc, currentHue);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  draw();

  return {
    setHue(hueDegrees: number) {
      currentHue = hueDegrees;
      draw();
    },
    resize: draw,
    destroy() {
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
    },
  };
}
