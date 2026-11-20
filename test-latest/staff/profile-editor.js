const profileDialog=document.querySelector('#profile-dialog');
const profileForm=profileDialog.querySelector('form');
let profileDraft;
let photoVersion=0;
const profileCopy={
  profile:['My profile','我的個人檔案','我的个人资料'],
  local:['This preview saves your profile in this browser only.','體驗版只在此瀏覽器儲存個人檔案。','体验版仅在此浏览器保存个人资料。'],
  photo:['Profile photo','個人照片','个人照片'], remove:['Remove photo','移除照片','移除照片'],
  langs:['Counseling languages','諮詢服務語言','咨询服务语言'], save:['Save profile','儲存個人檔案','保存个人资料'],
  cancel:['Cancel','取消','取消'], photoHint:['JPEG, PNG or WebP · up to 8 MB','JPEG、PNG 或 WebP，上限 8 MB','JPEG、PNG 或 WebP，上限 8 MB'],
  invalid:['Choose a JPEG, PNG or WebP image under 8 MB.','請選擇小於 8 MB 的 JPEG、PNG 或 WebP 圖片。','请选择小于 8 MB 的 JPEG、PNG 或 WebP 图片。'],
  failure:['Couldn’t save in this browser. Your edits are still here.','無法儲存至此瀏覽器。您的修改仍保留在此。','无法保存到此浏览器。您的修改仍保留在此。'],
  saved:['Profile saved in this browser','個人檔案已儲存至此瀏覽器','个人资料已保存到此浏览器']
};
const profileText=k=>StaffProfile.label(profileCopy[k],language);
function showPhoto(){
  profileForm.querySelector('.portrait').innerHTML=StaffProfile.avatar(profileDraft);
  profileForm.querySelector('[data-remove]').hidden=!profileDraft.photo;
}
function openProfile(){
  profileDraft=StaffProfile.read();
  profileForm.innerHTML='<h2 id="profile-title">'+profileText('profile')+'</h2><p>'+profileText('local')+'</p>'+
    '<div class="portrait"></div><label for="photo">'+profileText('photo')+'</label><small id="photo-help">'+profileText('photoHint')+'</small>'+
    '<input id="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="photo-help"><button type="button" class="secondary" data-remove>'+profileText('remove')+'</button>'+
    '<fieldset><legend>'+profileText('langs')+'</legend>'+Object.entries(StaffProfile.languages).map(([id,words])=>'<label><input type="checkbox" name="lang" value="'+id+'" '+(profileDraft.languages.includes(id)?'checked':'')+'>'+StaffProfile.label(words,language)+'</label>').join('')+'</fieldset>'+
    '<p role="alert"></p><div><button type="button" class="secondary" data-cancel>'+profileText('cancel')+'</button> <button class="primary">'+profileText('save')+'</button></div>';
  showPhoto();
  profileDialog.showModal();
}
profileForm.addEventListener('change',async e=>{
  if(e.target.id!=='photo') return;
  const file=e.target.files[0];
  if(!file) return;
  const version=++photoVersion;
  const save=profileForm.querySelector('.primary');
  const error=profileForm.querySelector('[role=alert]');
  error.textContent='';
  save.disabled=true;
  let url;
  try{
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024) throw Error();
    url=URL.createObjectURL(file);
    const img=new Image();
    img.src=url;
    await img.decode();
    if(version!==photoVersion) return;
    const size=Math.min(img.naturalWidth,img.naturalHeight);
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=Math.min(size,384);
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='white';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,(img.naturalWidth-size)/2,(img.naturalHeight-size)/2,size,size,0,0,canvas.width,canvas.height);
    profileDraft.photo=canvas.toDataURL('image/jpeg',0.86);
    showPhoto();
  }catch{
    if(version===photoVersion) error.textContent=profileText('invalid');
  }finally{
    if(url) URL.revokeObjectURL(url);
    if(version===photoVersion){save.disabled=false;e.target.value='';}
  }
});
profileForm.addEventListener('click',e=>{
  if(e.target.hasAttribute('data-cancel')) profileDialog.close();
  if(e.target.hasAttribute('data-remove')){
    photoVersion++;
    profileForm.querySelector('.primary').disabled=false;
    profileDraft.photo='';
    showPhoto();
  }
});
profileForm.addEventListener('submit',e=>{
  e.preventDefault();
  if(profileForm.querySelector('.primary').disabled) return;
  profileDraft.languages=new FormData(profileForm).getAll('lang');
  try{localStorage.setItem(StaffProfile.key,JSON.stringify(profileDraft));}
  catch{profileForm.querySelector('[role=alert]').textContent=profileText('failure');return;}
  profileDialog.close();
  render();
  app.querySelector('[data-action=profile]')?.focus();
  document.querySelector('#feedback').textContent=profileText('saved');
});
profileDialog.addEventListener('close',()=>{photoVersion++;});
