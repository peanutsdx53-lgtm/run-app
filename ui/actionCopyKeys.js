/* UX04 opt-in action copy keys.
 * A route/action identity is stable even when Japanese button text is edited.
 * This module is display-only. It never reads or writes records, user text,
 * legal copy, scientific values, localStorage, or translation preferences.
 *
 * "Navigate" opens a screen; it MUST NOT imply save, apply, select, or delete.
 * Other action kinds are catalogued for future, separately reviewed migrations.
 */
const action=(ja,en,kind)=>Object.freeze({ja,en,kind});
export const UI_ACTION_COPY=Object.freeze({
 'nav.home':action('ホーム','Home','navigate'),
 'nav.record':action('記録','Record','navigate'),
 'nav.record-start':action('記録','Record','navigate'),
 'nav.result':action('結果','Results','navigate'),
 'nav.history':action('履歴','History','navigate'),
 'nav.exploration-tree':action('探究','Explore','navigate'),
 'nav.learning':action('学習','Learning','navigate'),
 'nav.settings':action('設定','Settings','navigate'),
 // Reference terms: do not silently migrate buttons in other screens.
 'action.save-run':action('走行記録を保存する','Save Activity Record','commit'),
 'action.save-notes':action('メモを保存','Save Notes','commit'),
 'action.apply-course':action('条件を反映して記録に戻る','Apply Conditions & Return','apply-draft'),
 'action.return-without-applying':action('反映せず戻る','Return Without Applying','return'),
 'action.view-results':action('結果を見る','View Results','navigate'),
 'action.select-region':action('部位を選ぶ','Select a Region','select'),
 'action.open-help':action('使い方','Help','disclose'),
});
export function actionCopy(key,language='ja'){
 const entry=Object.hasOwn(UI_ACTION_COPY,key)?UI_ACTION_COPY[key]:null;
 return entry?entry[language==='en'?'en':'ja']:null;
}
export function actionKind(key){
 return Object.hasOwn(UI_ACTION_COPY,key)?UI_ACTION_COPY[key].kind:null;
}
export function translateOptInActionText(text,{element,attribute}={}){
 // Only a tagged UI text node. Never touch aria, placeholders, saved or
 // user-authored text; those follow their existing independent policies.
 if(attribute||!element||typeof element.getAttribute!=='function')return null;
 const key=element.getAttribute('data-ui-copy-key');
 const entry=Object.hasOwn(UI_ACTION_COPY,key)?UI_ACTION_COPY[key]:null;
 if(!entry)return null;
 const trimmed=String(text??'').trim();
 return trimmed===entry.ja?entry.en:null;
}
