import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEARNING_COURSES} from '../ui/learningExperience.js';
import {translateUiText} from '../ui/englishUi.js';
import {openAnnotationStore} from '../ui/annotationStore.js';
import {readCanonical} from '../ui/manualRunCanonical.js';
const pairs=[
 [
  "手入力記録の正本を利用できません。保存は停止しました。",
  "手入力の保存済み記録を確認できません。保存は停止しました。",
  "Saved manual records cannot be verified. Saving has been stopped."
 ],
 [
  "既存の親記録を照合しました。任意回答は結果画面から確認してください",
  "すでに保存された元の走行記録を確認しました。任意回答は結果画面から確認してください",
  "The original activity was confirmed as saved. Check optional responses on its results screen."
 ],
 [
  "手入力の保存正本を照合できません",
  "保存済みの手入力記録を確認できません",
  "Saved manual records cannot be verified."
 ],
 [
  "親記録が見つかりません",
  "元の走行記録が見つかりません",
  "The original activity record could not be found."
 ],
 [
  "親記録の形式が正しくありません",
  "元の走行記録の内容を確認できません",
  "The contents of the original activity record cannot be verified."
 ],
 [
  "IndexedDBを利用できません",
  "この端末の保存領域を利用できません",
  "Storage on this device is unavailable."
 ],
 [
  "親記録を読み取れないため隔離状態を確定できません",
  "元の走行記録を読み取れないため、別ファイルに分けられるか確認できません",
  "The original activity cannot be read, so a separate file cannot be prepared safely."
 ],
 [
  "親記録の条件と追記値が一致しません",
  "元の走行記録の条件と追記した内容が一致しません",
  "The conditions of the original activity do not match the additional information."
 ],
 [
  "手入力記録の正本を安全に読み取れません。元のデータを変更しません",
  "保存済みの手入力記録を安全に読み取れません。元の記録は変更しません",
  "Saved manual records cannot be read safely. The original records will not be changed."
 ],
 [
  "正本の形式が変更されました。再読込してください",
  "保存情報の形式が変更されました。画面を再読み込みしてください",
  "The saved information format has changed. Reload the page."
 ],
 [
  "IndexedDB正本は書込APIのみ",
  "手入力記録は専用の保存操作から変更してください",
  "Use the dedicated save operation to change manual records."
 ],
 [
  "正本に保存できない形式です",
  "手入力記録として保存できない内容です",
  "This information cannot be saved as a manual record."
 ],
 [
  "IndexedDBへの保存を確認できません。既存記録を確認してください",
  "手入力記録の保存を確認できません。保存済みの記録を確認してください",
  "The manual record save could not be verified. Check your saved records."
 ],
 [
  "バックアップ中に正本が変更されました。中止して再試行してください",
  "バックアップ中に保存済みの記録が変更されました。処理を中止しました。再試行してください",
  "Saved records changed during backup. The operation was stopped. Try again."
 ],
 [
  "処理中に正本が変更された可能性があります。再読込して照合してください",
  "処理中に保存済みの記録が変更された可能性があります。画面を再読み込みして確認してください",
  "Saved records may have changed during the operation. Reload and check them."
 ],
 [
  "保存正本の形式を確認できません",
  "保存済み記録の形式を確認できません",
  "The saved record format cannot be verified."
 ],
 [
  "復元中に別の正本更新がありました。各記録とバックアップを照合してください",
  "復元中に別の操作で記録が変更されました。保存済み記録とバックアップを確認してください",
  "Another operation changed records during restore. Check your saved records and backup."
 ],
 [
  "正本への復元・削除が完了していません。他の保存先を確認してください",
  "手入力記録の復元・削除が完了していません。他の保存済み情報も確認してください",
  "Restoring or deleting manual records is incomplete. Check other saved information as well."
 ],
 [
  "親記録を確認できません",
  "元の走行記録を確認できません",
  "Original Running Record Cannot Be Verified"
 ],
 [
  "親記録が存在しない追記はバックアップできません",
  "元の走行記録が見つからない追記はバックアップできません",
  "Additional information without its original activity cannot be backed up."
 ],
 [
  "親記録を照合できません",
  "元の走行記録との関連を確認できません",
  "The link to the original activity record cannot be verified."
 ],
 [
  "親記録の条件と追記が一致しません",
  "元の走行記録の条件と追記した内容が一致しません",
  "The conditions of the original activity do not match the additional information."
 ],
 [
  "親を照合できません",
  "元の走行記録との関連を確認できません",
  "The link to the original activity record cannot be verified."
 ],
 [
  "親の状態が不明なため隔離できません",
  "元の走行記録の状態を確認できないため、別ファイルに分けられません",
  "A separate file cannot be prepared because the state of the original activity is unknown."
 ],
 [
  "親のない注記はありません",
  "元の走行記録が見つからない追記はありません",
  "There is no additional information missing its original activity."
 ],
 [
  "追記イベントを検証できません",
  "追記した内容を確認できません",
  "The additional information cannot be verified."
 ],
 [
  "イベントが長すぎます",
  "追記した内容が長すぎます",
  "The additional information is too long."
 ],
 [
  "GPS保存領域の構成に不整合があります",
  "保存済みのGPS記録を安全に確認できません",
  "Saved GPS records cannot be verified safely."
 ],
 [
  "後日申告は本人が書いた内容です。記録時の計測値・ROF-Jの正本・12部位の文献参考値・過去比較は変更しません。申告時刻は端末の操作時刻で、体験が生じた時刻を保証しません。",
  "後日申告は本人が書いた内容です。記録時の計測値・ROF-Jの回答・12部位の文献参考値・過去比較は変更しません。申告時刻は端末の操作時刻で、体験が生じた時刻を保証しません。",
  "Retrospective entries are user-authored. They do not change original measurements, original ROF-J responses, 12 regional references or past comparisons. The time of entry does not establish when the experience occurred."
 ]
];
test('only available curriculum courses remain, with no unreleased translations',()=>{
 assert.deepEqual(LEARNING_COURSES.map(c=>c.id),['data','movement','fatigue']);
 assert.ok(LEARNING_COURSES.every(c=>c.ready));
 const dictionary=readFileSync(new URL('../ui/englishCurriculumPace.js',import.meta.url),'utf8');
 for(const phrase of ['走行条件と生活','研究と数字の読み方','変化と過去比較','走行経験を捉える視点','運動の基礎と個人差'])assert.ok(!dictionary.includes('"'+phrase+'":'));
});
test('revised storage and source messages have exact bilingual translations',()=>{
 for(const [,ja,en] of pairs)assert.equal(translateUiText(ja),en,ja);
});
test('unavailable storage fails closed with understandable language',async()=>{
 const a=await openAnnotationStore();assert.equal(a.ok,false);assert.equal(a.reason,'この端末の保存領域を利用できません');
 const m=await readCanonical();assert.equal(m.ok,false);assert.equal(m.reason,'保存済みの手入力記録を安全に読み取れません。元の記録は変更しません');
});
