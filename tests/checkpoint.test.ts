import test from 'node:test';
import assert from 'node:assert/strict';
import {MouseSession} from '../src/diagnostics';

test('restoring a long session retains cumulative values and clears physical holds',()=>{
  const old=new MouseSession();old.conditions.input='mouse';
  for(let i=0;i<400;i++){old.down(0,old.start+i*20);old.up(0,old.start+i*20+5);}
  old.down(3,old.start+9000);
  const saved=old.report('Test mouse','Before update','previous-session');
  const restored=MouseSession.restore(old.checkpoint('Test mouse','Before update','previous-session'));
  assert.equal(restored.report.device,saved.device);assert.equal(restored.report.comment,saved.comment);assert.equal(restored.report.previous_session_id,'previous-session');
  assert.equal(restored.session.id,old.id);assert.equal(restored.session.totalEvents,old.totalEvents);
  assert.deepEqual(restored.session.summary,old.summary);assert.deepEqual(restored.session.events,old.events);
  restored.session.down(3,restored.session.start+10);restored.session.up(3,restored.session.start+35);
  assert.equal(restored.session.summary.totalClicks,402);assert.equal(restored.session.summary.completedHolds,401);
  assert.equal(restored.session.report().trace_truncated,true);
});

test('restoration preserves sampling aggregates without bridging the reload gap',()=>{
  const old=new MouseSession();
  for(let i=0;i<70;i++)old.pointer(old.start+i*10,i,i,'pointermove','mouse');
  const restored=MouseSession.restore(old.checkpoint()).session;
  restored.pointer(restored.start+20,1,1,'pointermove','mouse');
  assert(Math.abs(restored.summary.eventRateHz!-100)<1e-8);
  restored.pointer(restored.start+40,2,2,'pointermove','mouse');
  assert(Math.abs(restored.summary.eventRateHz!-1000*70/710)<1e-8);
});

test('malformed recovery counters are refused',()=>{
  const valid=JSON.parse(new MouseSession().checkpoint());
  for(const change of [{totalEvents:-1},{intervalSum:-1},{intervals:4},{kind:'foreign'}]){
    assert.throws(()=>MouseSession.restore(JSON.stringify({...valid,...change})));
  }
});
