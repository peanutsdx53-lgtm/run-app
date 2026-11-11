/**
 * RunLoad L2 candidate: K04/K05 provenance and missingness.
 * Only authored, hypothetical examples; no store access, health classification,
 * hidden RecordRef selection, saved answers, or personal measurements.
 * Basis: Current/App_Design/07 (D0), 39 (L2), Current source/provenance contracts.
 */
export const ORIGIN_LESSON=Object.freeze({
 id:'record-origin-missing',version:'0.1-candidate',courseId:'data',
 title:'記録の出所・欠測・後日申告'
});
export const ORIGIN_QUIZ=Object.freeze([
 {id:'o1',question:'仮想例：6km・33分は本人が手入力した。5:30/kmという平均ペースの出所は？',
  choices:['GPSで測った各1km区間の実測','入力された合計時間と距離からの算術','本人の筋活動を直接測った結果'],
  correct:1,relearn:'lo-origin',
  reasons:['この例にはGPSや区間ログはありません。全体値から区間は復元できません。','33分÷6km＝5分30秒/km。入力した2値から計算した値です。','距離と時間から筋活動を測定したことにはなりません。']},
 {id:'o2',question:'仮想例：ROF-J欄に0が有効な回答として保存されている。どう読む？',
  choices:['未回答と同じ扱いにする','本人による有効な回答0と読む','保存データの読取失敗だったと読む'],
  correct:1,relearn:'lo-missing',
  reasons:['未回答は別の状態です。0という回答を消してはいけません。','0は尺度の有効な回答値です。何も記録されていない状態ではありません。','読取失敗はエラー状態であり、正常に保存された0と混同できません。']},
 {id:'o3',question:'仮想例：GPSから距離が保存された。GPSの記録だけで出所を確認できる情報は？',
  choices:['本人が走った後の気分','本人が申告した路面の種類','GPS記録の位置・時刻等に基づく距離の情報'],
  correct:2,relearn:'lo-gps',
  reasons:['気分は位置データから確定できず、本人申告など別の情報が必要です。','路面の申告の有無はGPS距離の記録からは分かりません。','距離の取得・算出の出所を確認できます。ただし実距離の完全な正確性を保証する意味ではありません。']},
 {id:'o4',question:'仮想例：走行の数日後に本人が身体メモを追記した。どの説明が妥当？',
  choices:['走行当日に同時測定した値へ置き換える','元記録と区別した後日申告として扱う','部位ごとの文献参考値と元の距離・時間を自動で更新する'],
  correct:1,relearn:'lo-posthoc',
  reasons:['数日後に思い出して書いた内容を当日計測した情報として扱うことはできません。','原本の値と後日の本人申告を区別し、対象時点と入力時点を混同しない方法です。','後日の記述は原著の適用条件や保存済みの科学参考値を自動変更する理由になりません。']}
]);
export function evaluateOriginQuiz(answers={}){
 return ORIGIN_QUIZ.map(q=>{
  const input=answers?.[q.id], value=input===undefined||input===null?'':String(input);
  const valid=/^[0-2]$/.test(value)&&Number(value)<q.choices.length;
  return {id:q.id,correct:valid&&Number(value)===q.correct,
   reason:valid?q.reasons[Number(value)]:'未回答です。問題文と選択肢を確認してから選べます。',
   relearn:q.relearn};
 });
}
export function assessOriginExample(choice){
 const value=String(choice??'');
 if(!value)return {correct:false,feedback:'未選択です。平均ペースの値がどこから来たかを選んでください。'};
 const reasons={
  input:'距離6.00kmと33分は手入力ですが、5:30/kmはその入力値から算出した別の情報です。',
  derived:'正解です。33分÷6km＝5分30秒/km。本人が入力した値と、計算された値を区別しました。',
  gps:'この仮想例にはGPSログはありません。GPS由来と記載することはできません。',
  reference:'文献参考値は研究の測定条件を伴う別の情報です。この平均ペースは算術値です。'
 };
 return {correct:value==='derived',feedback:reasons[value]||'選択肢を確認してください。'};
}
const quizHtml=()=>'<section class="lr-panel lr-review" id="lo-review" tabindex="-1">'+
 '<p class="lr-eyebrow">06 · 一般知識の復習</p><h2>出所と状態を見分ける</h2>'+
 '<p>仮想例の情報の意味を確認します。あなたの疲労感・気づき・身体状態には正誤を付けません。回答や得点は保存されません。</p>'+
 '<form data-lo-quiz>'+ORIGIN_QUIZ.map((q,i)=>'<fieldset class="lr-question"><legend>問'+(i+1)+'｜'+q.question+'</legend>'+
 q.choices.map((choice,j)=>'<label><input type="radio" name="'+q.id+'" value="'+j+'"><span>'+choice+'</span></label>').join('')+
 '<p class="lr-feedback" data-lo-feedback="'+q.id+'" role="status" hidden></p>'+
 '<button class="lr-relearn" data-lo-relearn="'+q.relearn+'" type="button" hidden>関連する説明に戻る</button></fieldset>').join('')+
 '<button type="submit" class="lr-action">各問の理由を確認する</button></form>'+
 '<p class="lr-source">未回答でも確認できます。必要なら説明へ戻って繰り返し回答できます。通知・得点保存・履修条件はありません。</p></section>';
export function originMarkup(){
 return '<div class="lr-lesson lr-origin"><a href="#/learning" class="lr-back">‹ 学習の一覧へ</a>'+
 '<h2 class="lr-lesson-title">記録の出所・欠測・後日申告</h2>'+
 '<nav class="lr-lesson-index" aria-label="第2単元内の移動">'+
 '<button type="button" data-lo-jump="lo-origin">出所</button><button type="button" data-lo-jump="lo-practice">部分練習</button>'+
 '<button type="button" data-lo-jump="lo-gps">GPS</button><button type="button" data-lo-jump="lo-missing">欠測</button>'+
 '<button type="button" data-lo-jump="lo-posthoc">後日申告</button><button type="button" data-lo-jump="lo-reference">文献参考値</button>'+
 '<button type="button" data-lo-jump="lo-review">復習</button><button type="button" data-lo-jump="lo-explore">探究</button></nav>'+
 '<section class="lr-panel" id="lo-origin" tabindex="-1"><p class="lr-eyebrow">01 · 出所を見分ける</p><h2>数値はすべて同じ方法で得られるわけではない</h2>'+
 '<div class="lr-comparison"><div><h3>本人が入力した情報</h3><p>距離6.00km・時間33分を本人が入力した仮想例。実際に測定されたことを自動的に証明しません。</p></div>'+
 '<div><h3>計算された情報</h3><p>平均ペースは33分÷6km＝5分30秒/km。入力された2値から算出した値で、区間や疲労を測った値ではありません。</p></div>'+
 '<div><h3>取得したログに基づく情報</h3><p>GPSの位置・時刻などの記録を基に表示する距離や時間。取得条件や欠測の影響を受け得ます。</p></div>'+
 '<div><h3>文献からの参考情報</h3><p>研究参加者と測定条件に基づく参考値。本人の筋・関節の負荷を直接測った値ではありません。</p></div></div>'+
 '<p class="lr-source">すべて教材用の仮想例です。実在の本人記録を取得していません。出所は「正確だった」という保証や医学的判断ではありません。</p></section>'+
 '<section class="lr-panel" id="lo-practice" tabindex="-1"><p class="lr-eyebrow">02 · 一部を自分で見分ける</p>'+
 '<h2>平均ペース5:30/kmの出所は？</h2><p>仮想のランナーが距離6.00km・合計33分を手入力したとします。表示された5:30/kmの出所を選んでください。</p>'+
 '<form data-lo-practice class="lr-partial-form"><label class="lr-fallback-label" for="lo-origin-choice">5:30/kmはどこから来た値？'+
 '<select id="lo-origin-choice"><option value="">選んでください</option><option value="input">本人が直接入力したペース</option>'+
 '<option value="derived">入力した距離・時間からの算術</option><option value="gps">GPSが測った各区間ペース</option>'+
 '<option value="reference">研究文献の参考値</option></select></label>'+
 '<div class="lr-actions"><button type="submit" class="lr-action">理由を確認</button>'+
 '<button type="button" class="lr-action lr-outline" data-lo-hint>ヒントを見る</button></div>'+
 '<p class="lr-hint" data-lo-hint-text hidden>6.00kmと33分は入力されています。5:30/kmは33÷6という計算結果です。</p>'+
 '<p class="lr-feedback" data-lo-practice-feedback role="status" hidden></p></form></section>'+
 '<section class="lr-panel" id="lo-gps" tabindex="-1"><p class="lr-eyebrow">03 · 取得と申告の違い</p>'+
 '<h2>GPSの距離があっても、路面や気分まで分かるわけではない</h2>'+
 '<p>仮想のGPS走行で距離・時間が保存されていても、それは路面の種類、本人の気分、ROF-J、身体の違和感を同時に取得した証拠ではありません。</p>'+
 '<p>手入力やGPS由来の情報について、記録方式・取得できた項目・本人申告・計算方法を個別に確認します。</p>'+
 '<p class="lr-source">GPSの位置・時刻から得られた情報と、本人が任意に回答する疲労感やメモは別の情報です。保存されていない内容を推測して補完しません。</p></section>'+
 '<section class="lr-panel" id="lo-missing" tabindex="-1"><p class="lr-eyebrow">04 · 値と欠測</p><h2>0、未回答、読取失敗は違う</h2>'+
 '<div class="lr-comparison"><div><h3>ROF-J：0（有効な回答）</h3><p>本人が0と回答した、有効な回答値です。空欄や読取失敗ではありません。</p></div>'+
 '<div><h3>ROF-J：未回答（値なし）</h3><p>回答が保存されていない状態。0を代入して埋めません。</p></div>'+
 '<div><h3>読取失敗</h3><p>保存状態を確認できないエラー。未回答だったと断定しません。</p></div>'+
 '<div><h3>適用範囲外の不算出</h3><p>参考値を計算しない判断であり、本人の走行や申告の不存在とは別です。</p></div></div>'+
 '<p class="lr-source">ROF-Jの「運動前／運動後」は回答区分です。回答した実際の時刻や前後差を区分だけで確定しません。本人の精神状態も判定しません。尺度原著：<a href="https://doi.org/10.1186/s40798-026-01108-8" rel="noopener noreferrer">Suzuki &amp; Arai（2026）</a>。回答0・未回答・読取失敗の保存上の区別は本アプリ独自のデータ設計であり、尺度原著がこの保存仕様を検証したわけではありません。</p></section>'+
 '<section class="lr-panel" id="lo-posthoc" tabindex="-1"><p class="lr-eyebrow">05 · 時点と追記</p><h2>後から思い出した内容は、元の計測ではない</h2>'+
 '<p>例えば本人が数日後に「当日は膝に違和感があった」と書き加えた場合、それは<b>本人の後日申告</b>です。実際にいつ感覚が生じたかを、入力日から確定できません。</p>'+
 '<p>本アプリでは原本と後日申告の出所を区別します。追記で元の距離・時間・ROF-Jの回答や部位ごとの文献参考値を無断で書き換えません。</p>'+
 '<p class="lr-source">ここで扱うのはデータの由来と時点の区別です。症状の診断や走行の安全性評価は行いません。</p></section>'+
 '<section class="lr-panel" id="lo-reference" tabindex="-1"><p class="lr-eyebrow">補足 · 文献の適用条件</p>'+
 '<h2>参考値が「不算出」でも、走った事実は消えない</h2>'+
 '<p>文献の速度域や活動条件などを満たさないとき、参考値は計算せず理由を示します。元の走行距離・時間・本人申告は別に保持されます。</p>'+
 '<p class="lr-source">部位ごとの文献参考値は、文献の対象者や測定条件に基づく参考情報であり、100が「正常」「安全」「本人の組織負荷100%」であることを意味しません。</p></section>'+
 quizHtml()+
 '<section class="lr-panel" id="lo-explore" tabindex="-1"><p class="lr-eyebrow">NEXT · 任意の往復</p>'+
 '<h2>一般知識から、自分の記録についての問いへ</h2>'+
 '<p>探究では自分で選んだ実在する走行情報を確かめます。ここでの仮想例や回答結果は引き継ぎません。保存記録を選んでいない場合、最近の走行を勝手に選びません。</p>'+
 '<div class="lr-actions"><a class="lr-action" href="#/exploration-tree?category=01&topic=%E8%B7%9D%E9%9B%A2%E3%83%BB%E6%99%82%E9%96%93%E3%83%BB%E3%83%9A%E3%83%BC%E3%82%B9&entry=learning">探究へ</a>'+
 '<a class="lr-action lr-secondary" href="#/history">履歴で本人が記録を選ぶ</a>'+
 '</div></section>'+
 '<p class="lr-note">教材設計の参考：<a href="https://doi.org/10.1080/00220970209599510" rel="noopener noreferrer">Renklら（2002）</a>の段階的な例題と、<a href="https://doi.org/10.3758/MC.36.3.604" rel="noopener noreferrer">Butler &amp; Roediger（2008）</a>の選択問題後のフィードバック。この教材の教育効果を初心者ランナーで検証した研究ではありません。</p>'+
 '</div>';
}
export function mountOriginLesson(host){
 if(!host)return;
 host.innerHTML=originMarkup();
 const go=id=>{
  const el=host.querySelector('#'+id);
  if(!el)return;
  el.scrollIntoView({block:'start',behavior:'auto'});
  el.focus({preventScroll:true});
 };
 host.querySelectorAll('[data-lo-jump]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.loJump)));
 host.querySelectorAll('[data-lo-relearn]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.loRelearn)));
 const practice=host.querySelector('[data-lo-practice]');
 practice.querySelector('[data-lo-hint]').addEventListener('click',()=>{
  practice.querySelector('[data-lo-hint-text]').hidden=false;
 });
 practice.addEventListener('submit',e=>{
  e.preventDefault();
  const {correct,feedback}=assessOriginExample(practice.querySelector('#lo-origin-choice').value);
  const target=practice.querySelector('[data-lo-practice-feedback]');
  target.textContent=feedback;target.dataset.correct=String(correct);target.hidden=false;
 });
 const form=host.querySelector('[data-lo-quiz]');
 form.addEventListener('submit',e=>{
  e.preventDefault();
  const values=new FormData(form),answers={};
  for(const q of ORIGIN_QUIZ)answers[q.id]=values.get(q.id);
  for(const result of evaluateOriginQuiz(answers)){
   const place=host.querySelector('[data-lo-feedback="'+result.id+'"]');
   place.textContent=(result.correct?'正解。':'確認しましょう。')+result.reason;
   place.dataset.correct=String(result.correct);place.hidden=false;
   place.parentElement.querySelector('[data-lo-relearn]').hidden=result.correct;
  }
  host.querySelector('[data-lo-feedback="o1"]')?.scrollIntoView({block:'nearest',behavior:'auto'});
 });
}
