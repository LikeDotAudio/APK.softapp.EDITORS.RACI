import test from 'node:test';
import assert from 'node:assert/strict';
import { RaciModel } from '../js/raciModel.js';

test('RaciModel tracks deliverable assignments and role matrix', () => {
  const raci = new RaciModel();
  assert.equal(raci.roles.length, 4);
  assert.equal(raci.tasks.length, 4);

  const t1 = raci.tasks[0];
  assert.equal(t1.raci['Lead AV Engineer'], 'R');
  assert.equal(t1.raci['Project Manager'], 'A');
});

test('RaciModel cycles cell values and serializes block schema', () => {
  const raci = new RaciModel('FACILITY-HANDOVER');
  raci.addTask('Rigging Certification');
  assert.equal(raci.tasks.length, 5);

  const nextVal = raci.cycleCell(4, 'Lead AV Engineer');
  assert.equal(nextVal, 'R');

  const block = raci.toBlock();
  assert.equal(block.type, 'raci_matrix');
  assert.equal(block.matrixTitle, 'FACILITY-HANDOVER');
  assert.equal(block.tasks.length, 5);

  const restored = new RaciModel();
  restored.fromBlock(block);
  assert.equal(restored.matrixTitle, 'FACILITY-HANDOVER');
  assert.equal(restored.tasks.length, 5);
  assert.equal(restored.tasks[4].raci['Lead AV Engineer'], 'R');
});
