import {EXPLORATION_DRAFT_GUIDES,EXPLORATION_STARTING_QUESTIONS} from './explorationTopicGuides.js?v=20261111-exploration-inquiry-v1-daily-only-ux109';
// A single question leads into evidence, interpretation and optional notes.
// The observation guide remains an editorial prompt, not a scientific lesson.
export const OBSERVATION_GUIDE_BOUNDARY='観察ガイド：自分の経験を見直すための問いです。研究出典に基づく専門解説ではありません。';
export function renderObservationGuide(ui,ctx,cat,topic,inquiry=''){
 const guide=EXPLORATION_DRAFT_GUIDES[cat.id+'|'+topic];
 const text=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const run=ctx.focusRunId&&ctx.focusRun?ctx.focusRun:null;
 const question=EXPLORATION_STARTING_QUESTIONS[cat.id+'|'+topic]||guide?.question||'自分の経験で、何が気になりますか？';
 // Only the selected run, or truly standalone notes, may appear here.
 const saved=(Array.isArray(ui.notes)?ui.notes:[]).filter(n=>n.topicId===guide?.id&&(
  ctx.focusRunId?ctx.focusRun?.id===ctx.focusRunId&&n.recordId===ctx.focusRunId:!n.recordId
 )).slice(0,2);
 const link=run?'<a class="ex-learning-link" href="#/result?record='+encodeURIComponent(run.id)+'">この走行の結果へ戻る ›</a>':'';
 return '<div class="ex-learning ex-observation-guide" data-ex-inquiry-layout="observation">'+
  '<header class="ex-inquiry-start"><small>探究の入り口</small><h3>'+text(question)+'</h3></header>'+
  '<section class="ex-inquiry-stage"><h4>記録や経験を手がかりにする</h4>'+
  '<p>'+text(guide?.record||'自分の経験や記録から、気になる点を確認します。')+'</p>'+
  (!inquiry&&cat.id==='05'&&topic==='日々のコンディション'?'<a class="ex-e-compare-link" href="#/condition">コンディションの履歴を見る</a>':'')+
  (run?'<details class="ex-inquiry-details ex-run-context"><summary>選択した走行</summary><p>'+text(run.date)+'に保存した走行の情報です。ほかの記録とは自動で結びつけません。</p>'+link+'</details>':'')+
  (inquiry?'<div class="ex-inline-inquiry">'+inquiry+'</div>':'')+'</section>'+
  '<section class="ex-inquiry-stage"><h4>記録と感覚を照らし合わせる</h4>'+
  '<p>記録された情報と、そのときの感じ方を区別して考えます。</p>'+
  '<details class="ex-inquiry-details"><summary>情報の出所と限界</summary><p>'+text(guide?.limit||'記録だけから原因や身体の状態を断定しません。')+'</p><p>'+text(OBSERVATION_GUIDE_BOUNDARY)+'</p></details>'+
  '<button type="button" class="ex-help-link" data-ex-action="learn-help">観察ガイドの注意点</button>'+
  '</section>'+
  renderReflectionActions(saved)+'</div>';
}

// Shared final action section: same affordances for knowledge and observation themes.
export function renderReflectionActions(saved=[]){
 const text=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return '<section class="ex-inquiry-stage ex-inquiry-last"><h4>気づき・疑問を残す</h4>'+
 '<div class="ex-note-invite"><div><p>感じたことや次に確かめたいことを、任意で記録できます。</p></div>'+
 '<button type="button" data-ex-action="note"><span>メモを書く</span><span aria-hidden="true">＋</span></button></div>'+
 (saved.length?'<div class="ex-note-preview"><strong>以前のメモ</strong>'+saved.map(n=>'<p data-user-authored>'+text(n.text)+'</p>').join('')+'</div>':'')+
 '<div class="ex-consultation-action"><a class="ex-action quiet" data-ex-consultation href="#/consultation?from=explore"><span>相談・共有画面へ</span><span aria-hidden="true">›</span></a></div></section>';
}
