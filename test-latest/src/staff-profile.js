// Shared by the staff editor and member guide directory in this browser.
const StaffProfile = (() => {
  const key = 'brc-crossings:staff-preview:joel';
  const languages = {
    en:['English','英語','英语'], cmn:['Mandarin','國語（普通話）','普通话'], yue:['Cantonese','粵語','粤语'],
    es:['Spanish','西班牙語','西班牙语'], ko:['Korean','韓語','韩语'], vi:['Vietnamese','越南語','越南语'],
    fr:['French','法語','法语'], ja:['Japanese','日語','日语'], hi:['Hindi','印地語','印地语'], ar:['Arabic','阿拉伯語','阿拉伯语']
  };
  function read(){
    let value;
    try { value=JSON.parse(localStorage.getItem(key)); } catch {}
    return {
      photo: typeof value?.photo==='string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value.photo) ? value.photo : '',
      languages:Object.keys(languages).filter(id=>Array.isArray(value?.languages) && value.languages.includes(id))
    };
  }
  function label(words,lang){return words[{en:0,ht:1,hs:2}[lang]];}
  function languageText(profile,lang){
    return profile.languages.map(id=>label(languages[id],lang)).join(' · ') ||
      label(['Languages not listed','尚未列出服務語言','尚未列出服务语言'],lang);
  }
  function avatar(profile){
    return profile.photo ? '<img alt="" width="44" height="44" style="border-radius:50%;object-fit:cover" src="'+profile.photo+'">' : '<span class="avatar av" aria-hidden="true">JQ</span>';
  }
  return {key,languages,read,label,languageText,avatar};
})();
