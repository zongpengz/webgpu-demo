import { SPRITE_KIND } from './core/sprites';

// Positions are in the 1000 × 650 combat space.
// Globals = 48 bytes, Particle = 16 bytes, Sprite = 48 bytes.
export const uniforms = /* wgsl */ `
struct Globals {
  world: vec2f,
  time: f32,
  dt: f32,
  glow: f32,
  count: f32,
  stage: f32,
  danger: f32,
  impact: vec2f,
  flash: f32,
  speed: f32,
};
@group(0) @binding(0) var<uniform> g: Globals;
`;

export const backgroundShader =
  uniforms +
  /* wgsl */ `
struct Varying { @builtin(position) position: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> Varying {
  let p = array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var o: Varying; o.position = vec4f(p[i],0.,1.); o.uv = p[i]*vec2f(.5,-.5)+.5; return o;
}
fn hash(p: vec2f) -> f32 {
  var q = fract(vec3f(p.x,p.y,p.x)*.1031);
  q += dot(q,q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
}
fn noise(p: vec2f) -> f32 {
  let cell = floor(p); let f = fract(p); let u = f*f*(3.-2.*f);
  return mix(mix(hash(cell),hash(cell+vec2f(1.,0.)),u.x),mix(hash(cell+vec2f(0.,1.)),hash(cell+1.),u.x),u.y);
}
fn cloud(p: vec2f) -> f32 {
  return noise(p)*.55 + noise(p*2.1+4.7)*.28 + noise(p*4.3+9.2)*.14;
}
@fragment fn fs(v: Varying) -> @location(0) vec4f {
  let uv = v.uv;
  let drift = vec2f(g.time*.004,g.time*.007);
  let mist = cloud(uv*4.+drift);
  let band = exp(-pow((uv.y - .65 + uv.x*.4)*2.2,2.));
  let cyan = vec3f(.025,.11,.16); let crimson = vec3f(.17,.032,.085); let amber = vec3f(.12,.075,.025);
  let hue = mix(mix(cyan,crimson,clamp(g.stage,0.,1.)),amber,clamp(g.stage-1.,0.,1.));
  var col = vec3f(.008,.017,.035) + hue*pow(mist,2.)*band*1.8;
  let filament = cloud(uv*8.+vec2f(mist*2.,-mist)+drift);
  col += mix(vec3f(.04,.1,.15),hue,.55)*pow(filament,3.)*band;
  col *= 1.-pow(cloud(uv*6.+drift*.5),3.)*.7;
  col += vec3f(.05,.055,.11)*pow(cloud(uv*3.-drift),5.)*.5;
  // A lit gas giant with procedural surface bands and a tilted orbital ring.
  let planetUV = (uv-vec2f(.77,.34))*vec2f(1.538,1.);
  let radius = .24; let sphereDistance = length(planetUV);
  let ringUV = vec2f(planetUV.x*.92+planetUV.y*.39,-planetUV.x*.39+planetUV.y*.92);
  let ringDistance = length(ringUV*vec2f(1.,3.4));
  let ring = exp(-abs(ringDistance-.32)*350.) + exp(-abs(ringDistance-.335)*500.)*.35;
  col += mix(vec3f(.09,.24,.32),hue*2.,.4)*ring*.6;
  let atmosphere = exp(-abs(sphereDistance-radius)*260.);
  col += mix(vec3f(.04,.27,.42),hue*2.,.4)*atmosphere*.7;
  if (sphereDistance < radius) {
    let z = sqrt(max(0.,1.-dot(planetUV,planetUV)/(radius*radius)));
    let normal = vec3f(planetUV/radius,z);
    let lighting = max(0.,dot(normal,normalize(vec3f(-.9,-.5,.6))));
    let stripes = .5+.5*sin(planetUV.y*145.+noise(planetUV*23.)*5.+g.time*.015);
    let surface = mix(vec3f(.025,.09,.14),mix(vec3f(.12,.29,.37),hue*1.8,.35),stripes*.6);
    col = surface*(.12+lighting*.9) + vec3f(.035,.09,.13)*pow(1.-z,4.);
  }
  let cellUV = uv*vec2f(160.,104.)+vec2f(0.,-g.time*.1*g.speed);
  let seed = hash(floor(cellUV));
  let star = exp(-length(fract(cellUV)-.5)*70.)*step(.985,seed);
  col += vec3f(.65,.8,1.)*star*(.5+.5*sin(g.time*.6+seed*50.));
  col *= 1.-smoothstep(.28,.8,length(uv-.5))*.55;
  let edge = pow(abs(uv.x-.5)*2.,8.)+pow(abs(uv.y-.5)*2.,8.);
  col += vec3f(.15,.015,.025)*g.danger*edge*.4;
  col += vec3f(.12,.25,.32)*g.flash;
  return vec4f(col,1.);
}
`;

const particleStruct = /* wgsl */ `
struct Particle { position: vec2f, seed: f32 };
`;
export const computeShader =
  uniforms +
  particleStruct +
  /* wgsl */ `
@group(0) @binding(1) var<storage,read_write> particles: array<Particle>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= u32(g.count)) { return; }
  var p = particles[id.x];
  p.position.y += (12.+p.seed*70.)*g.dt*g.speed;
  p.position.x += sin(g.time*.15+p.seed*60.)*g.dt*2.;
  if (p.position.y > g.world.y+5.) { p.position.y = -5.; }
  if (p.position.x < 0.) { p.position.x += g.world.x; }
  if (p.position.x > g.world.x) { p.position.x -= g.world.x; }
  particles[id.x] = p;
}
`;
export const particleShader =
  uniforms +
  particleStruct +
  /* wgsl */ `
@group(0) @binding(1) var<storage,read> particles: array<Particle>;
struct Varying { @builtin(position) position: vec4f, @location(0) local: vec2f, @location(1) seed: f32 };
@vertex fn vs(@builtin(vertex_index) vi: u32,@builtin(instance_index) i: u32) -> Varying {
  let corners = array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));
  let p = particles[i]; let q = corners[vi];
  let size = vec2f(.35+p.seed*.55,.35+pow(p.seed,14.)*1.5);
  let world = p.position+q*size*2.;
  var o: Varying; o.position = vec4f(world/g.world*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);
  o.local = q; o.seed = p.seed; return o;
}
@fragment fn fs(v: Varying) -> @location(0) vec4f {
  let alpha = exp(-dot(v.local,v.local)*5.5)*(.012+pow(v.seed,25.)*.15);
  return vec4f(mix(vec3f(.2,.35,.5),vec3f(.6,.8,1.),v.seed)*(1.+g.glow*.3),alpha);
}
`;

export const spriteShader =
  uniforms +
  /* wgsl */ `
// Material IDs come from the CPU/GPU contract in core/sprites.ts.
const SPRITE_SPARK = ${SPRITE_KIND.spark}u;
const SPRITE_FIGHTER = ${SPRITE_KIND.fighter}u;
const SPRITE_PICKUP = ${SPRITE_KIND.pickup}u;
const SPRITE_ENEMY = ${SPRITE_KIND.enemy}u;
const SPRITE_RING = ${SPRITE_KIND.ring}u;
const SPRITE_PROJECTILE = ${SPRITE_KIND.projectile}u;
const SPRITE_TURRET = ${SPRITE_KIND.turret}u;
const SPRITE_BOSS_HULL = ${SPRITE_KIND.bossHull}u;
const SPRITE_LASER = ${SPRITE_KIND.laser}u;
const SPRITE_EXHAUST = ${SPRITE_KIND.exhaust}u;
const SPRITE_EXPLOSION = ${SPRITE_KIND.explosion}u;
const SPRITE_REACTOR = ${SPRITE_KIND.reactor}u;
const SPRITE_BOSS_WING = ${SPRITE_KIND.bossWing}u;
const SPRITE_ORBIT = ${SPRITE_KIND.orbit}u;
struct Sprite { geometry: vec4f, color: vec4f, style: vec4f };
@group(0) @binding(1) var<storage,read> sprites: array<Sprite>;
struct Varying {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) color: vec4f,
  @location(2) @interpolate(flat) kind: u32,
  @location(3) extra: f32,
};
@vertex fn vs(@builtin(vertex_index) vi: u32,@builtin(instance_index) i: u32) -> Varying {
  let corners = array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));
  let s = sprites[i]; let q = corners[vi]*1.5;
  let c = cos(s.style.y); let sn = sin(s.style.y); let scaled = q*s.geometry.zw;
  let world = s.geometry.xy+vec2f(scaled.x*c-scaled.y*sn,scaled.x*sn+scaled.y*c)+g.impact;
  var o: Varying; o.position = vec4f(world/g.world*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);
  o.local = q; o.color = s.color; o.kind = u32(s.style.x); o.extra = s.style.z; return o;
}
fn segmentDistance(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let ab = b-a;
  return length(p-a-ab*clamp(dot(p-a,ab)/dot(ab,ab),0.,1.));
}
fn boxDistance(p: vec2f, halfSize: vec2f) -> f32 {
  let q = abs(p)-halfSize;
  return length(max(q,vec2f(0.)))+min(max(q.x,q.y),0.);
}
fn wingDistance(p: vec2f) -> f32 {
  let vertices = array<vec2f,8>(vec2f(.16,-.48),vec2f(.36,-.25),vec2f(.98,.56),vec2f(.96,.78),vec2f(.64,.67),vec2f(.38,.36),vec2f(.25,.78),vec2f(.14,.38));
  var squared = 10.; var inside = false;
  for (var index = 0u; index < 8u; index++) {
    let a = vertices[index]; let b = vertices[(index+1u)%8u];
    let edge = b-a; let relative = p-a;
    let nearest = relative-edge*clamp(dot(relative,edge)/dot(edge,edge),0.,1.);
    squared = min(squared,dot(nearest,nearest));
    if ((a.y > p.y) != (b.y > p.y)) {
      if (p.x < (b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) { inside = !inside; }
    }
  }
  return sqrt(squared)*select(1.,-1.,inside);
}
fn craft(p: vec2f) -> f32 {
  let width = .19*clamp((p.y+.98)/.78,0.,1.)*(1.-.22*smoothstep(.35,.8,p.y));
  let hull = max(abs(p.x)-width,abs(p.y+.08)-.88);
  let wing = wingDistance(vec2f(abs(p.x),p.y));
  let engine = boxDistance(vec2f(abs(p.x)-.34,p.y-.36),vec2f(.11,.4))-.015;
  let cannon = boxDistance(vec2f(abs(p.x)-.58,p.y-.34),vec2f(.028,.28));
  return min(min(hull,wing),min(engine,cannon));
}
// Layered titanium, directional key light, bevels and local panel shadows.
fn metal(p: vec2f, normal: vec3f, base: vec3f, distance: f32) -> vec3f {
  let light = normalize(vec3f(-.65,-.8,1.1));
  let diffuse = max(dot(normal,light),0.);
  let halfLight = normalize(light+vec3f(0.,0.,1.));
  let specular = pow(max(dot(normal,halfLight),0.),38.);
  let grain = sin(p.x*640.+sin(p.y*91.))*sin(p.y*530.)*.018;
  var col = base*(.25+diffuse*.95+grain)+vec3f(.65,.8,.88)*specular*.48;
  col += vec3f(.34,.49,.58)*exp(-abs(distance+.018)*90.)*.5;
  return col;
}
fn fighterSurface(p: vec2f, accent: vec3f, distance: f32) -> vec3f {
  let q = vec2f(abs(p.x),p.y);
  var normal = normalize(vec3f(sign(p.x)*.3,-.38,1.));
  var base = vec3f(.23,.31,.39);
  let panel = segmentDistance(q,vec2f(.31,-.12),vec2f(.84,.59));
  let innerPanel = segmentDistance(q,vec2f(.27,-.15),vec2f(.48,.46));
  base *= .7+.3*smoothstep(.008,.023,panel);
  base += vec3f(.14,.18,.2)*step(.022,panel)*step(q.x,.7)*step(.04,q.y);
  let engine = boxDistance(vec2f(q.x-.34,q.y-.36),vec2f(.105,.39));
  if (engine < 0.) {
    normal = normalize(vec3f((q.x-.34)*6.*sign(p.x),-.15,1.));
    base = vec3f(.32,.4,.45);
    let vent = boxDistance(vec2f(q.x-.34,q.y-.31),vec2f(.067,.23));
    base = mix(base,vec3f(.028,.048,.065),1.-smoothstep(-.006,.008,vent));
    base += vec3f(.08,.13,.16)*step(.65,fract(q.y*24.))*(1.-step(0.,vent));
  }
  if (q.x < .19 && q.y < .75) {
    normal = normalize(vec3f(p.x*3.8,-.15,1.));
    base = vec3f(.4,.49,.55)*(1.-.4*smoothstep(.12,.2,q.x));
    base *= .8+.2*smoothstep(.004,.012,abs(p.x));
  }
  var col = metal(p,normal,base,distance);
  col *= 1.-.65*exp(-innerPanel*150.);
  let trim = segmentDistance(q,vec2f(.7,.49),vec2f(.86,.65));
  col = mix(col,vec3f(.74,.46,.22),exp(-trim*190.));
  let cockpit = max(q.x-.065*(1.-abs((p.y+.3)*2.5)),abs(p.y+.3)-.24);
  if (cockpit < 0.) {
    col = mix(vec3f(.015,.08,.14),vec3f(.22,.66,.78),clamp(-p.y*1.1-p.x*3.,0.,1.));
    col += vec3f(.55,.9,1.)*exp(-abs(p.x+.025)*160.)*.65;
    col *= .7+.3*smoothstep(.01,.03,abs(p.y+.22));
  }
  let emitter = boxDistance(vec2f(q.x-.34,p.y-.72),vec2f(.065,.016));
  let navigation = length(vec2f(q.x-.91,p.y-.63));
  col += accent*(exp(-max(0.,emitter)*85.)+exp(-navigation*95.)*1.5);
  let rivet = length(vec2f(q.x-.34,abs(p.y-.35)-.31));
  col += vec3f(.4,.5,.54)*exp(-rivet*180.);
  return col;
}
fn dreadnought(p: vec2f) -> f32 {
  let q = abs(p);
  var hull = max(q.x*.38+q.y*.76-.65,q.x-.84);
  if (g.stage > .5 && g.stage < 1.5) {
    hull = max(length(p*vec2f(.82,1.25))-.85,-p.y-.49+q.x*.48);
    hull = max(hull,-(length((p-vec2f(0.,.97))*vec2f(1.,1.2))-.65));
  }
  if (g.stage > 1.5) {
    hull = max(q.x*.7+q.y*.58-.68,q.y-.8);
  }
  return hull;
}
fn capitalSurface(p: vec2f, accent: vec3f, distance: f32) -> vec3f {
  let q = vec2f(abs(p.x),p.y);
  let rib = abs(fract((q.x+q.y*.18)*7.)-.5);
  let plate = segmentDistance(q,vec2f(.13,-.59),vec2f(.71,.45));
  let crossing = abs(q.y+.29-q.x*.28);
  var base = vec3f(.18,.23,.29);
  base *= .65+.35*smoothstep(.015,.05,rib);
  base += vec3f(.09,.11,.13)*step(.35,q.x)*step(q.y,.2);
  let normal = normalize(vec3f(sign(p.x)*.4,p.y*.55,1.));
  var col = metal(p,normal,base,distance);
  col *= 1.-.65*exp(-plate*130.);
  col *= 1.-.5*exp(-crossing*140.);
  let trench = boxDistance(vec2f(q.x-.53,q.y+.1),vec2f(.085,.26));
  if (trench < 0.) {
    col *= .35;
    col += accent*step(.55,fract(q.y*28.))*.55;
  }
  let conduit = segmentDistance(q,vec2f(.18,-.45),vec2f(.4,.45));
  col += accent*exp(-conduit*170.)*.45;
  let windows = step(.65,fract(q.x*28.))*exp(-abs(q.y+.44)*180.);
  col += vec3f(.55,.85,1.)*windows*.55;
  let hatch = max(abs(q.x-.27),abs(q.y-.22))-.075;
  col *= 1.-exp(-abs(hatch)*170.)*.45;
  let bolt = length(vec2f(q.x-.69,abs(q.y)-.28));
  col += vec3f(.42,.48,.52)*exp(-bolt*130.);
  return col;
}
@fragment fn fs(v: Varying) -> @location(0) vec4f {
  let p = v.local;
  var distance = length(p)-.72;
  var fill = .75; var material = v.color.rgb;
  if (v.kind == SPRITE_FIGHTER) {
    distance = craft(p);
    material = fighterSurface(p,vec3f(.3,.85,1.),distance); fill = 1.;
  } else if (v.kind == SPRITE_PICKUP) {
    distance = (abs(p.x)+abs(p.y)-.8)*.7; fill = .5;
    let cross = min(max(abs(p.x)-.08,abs(p.y)-.32),max(abs(p.x)-.32,abs(p.y)-.08));
    if (v.extra > 1.5 && v.extra < 2.5 && cross < 0.) { material = vec3f(.8,1.,.85); }
  } else if (v.kind == SPRITE_ENEMY) {
    distance = craft(vec2f(p.x,-p.y));
    material = fighterSurface(vec2f(p.x,-p.y),v.color.rgb,distance)*vec3f(1.,.8,.8); fill = 1.;
  } else if (v.kind == SPRITE_RING) {
    distance = length(p)-.85; fill = 0.;
  } else if (v.kind == SPRITE_PROJECTILE || v.kind == SPRITE_LASER) {
    distance = max(abs(p.x)-.82,abs(p.y)-.9); fill = 1.;
    material = v.color.rgb + vec3f(.4,.5,.5)*exp(-abs(p.x)*4.);
  } else if (v.kind == SPRITE_TURRET) {
    distance = max(abs(p.x)*.86+abs(p.y)*.3-.7,abs(p.y)-.9);
    material = capitalSurface(p,v.color.rgb,distance);
    let barrel = boxDistance(vec2f(abs(p.x)-.33,p.y-.68),vec2f(.09,.25));
    material = mix(material,vec3f(.035,.05,.07),1.-smoothstep(-.02,.015,barrel));
    material += v.color.rgb*exp(-length(vec2f(abs(p.x)-.33,p.y-.86))*65.); fill = 1.;
  } else if (v.kind == SPRITE_BOSS_HULL) {
    distance = dreadnought(p);
    material = capitalSurface(p,v.color.rgb,distance); fill = 1.;
  } else if (v.kind == SPRITE_REACTOR) {
    let radius = length(p); let angle = atan2(p.y,p.x);
    let ring = exp(-abs(radius-.77)*90.);
    let segments = .3+.7*step(.22,fract(angle*3.8197+g.time*.08));
    let innerRing = exp(-abs(radius-.56)*100.);
    let core = exp(-radius*radius*13.);
    let lens = pow(max(0.,1.-radius*radius/.2),2.);
    let aperture = .7+.3*sin(angle*6.+g.time*.6);
    let color = vec3f(.035,.055,.075)*(1.-smoothstep(.74,.82,radius))
      + v.color.rgb*(ring*segments*.8+innerRing*aperture+core*1.5)
      + vec3f(.8,.95,1.)*lens;
    return vec4f(color,clamp((1.-smoothstep(.8,.84,radius))+exp(-radius*radius*3.)*.3*g.glow,0.,1.)*v.color.a);
  } else if (v.kind == SPRITE_BOSS_WING) {
    let q = vec2f(abs(p.x),p.y);
    distance = max(q.x*.72+abs(q.y)*.42-.67,abs(q.y)-.87);
    material = capitalSurface(p,v.color.rgb,distance); fill = 1.;
  } else if (v.kind == SPRITE_ORBIT) {
    let radius = length(p); let angle = atan2(p.y,p.x);
    let arc = smoothstep(-.3,.1,sin(angle*3.+g.time*.28));
    let ring = exp(-abs(radius-.84)*110.);
    let ticks = pow(max(0.,cos(angle*36.)),16.)*exp(-abs(radius-.9)*130.);
    return vec4f(v.color.rgb,(ring*arc+ticks*.5)*v.color.a);
  } else if (v.kind == SPRITE_EXHAUST) {
    let along = clamp((p.y+.85)/1.85,0.,1.);
    let width = max(.04,.38*(1.-along));
    let jet = exp(-pow(p.x/width,2.)*2.5)*pow(1.-along,1.7);
    let diamonds = .8+.2*pow(max(0.,cos(p.y*22.+g.time*18.)),4.);
    let glow = exp(-p.x*p.x*9.)*pow(1.-along,2.)*.17*g.glow;
    return vec4f(mix(v.color.rgb,vec3f(.8,.95,1.),jet*.6), (jet*diamonds+glow)*v.color.a);
  } else if (v.kind == SPRITE_EXPLOSION) {
    let alpha = exp(-dot(p,p)*5.)*v.color.a;
    return vec4f(v.color.rgb*1.4,alpha);
  }
  if (v.kind == SPRITE_FIGHTER || v.kind == SPRITE_ENEMY || v.kind == SPRITE_TURRET || v.kind == SPRITE_BOSS_HULL || v.kind == SPRITE_BOSS_WING) {
    let surface = 1.-smoothstep(-.008,.012,distance);
    let rim = exp(-abs(distance)*130.);
    let tint = select(vec3f(.4,.65,.8),v.color.rgb,v.kind != SPRITE_FIGHTER);
    return vec4f(material+tint*rim*.18,surface*v.color.a);
  }
  let edge = exp(-abs(distance)*55.);
  let halo = exp(-abs(distance)*9.)*g.glow*.3;
  let surface = (1.-smoothstep(-.02,.015,distance))*fill;
  let alpha = clamp(max(surface,edge*.9+halo)*v.color.a,0.,1.);
  let col = material+v.color.rgb*(edge*.6+halo*.3);
  return vec4f(col,alpha);
}
`;
