// Legacy key retained solely so all-data deletion can clear old checkmarks.
export const LEARNING_PROGRESS_KEY='runload-v2-learning-checklist-v1';
/** Accessible quiz headings and independent chapter disclosures. */
function splitQuestionHeading(lesson,lessonId){
 [...lesson.querySelectorAll('fieldset.lr-question')].forEach((item,index)=>{
  const legend=item.querySelector('legend');
  if(!legend||item.querySelector('.lr-question-prompt'))return;
  const original=legend.textContent.trim();
  const delimiter=original.indexOf('｜');
  const prompt=delimiter>=0?original.slice(delimiter+1):original;
  legend.textContent='問 '+(index+1);
  legend.className='lr-question-number';
  const heading=document.createElement('h3');
  const legendId='lr-question-number-'+lessonId+'-'+(index+1);
  const headingId='lr-question-prompt-'+lessonId+'-'+(index+1);
  legend.id=legendId;heading.id=headingId;
  heading.className='lr-question-prompt';
  heading.textContent=prompt;
  legend.after(heading);
  item.setAttribute('aria-labelledby',legendId+' '+headingId);
 });
}
function compactLessonChapters(lesson){
 const panels=[...lesson.querySelectorAll(':scope > section.lr-panel')];
 if(!panels.length)return;
 for(const [index,panel] of panels.entries()){
  const eyebrow=panel.querySelector('.lr-eyebrow')?.textContent?.trim()||'教材';
  const title=panel.querySelector('h2')?.textContent?.trim()||'この章を読む';
  const details=document.createElement('details');
  details.className='lr-chapter';details.dataset.lrChapter=panel.id||String(index+1);
  details.open=index===0;
  const summary=document.createElement('summary');
  const lead=document.createElement('span');lead.className='lr-chapter-label';lead.textContent=eyebrow;
  const name=document.createElement('strong');name.className='lr-chapter-name';name.textContent=title;
  summary.append(lead,name);
  panel.before(details);details.append(summary,panel);
 }
 // Open target before the original per-button click handler runs and scrolls.
 lesson.addEventListener('click',e=>{
  const button=e.target.closest('button[data-lr-jump],button[data-lm-jump],button[data-lf-jump],button[data-lo-jump],button[data-lr-relearn],button[data-lm-relearn],button[data-lf-relearn],button[data-lo-relearn]');
  if(!button)return;
  const id=button.dataset.lrJump||button.dataset.lmJump||button.dataset.lfJump||
   button.dataset.loJump||button.dataset.lrRelearn||button.dataset.lmRelearn||
   button.dataset.lfRelearn||button.dataset.loRelearn;
  if(!id)return;
  const target=lesson.querySelector('#'+id);
  const chapter=target?.closest('.lr-chapter');
  if(chapter)chapter.open=true;
 },true);
}
export function enhanceLearningLesson(host,lessonId){
 if(!host?.querySelector)return;
 const lesson=host.querySelector('.lr-lesson');
 if(!lesson)return;
 // Chapters already provide section navigation and disclosure. Remove the
 // duplicated chapter index entirely, not just visually hide it.
 lesson.querySelector('.lr-lesson-index')?.remove();
 // Keep the inquiry and history destinations grouped before related lessons.
 const inquiry=lesson.querySelector('[id$="-explore"] .lr-actions');
 inquiry?.classList.add('lr-inquiry-actions');
 splitQuestionHeading(lesson,lessonId);
 compactLessonChapters(lesson);
}
