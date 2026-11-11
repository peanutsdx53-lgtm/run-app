/**
 * RunLoad L4 isolated running-motion learning candidate.
 * Generic running education with source-conditional research facts.
 * This module contains only authored hypothetical scenarios and never reads/saves user runs.
 * Text sources: Fukuchi et al. (2017) PeerJ e3298, pages 3–5/14–16;
 * Gazendam & Hof (2007) Gait & Posture 25:604–614, pages 1–3/8–9.
 */
export const MOTION_LESSON=Object.freeze({id:'running-motion-basics',version:'0.1-source-audited',courseId:'movement',
 title:'走るときの脚の動き：関節・接地・筋活動'});
export const MOTION_QUESTIONS=Object.freeze([
 {id:'m1',prompt:'走るときの下肢の関節について、適切なのはどれ？',
 choices:['股関節・膝・足関節はそれぞれ別の位置にあり、動きの研究対象になる',
          '膝と足関節は同じ関節なので区別できない',
          '股関節の位置だけを知れば、全員に最適なフォームが決まる'],
 correct:0,relearn:'lm-anatomy',
 reasons:['股関節・膝・足関節は区別され、下肢運動の研究ではそれぞれの角度を調べることがあります。',
          '膝と足関節は部位の異なる関節です。',
          '関節の名称だけから個人に適切なフォームを決めることはできません。']},
 {id:'m2',prompt:'脚の動きを研究するとき、表面筋電図（EMG）が主に捉えるのは？',
 choices:['地面から身体が受ける力そのもの',
          '電極で捉えた筋の電気的な活動に関する信号',
          '本人の傷害確率'],
 correct:1,relearn:'lm-measures',
 reasons:['地面反力は力を測る装置などの別の量です。EMG信号そのものとは違います。',
          '表面電極で記録され、処理された電気信号です。筋損傷や本人の身体負荷率の直接測定ではありません。',
          '筋電図は個人の傷害確率を直接測定するものではありません。']},
 {id:'m3',prompt:'Fukuchiら（2017）の定期ランナー28名の研究から、適切に言えるのは？',
 choices:['全初心者に同じフォーム変更が必要と分かった',
          '速くなれば必ず全員の足部接地タイプが変わると分かった',
          '研究条件の3速度で選択された下肢動作・力学変数に違いが見られた'],
 correct:2,relearn:'lm-research',
 reasons:['対象は週20kmを超える走行習慣などの条件を満たした人で、初心者への処方試験ではありません。',
          'この研究では足部接地タイプへの有意な速度効果は検出されませんでした。結果を必然的な変化と呼べません。',
          '3D動作計測と力計付きトレッドミルを使った研究内での観察です。すべての変数・全個人に広げません。']},
 {id:'m4',prompt:'同じ脚の支持期と遊脚期について、適切なのは？',
 choices:['遊脚期は足が地面に接して身体を支えている間である',
          '支持期は接地から離地まで、遊脚期は離地から次の接地までである',
          '支持期と遊脚期の時間配分はすべての人で同じである'],
 correct:1,relearn:'lm-cycle',
 reasons:['接地している段階は支持期です。遊脚期は同じ脚が地面を離れて次の接地へ向かいます。',
          '同じ脚の接地と離地で段階を区切る基本的な考え方です。速さや姿勢の善悪を判定するものではありません。',
          '速度や動きの条件などによって時間配分が異なり得ます。全員同じとは言えません。']}
]);
export const MOTION_MEASURE_EXAMPLES=Object.freeze({
 angle:'股関節・膝・足関節の角度を調べるなら、3D動作計測などが対応します。平均ペースだけでは角度を知ることはできません。',
 force:'接地中に地面から受ける力（地面反力）には、力計付きトレッドミルなどの計測が必要です。単なる区間時間とは違います。',
 emg:'筋の電気的な活動を調べるなら、表面電極によるEMGが対応します。EMGは筋損傷や個人の安全性の検査ではありません。'
});
export function checkMotionMeasurement(value){
 const selected=String(value??'');
 return {valid:Object.hasOwn(MOTION_MEASURE_EXAMPLES,selected),
         correct:selected==='angle',
         feedback:selected?MOTION_MEASURE_EXAMPLES[selected]||'選択肢を確認してください。':'まだ選択されていません。角度を測る方法を選んでください。'};
}
export function evaluateMotionQuestions(answers={}){
 return MOTION_QUESTIONS.map(q=>{
  const v=answers?.[q.id]; const str=v===undefined||v===null?'':String(v);
  const selected=/^[0-2]$/.test(str)?Number(str):null;
  return {id:q.id,correct:selected!==null&&selected===q.correct,
   feedback:selected===null?'未回答です。説明に戻ってから選び直すこともできます。':q.reasons[selected],relearn:q.relearn};
 });
}
export function motionAnatomySvg(){
 return '<figure class="lr-motion-figure">'+
 '<svg viewBox="0 0 460 310" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="lm-figure-title lm-figure-description">'+
 '<title id="lm-figure-title">股関節・膝・足関節の位置関係を示す模式図</title>'+
 '<desc id="lm-figure-description">股関節から膝、足関節までを線で結んだ簡略図。実際の走行姿勢や推奨フォームを描いたものではありません。</desc>'+
 '<path d="M132 54 L213 154 L174 253" stroke="#1b637e" stroke-width="19" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'+
 '<path d="M174 253 L239 264" stroke="#1b637e" stroke-width="11" stroke-linecap="round" fill="none"/>'+
 '<g fill="#0a96a1" stroke="#ffffff" stroke-width="5"><circle cx="132" cy="54" r="15"/><circle cx="213" cy="154" r="15"/><circle cx="174" cy="253" r="15"/></g>'+
 '<g stroke="#668b9c" stroke-width="2" fill="none"><path d="M147 54 H260"/><path d="M228 154 H260"/><path d="M189 253 H260"/></g>'+
 '<g fill="#153f55" font-size="21" font-weight="700"><text x="270" y="61">股関節</text><text x="270" y="161">膝</text><text x="270" y="260">足関節</text></g></svg>'+
 '<figcaption>部位を理解するための独自模式図です。角度・長さ・接地姿勢を正確に再現した図ではなく、原著の図の転載でもありません。</figcaption></figure>';
}
function quizMarkup(){
 return '<section class="lr-panel lr-review" id="lm-review" tabindex="-1"><p class="lr-eyebrow">06 · 知識の確認</p><h2>身体の動きをどう確かめる？</h2>'+
 '<p>一般知識に関する4問です。本人の感覚やフォーム、自己理解を採点しません。回答や正答数は保存しません。</p>'+
 '<form data-lm-quiz>'+MOTION_QUESTIONS.map((q,i)=>'<fieldset class="lr-question">'+
 '<legend>問'+(i+1)+'｜'+q.prompt+'</legend>'+
 q.choices.map((choice,k)=>'<label><input type="radio" name="'+q.id+'" value="'+k+'"><span>'+choice+'</span></label>').join('')+
 '<p class="lr-feedback" data-lm-feedback="'+q.id+'" role="status" hidden></p>'+
 '<button type="button" class="lr-relearn" data-lm-relearn="'+q.relearn+'" hidden>関連説明を読み直す</button></fieldset>').join('')+
 '<button type="submit" class="lr-action">各問の理由を確認する</button></form>'+
 '<p class="lr-source">無回答・誤答でも説明に戻り、何度でも答えられます。履修を記録・結果・探究の条件にしません。</p></section>';
}
export function motionMarkup(){
 return '<div class="lr-lesson lr-motion"><a class="lr-back" href="#/learning">‹ 学習の一覧へ</a>'+
 '<h2 class="lr-lesson-title">走るときの脚の動き</h2>'+
 '<nav class="lr-lesson-index" aria-label="身体と動作の単元内移動">'+
 '<button type="button" data-lm-jump="lm-anatomy">脚の関節</button><button type="button" data-lm-jump="lm-cycle">接地と離地</button>'+
 '<button type="button" data-lm-jump="lm-measures">測定方法</button><button type="button" data-lm-jump="lm-research">研究の例</button>'+
 '<button type="button" data-lm-jump="lm-practice">練習</button><button type="button" data-lm-jump="lm-review">復習</button>'+
 '<button type="button" data-lm-jump="lm-explore">探究へ</button></nav>'+
 '<section class="lr-panel" id="lm-anatomy" tabindex="-1"><p class="lr-eyebrow">01 · 部位を知る</p>'+
 '<h2>股関節・膝・足関節はどこにある？</h2>'+
 '<p>股関節は骨盤と大腿、膝は大腿と下腿、足関節は下腿と足につながる位置にあります。走る動作の研究では、これらの関節の角度などを区別して調べます。</p>'+
 motionAnatomySvg()+
 '<p class="lr-source">図は名称と位置の関係を理解するための模式図です。本人の動作を推定したものでも、走行フォームの推奨でもありません。</p></section>'+
 '<section class="lr-panel" id="lm-cycle" tabindex="-1"><p class="lr-eyebrow">02 · 走る動作の段階</p>'+
 '<h2>接地している時間と、脚が移動する時間</h2>'+
 '<div class="lr-comparison"><div><h3>支持期（接地から離地まで）</h3>'+
 '<p>足が地面と接している間です。足が着く時点と地面を離れる時点を区別します。</p></div>'+
 '<div><h3>遊脚期（離地から次の接地まで）</h3>'+
 '<p>同じ脚が地面から離れ、次の接地へ向かう段階です。両脚の動きを総合したフォーム評価とは別の考え方です。</p></div></div>'+
 '<div class="lr-motion-cycle" role="group" aria-label="同じ脚の接地から次の接地までの流れ"><span>接地</span><strong>支持期</strong><span>離地</span><strong>遊脚期</strong><span>次の接地</span></div>'+
 '<p>Fukuchiらは力計付きトレッドミルの鉛直方向の地面反力などを使い、接地と離地を判別していました。</p>'+
 '<p>Gazendam・Hofの参加者では、歩行と走行でふくらはぎ筋群の活動ピークの時点が異なりました。走りの特徴は単に速度の数値だけではなく、接地の段階と筋活動のタイミングからも研究できます。ただし、この観察は万人の正しいフォームを示すものではありません。</p>'+
 '<p class="lr-source"><a href="https://doi.org/10.7717/peerj.3298" rel="noopener noreferrer">Fukuchiら（2017）</a>：Methods p.5（接地・離地の定義）；<a href="https://doi.org/10.1016/j.gaitpost.2006.06.013" rel="noopener noreferrer">Gazendam・Hof（2007）</a>：Abstract p.1、Discussion p.8–9（歩行と走行での筋活動の時期）。研究対象者の観察であり、本人の平均ペースから直接判定できるものではありません。</p></section>'+
 '<section class="lr-panel" id="lm-measures" tabindex="-1"><p class="lr-eyebrow">03 · 研究は何を測るか</p>'+
 '<h2>同じ「脚の働き」でも、測っている量が異なる</h2>'+
 '<div class="lr-motion-methods">'+
 '<article><h3>関節角度・動き（kinematics）</h3><p>3D動作計測などで、股関節・膝・足関節の角度やその時間変化を調べます。</p></article>'+
 '<article><h3>地面反力・関節の力学量（kinetics）</h3><p>力計付きトレッドミルなどを使って、地面から受ける力や、モデルから求める関節モーメント等を調べます。関節角度とは別の量です。</p></article>'+
 '<article><h3>筋電図（EMG）</h3><p>表面電極で筋の電気的活動に関する信号を記録します。EMGは筋損傷、関節角度、個人の組織負荷率そのものではありません。</p></article></div>'+
 '<p class="lr-source">Fukuchiら（2017）Methods p.3–5、Gazendam・Hof（2007）Methods p.1–2。異なる装置、解析手順、研究対象の量を混同しません。</p></section>'+
 '<section class="lr-panel" id="lm-research" tabindex="-1"><p class="lr-eyebrow">04 · 原著から学ぶ</p>'+
 '<h2>研究条件を確認してから、分かったことを読む</h2>'+
 '<div class="lr-motion-methods">'+
 '<article><h3>Fukuchiら（2017）</h3><p>週20km超の走行習慣、10kmレースで平均5分/km以内などの参加条件を満たす定期ランナー28名。3D動作計測と力計付きトレッドミルで2.5・3.5・4.5m/sを比較しました。</p>'+
 '<p>選択された下肢の関節角度・力学変数の多くは速度によって違いが見られました。一方、この研究では足部接地タイプへの有意な速度効果は検出されませんでした。</p>'+
 '<p class="lr-source"><a href="https://doi.org/10.7717/peerj.3298" rel="noopener noreferrer">原著</a>：Participants p.3、Methods p.4–5、Results p.14–16。初心者全般や路上の個人へそのまま一般化しません。</p></article>'+
 '<article><h3>Gazendam・Hof（2007）</h3><p>健康で活動的な成人男性10名の右脚14筋について、トレッドミルで歩行と走行の表面EMGを計測し、集団平均の活動パターンを調べました。</p>'+
 '<p>筋活動のピークが速度によって変化する場合と、あまり変化しない場合があり、同じ筋群内でも一様ではありません。</p>'+
 '<p class="lr-source"><a href="https://doi.org/10.1016/j.gaitpost.2006.06.013" rel="noopener noreferrer">原著</a>：Abstract/Methods p.1–2、Discussion p.8–9。集団平均のパターンから個人のフォームや傷害を推測しません。</p></article></div></section>'+
 '<section class="lr-panel" id="lm-practice" tabindex="-1"><p class="lr-eyebrow">05 · 一部を自分で考える</p>'+
 '<h2>関節角度を調べるなら？</h2>'+
 '<p>仮想の研究者が「走っているときの膝関節の角度」を調べたいと考えています。対応する測定を選んでください。</p>'+
 '<form data-lm-practice class="lr-partial-form"><label class="lr-fallback-label" for="lm-measure-select">研究で何を記録する？'+
 '<select id="lm-measure-select"><option value="">選んでください</option><option value="angle">3D動作計測による角度</option>'+
 '<option value="force">地面から受ける力</option><option value="emg">表面筋電図（EMG）</option></select></label>'+
 '<div class="lr-actions"><button class="lr-action" type="submit">理由を確かめる</button>'+
 '<button class="lr-action lr-outline" type="button" data-lm-hint>ヒント</button></div>'+
 '<p class="lr-hint" data-lm-hint-text hidden>関節の角度・地面から受ける力・筋の電気信号は、それぞれ測定対象が違います。</p>'+
 '<p class="lr-feedback" data-lm-practice-feedback role="status" hidden></p></form></section>'+
 '<section class="lr-panel" id="lm-limits" tabindex="-1"><p class="lr-eyebrow">補足 · 言えることの限界</p>'+
 '<h2>本人の脚を直接測定した情報ではない</h2>'+
 '<p>距離・時間・平均ペースは走行情報ですが、そこから本人の関節角度、着地位置、筋電図、組織負荷、フォームの良し悪しを確定できません。</p>'+
 '<p>研究で確認されたことは、対象者・測定機器・速度・環境・解析方法のもとでの結果です。研究に差が検出されなかった場合も、全員に変化がないという証明にはなりません。</p>'+
 '<p class="lr-source">文献の参考値を本人の身体計測に読み替えず、痛み・傷害・走行継続の判断をアプリは診断しません。</p></section>'+
 quizMarkup()+
 '<section class="lr-panel" id="lm-explore" tabindex="-1"><p class="lr-eyebrow">任意 · 探究とつながる</p>'+
 '<h2>学んだ一般知識を、自分の問いへ</h2>'+
 '<p>探究の既存テーマ「足・膝・股関節」では、本人が知りたいことを自分で選び、記録がある場合だけ確認できます。学習例や小テストの回答を本人の記録へ移しません。</p>'+
 '<div class="lr-actions"><a class="lr-action" href="#/exploration-tree?category=02&amp;topic=%E8%B6%B3%E3%83%BB%E8%86%9D%E3%83%BB%E8%82%A1%E9%96%A2%E7%AF%80&amp;entry=learning">探究で考える</a>'+
 '<a class="lr-action lr-secondary" href="#/history">履歴で本人が記録を選ぶ</a>'+

 '</div>'+
 '</section>'+
 '</div>';
}
export function mountMotionLesson(host){
 if(!host)return;
 host.innerHTML=motionMarkup();
 const jump=id=>{const node=host.querySelector('#'+id);if(node){node.scrollIntoView({block:'start',behavior:'auto'});node.focus({preventScroll:true});}};
 host.querySelectorAll('[data-lm-jump]').forEach(b=>b.addEventListener('click',()=>jump(b.dataset.lmJump)));
 host.querySelectorAll('[data-lm-relearn]').forEach(b=>b.addEventListener('click',()=>jump(b.dataset.lmRelearn)));
 const exercise=host.querySelector('[data-lm-practice]');
 exercise.querySelector('[data-lm-hint]').addEventListener('click',()=>{exercise.querySelector('[data-lm-hint-text]').hidden=false;});
 exercise.addEventListener('submit',event=>{
  event.preventDefault();
  const result=checkMotionMeasurement(exercise.querySelector('#lm-measure-select').value);
  const feedback=exercise.querySelector('[data-lm-practice-feedback]');
  feedback.textContent=(result.correct?'正解。':'確かめましょう。')+result.feedback;
  feedback.dataset.correct=String(result.correct);feedback.hidden=false;
 });
 const quiz=host.querySelector('[data-lm-quiz]');
 quiz.addEventListener('submit',event=>{
  event.preventDefault();const data=new FormData(quiz),answers={};
  for(const q of MOTION_QUESTIONS)answers[q.id]=data.get(q.id);
  for(const result of evaluateMotionQuestions(answers)){
   const feedback=host.querySelector('[data-lm-feedback="'+result.id+'"]');
   feedback.textContent=(result.correct?'正解。':'確認しましょう。')+result.feedback;
   feedback.dataset.correct=String(result.correct);feedback.hidden=false;
   feedback.parentElement.querySelector('[data-lm-relearn]').hidden=result.correct;
  }
  host.querySelector('[data-lm-feedback="m1"]')?.scrollIntoView({block:'nearest',behavior:'auto'});
 });
}
