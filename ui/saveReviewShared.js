/* Shared pre-save review contract. Data sources and permitted storage remain distinct.
 * This is a presentation layer: scientific calculations and authoritative storage
 * are validated by their own source-specific modules. */
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function saveReviewScope({source,rest=false,routeOptIn=false,notice='',busy=false}={}){
 if(!['manual','gps'].includes(source))return '';
 const gps=source==='gps';
 const origin=gps?'GPSで測定':'本人が手入力';
 const recorded=gps?'GPS距離・時間と任意の本人申告':rest?'休養日と任意の本人メモ':'手入力の距離・時間と任意の本人申告';
 const route=gps?(routeOptIn?'本人が選択：位置・速度・フラッグを端末に保存':'保存しない（初期設定）'):'保存しない';
 const detail=gps?
  '路面と疲労感・メモは本人申告であり、GPSから推定していません。位置情報を含む経路・速度・フラッグは、チェックを入れた場合だけ保存します。':
  rest?'休養日に走行距離・時間・文献参考値はありません。記録は端末に保存します。':
  '距離・時間・活動種目は本人の入力です。運動前後の疲労感・メモは任意の本人申告で、医学的な診断や身体負荷の実測ではありません。';
 return `<section class="sv4-review" data-pre-save-scope data-save-source="${source}" aria-label="保存前の確認">
  <div class="sv4-review-head"><h2>保存前の確認</h2><span>端末内に保存</span></div>
  <dl><div><dt>記録の出所</dt><dd>${origin}</dd></div>
  <div><dt>保存する内容</dt><dd>${recorded}</dd></div>
  <div><dt>位置情報を含む詳細</dt><dd>${route}</dd></div></dl>
  <details class="sv4-review-help"><summary>保存内容と注意点</summary><p>${detail}</p></details>
  ${notice?`<p class="sv4-save-notice" data-save-failure role="alert">${esc(notice)}</p>`:''}
  ${busy?'<p class="sv4-save-busy" role="status">保存結果を確認しています…</p>':''}
 </section>`;
}
export function setSaveReviewBusy(button,busy){
 if(!button)return;
 if(busy){
  if(!button.dataset.sv4OriginalLabel)button.dataset.sv4OriginalLabel=button.textContent;
  button.textContent='保存結果を確認しています…';
  button.disabled=true;button.setAttribute('aria-busy','true');
 }else{
  if(button.dataset.sv4OriginalLabel)button.textContent=button.dataset.sv4OriginalLabel;
  delete button.dataset.sv4OriginalLabel;button.removeAttribute('aria-busy');
  // Do not enable here: source-specific validation owns disabled state.
 }
}
