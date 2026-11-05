// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* ROAD-3489: the RACI block round trip over cad.like.audio/host@1, through the
   vendored apk-softapp.js the page loads. */
import test from 'node:test';
import assert from 'node:assert/strict';

import { RaciModel, RACI_BLOCK_TYPE } from '../js/raciModel.js';
import { world, roundTrip, ORIGIN, PROTOCOL } from './softapp-harness.mjs';

const connect = (model) => (S) => S.connectHost({
  editor: 'RACI Matrix Editor', blockType: RACI_BLOCK_TYPE,
  onLoad: (b) => model.fromBlock(b), onRequest: () => model.toBlock(),
});

test('RACI: the CAD loads a block, asks for it back, gets the same matrix at its own origin', () => {
  const model = new RaciModel();
  const block = {
    type: RACI_BLOCK_TYPE, id: 'raci_handover', matrixTitle: 'HANDOVER',
    roles: ['Engineer', 'Client'],
    tasks: [{ task: 'Sign-off', raci: { Engineer: 'R', Client: 'A' } }],
  };
  const { w, ready, saved } = roundTrip({ connect: connect(model), block });
  assert.equal(ready.m.protocol, PROTOCOL);
  assert.equal(ready.m.blockType, RACI_BLOCK_TYPE);
  assert.equal(model.matrixTitle, 'HANDOVER');
  assert.equal(saved.o, ORIGIN);
  assert.deepEqual(saved.m.block, block);
  assert.equal(w.downloads.length, 0, 'no download when embedded');
});

test('RACI: renaming a role carries its column; a clash is refused', () => {
  const model = new RaciModel();
  const first = model.tasks[0].raci['Project Manager'];
  assert.ok(model.renameRole('Project Manager', 'PM'));
  assert.equal(model.tasks[0].raci.PM, first);
  assert.ok(!('Project Manager' in model.tasks[0].raci));
  assert.equal(model.renameRole('PM', 'Lead AV Engineer'), false);
  assert.equal(model.missingAccountable(), 0);
});

test('RACI: a block that is not a RACI block leaves the matrix alone', () => {
  const model = new RaciModel();
  assert.equal(model.fromBlock({ type: 'wirelist', wires: [] }), false);
  assert.equal(model.roles.length, 4);
});

test('RACI: standalone save downloads <title>.json', () => {
  const model = new RaciModel('HANDOVER');
  const w = world({ framed: false });
  const host = connect(model)(w.S);
  assert.equal(host.save(model.toBlock(), { filename: model.matrixTitle }), 'download');
  assert.equal(w.downloads[0].name, 'HANDOVER.json');
});
