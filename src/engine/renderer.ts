// HD-2D renderer: WebGL2 sprite batch + normal-mapped dynamic 2D lighting, pixel-perfect.
const MAX_LIGHTS = 8;
const VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos; layout(location=1) in vec2 aUV; layout(location=2) in vec4 aColor;
uniform vec2 uRes; uniform vec2 uCam;
out vec2 vUV; out vec4 vColor;
void main(){ vec2 p = (aPos - uCam) / uRes * 2.0 - 1.0; gl_Position = vec4(p.x, -p.y, 0.0, 1.0); vUV = aUV; vColor = aColor; }`;
const FS = `#version 300 es
precision highp float;
in vec2 vUV; in vec4 vColor; out vec4 outColor;
uniform sampler2D uTex; uniform sampler2D uNormal;
uniform vec3 uLights[${MAX_LIGHTS}]; // xy = world pos, z = radius
uniform vec3 uLightColor[${MAX_LIGHTS}];
uniform float uAmbient; uniform float uUseNormal;
void main(){
  vec4 tex = texture(uTex, vUV) * vColor;
  vec3 lit = vec3(uAmbient);
  if (uUseNormal > 0.5) {
    vec3 n = texture(uNormal, vUV).rgb * 2.0 - 1.0;
    for (int i = 0; i < ${MAX_LIGHTS}; i++) {
      if (uLights[i].z <= 0.0) continue;
      vec2 d = uLights[i].xy - gl_FragCoord.xy; // sprite-space: lights baked per-draw pass
      float att = clamp(1.0 - length(d) / uLights[i].z, 0.0, 1.0); att *= att;
      lit += uLightColor[i] * att * max(0.0, n.z);
    }
  }
  outColor = vec4(tex.rgb * lit, tex.a);
}`;

export interface Light { x: number; y: number; radius: number; color: [number, number, number] }
export class Renderer {
  private gl: WebGL2RenderingContext; private prog: WebGLProgram;
  private vao: WebGLVertexArrayObject; private vbo: WebGLBuffer;
  private verts: number[] = []; private cam = { x: 0, y: 0 };
  private texCache = new Map<string, WebGLTexture>();
  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: false })!;
    this.gl = gl;
    this.prog = this.build(VS, FS);
    gl.useProgram(this.prog);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.vao = gl.createVertexArray()!; gl.bindVertexArray(this.vao);
    this.vbo = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    const stride = 8 * 4; // x,y,u,v,r,g,b,a
    const attribs: [number, number, number][] = [[0, 2, 0], [1, 2, 2], [2, 4, 4]];
    attribs.forEach(([loc, size, off]) => { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, off * 4); });
  }
  private build(vs: string, fs: string): WebGLProgram {
    const gl = this.gl, compile = (t: number, src: string) => { const s = gl.createShader(t)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)!); return s; };
    const p = gl.createProgram()!; gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)!); return p;
  }
  setCamera(x: number, y: number) { this.cam = { x, y }; }
  loadTexture(url: string): WebGLTexture { // caller binds normal map as *_n.png via options later
    if (this.texCache.has(url)) return this.texCache.get(url)!;
    const gl = this.gl, tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    const img = new Image(); img.onload = () => { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); };
    img.src = url; this.texCache.set(url, tex); return tex;
  }
  /** Queue a sprite: world px, 128x128 HD sprite scaled by s, tint color. */
  sprite(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a = 1) {
    const push = (px: number, py: number, u: number, v: number) => this.verts.push(px, py, u, v, r, g, b, a);
    push(x, y, 0, 0); push(x + w, y, 1, 0); push(x + w, y + h, 1, 1);
    push(x, y, 0, 0); push(x + w, y + h, 1, 1); push(x, y + h, 0, 1);
  }
  rect(x: number, y: number, w: number, h: number, hex: string, a = 1) { const n = parseInt(hex.slice(1), 16); this.sprite(x, y, w, h, (n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, a); }
  /** Flush batch with dynamic lighting. lights[] in screen px. */
  flush(lights: Light[] = [], ambient = 0.35, useNormal = false, normalTex?: WebGLTexture) {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.02, 0.03, 0.04, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog); gl.bindVertexArray(this.vao); gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.verts), gl.DYNAMIC_DRAW);
    const uRes = gl.getUniformLocation(this.prog, 'uRes'); gl.uniform2f(uRes, this.canvas.width, this.canvas.height);
    const uCam = gl.getUniformLocation(this.prog, 'uCam'); gl.uniform2f(uCam, this.cam.x, this.cam.y);
    const la = new Float32Array(MAX_LIGHTS * 3), lc = new Float32Array(MAX_LIGHTS * 3);
    lights.slice(0, MAX_LIGHTS).forEach((l, i) => { la.set([l.x, l.y, l.radius], i * 3); lc.set(l.color, i * 3); });
    gl.uniform3fv(gl.getUniformLocation(this.prog, 'uLights[0]'), la);
    gl.uniform3fv(gl.getUniformLocation(this.prog, 'uLightColor[0]'), lc);
    gl.uniform1f(gl.getUniformLocation(this.prog, 'uAmbient'), ambient);
    gl.uniform1f(gl.getUniformLocation(this.prog, 'uUseNormal'), useNormal ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, this.verts.length / 8);
    this.verts = [];
  }
}
