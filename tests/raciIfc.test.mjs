// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* bom-fm-3: the RACI matrix as IfcActor + IfcTask + IfcRelAssignsToActor (USERDEFINED R/A/C/I acting
   roles), round-tripped block → IFC → block, and — with APK_IFC_PYTHON=<python with ifcopenshell> —
   held to tests/fixtures/ifc_oracle.py. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { RaciModel } from '../js/raciModel.js';
import { raciToIfc, raciFromIfc, ifcRoleFor, RACI_WORDS } from '../js/raciIfc.js';
import * as ifc from '../js/ifc/apk-ifc.mjs';
import { available, render, OUT } from './fixtures/make_ifc_codec.mjs';

const FIX = new URL('./fixtures/', import.meta.url);

function matrix() {
  const m = new RaciModel('HANDOVER');
  m.createdOn = '2026-11-01';
  m.addRole('Integrator QA');   // a role with no letter yet still belongs to the matrix
  m.addTask('Rigging certification');
  m.setCell(4, 'Lead AV Engineer', 'A');
  return m;
}

test('block → IFC → block: the same matrix, roles in column order, and the same bytes again', () => {
  const m = matrix();
  const text = raciToIfc(m);
  const back = new RaciModel();
  back.loadIfc(text, 'raci.ifc');
  assert.deepEqual(back.toBlock(), m.toBlock());
  assert.equal(raciToIfc(back), text);
});

test('each role is an IfcActor (IfcOrganization + its IfcActorRole); each cell an IfcRelAssignsToActor', () => {
  const m = matrix();
  const f = ifc.parseStep(raciToIfc(m));
  assert.equal(ifc.entitiesByType(f, 'IFCACTOR').length, m.roles.length);
  const roleWords = ifc.entitiesByType(f, 'IFCORGANIZATION').filter((o) => o.args[0] !== null && o.args[1] !== 'APK.audio')
    .map((o) => [o.args[1], ifc.deref(f, o.args[3][0]).args[0].value]);
  assert.deepEqual(Object.fromEntries(roleWords), { 'Lead AV Engineer': 'ENGINEER', 'Project Manager': 'PROJECTMANAGER',
    'Field Electrician': 'USERDEFINED', 'Client Operations': 'CLIENT', 'Integrator QA': 'USERDEFINED' });
  const cells = m.tasks.reduce((n, t) => n + Object.values(t.raci).filter((v) => v !== '-').length, 0);
  const rels = ifc.entitiesByType(f, 'IFCRELASSIGNSTOACTOR').filter((r) => Object.values(RACI_WORDS).includes(r.args[2]));
  assert.equal(rels.reduce((n, r) => n + r.args[4].length, 0), cells, 'every non-"-" cell, once');
  for (const r of rels) {
    const role = ifc.deref(f, r.args[7]);
    assert.equal(role.args[0].value, 'USERDEFINED', 'R/A/C/I are not IfcRoleEnum words');
    assert.equal(role.args[1], r.args[2]);
  }
});

test('renaming a role or a deliverable keeps its id, so its GlobalId stays', () => {
  const m = matrix();
  const before = ifc.parseStep(raciToIfc(m));
  const gidOf = (f, type, name) => ifc.entitiesByType(f, type).find((e) => e.args[2] === name)?.args[0];
  const actor = gidOf(before, 'IFCACTOR', 'Project Manager');
  const task = gidOf(before, 'IFCTASK', 'Rigging certification');
  assert.ok(m.renameRole('Project Manager', 'PM'));
  m.updateTask(4, 'Rigging inspection');
  const after = ifc.parseStep(raciToIfc(m));
  assert.equal(gidOf(after, 'IFCACTOR', 'PM'), actor);
  assert.equal(gidOf(after, 'IFCTASK', 'Rigging inspection'), task);
  assert.equal(m.roleInfo.PM.id, 'project-manager');
});

test('a v1 block (bare role names, no ids) loads and gets stable ids; IfcRoleEnum words where they fit', () => {
  const m = new RaciModel();
  assert.ok(m.fromBlock({ type: 'raci_matrix', matrixTitle: 'OLD', roles: ['Commissioning Lead', 'Client'],
    tasks: [{ task: 'Sign-off', raci: { 'Commissioning Lead': 'R', Client: 'A' } }] }));
  assert.deepEqual(m.roleInfo, { 'Commissioning Lead': { id: 'commissioning-lead', ifcRole: 'COMMISSIONINGENGINEER' }, Client: { id: 'client', ifcRole: 'CLIENT' } });
  assert.equal(m.tasks[0].id, 'task-1');
  assert.equal(ifcRoleFor('Rigging crew'), 'USERDEFINED');
  assert.throws(() => raciFromIfc(ifc.writeStep({ header: [], entities: [] })), /no RACI matrix/);
});

test('js/ifc/apk-ifc.mjs is the contracts IFC kit (when the contracts checkout is beside this app)', { skip: !available() && 'no contracts checkout' }, async () => {
  assert.equal(fs.readFileSync(OUT, 'utf8'), await render(), 'run: node tests/fixtures/make_ifc_codec.mjs');
});

const PY = process.env.APK_IFC_PYTHON;
test('IfcOpenShell oracle: 0 schema + EXPRESS errors; actors, tasks, acting roles read back', { skip: !PY && 'set APK_IFC_PYTHON to a python with ifcopenshell' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'raci-ifc-'));
  const oracle = fileURLToPath(new URL('ifc_oracle.py', FIX));
  const m = matrix();
  const file = path.join(dir, 'raci.ifc');
  fs.writeFileSync(file, raciToIfc(m));
  fs.writeFileSync(`${file}.expect.json`, JSON.stringify(m.toBlock()));
  const r = spawnSync(PY, ['-I', oracle, file, `${file}.expect.json`], { encoding: 'utf8', cwd: os.tmpdir() });
  if (r.status === 3) return;
  const got = JSON.parse(r.stdout.trim().split('\n').pop() || '{}');
  assert.deepEqual(got.problems, [], r.stderr);
  assert.equal(got.validate_errors, 0);
  assert.equal(got.tasks, m.tasks.length);
});

test('standalone Save Model (vendored apk-softapp.js): <title>.ifc and <title>.json, both', async () => {
  const { world } = await import('./softapp-harness.mjs');
  const w = world({ framed: false });
  const m = matrix();
  const r = await w.S.saveModel(m, { name: m.matrixTitle, toIfc: (x) => raciToIfc(x), toJson: (x) => x.toBlock() });
  assert.equal(r.ok, true);
  assert.equal(w.downloads.length, 2);
  assert.ok(w.downloads[0].name.endsWith('.ifc') && w.downloads[0].text.startsWith('ISO-10303-21;'));
  assert.equal(JSON.parse(w.downloads[1].text).schema, 'apk.raci/2');
});
