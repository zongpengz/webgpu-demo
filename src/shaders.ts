// WGSL shaders. All positions use the same 1000 × 650 logical game space.
// Uniforms are 24 bytes; Particle is 16 bytes; Sprite is 48 bytes.
export const uniforms = /* wgsl */ `
struct Globals {
  world: vec2f,
  time: f32,
  dt: f32,
  glow: f32,
  count: f32,
};
@group(0) @binding(0) var<uniform> g: Globals;
`;

export const backgroundShader =
  uniforms +
  /* wgsl */ `
struct Varying { @builtin(position) position: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> Varying {
  let p = array<vec2f, 3>(vec2f(-1., -1.), vec2f(3., -1.), vec2f(-1., 3.));
  var o: Varying;
  o.position = vec4f(p[i], 0., 1.);
  o.uv = p[i] * vec2f(.5, -.5) + .5;
  return o;
}
fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
@fragment fn fs(v: Varying) -> @location(0) vec4f {
  let uv = v.uv;
  var col = vec3f(.028, .025, .065);
  let haze = exp(-length((uv - vec2f(.52, .46)) * vec2f(1.5, 1.)) * 5.);
  col += vec3f(.05, .017, .10) * haze;
  col += vec3f(.007, .022, .042) * exp(-length(uv - vec2f(.2, .7)) * 5.);
  let grid = abs(fract(uv * vec2f(20., 13.)) - .5);
  col += vec3f(.14, .09, .23) * (1. - smoothstep(.003, .012, min(grid.x, grid.y))) * .10;
  let p = (uv - vec2f(.52, .47)) * vec2f(1., 1.35);
  let r = length(p);
  let orbit = exp(-abs(r - .32) * 1100.) + exp(-abs(r - .323) * 650.) * .2;
  col += vec3f(.23, .12, .35) * orbit * (.4 + .35 * sin(atan2(p.y, p.x) * 3. + g.time * .1));
  let cells = uv * vec2f(100., 65.);
  let seed = hash(floor(cells));
  let star = exp(-length(fract(cells) - .5) * 70.) * step(.976, seed);
  col += vec3f(.6, .49, .8) * star * (.6 + .4 * sin(g.time * .7 + seed * 100.));
  col *= 1. - smoothstep(.3, .85, length(uv - .5)) * .5;
  return vec4f(col, 1.);
}
`;

const particleStruct = /* wgsl */ `
struct Particle { position: vec2f, seed: f32 };
`;

export const computeShader =
  uniforms +
  particleStruct +
  /* wgsl */ `
@group(0) @binding(1) var<storage, read_write> particles: array<Particle>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= u32(g.count)) { return; }
  var p = particles[i];
  let dt = g.dt;
  p.position.y += (10. + p.seed * 58.) * dt;
  p.position.x += sin(g.time * .15 + p.seed * 60.) * dt * 2.;
  if (p.position.y > g.world.y + 5.) { p.position.y = -5.; }
  if (p.position.x < 0.) { p.position.x += g.world.x; }
  if (p.position.x > g.world.x) { p.position.x -= g.world.x; }
  particles[i] = p;
}
`;

export const particleShader =
  uniforms +
  particleStruct +
  /* wgsl */ `
@group(0) @binding(1) var<storage, read> particles: array<Particle>;
struct Varying {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) color: vec3f,
  @location(2) alpha: f32,
};
@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) i: u32) -> Varying {
  let corners = array<vec2f, 6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));
  let p = particles[i];
  let q = corners[vi];
  let radius = .65 + p.seed * 1.05;
  let world = p.position + q * radius * 2.;
  var o: Varying;
  o.position = vec4f(world / g.world * vec2f(2., -2.) + vec2f(-1.,1.), 0., 1.);
  o.local = q;
  o.color = mix(vec3f(.42,.28,.8), vec3f(.63,.81,1.), p.seed);
  o.alpha = .08 + pow(p.seed, 8.) * .6;
  return o;
}
@fragment fn fs(v: Varying) -> @location(0) vec4f {
  let a = exp(-dot(v.local,v.local) * 5.5) * v.alpha;
  return vec4f(v.color * (1. + g.glow * .4), a);
}
`;

export const spriteShader =
  uniforms +
  /* wgsl */ `
struct Sprite { geometry: vec4f, color: vec4f, style: vec4f };
@group(0) @binding(1) var<storage, read> sprites: array<Sprite>;
struct Varying {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) color: vec4f,
  @location(2) @interpolate(flat) kind: u32,
  @location(3) extra: f32,
};
@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) i: u32) -> Varying {
  let corners = array<vec2f, 6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));
  let s = sprites[i];
  let q = corners[vi] * 1.5;
  let c = cos(s.style.y);
  let sn = sin(s.style.y);
  let local = q * s.geometry.zw;
  let world = s.geometry.xy + vec2f(local.x*c-local.y*sn, local.x*sn+local.y*c);
  var o: Varying;
  o.position = vec4f(world / g.world * vec2f(2.,-2.) + vec2f(-1.,1.), 0., 1.);
  o.local = q; o.color = s.color; o.kind = u32(s.style.x); o.extra = s.style.z;
  return o;
}
@fragment fn fs(v: Varying) -> @location(0) vec4f {
  let p = v.local;
  var d = length(p) - .72;
  var fill = .08;
  if (v.kind == 1u) {
    let angle = atan2(p.y, p.x);
    let edge = .76 + .10 * cos(angle * 7. + v.extra) + .055 * sin(angle * 3.);
    d = length(p) - edge;
    fill = .055;
  } else if (v.kind == 2u) {
    d = max(abs(p.x) * 1.4 - p.y * .68 - .58, p.y - .75);
    d = max(d, p.y - .24 - abs(p.x) * 1.5);
    fill = .26;
  } else if (v.kind == 3u) {
    d = (abs(p.x) + abs(p.y) - .8) * .7;
    fill = .3;
  } else if (v.kind == 6u) {
    d = max(abs(p.x) - .93, abs(p.y) - .85);
    fill = .5;
  } else if (v.kind == 5u) {
    fill = 0.;
  }
  let edge = exp(-abs(d) * 44.);
  let glow = exp(-abs(d) * 9.) * g.glow * .28;
  let inside = (1. - smoothstep(-.03, .01, d)) * fill;
  let alpha = (edge * .9 + glow + inside) * v.color.a;
  return vec4f(v.color.rgb * (1. + edge * .4), alpha);
}
`;
