#!/usr/bin/env node
/* Regression harness for the component POSE system.
 *
 * Pulls the pose helpers VERBATIM out of the BUILT game/mining-game.html and
 * exercises them against real three.js, so the invariants the mounts rely on
 * (a posed part is grounded at its mount point, a card's edge is seated in the
 * slot, the rack rails line up with their risers) are checked without a
 * browser. Run after any change to the pose table or the mount code:
 *
 *     node game/tools/posetest.mjs        # prints POSE TESTS OK
 *
 * three.js is resolved from any local node_modules copy; pass one with
 * THREE_PATH=/path/to/three.module.js if the lookup misses.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'mining-game.html'), 'utf8');

/* ---- locate three ---- */
function findThree(){
  if (process.env.THREE_PATH) return process.env.THREE_PATH;
  const roots = [path.join(here,'..','..'), path.join(here,'../../..'), process.env.HOME];
  const seen = new Set();
  for (const root of roots){
    if (!root || seen.has(root)) continue; seen.add(root);
    for (const d of (fs.existsSync(root) ? fs.readdirSync(root) : [])){
      const p = path.join(root, d, 'node_modules', 'three', 'build', 'three.module.js');
      if (fs.existsSync(p)) return p;
    }
    const direct = path.join(root, 'node_modules', 'three', 'build', 'three.module.js');
    if (fs.existsSync(direct)) return direct;
  }
  throw new Error('three.js not found — set THREE_PATH=/path/to/three.module.js');
}
const THREE = await import(pathToFileURL(findThree()).href);

/* ---- extract a top-level declaration from the built file, braces balanced ----
 * Skips strings AND comments: an apostrophe in a `// the CPUs' deck` comment
 * used to open a phantom string and swallow the rest of the file. */
function grab(decl){
  const i = html.indexOf('\n' + decl);
  if (i < 0) throw new Error('not found in built html: ' + decl);
  const j = html.indexOf('{', i);
  let depth = 0, str = null, line = false, block = false, prev = '';
  for (let k = j; k < html.length; k++){
    const c = html[k], next = html[k+1];
    if (line){ if (c === '\n') line = false; }
    else if (block){ if (prev === '*' && c === '/') block = false; }
    else if (str){ if (c === str && prev !== '\\') str = null; }
    else if (c === '/' && next === '/') line = true;
    else if (c === '/' && next === '*') block = true;
    else if (c === '"' || c === "'" || c === '`') str = c;
    else if (c === '{') depth++;
    else if (c === '}'){ depth--; if (!depth) return html.slice(i + 1, k + 1) + (decl.startsWith('function') ? '' : ';'); }
    prev = c;
  }
  throw new Error('unbalanced: ' + decl);
}
const SRC = [
  'const POSE_CTX=', 'const POSE_DEF=', 'const PART_POSE=',
  'function poseFor(', 'function poseOverride(', 'function poseSet(',
  'function poseMesh(', 'function poseSize(',
  'function normalizeFit(', 'function instOf(',
  'function seatCard(', 'function placeRackGpus(',
  'const TOWER_BAY=', 'function towerBayOf(', 'function towerFitOf(',
  'function placeTowerBoard(', 'function placeTowerBayGpus(', 'function placeTowerCpus(',
  'const BOARD_TILT=', 'function seatCpu(',
  'const FAN=', 'function spinFans(',
].map(grab).join('\n');
const SLOT_Y = +/const SLOT_Y=([\d.]+)/.exec(html)[1];
const CPU_Y = SLOT_Y - 0.03;   // matches the source's own `CPU_Y=SLOT_Y-0.03`

/* ---- stub the pieces the extracted code reaches for ---- */
const PROTO = {}, ITEMS = {}, S = {pose:{}};
const DEG = Math.PI/180;
const save = () => {};
/* a synthetic card: 0.30 long, 0.12 wide, 0.02 thick, authored long-axis=x
   fans=+z (the gen1 convention), and a twin authored standing on end (gen2) */
function box(w,h,d){ return new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshBasicMaterial()); }
PROTO.flatcard  = box(0.30, 0.02, 0.12);   // lying flat, long axis x
PROTO.endcard   = box(0.02, 0.30, 0.12);   // standing on end (needs rz/ry to lie down)
PROTO.sidecard  = box(0.12, 0.02, 0.30);   // long axis z (needs ry to face x)
PROTO.frame     = box(1.0, 0.6, 0.5);
PROTO.board     = box(0.30, 0.04, 0.25);   // motherboard: long x, components 4mm proud, 250mm deep
PROTO.cooler    = box(0.12, 0.16, 0.10);   // CPU cooler, authored fan-up: taller than it is deep
ITEMS[1] = {id:1, key:'flatcard', comp:'GPU'};
ITEMS[2] = {id:2, key:'sidecard', comp:'GPU'};
ITEMS[3] = {id:3, key:'endcard',  comp:'GPU'};
ITEMS[9] = {id:9, key:'cooler',   comp:'Processor'};
const makeRGBFan = () => new THREE.Group();

const ctxObj = {THREE, PROTO, ITEMS, S, DEG, save, makeRGBFan, SLOT_Y, CPU_Y, Math, Object, console, JSON};
const body = SRC + '\nreturn {poseFor,poseMesh,poseSize,poseSet,poseOverride,seatCard,seatCpu,placeRackGpus,'
  + 'towerBayOf,towerFitOf,placeTowerBoard,placeTowerBayGpus,placeTowerCpus,spinFans,FAN,TOWER_BAY,PART_POSE,POSE_DEF,POSE_CTX,normalizeFit,instOf,BOARD_TILT};';
const G = new Function(...Object.keys(ctxObj), body)(...Object.values(ctxObj));

/* ---- assertions ---- */
let pass = 0; const fails = [];
const ok = (name, cond, extra='') => { if (cond) pass++; else fails.push(name + (extra ? ' — ' + extra : '')); };
const near = (a,b,eps=1e-4) => Math.abs(a-b) <= eps;
const size = o => G.poseSize(o);
const bbox = o => new THREE.Box3().setFromObject(o);

// 1. a posed part is grounded at its mount point and centred in x/z
{
  const m = G.poseMesh('rack','flatcard',0.56);
  const b = bbox(m);
  ok('grounded at y=0', near(b.min.y, 0), 'min.y=' + b.min.y);
  ok('centred in x', near((b.min.x + b.max.x)/2, 0));
  ok('centred in z', near((b.min.z + b.max.z)/2, 0));
  ok('fitted to the target size', near(Math.max(...size(m).toArray()), 0.56));
}
// 2. rotation is applied to the RAW model, before the fit — a card authored
//    long-axis=z ends up long-axis=x and STILL fits the target and grounds
{
  G.PART_POSE['*:sidecard'] = {ry:-90};
  const m = G.poseMesh('rack','sidecard',0.56);
  const s = size(m), b = bbox(m);
  ok('authored ry lays the card along x', s.x > s.z, `x=${s.x.toFixed(3)} z=${s.z.toFixed(3)}`);
  ok('rotation does not lift the part off the mount', near(b.min.y, 0), 'min.y=' + b.min.y);
  ok('rotation does not change the fitted size', near(Math.max(...s.toArray()), 0.56));
  delete G.PART_POSE['*:sidecard'];
}
// 3. lookup order: '*:key' -> 'ctx:key' -> S.pose
{
  G.PART_POSE['*:flatcard']    = {rx:-90};
  G.PART_POSE['pcie:flatcard'] = {rx:180};
  ok("'*:key' applies to every mount", G.poseFor('rack','flatcard').rx === -90);
  ok("'ctx:key' beats '*:key'",        G.poseFor('pcie','flatcard').rx === 180);
  S.pose['*:flatcard'] = {rx:45};
  ok('a calibration beats the built-in default', G.poseFor('rack','flatcard').rx === 45);
  ok('a global calibration also beats a per-context default',
     G.poseFor('pcie','flatcard').rx === 45, 'the lab is the last word — otherwise an edit looks ignored');
  S.pose['pcie:flatcard'] = {rx:10};
  ok('a per-context calibration beats a global one', G.poseFor('pcie','flatcard').rx === 10);
  S.pose = {};
  delete G.PART_POSE['*:flatcard']; delete G.PART_POSE['pcie:flatcard'];
}
// 4. offsets and scale
{
  S.pose['rack:flatcard'] = {y:0.1, x:-0.05, s:0.5};
  const m = G.poseMesh('rack','flatcard',0.56), b = bbox(m);
  ok('y offset lifts the part', near(b.min.y, 0.1), 'min.y=' + b.min.y);
  ok('x offset shifts the part', near((b.min.x + b.max.x)/2, -0.05));
  ok('s scales the fitted size', near(Math.max(...size(m).toArray()), 0.28));
  S.pose = {};
}
// 5. poseSet only stores what differs from the default, and clears when equal
{
  G.poseSet('rack','flatcard','ctx', {...G.POSE_DEF, rx:-90});
  ok('poseSet stores only the changed field', JSON.stringify(S.pose['rack:flatcard']) === '{"rx":-90}');
  ok('poseSet scope=ctx writes the ctx key', !!S.pose['rack:flatcard'] && !S.pose['*:flatcard']);
  G.poseSet('rack','flatcard','all', {...G.POSE_DEF, ry:90});
  ok('poseSet scope=all writes the global key', JSON.stringify(S.pose['*:flatcard']) === '{"ry":90}');
  G.poseSet('rack','flatcard','ctx', {...G.POSE_DEF});
  ok('a pose back at the default is deleted, not stored', !S.pose['rack:flatcard']);
  S.pose = {};
}
// 6. seatCard puts the card's edge IN the slot (no float, no sink, no lie-down)
{
  /* the canonical pose is a STANDING card: long axis x, height y, thin axis z */
  PROTO.standcard = box(0.30, 0.12, 0.02);
  ITEMS[4] = {id:4, key:'standcard', comp:'GPU'};
  const m = G.seatCard(G.poseMesh('pcie','standcard',1.8), 0, 0.12);
  const b = bbox(m), s = size(m);
  ok('card stays standing in the slot', s.y > s.z, `h=${s.y.toFixed(3)} thickness=${s.z.toFixed(3)}`);
  ok('card keeps its full height', near(s.y, 1.8 * (0.12/0.30)), 'height=' + s.y);
  ok('edge connector seated at the slot', near(b.min.y, SLOT_Y - 0.03), 'min.y=' + b.min.y);
  ok('card straddles the slot centre line',
     near((b.min.x + b.max.x)/2, 0) && near((b.min.z + b.max.z)/2, 0.12),
     'z centre=' + ((b.min.z + b.max.z)/2).toFixed(4));
}
// 6b. seatCpu keeps the fan pointing at the ceiling despite the bench board's
// own tilt (the actual bug: CPU coolers used to inherit BOARD_TILT with no
// compensation and ended up leaning the same way as the GPUs beside them).
{
  const m = G.seatCpu(G.poseMesh('socket','standcard',0.62), -0.28, -0.52);
  ok("seatCpu counter-tilts by -BOARD_TILT so a fan-up cooler stays fan-up",
     near(m.rotation.x, -G.BOARD_TILT), 'rotation.x=' + m.rotation.x);
  ok('seatCpu positions the cooler at CPU_Y on the given x/z',
     near(m.position.x, -0.28) && near(m.position.y, CPU_Y) && near(m.position.z, -0.52));
  // simulate the bench's own tilted board parent and confirm the NET world
  // rotation cancels out to identity — a fan authored pointing +Y (up) must
  // still point up in world space once mounted, tilted board or not.
  const board = new THREE.Group(); board.rotation.x = G.BOARD_TILT;
  board.add(m); board.updateMatrixWorld(true);
  const upLocal = new THREE.Vector3(0,1,0);
  const upWorld = upLocal.clone().applyQuaternion(m.getWorldQuaternion(new THREE.Quaternion()));
  ok('the cooler\'s local "up" (fan direction) still points world-up once mounted on the tilted board',
     near(upWorld.x,0) && near(upWorld.y,1) && near(upWorld.z,0),
     'world up=' + upWorld.toArray().map(v=>v.toFixed(3)).join(','));
}
// 7. the open-air rack: rails, spacing, and risers that actually touch the card
{
  const parent = new THREE.Group();
  const base = {x:0, y:2.2, z:-0.6};
  const r = G.placeRackGpus(parent, [1,1,1,1], base, {fans:false});
  ok('4 cards on the frame', r.cards.length === 4);
  ok('all 4 on the bottom rail', r.cards.every(c => near(c.position.y, base.y)));
  const xs = r.cards.map(c => c.position.x).sort((a,b)=>a-b);
  ok('cards spaced 0.46 apart', near(xs[1]-xs[0], 0.46) && near(xs[3]-xs[2], 0.46));
  ok('row centred on the mount', near((xs[0]+xs[3])/2, base.x));
  ok('every card bottom sits on its rail', r.cards.every(c => near(bbox(c).min.y, base.y)),
     'bottoms=' + r.cards.map(c => bbox(c).min.y.toFixed(3)).join(','));
  const r2 = G.placeRackGpus(new THREE.Group(), new Array(9).fill(1), base, {fans:true});
  const rails = new Set(r2.cards.map(c => +c.position.y.toFixed(3)));
  const depths = new Set(r2.cards.map(c => Math.round((c.position.z - base.z) / 0.62)));
  ok('9 cards fill both rails', rails.size === 2, 'rails=' + [...rails].join(','));
  ok('the 9th card starts a second row behind', depths.size === 2, 'depths=' + [...depths].join(','));
  ok('a fan per card when cooling is on', r2.fans.length === 9);
}
// 9. the Server Tower: cards plugged into real PCIe slots on the board
{
  /* the real tower's local bounds, measured in-browser: 2.2 x 1.8 x 0.83, so
     the big face the player looks at is the side panel, as in a real tower */
  const box = {min:new THREE.Vector3(-1.1,0,-0.42), size:new THREE.Vector3(2.2,1.8,0.83)};
  const bay = G.towerBayOf(box);
  const parent = new THREE.Group();
  const fit = G.towerFitOf(bay, [4]);
  const board = G.placeTowerBoard(parent, bay, fit);
  ok('the board stands on the tray, inside the case',
     near(bbox(board.group).min.z, bay.tray) && board.bottom >= box.min.y && board.top <= box.min.y + box.size.y,
     `tray=${bay.tray.toFixed(3)} back=${bbox(board.group).min.z.toFixed(3)}`);
  ok('the board is centred across the case', near((bbox(board.group).min.x + bbox(board.group).max.x)/2, bay.x));

  const six = G.placeTowerBayGpus(parent, new Array(6).fill(4), bay, board, fit);
  ok('six cards all mount', six.length === 6);
  const boxes = six.map(bbox);
  ok('every card is seated ON the board face, not floating',
     boxes.every(b => near(b.min.z, board.face)),
     'z=' + boxes.map(b => b.min.z.toFixed(3)).join(','));
  /* the case DEPTH is what limits card size: a card standing in a slot has to
     fit between the tray and the glass, or it pokes out through the panel */
  ok('cards stand off the board toward the glass, and stop short of the panel',
     boxes.every(b => b.max.z > b.min.z && b.max.z <= box.min.z + box.size.z - 1e-4),
     'reach=' + boxes[0].max.z.toFixed(3) + ' panel=' + (box.min.z + box.size.z).toFixed(3));
  ok('nothing pokes out of the case at all',
     [...boxes, bbox(board.group)].every(b =>
        b.min.x >= box.min.x && b.max.x <= box.min.x + box.size.x &&
        b.min.y >= box.min.y && b.max.y <= box.min.y + box.size.y &&
        b.min.z >= box.min.z && b.max.z <= box.min.z + box.size.z));
  ok('each card lies along its slot, not across it',
     boxes.every(b => (b.max.x - b.min.x) > (b.max.y - b.min.y)),
     'len=' + (boxes[0].max.x - boxes[0].min.x).toFixed(3) + ' thick=' + (boxes[0].max.y - boxes[0].min.y).toFixed(3));
  /* the stacking axis is the card's THICKNESS — that is what PCIe pitch is */
  const pitches = boxes.slice(1).map((b,i) => b.min.y - boxes[i].min.y);
  const thick = boxes[0].max.y - boxes[0].min.y;
  ok('slots are evenly pitched', pitches.every(p => near(p, pitches[0])), 'pitch=' + pitches[0].toFixed(4));
  ok('pitch is one card thickness plus clearance',
     pitches[0] > thick && pitches[0] < thick * 2,
     `pitch=${pitches[0].toFixed(4)} thickness=${thick.toFixed(4)}`);
  ok('no two cards intersect', boxes.every((b,i) => i === 0 || b.min.y >= boxes[i-1].max.y - 1e-4));
  ok('the whole stack fits on the board',
     boxes[0].min.y >= board.bottom - 1e-4 && boxes[5].max.y <= board.top + 1e-4,
     `stack=${boxes[0].min.y.toFixed(3)}..${boxes[5].max.y.toFixed(3)} board=${board.bottom.toFixed(3)}..${board.top.toFixed(3)}`);
  ok('a full tower keeps its cards at the size the case allows', near(size(six[0]).x, fit.len),
     'len=' + size(six[0]).x.toFixed(3) + ' vs fit ' + fit.len.toFixed(3));
  ok('card length is limited by the case depth, not the case width',
     fit.len < bay.iw*0.86, `len=${fit.len.toFixed(3)} width cap=${(bay.iw*0.86).toFixed(3)}`);
  ok('the depth budget counts the board as well as the card',
     near(fit.len * (fit.ratio.y + fit.board/G.TOWER_BAY.cardOfBoard), bay.id*0.95),
     `board+card=${(fit.len*(fit.ratio.y + fit.board/G.TOWER_BAY.cardOfBoard)).toFixed(3)} depth=${(bay.id*0.95).toFixed(3)}`);
  ok('every card is the same size', six.every(c => near(size(c).x, size(six[0]).x)));
  // CPU coolers: fans up, on the board, clear of the cards
  const cw = Math.min(fit.boardW*0.22, board.h*0.3);
  const cpus = G.placeTowerCpus(parent, [9,9], bay, board, cw);
  const cb = cpus.map(bbox);
  ok('both coolers mount', cpus.length === 2);
  ok('coolers stand upright, fan up — no roll onto their side',
     cb.every(b => (b.max.y - b.min.y) > (b.max.z - b.min.z)),
     `h=${(cb[0].max.y-cb[0].min.y).toFixed(3)} d=${(cb[0].max.z-cb[0].min.z).toFixed(3)}`);
  ok('coolers sit proud of the board, not sunk into it',
     cb.every(b => b.min.z >= board.face - 1e-4), 'z=' + cb[0].min.z.toFixed(3) + ' face=' + board.face.toFixed(3));
  ok('coolers clear the PCIe stack', cb.every(b => b.min.y > boxes[5].max.y));
  ok('coolers stay on the board', cb.every(b => b.max.y <= board.top + 1e-4));
  ok('two coolers sit side by side without touching',
     cb[0].max.x <= cb[1].min.x + 1e-4);
  ok('coolers stay inside the case',
     cb.every(b => b.max.z <= box.min.z + box.size.z && b.min.x >= box.min.x && b.max.x <= box.min.x + box.size.x));

  // a board too short for the stack shrinks the cards rather than overflowing
  const tiny = G.placeTowerBayGpus(new THREE.Group(), new Array(6).fill(4), bay, {...board, h: board.h*0.4}, fit);
  ok('an undersized board shrinks the stack instead of overflowing',
     tiny.every(c => size(c).x < size(six[0]).x)
     && tiny.map(bbox).every(b => b.max.y <= board.bottom + board.h*0.4 + 1e-4));
}
// 10. fans turn clockwise while mining, and stop dead when the rig is not
{
  const fan = () => { const m = new THREE.Object3D(); m.userData.fanAxis = 'z'; return m; };
  const fans = [fan(), fan(), fan()];
  fans[1].userData.fanAxis = 'y';
  G.spinFans(fans, 0.5, true);
  ok('a mining rig turns its fans', fans[0].rotation.z !== 0);
  ok('each fan turns about its own axis',
     fans[1].rotation.y !== 0 && fans[1].rotation.z === 0 && fans[0].rotation.y === 0);
  ok('clockwise seen from the fan face is a negative turn', fans[0].rotation.z < 0);
  ok('every fan turns together', fans[0].rotation.z === fans[2].rotation.z);
  ok('the step is the configured speed', near(fans[0].rotation.z, -G.FAN.spin*0.5));
  const held = fans[0].rotation.z;
  G.spinFans(fans, 0.5, false);
  ok('an idle rig stops them dead, not slow-drifts', fans[0].rotation.z === held);
  G.spinFans(null, 0.5, true); G.spinFans([], 0.5, true);
  ok('a rig with no detected fans is harmless', true);
}
// 8. the shipped table stays well-formed (every field known, angles sane)
{
  const known = Object.keys(G.POSE_DEF);
  let bad = [];
  for (const k in G.PART_POSE){
    if (!/^(\*|[a-z]+):[a-z0-9]+$/.test(k)) bad.push('key ' + k);
    for (const f in G.PART_POSE[k]){
      if (!known.includes(f)) bad.push(k + '.' + f);
      if (f[0] === 'r' && Math.abs(G.PART_POSE[k][f]) > 360) bad.push(k + '.' + f + ' out of range');
    }
  }
  ok('shipped PART_POSE is well-formed', !bad.length, bad.join(' '));
}

console.log(`${pass} assertions passed` + (fails.length ? `, ${fails.length} FAILED` : ''));
if (fails.length){ fails.forEach(f => console.error('  ✗ ' + f)); process.exit(1); }
console.log('POSE TESTS OK');
