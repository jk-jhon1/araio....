const SaveSystem = (() => {
  const KEY = 'restuding_save_v07_noaudio';
  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(raw){ const p=JSON.parse(raw); return {endings:Array.isArray(p.endings)?p.endings:[], bestTime:typeof p.bestTime==='number'?p.bestTime:null} }
    }catch(e){}
    return {endings:[], bestTime:null}
  }
  let data = load();
  function persist(){ try{ localStorage.setItem(KEY, JSON.stringify(data)) }catch(e){} }
  return {
    unlockEnding(id){ if(!data.endings.includes(id)){ data.endings.push(id); persist(); return true } return false },
    getEndings(){ return data.endings.slice() },
    setBestTime(s){ if(data.bestTime===null||s<data.bestTime){ data.bestTime=s; persist(); return true } return false },
    getBestTime(){ return data.bestTime }
  };
})();
