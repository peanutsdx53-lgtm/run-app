/**
 * RunLoad L5 running-learning candidate: exertion, perceived fatigue and recovery.
 * Source-bounded education, not training guidance, diagnostics or a RunLoad tutorial.
 * Hypothetical scenarios only: no saved run, app records, RPE, ROF-J, sleep diary,
 * wellness or health state is read/written. No score persistence.
 *
 * Source boundaries:
 * - Borg (1982), perceived exertion, abstract only (PMID 7154893).
 * - Micklewright et al. (2017), ROF construct, cycling+30 min recovery,
 *   original research article DOI 10.1007/s40279-017-0711-5.
 * - Suzuki & Arai (2026), ROF-J university students 85, athletes 35,
 *   exertion/fatigue self-report distinction uncertain, pp.4–8.
 * - Walsh et al. (2021), elite-athlete sleep narrative review/consensus,
 *   inconsistent methods and one-size-fits-all limits, DOI 10.1136/bjsports-2020-102025.
 */
export const FATIGUE_LESSON=Object.freeze({
 id:'effort-fatigue-recovery',version:'0.1-source-audited',courseId:'fatigue',
 title:'ランニングのきつさ・疲労感・休養'
});
export const FATIGUE_QUESTIONS=Object.freeze([
 {id:'f1',prompt:'仮想のランナーA・Bが、それぞれ3 kmを18分で走りました。感覚についてどれが正しい？',
  choices:['同じ平均ペースなら疲れの感覚まで必ず同じです。',
   '平均ペースが同じでも、本人が申告する感覚まで同じとは決まりません。',
   '距離と時間だけで、AとBの次の休養日数が求まります。'],
  correct:1,relearn:'lf-scenario',
  reasons:['距離・時間は感覚の直接測定ではありません。同じ数値でも感覚の一致は証明できません。',
   '平均ペースという算術値と、本人の主観的な感じは別に捉える必要があります。',
   '個人の休養日数を距離・時間だけから計算する根拠は、この教材では示されていません。']},
 {id:'f2',prompt:'走行中の「きつさ」と、運動後にも感じ得る「疲労感」について、研究に沿うのは？',
  choices:['二つの尺度は目的が異なり得ますが、本人がいつも明確に区別できるとは限りません。',
   'RPEとROF-Jは同じ数字で相互換算できると確認されています。',
   'ROF-Jの回答は筋損傷を直接測定しています。'],
  correct:0,relearn:'lf-concepts',
  reasons:['Borgの努力感とROF/ROF-Jの疲労感は意図する対象が異なります。ただし日本語版の原著には主観的な区別の難しさが論じられています。',
   '相互換算は確認されていません。回答の数値と意味を同一視できません。',
   'ROF-Jは主観的疲労の尺度であり、筋損傷を直接測る検査ではありません。']},
 {id:'f3',prompt:'Micklewrightら（2017）が運動後の疲労感を調べた研究について、適切なのは？',
  choices:['初心者ランナー全員の回復に必要な分数が分かった研究です。',
   '自転車運動後30分の安静回復などを含む原著で、ランニング個人へそのまま一般化しません。',
   '運動後は、疲労感と努力感が必ず同じ値になることを示しました。'],
  correct:1,relearn:'lf-recovery',
  reasons:['実験は自転車運動・参加者・測定条件に限定されます。初心者の必要休養時間を決めていません。',
   '自転車の漸増負荷運動と30分の安静回復を含み、疲労感と努力感の異なる働きを検討しました。',
   '同研究は回復中に疲労感と努力感が異なる変化を示したことを報告しています。全員の同じ数値を示したものではありません。']},
 {id:'f4',prompt:'競技者の睡眠を扱うWalshら（2021）の総説から、初心者が学べるのは？',
  choices:['睡眠や生活条件は運動と回復を考える文脈ですが、全員に同じ睡眠時間・休養日数を命じる根拠ではありません。',
   'ランニング距離が同じなら、適切な睡眠時間は必ず同じです。',
   '睡眠時間の記録だけで、翌日の傷害発生や練習の実施可否を判定できます。'],
  correct:0,relearn:'lf-sleep',
  reasons:['研究対象は競技者中心で、実験方法や対象者の異質性が指摘されています。個人への一律の処方ではありません。',
   '距離だけから個人の睡眠の必要量は決定できません。',
   '睡眠記録だけから個人の傷害発生や走行可否を確定することはできません。']}
]);
export const FATIGUE_SCENARIOS=Object.freeze([
 Object.freeze({id:'same-pace',label:'AとBの3 km・18分',answer:'same-pace',
  reasoning:'距離・時間は同じですが、走行中や走行後にどのように感じたかは記録されていません。主観を同じと決められません。'}),
 Object.freeze({id:'personal-report',label:'Aが「疲れている」、Bが「まだ疲れていない」と後から申告',answer:'personal-report',
  reasoning:'架空の本人申告が新たに加わりました。測定条件と申告された時点を区別し、健康状態の診断には変えません。'}),
 Object.freeze({id:'sleep-context',label:'生活の予定・睡眠の条件が両者で異なる',answer:'sleep-context',
  reasoning:'生活条件も考える材料ですが、条件だけから休養日数を計算したり翌日の練習可否を決めたりしません。'})
]);
export function evaluateFatigueQuestions(answers={}){
 return FATIGUE_QUESTIONS.map(q=>{
  const raw=answers?.[q.id],s=raw===null||raw===undefined?'':String(raw);
  const value=/^[0-2]$/.test(s)?Number(s):null;
  return {id:q.id,correct:value!==null&&value===q.correct,
   reason:value===null?'未回答です。授業に戻ってから、選び直すこともできます。':q.reasons[value],
   relearn:q.relearn};
 });
}
export function assessFatigueScenario(value){
 const chosen=String(value??'');
 if(!chosen)return {valid:false,correct:false,feedback:'未選択です。仮想の2人について、何が分かるかを選んでください。'};
 const lookup={
  different:'適切です。走行全体の時間と距離が同じでも、主観的な感じまで同じとは確定できません。',
  equal:'平均ペースは同じですが、本人がどう感じたかという別の情報がありません。',
  prescribe:'本人の疲労・睡眠の状態や次の休養日数を、距離と時間だけで決められません。'
 };
 return {valid:Object.hasOwn(lookup,chosen),correct:chosen==='different',feedback:lookup[chosen]||'選択肢を確認してください。'};
}
function fatigueCycleMarkup(){
 return '<div class="lr-fatigue-cycle" role="group" aria-label="走行中のきつさ、運動後の疲労感、生活と睡眠を区別して考える3つの場面">'+
 '<article><span class="lr-fatigue-step">走行中</span><h3>運動がどの程度きつく感じられるか</h3>'+
 '<p>走っている仕事の大変さという主観的な経験。研究上の「知覚的運動強度（RPE）」の話題に関連します。</p></article>'+
 '<article><span class="lr-fatigue-step">走行後</span><h3>どの程度疲れていると感じるか</h3>'+
 '<p>運動が終わっても感じ得る疲れ。ROFの研究では運動後の安静回復中も調べています。</p></article>'+
 '<article><span class="lr-fatigue-step">生活・睡眠</span><h3>回復を考えるときの条件</h3>'+
 '<p>睡眠や生活状況も関連する文脈ですが、本人の必要休養日数を自動計算する材料ではありません。</p></article></div>';
}
function fatigueQuizMarkup(){
 return '<section class="lr-panel lr-review" id="lf-review" tabindex="-1">'+
 '<p class="lr-eyebrow">06 · ランニングの一般知識を確認</p><h2>きつさ・疲労感・休養の違いを考える</h2>'+
 '<p>仮想例と文献から分かる範囲を確認します。自分の感覚や健康状態に正誤を付ける試験ではありません。回答・得点は保存しません。</p>'+
 '<form data-lf-quiz>'+FATIGUE_QUESTIONS.map((q,i)=>'<fieldset class="lr-question"><legend>問'+(i+1)+'｜'+q.prompt+'</legend>'+
 q.choices.map((choice,k)=>'<label><input type="radio" name="'+q.id+'" value="'+k+'"><span>'+choice+'</span></label>').join('')+
 '<p class="lr-feedback" data-lf-feedback="'+q.id+'" role="status" hidden></p>'+
 '<button type="button" class="lr-relearn" data-lf-relearn="'+q.relearn+'" hidden>関連する説明に戻る</button></fieldset>').join('')+
 '<button type="submit" class="lr-action">各問の理由を確認する</button></form>'+
 '<p class="lr-source">誤答・未回答でも自由に読み直せます。記録・結果・探究には履修条件を設けません。</p></section>';
}
export function fatigueMarkup(){
 return '<div class="lr-lesson lr-fatigue"><a class="lr-back" href="#/learning">‹ 学習の一覧へ</a>'+
 '<h2 class="lr-lesson-title">走っているときのきつさ・疲労感・休養</h2>'+
 '<nav class="lr-lesson-index" aria-label="きつさ・疲労・休養の単元内移動">'+
 '<button type="button" data-lf-jump="lf-scenes">3つの場面</button><button type="button" data-lf-jump="lf-concepts">感じ方</button>'+
 '<button type="button" data-lf-jump="lf-scenario">架空の2人</button><button type="button" data-lf-jump="lf-recovery">運動後の研究</button>'+
 '<button type="button" data-lf-jump="lf-sleep">睡眠と生活</button><button type="button" data-lf-jump="lf-practice">練習</button>'+
 '<button type="button" data-lf-jump="lf-review">復習</button><button type="button" data-lf-jump="lf-explore">探究へ</button></nav>'+
 '<section class="lr-panel" id="lf-scenes" tabindex="-1"><p class="lr-eyebrow">01 · 走る前後の流れ</p>'+
 '<h2>運動中・運動後・生活の場面を分けて考える</h2>'+
 fatigueCycleMarkup()+
 '<p class="lr-source">場面を分けた独自の概念図です。疲労感が必ずこの順番・時間で変化するという測定曲線ではありません。文献の図を転載していません。</p></section>'+
 '<section class="lr-panel" id="lf-concepts" tabindex="-1"><p class="lr-eyebrow">02 · 感覚の意味</p>'+
 '<h2>「運動がきつい」と「疲れている」は同じ質問ではない</h2>'+
 '<p>運動中のきつさを扱う研究には、Borg（1982）の<strong>知覚的運動強度（RPE）</strong>があります。疲れているという主観的な感じを扱う研究にはROFと日本語版ROF-Jがあります。</p>'+
 '<p>それぞれが意図する対象は異なります。ただし、本人がこの2つの感覚を常に明瞭に区別できるとは限りません。ROF-Jの日本語版原著でも、その難しさを議論しています。</p>'+
 '<div class="lr-comparison"><div><h3>RPEの研究対象</h3><p>課題・運動がどの程度きついと感じられるか。本アプリが本人のRPEを記録しているという意味ではありません。</p></div>'+
 '<div><h3>ROF/ROF-Jの研究対象</h3><p>本人が疲れをどのように感じているかという主観的な情報。筋損傷や生理的負荷を直接測ったものではありません。</p></div></div>'+
 '<p class="lr-source">Borg（1982）<a href="https://pubmed.ncbi.nlm.nih.gov/7154893/" rel="noopener noreferrer">要約</a>（原著本文未照合）／Micklewrightら（2017）<a href="https://doi.org/10.1007/s40279-017-0711-5" rel="noopener noreferrer">原著</a>／Suzuki・Arai（2026）<a href="https://doi.org/10.1186/s40798-026-01108-8" rel="noopener noreferrer">ROF-J原著</a>のDiscussion p.7–8。RPEとROF-Jの数値を相互換算しません。</p></section>'+
 '<section class="lr-panel" id="lf-scenario" tabindex="-1"><p class="lr-eyebrow">03 · ランニングの仮想例</p>'+
 '<h2>同じ3 km・18分でも、同じ感覚とは限らない</h2>'+
 '<p>架空のランナーA・Bはどちらも3 kmを18分で走り、平均ペースは6分/kmです。走行時間と距離が同じというだけで、運動中のきつさや運動後の疲れが一致することにはなりません。</p>'+
 '<div class="lr-fatigue-scenarios">'+FATIGUE_SCENARIOS.map((x,i)=>'<article><span class="lr-eyebrow">仮想'+(i+1)+'</span><h3>'+x.label+'</h3><p>'+x.reasoning+'</p></article>').join('')+'</div>'+
 '<p class="lr-source">3 km・18分は教材用の算術例で、原著がこの2人を測定したという意味ではありません。本人の疲労や能力差、原因を断定しません。</p></section>'+
 '<section class="lr-panel" id="lf-recovery" tabindex="-1"><p class="lr-eyebrow">04 · 運動後の回復の研究</p>'+
 '<h2>運動が終わった後にも、疲れの感じを調べられる</h2>'+
 '<p>Micklewrightら（2017）はROFという尺度を開発し、漸増負荷の<strong>自転車運動</strong>から運動終了後30分の安静回復に至る場面などを研究しました。</p>'+
 '<p>同研究では、運動中と回復中で疲労感と努力感の測定値の関係が異なりました。ただし、この研究はランニング初心者の回復時間を決めたものではありません。</p>'+
 '<p>日本語版ROF-Jを検証したSuzuki・Arai（2026）では、大学生85名の質問紙調査と、大学運動部員35名の身体運動前後の調査が行われました。疲労感の自己申告に関する検証であり、全初心者への医学的な判断には使えません。</p>'+
 '<p class="lr-source"><a href="https://doi.org/10.1007/s40279-017-0711-5" rel="noopener noreferrer">Micklewrightら（2017）</a> Experiment 3（自転車運動・安静回復）／<a href="https://doi.org/10.1186/s40798-026-01108-8" rel="noopener noreferrer">Suzuki・Arai（2026）</a> Methods p.4–5、Discussion p.7–8。ROFとROF-Jの調査設計は異なります。</p></section>'+
 '<section class="lr-panel" id="lf-sleep" tabindex="-1"><p class="lr-eyebrow">05 · 睡眠と休養</p>'+
 '<h2>「休めば何分で回復する」と単純に決められない</h2>'+
 '<p>運動と回復について考えるとき、睡眠の量や質、生活・練習の時刻なども関係する条件として扱われます。ただし、その記録から本人の疲労の原因や翌日の練習可否が分かるわけではありません。</p>'+
 '<p>Walshら（2021）は主に競技者の睡眠を対象としたナラティブレビューと専門家合意です。既存研究には対象・介入方法・測定の不一致や女性参加者の不足などの限界があり、睡眠の推奨を全員に同じものとして適用することには慎重です。したがって、睡眠研究は初心者個人への一律の処方ではありません。</p>'+
 '<p>したがって本教材は<strong>「初心者には必ず何時間寝る」「休養を何日取る」</strong>といった処方を提示しません。睡眠・日常生活の条件を、走行経験を理解する際の文脈として学びます。</p>'+
 '<p class="lr-source"><a href="https://doi.org/10.1136/bjsports-2020-102025" rel="noopener noreferrer">Walshら（2021）</a>、Br J Sports Med 55:356–368。競技者の研究・合意であり、本アプリの利用者を対象とした介入試験ではありません。</p></section>'+
 '<section class="lr-panel" id="lf-practice" tabindex="-1"><p class="lr-eyebrow">小練習 · 感覚と算術を混同しない</p>'+
 '<h2>同じ平均ペースから、どこまで分かる？</h2>'+
 '<p>架空の2人が同じ3 km・18分で走りました。結果から言えることを選び、理由を確かめましょう。</p>'+
 '<form data-lf-practice class="lr-partial-form"><label for="lf-practice-choice" class="lr-fallback-label">確かめられる範囲'+
 '<select id="lf-practice-choice"><option value="">選んでください</option>'+
 '<option value="equal">疲れの感じも同じと確定</option>'+
 '<option value="different">平均は同じだが感覚が同じとは限らない</option>'+
 '<option value="prescribe">2人の必要休養日数が計算できる</option></select></label>'+
 '<div class="lr-actions"><button type="submit" class="lr-action">理由を確認する</button>'+
 '<button type="button" class="lr-action lr-outline" data-lf-hint>ヒントを見る</button></div>'+
 '<p class="lr-hint" data-lf-hint-text hidden>距離・時間は数値です。感覚は本人の申告など別の情報です。</p>'+
 '<p class="lr-feedback" data-lf-practice-feedback role="status" hidden></p></form></section>'+
 fatigueQuizMarkup()+
 '<section class="lr-panel" id="lf-explore" tabindex="-1"><p class="lr-eyebrow">任意 · 探究との往復</p>'+
 '<h2>学習した知識を、自分の走行の問いへ</h2>'+
 '<p>既存の探究「疲れの感じ方」へ進み、自分で選んだ走行記録や申告について、意味・限界・次の問いを考えられます。ここでの仮想例やテスト回答は引き継ぎません。</p>'+
 '<div class="lr-actions"><a class="lr-action" href="#/exploration-tree?category=04&amp;topic=%E7%96%B2%E3%82%8C%E3%81%AE%E6%84%9F%E3%81%98%E6%96%B9&amp;entry=learning">探究で考える</a>'+
 '<a class="lr-action lr-secondary" href="#/history">履歴で本人が記録を選ぶ</a>'+

 '</div>'+
 '</section>'+
 '</div>';
}
export function mountFatigueLesson(host){
 if(!host)return;
 host.innerHTML=fatigueMarkup();
 const jump=id=>{const el=host.querySelector('#'+id);if(el){el.scrollIntoView({block:'start',behavior:'auto'});el.focus({preventScroll:true});}};
 host.querySelectorAll('[data-lf-jump]').forEach(b=>b.addEventListener('click',()=>jump(b.dataset.lfJump)));
 host.querySelectorAll('[data-lf-relearn]').forEach(b=>b.addEventListener('click',()=>jump(b.dataset.lfRelearn)));
 const practice=host.querySelector('[data-lf-practice]');
 practice.querySelector('[data-lf-hint]').addEventListener('click',()=>{practice.querySelector('[data-lf-hint-text]').hidden=false;});
 practice.addEventListener('submit',e=>{
  e.preventDefault();
  const result=assessFatigueScenario(practice.querySelector('#lf-practice-choice').value);
  const output=practice.querySelector('[data-lf-practice-feedback]');
  output.textContent=(result.correct?'正解。':'確かめましょう。')+result.feedback;
  output.dataset.correct=String(result.correct);output.hidden=false;
 });
 const quiz=host.querySelector('[data-lf-quiz]');
 quiz.addEventListener('submit',e=>{
  e.preventDefault();
  const form=new FormData(quiz),answers={};
  for(const q of FATIGUE_QUESTIONS)answers[q.id]=form.get(q.id);
  for(const res of evaluateFatigueQuestions(answers)){
   const target=host.querySelector('[data-lf-feedback="'+res.id+'"]');
   target.textContent=(res.correct?'正解。':'確認しましょう。')+res.reason;
   target.dataset.correct=String(res.correct);target.hidden=false;
   target.parentElement.querySelector('[data-lf-relearn]').hidden=res.correct;
  }
  host.querySelector('[data-lf-feedback="f1"]')?.scrollIntoView({block:'nearest',behavior:'auto'});
 });
}
