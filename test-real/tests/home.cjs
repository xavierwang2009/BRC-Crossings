const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync(__dirname + '/../src/app.js', 'utf8');
const source = app.slice(app.indexOf('const isFriend ='), app.indexOf('function todayCard()'));
const S = {
  friendships: { kevin: 'friend', ana: 'outgoing' },
  posts: [
    { id: 'p1', anon: true, replies: [{ author: 'Kevin W.', text: 'named reply' }, { author: 'Anonymous', text: 'anonymous reply' }] },
    { id: 'p2', anon: false, replies: [{ author: 'Kevin W.', text: 'held reply', held: true }, { author: 'Ana M.', text: 'pending friend' }] },
  ],
};
const ctx = vm.createContext({ S, MEMBERS: [{ id: 'kevin', name: 'Kevin W.' }, { id: 'ana', name: 'Ana M.' }] });
vm.runInContext(source, ctx);
const rows = ctx.friendReplies();
assert.equal(rows.length, 1, 'Only accepted friends, only named replies, never held ones');
assert.equal(rows[0].r.text, 'named reply');
assert.equal(rows[0].p.id, 'p1');
assert.equal(vm.runInContext("isFriend('ana')", ctx), false, 'A pending request is not a friend');
console.log('Home checks passed: friends\' replies come only from accepted friends, are named, and skip held replies.');
