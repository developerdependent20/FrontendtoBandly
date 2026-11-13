// Pruebas del catálogo de planes y del acceso a las apps. Se corren con:
//   node --test src/utils/plans.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANS, getPlanById } from './planFeatures.js';
import { APP_MIN_PLAN, APPS, planAllows } from './downloadLinks.js';

const ORDER = ['free', 'starter', 'pro', 'elite'];

test('los planes están en orden y no se repiten', () => {
  assert.deepEqual(PLANS.map(p => p.id), ORDER);
});

test('getPlanById no distingue mayúsculas y cae a Gratis si no reconoce el plan', () => {
  assert.equal(getPlanById('pro').id, 'pro');
  assert.equal(getPlanById('ELITE').id, 'elite');
  for (const raro of [undefined, null, '', 'platino']) {
    assert.equal(getPlanById(raro).id, 'free', String(raro));
  }
});

test('el plan gratis cuesta cero y los de pago suben de precio con el nivel', () => {
  const [free, ...paid] = PLANS;
  assert.equal(free.monthly, 0);
  assert.equal(free.yearly, 0);
  for (let i = 0; i < paid.length; i++) {
    assert.ok(paid[i].monthly > 0 && paid[i].yearly > 0, paid[i].id);
    if (i > 0) {
      assert.ok(paid[i].monthly > paid[i - 1].monthly, `${paid[i].id} mensual`);
      assert.ok(paid[i].yearly > paid[i - 1].yearly, `${paid[i].id} anual`);
    }
  }
});

test('el pago anual sale más barato que doce meses, y la promo es una rebaja real', () => {
  for (const p of PLANS.filter(p => p.monthly > 0)) {
    assert.ok(p.yearly < p.monthly * 12, `${p.id}: anual ${p.yearly} contra ${p.monthly * 12}`);
    assert.ok(p.originalMonthly > p.monthly, `${p.id}: precio tachado mensual`);
    assert.ok(p.originalYearly > p.yearly, `${p.id}: precio tachado anual`);
  }
});

test('solo un plan se marca como recomendado', () => {
  assert.equal(PLANS.filter(p => p.recommended).length, 1);
});

test('cada app se abre desde su plan mínimo y los superiores', () => {
  const table = {
    free:    { daw: false, presenter: false, lights: false },
    starter: { daw: true,  presenter: false, lights: false },
    pro:     { daw: true,  presenter: true,  lights: false },
    elite:   { daw: true,  presenter: true,  lights: true },
  };
  for (const [plan, apps] of Object.entries(table)) {
    for (const [app, expected] of Object.entries(apps)) {
      assert.equal(planAllows(plan, app), expected, `${plan} → ${app}`);
    }
  }
});

test('sin plan cuenta como gratis y no distingue mayúsculas', () => {
  for (const app of Object.keys(APP_MIN_PLAN)) {
    assert.equal(planAllows(undefined, app), false);
    assert.equal(planAllows(null, app), false);
    assert.equal(planAllows('', app), false);
  }
  assert.equal(planAllows('Elite', 'lights'), true);
});

test('un plan o una app que no existen no dan acceso', () => {
  assert.equal(planAllows('platino', 'daw'), false);
  assert.equal(planAllows('elite', 'otra'), false);
});

test('la etiqueta de plan mínimo de cada app coincide con la regla', () => {
  assert.deepEqual(Object.keys(APPS).sort(), Object.keys(APP_MIN_PLAN).sort());
  for (const [app, info] of Object.entries(APPS)) {
    assert.equal(info.minPlanLabel, getPlanById(APP_MIN_PLAN[app]).name, app);
  }
});

test('cada plan anuncia la app que desbloquea', () => {
  const mentions = { starter: /Tracker/i, pro: /Presenter/i, elite: /Lights/i };
  for (const [plan, pattern] of Object.entries(mentions)) {
    assert.ok(getPlanById(plan).features.some(f => pattern.test(f)), plan);
  }
});
