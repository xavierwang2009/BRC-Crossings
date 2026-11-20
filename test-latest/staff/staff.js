/* Public, fictional staff workflow. All changes live in this tab's memory. */
const strings = {
  questions:['Questions','問題','问题'], saved:['Reply saved','回覆已儲存','回复已保存'],
  preview:['Staff preview','員工體驗版','员工体验版'],
  notice:['Use sample text only. Refresh resets the queue.','請只輸入示範文字。重新整理會重設問題清單。','请只输入示例文字。刷新会重置问题列表。'],
  admin:['Clinic coordinator','診所管理員','诊所管理员'], counselor:['Counselor','輔導師','咨询师'],
  roles:['Workspace','工作區','工作区'], queue:['Assignment queue','問題分配','问题分配'], inbox:['My inbox','我的收件匣','我的收件箱'],
  parenting:['Parenting','親職','育儿'], stress:['Work stress','工作壓力','工作压力'],
  school:['How can we discuss homework without an argument?','怎麼和孩子談功課才不會吵架？','怎么和孩子谈作业才不会吵架？'],
  hours:['How can I set boundaries around after-hours work messages?','下班後收到工作訊息時，我可以怎麼設定界線？','下班后收到工作消息时，我可以怎样设定界限？'],
  open:['Unassigned','尚未分配','尚未分配'], assigned:['Assigned','已分配','已分配'], replied:['Replied','已回覆','已回复'], resolved:['Resolved','已完成','已完成'],
  assign:['Assign to Joel','分配給 Joel','分配给 Joel'], release:['Unassign from Joel','解除 Joel 的指派','取消分配给 Joel'],
  resolve:['Mark resolved','標記為已完成','标记为已完成'], reopen:['Reopen','重新開啟','重新打开'],
  draftTitle:['Save your reply before resolving?','要先儲存回覆再標記為已完成嗎？','要先保存回复再标记为已完成吗？'],
  finish:['Save reply and resolve','儲存回覆並標記為已完成','保存回复并标记为已完成'], edit:['Keep editing','繼續編輯','继续编辑'],
  finished:['Reply saved and question resolved','已儲存回覆並完成問題','已保存回复并完成问题'],
  respond:['Reply to sample question','回覆示範問題','回复示例问题'], save:['Save sample reply','儲存示範回覆','保存示例回复'],
  responses:['Saved replies','已儲存的回覆','已保存的回复'], empty:['Your inbox is empty. Switch to Clinic coordinator to assign a sample question.','收件匣是空的。切換到診所管理員即可分配示範問題。','收件箱为空。切换到诊所管理员即可分配示例问题。'],
  detail:['Question details','問題詳情','问题详情'], reset:['Restart test','重新開始測試','重新开始测试'],
  confirm:['Clear this tab’s sample assignments and replies?','清除此分頁的示範分配與回覆？','清除此标签页的示例分配和回复？']
};
const copy = key => strings[key][['en','ht','hs'].indexOf(language)];
const params = new URLSearchParams(location.search);
let language = ['en','ht','hs'].includes(params.get('lang')) ? params.get('lang') : 'en';
let role = params.get('role') === 'counselor' ? 'counselor' : 'admin';
const samples = () => [
  { id:'work', topic:'stress', question:'hours', assigned:false, resolved:false, replies:[], draft:'' },
  { id:'parent', topic:'parenting', question:'school', assigned:true, resolved:false, replies:[], draft:'' }
];
let questions = samples(), selected = null;
const app = document.querySelector('#app');
const esc = text => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function status(q) {
  if (q.resolved) return 'resolved';
  if (!q.assigned) return 'open';
  return q.replies.length ? 'replied' : 'assigned';
}
function details(q) {
  const replyList = q.replies.length ? '<h3>'+copy('responses')+'</h3>'+q.replies.map(r=>'<p class="reply">'+esc(r)+'</p>').join('') : '';
  let controls;
  if (role === 'admin') {
    controls = q.resolved ? '' : '<button class="primary" data-action="assign">'+copy(q.assigned?'release':'assign')+'</button>';
  } else {
    const form = q.resolved ? '' : '<form><label for="draft">'+copy('respond')+'</label><textarea id="draft" required>'+esc(q.draft)+'</textarea><button class="primary" type="submit" '+(q.draft.trim()?'':'disabled')+'>'+copy('save')+'</button></form>';
    controls = form+'<div><button class="secondary" data-action="resolve">'+copy(q.resolved?'reopen':'resolve')+'</button></div>';
  }
  const profile=StaffProfile.read();
  const assignee=role==='admin' ? '<div class="counselor-summary">'+StaffProfile.avatar(profile)+'<div><strong>Joel Qiao</strong><br>'+profileText('langs')+' · '+StaffProfile.languageText(profile,language)+'</div></div>' : '';
  return '<article class="panel detail" aria-label="'+copy('detail')+'"><div class="topic">'+copy(q.topic)+'</div><h2>'+copy(q.question)+'</h2><div class="metadata">'+badge(q)+(q.assigned && role==='counselor'?' · Joel Qiao':'')+'</div>'+assignee+replyList+(controls?'<div class="actions">'+controls+'</div>':'')+'</article>';
}
function badge(q) {
  return '<span class="badge '+status(q)+'">'+copy(status(q))+'</span>';
}
function render() {
  document.documentElement.lang = {en:'en',ht:'zh-Hant',hs:'zh-Hans'}[language];
  document.title = 'BRC Crossings · '+copy('preview');
  const visible = questions.filter(q=>role==='admin'||q.assigned);
  const current = visible.find(q=>q.id===selected)||visible[0];
  selected = current?.id;
  const roles = ['admin','counselor'].map(r=>'<button data-role="'+r+'" aria-pressed="'+(r===role)+'">'+copy(r)+'</button>').join('');
  const rows = visible.map(q=>'<button class="row" data-id="'+q.id+'" aria-pressed="'+(q===current)+'"><span class="row-title">'+copy(q.topic)+'</span>'+badge(q)+'<span class="snippet">'+copy(q.question)+'</span></button>').join('');
  app.innerHTML = '<aside><div class="identity">'+StaffProfile.avatar(StaffProfile.read())+'<div><strong>Joel Qiao</strong><small>info@bridgerivercounseling.com</small></div>'+(role==='counselor'?'<button class="profile-link" data-action="profile">'+profileText('profile')+'</button>':'')+'</div><nav aria-label="'+copy('roles')+'">'+roles+'</nav></aside>'+
    '<section class="workspace"><div class="workspace-head"><h1>'+copy(role==='admin'?'queue':'inbox')+'</h1><button class="restart" data-action="reset">'+copy('reset')+'</button></div>'+
    '<div class="notice"><div><strong>'+copy('preview')+'</strong><p>'+copy('notice')+'</p></div></div>'+
    '<div class="layout"><section class="panel queue"><h2>'+copy('questions')+' <span class="count">'+visible.length+'</span></h2>'+(rows||'<p class="empty">'+copy('empty')+'</p>')+'</section>'+(current?details(current):'')+'</div></section>';
}
const dialog=document.querySelector('#resolve-dialog');
dialog.addEventListener('close',()=>{
  const q=questions.find(q=>q.id===selected);
  if(dialog.returnValue!=='save'){
    app.querySelector('#draft')?.focus();
    return;
  }
  saveReply(q);
  q.resolved=true;
  render();
  document.querySelector('#feedback').textContent=copy('finished');
  app.querySelector('[data-action="resolve"]').focus();
});
function saveReply(q){
  q.replies.push(q.draft.trim());
  q.draft='';
}
const langSelect=document.querySelector('#lang');
langSelect.value=language;
langSelect.onchange=()=>{language=langSelect.value; render();};
app.addEventListener('input',e=>{
  if(e.target.id!=='draft') return;
  questions.find(q=>q.id===selected).draft=e.target.value;
  e.target.form.querySelector('button').disabled=!e.target.value.trim();
});
app.addEventListener('submit',e=>{
  e.preventDefault();
  const q=questions.find(q=>q.id===selected);
  if(role!=='counselor'||!q?.assigned||q.resolved||!q.draft.trim()) return;
  saveReply(q);render();
  document.querySelector('#feedback').textContent=copy('saved');
  app.querySelector('#draft').focus();
});
app.addEventListener('click',e=>{
  const button=e.target.closest('button');
  if(!button||button.type==='submit'&&button.form) return;
  const q=questions.find(q=>q.id===selected);
  if(button.dataset.action==='profile'){openProfile();return;}
  if(button.dataset.role) role=button.dataset.role;
  if(button.dataset.id) selected=button.dataset.id;
  if(button.dataset.action==='assign'&&role==='admin'&&q&&!q.resolved) q.assigned=!q.assigned;
  if(button.dataset.action==='resolve'&&role==='counselor'&&q?.assigned){
    if(!q.resolved && q.draft.trim()){
      dialog.returnValue='';
      dialog.querySelector('h2').textContent=copy('draftTitle');
      dialog.querySelector('[value="edit"]').textContent=copy('edit');
      dialog.querySelector('[value="save"]').textContent=copy('finish');
      dialog.showModal();
      return;
    }
    q.resolved=!q.resolved;
  }
  if(button.dataset.action==='reset'){
    if(!confirm(copy('confirm')))return;
    questions=samples();selected=null;
  }
  render();
  if(button.dataset.action) app.querySelector('[data-action="'+button.dataset.action+'"]')?.focus();
  if(button.dataset.role) app.querySelector('[data-role="'+role+'"]').focus();
  if(button.dataset.id) app.querySelector('[data-id="'+selected+'"]').focus();
});
render();

window.addEventListener('storage',e=>{if(e.key===StaffProfile.key && !profileDialog.open) render();});
