import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {translateUiText} from '../ui/englishUi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const pairs=[
 [
  "任意回答が保存されたか確認できません。新しく入力せず、前回の保存結果を確認してください",
  "The optional response save could not be verified. Check the previous save before entering a new response."
 ],
 [
  "保存に必要な準備ができません。保存は行っていません",
  "Could not prepare the save safely. Nothing was saved."
 ],
 [
  "保存の準備ができないため保存を中止しました",
  "Saving was stopped because it could not be prepared safely."
 ],
 [
  "前回の保存操作に別の入力内容があります。履歴を確認してください。",
  "The previous save contains a different entry. Check your history."
 ],
 [
  "保存の結果を確認できません。入力内容は保持しています。履歴を確認してから、前回の保存を再試行してください。",
  "The save could not be verified. Your entry is retained. Check your history before retrying the previous save."
 ],
 [
  "保存先を確認できません。前回の保存結果と端末の保存領域を確認してください。",
  "The save destination could not be verified. Check the previous save and device storage."
 ],
 [
  "GPS記録の保存を準備できません。保存は行っていません",
  "Could not prepare the GPS record save. Nothing was saved."
 ],
 [
  "GPS記録の保存は確認できましたが、一覧を確認できません。新しく保存せず、前回の保存結果を確認してください。",
  "The GPS record was saved, but the list could not be verified. Check the previous save instead of saving again."
 ],
 [
  "保存結果が未確認です。保存済みの記録がないか確認してから、前回の保存を再試行してください。",
  "The save result is unconfirmed. Check existing records before retrying the previous save."
 ],
 [
  "前回の保存操作に異なるGPS記録があります。履歴を確認してください。",
  "The previous save contains a different GPS record. Check your history."
 ],
 [
  "GPSの保存を確認できません。入力内容は保持しています。保存内容を確認してから前回の保存を再試行してください。",
  "The GPS save could not be verified. Your entry is retained. Review the details before retrying the previous save."
 ],
 [
  "保存結果が未確認です。履歴と保存済みの記録を確認してから、前回の保存を再試行してください。",
  "The save result is unconfirmed. Check history and the saved record before retrying the previous save."
 ],
 [
  "追記の内容に不正な値または重複があります",
  "The additional information contains invalid or duplicate entries."
 ],
 [
  "追記の履歴が既存の記録と一致しません",
  "The additional information history conflicts with existing records."
 ],
 [
  "追記が既存の記録と重複しています",
  "The additional information conflicts with an existing entry."
 ],
 [
  "前回の操作に異なる内容が保存されています",
  "Different content was saved by the previous operation."
 ],
 [
  "追記の保存を確認できません。新しく保存せず、前回の保存結果を確認してください",
  "The additional information save could not be verified. Check the previous save instead of saving again."
 ],
 [
  "保存操作または本人が申告した時点を確認できません",
  "The save operation or reported time could not be verified."
 ],
 [
  "追記の履歴情報が正しくありません",
  "The additional information history is invalid."
 ],
 [
  "同じ追記の履歴がすでに存在します",
  "The same additional information entry already exists."
 ],
 [
  "追記の保存を確認できません。前回の保存結果を読み直してから再試行してください",
  "The additional information save could not be verified. Recheck the previous save before retrying."
 ],
 [
  "対象の保存操作を確認できません",
  "The save operation could not be verified."
 ],
 [
  "保存操作の履歴を読み取れません",
  "The save history could not be read."
 ],
 [
  "同じ記録または日付に異なる内容があります。現在の記録を保護しました",
  "Different content exists for the same record or date. Your current records are protected."
 ],
 [
  "同じGPS記録に異なる内容があります",
  "The same GPS record contains different content."
 ],
 [
  "保存の準備または保存時刻を確認できません",
  "The save could not be prepared or its time could not be verified."
 ],
 [
  "対象の記録と情報の出所",
  "Selected Record and Data Source"
 ],
 [
  "保存結果が不明です。元の走行記録は変更していません。重複して保存せず、前回の追記の保存結果だけを確認します。",
  "The save result is unknown. The original run is unchanged. Check the previous additional information save without saving it again."
 ],
 [
  "他の画面で同じ項目が更新された可能性があります。前回の保存結果を確認し、必要なら再読込してください。",
  "This item may have been updated on another screen. Check the previous save and reload if necessary."
 ],
 [
  "。新しく記録を作らず、前回の保存結果を確認してください。",
  ". Check the previous save instead of creating a new record."
 ],
 [
  "走行記録の保存結果は不明です。履歴と保存済みの記録を再確認してください。",
  "The activity save result is unknown. Check history and the saved record again."
 ],
 [
  "測定内容は再読込で復元できません。前回の測定が保存済みかどうかを確認できます。新しく測定を始めても前回の記録は自動保存しません。",
  "Unsaved measurement data cannot be restored after reloading. You can check whether the previous measurement was saved. Starting a new measurement does not save the previous one."
 ],
 [
  "前回の保存操作に異なる記録があります。履歴を確認してください",
  "The previous save contains a different record. Check your history."
 ],
 [
  "GPS記録の保存操作を確認できません",
  "The GPS record save could not be verified."
 ],
 [
  "GPS記録の保存を安全に準備できません",
  "The GPS record save could not be prepared safely."
 ],
 [
  "対象の記録とその種類を確認できません",
  "The selected record or its type could not be verified."
 ],
 [
  "比較相手の記録または情報の出所を確認できません",
  "The comparison record or its source could not be verified."
 ],
 [
  "対象の記録と情報の出所を照合できません",
  "The selected record and its source could not be matched."
 ],
 [
  "対象の走行記録と情報の出所を照合できません",
  "The selected activity and its source could not be matched."
 ],
 [
  "対象の走行記録を確認できません",
  "The selected activity could not be verified."
 ],
 [
  "対象の記録と情報の出所を確認できません",
  "The selected record and its source could not be verified."
 ],
 [
  "元のGPS記録の指定に不整合または重複があります",
  "The original GPS record selection is inconsistent or duplicated."
 ],
 [
  "自由記述の履歴情報が正しくありません",
  "The note history is invalid."
 ],
 [
  "対象の自由記述を確認できません",
  "The selected note could not be verified."
 ],
 [
  "同じ保存操作が重複しています",
  "The same save operation is duplicated."
 ],
 [
  "同じ元のGPS記録に異なる内容があります",
  "Different content exists for the same original GPS record."
 ],
 [
  "別の自由記述と保存履歴が重複しています",
  "The save history overlaps with a different note."
 ],
 [
  "対象の保存済みGPS記録を確認できません",
  "The selected saved GPS record could not be verified."
 ],
 [
  "GPS記録の保存操作が正しくありません",
  "The GPS save operation is invalid."
 ],
 [
  "前回の保存操作の記録が見つかりません",
  "No record was found for the previous save."
 ],
 [
  "前回の保存内容またはコース詳細の保存選択が一致しません。履歴を確認してください",
  "The previous save content or route detail choice does not match. Check your history."
 ],
 [
  "バックアップ内の記録に重複または不整合があります",
  "Records in the backup are duplicated or inconsistent."
 ],
 [
  "記録数の上限を超えるか、同じ記録に異なる内容があります",
  "The record limit is exceeded or the same record contains different content."
 ],
 [
  "自由記述の保存操作を確認できません",
  "The note save operation could not be verified."
 ],
 [
  "保存操作を安全に準備できません",
  "The save operation could not be prepared safely."
 ],
 [
  "同じ保存操作がすでに行われています",
  "The same save operation has already been performed."
 ],
 [
  "保存操作の内容を確認できません",
  "The save operation could not be verified."
 ],
 [
  "前回の保存操作と入力内容が一致しません。履歴を確認してください",
  "The entry does not match the previous save. Check your history."
 ],
 [
  "記録の保存を安全に準備できないため保存を中止しました",
  "Saving was stopped because the record could not be prepared safely."
 ],
 [
  "対象の記録を確認できません",
  "The selected record could not be verified."
 ],
 [
  "任意回答が保存されたか確認できませんでした。新しく保存せず、前回の保存結果を確認してください",
  "The optional response save could not be verified. Check the previous save instead of saving again."
 ],
 [
  "同じ元の記録に異なる内容があります",
  "Different content exists for the same original record."
 ],
 [
  "対象の記録またはその種類が正しくありません",
  "The selected record or its type is invalid."
 ],
 [
  "対象の記録とその種類が一致しません",
  "The selected record does not match its type."
 ],
 [
  "対象の記録が指定されていません",
  "No record was selected."
 ]
];
test('all revised save, restore and record-selection messages have exact neutral English translations',()=>{
 for(const [ja,en] of pairs){assert.equal(translateUiText(ja),en,ja);assert.doesNotMatch(ja,/ID|識別子/);assert.doesNotMatch(en,/\b(?:ID|identifier)\b/i);}
});
test('obsolete user-facing machine-identifier messages and DOM roots are not present in application source',()=>{
 const files=['app.js','index.html','pwa.js','styles.css',...readdirSync(new URL('../ui/',import.meta.url)).filter(p=>/\.(?:js|css)$/.test(p)).map(p=>'ui/'+p)];
 for(const file of files){const source=read(file);assert.doesNotMatch(source,/runload-(?:history-v2|result-v4|consultation|learning|annotation-editor|dialog-open|update-notice|cp-narrow|gps-narrow|rr-narrow)|runloadBoot|runload:boot-ready|_runloadResultFontObserver/,file);
 for(const old of ["任意回答の保存結果が不明です。操作IDを変えず再確認してください", "安全な操作IDを生成できません", "保存操作IDを作成できないため保存を中止しました", "保存操作IDに別の入力内容があります。履歴を確認してください。", "保存の結果を確認できません。入力と操作IDは保持しています。履歴を確認して同じ操作IDで再試行してください。", "保存先を確認できません。IDを保持しています。履歴と保存領域を確認してください。", "安全なGPS保存操作IDを作れません。保存は行っていません", "GPS原本の保存は確認できましたが、一覧を確認できません。同じ操作IDを保持して再確認してください。", "保存結果が未確認です。同じ操作IDを保持しています。保存済みの記録がないか確認してから再試行してください。", "保存操作IDに異なるGPS記録があります。履歴を確認してください。", "GPSの保存を確認できません。入力と操作IDは保持しています。保存内容を確認して再試行してください。", "保存結果が未確認です。同じ操作IDを保持しました。履歴と保存原本を確認してから再試行してください。", "追記に不正な値・識別子重複があります", "追記イベントまたは操作IDが既存データと衝突しています", "追記ID衝突", "同じ操作IDに異なる内容が保存されています", "追記の保存を確認できません。同じ操作IDで再確認してください", "操作識別子または本人申告時点が不正です", "操作・版・時点・識別子が不正です", "イベントIDが既に使われています", "追記の保存を確認できません。操作IDで再読込してから再試行してください", "操作IDが不正です", "操作IDの履歴が壊れています", "同じ記録ID又は日付に異なる内容があります。現在の記録を保護しました", "GPS記録の識別子と内容が一致しません", "保存操作の識別子または時刻を取得できません", "記録IDと情報の出所", "保存結果が不明です。元の走行記録には変更を加えていません。新しいIDで重複送信せず、同じ操作IDで追記だけを確認します。", "他の画面で同じ項目が更新された可能性があります。操作IDを保ったまま確認し、必要なら再読込してください。", "。新しい親IDは作らず、同じ操作IDで再確認してください。", "走行記録の保存結果は不明です。同じ操作IDを保持し、履歴と保存原本を再確認してください。", "測定内容は再読込で復元できません。保存済みかどうかを同じ操作IDで確認できます。新しく測定を始めても前回の記録は自動保存しません。", "同じ保存操作IDに異なる記録が存在します。履歴を確認してください", "GPS保存操作IDの形式を確認できません", "安全なGPS保存操作IDを生成できません", "記録の種類またはIDを確認できません", "比較相手の記録ID・出所が正しくありません", "記録のIDと出所が正しくありません", "走行記録の出所とIDを照合できません", "走行記録のIDが正しくありません", "記録のIDと出所を確認できません", "GPS元記録の識別子が不正・重複しています", "記述履歴のID・版・日時が不正です", "自由記述IDが不正です", "操作IDが重複しています", "同一IDのGPS元記録の内容が異なります", "別の自由記述とイベントID・操作IDが重複しています", "保存済みGPSのIDが不正です", "GPS保存操作IDが正しくありません", "同じ保存操作IDの記録が見つかりません", "保存操作IDの内容または軌跡保存の選択が一致しません。履歴を確認してください", "バックアップ内の記録IDに重複・不整合があります", "件数上限または同一IDの内容競合があります", "自由記述の操作IDが正しくありません", "安全な操作識別子を生成できません", "操作IDはすでに使用されています", "保存操作IDの形式を確認できません", "保存操作IDの内容が一致しません。履歴を確認してください", "安全な記録IDを生成できないため保存を中止しました", "記録IDが正しくありません", "任意回答の保存後照合ができませんでした。操作IDを変えずに再確認してください", "同一IDの親記録が衝突しています", "記録の種類またはIDが正しくありません", "記録の種類とIDが一致しません", "記録IDが指定されていません"])assert.ok(!source.includes(old),file+': '+old);}
});
