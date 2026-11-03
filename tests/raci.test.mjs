import test from 'node:test';
import assert from 'node:assert/strict';
import { RaciModel } from '../js/raciApp.js';

test('RaciModel tracks deliverable assignments and role matrix', () => {
  const raci = new RaciModel();
  assert.equal(raci.roles.length, 4);
  assert.equal(raci.tasks.length, 4);

  const t1 = raci.tasks[0];
  assert.equal(t1.raci['Lead AV Engineer'], 'R');
  assert.equal(t1.raci['Project Manager'], 'A');
});
