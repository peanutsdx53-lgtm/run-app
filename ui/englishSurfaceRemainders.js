/** Reviewed, exact-match copy discovered from displayed 20-screen English audits.
 * Do not translate user-authored content or the authoritative Japanese legal text.
 * Numerical composites are handled separately with narrow, contextual rules.
 */
export const ENGLISH_SURFACE_REMAINDERS=Object.freeze({
 // Desktop-only result disclosures found by the five-width English audit.
 '今回の記録・保存コース':'Current Record and Saved Courses',
 '訂正して履歴を保存':'Save Correction and Revision History',
 '「運動前／後」は回答区分です。入力操作時刻と本人申告の評価時刻を記録しますが、実際の時間的な順序が検証できないため、変化量や原因は判定しません。未回答は「—」で、0と区別します。':'Before/after are response categories. Entry times and self-reported assessment times may be recorded, but their actual chronological order is not verified, so changes or causes cannot be determined. An unanswered item (—) is distinct from a valid zero.',
 '出所：ROF-J／本人回答。数値が同じ場合も経験が同じとは限らず、前後差や原因の測定ではありません。':'Source: ROF-J self-report. Equal scores do not establish identical experiences, and neither actual timing differences nor causes are measured.',

 // Home and first-launch background
 'コンディションの歩みを開き、長期の変化とメモを確認':'Open condition history to review longer-term changes and notes',
 'コンディションの入力と詳細を開く':'Open condition entry and details',
 '実績の詳細を開く':'Open milestone details',
 'ホームの表示':'Home display',
 '保存済み走行による実績4項目':'Four milestones based on saved running records',
 '累計走行距離の節目':'Cumulative distance milestones',
 'クイックアクセス':'Quick Access',
 '実績':'Milestones',
 '最新の走行':'Latest Run',
 '直近7日':'Last 7 Days',
 '/ 7日':'/ 7 days',
 '未達成':'Not yet reached',
 '達成':'Reached',
 '記録を保存すると実績を確認できます':'Save a running record to view milestones',
 '30分以上':'At Least 30 min',
 '累計100 km':'Total 100 km',
 '累計50 km':'Total 50 km',
 '条件を変えて考える':'Explore Different Conditions',
 '対象外':'Not Applicable',
 // Manual recording, review and optional fields
 '休養':'Rest',
 '走行':'Running',
 '分':'min',
 '日付':'Date',
 '必須':'Required',
 '前：未入力・後：未入力':'Before: Unanswered · After: Unanswered',
 '割合':'Percentage',
 '区間':'Segments',
 '坂道':'Hills',
 '例：6000':'Example: 6000',
 '天気、湿度、向かい風など':'Weather, humidity, headwinds, etc.',
 '気になった部位、違和感など':'Body regions of concern or discomfort, etc.',
 '自分が感じたことを記入':'Describe what you noticed or felt',
 '歩数（歩）':'Step Count (steps)',
 '気温（℃）':'Temperature (°C)',
 '時間：入力済み':'Duration: Entered',
 '活動種目：入力済み':'Activity Type: Entered',
 '距離：入力済み':'Distance: Entered',
 '編集 ↗':'Edit ↗',
 '入力済み':'Entered',
 '坂道は未設定・路面は未設定':'Hills not set · Surface not set',
 '運動前 — ／ 運動後 —':'Before — / After —',
 // Fatigue rating and timing safeguards
 '疲労感を1上げる':'Increase fatigue rating by 1',
 '疲労感を1下げる':'Decrease fatigue rating by 1',
 '運動前のROF-J疲労感、0から10まで1ずつ':'Before-activity ROF-J rating, 0 to 10 in steps of 1',
 '運動後のROF-J疲労感、0から10まで1ずつ':'After-activity ROF-J rating, 0 to 10 in steps of 1',
 '運動終了時刻':'Activity End Time',
 '運動開始時刻':'Activity Start Time',
 '任意の運動時刻':'Optional Activity Times',
 '疲労感を評価した時点':'Time of Fatigue Assessment',
 '走行日：':'Activity Date:',
 'とても':'Very',
 '中程度':'Moderate',
 '完全':'Complete',
 '少し':'A Little',
 '運動前 / 10':'Before / 10',
 '運動後 / 10':'After / 10',
 '中程度に疲れている':'Moderately Tired',
 'まったく疲れていない':'Not Tired at All',
 '少し疲れている':'A Little Tired',
 'とても疲れている':'Very Tired',
 '完全な疲労困憊':'Completely Exhausted',
 '完全な疲労困憊（何も残っていない状態）':'Completely Exhausted (Nothing Left)',
 '翌日':'Following Day',
 '自動判定':'Automatic Day Selection',
 '（目安：5）':'(Anchor: 5)',
 '2と3の間':'Between 2 and 3',
 '7と8の間':'Between 7 and 8',
 '運動終了時刻（任意）':'Activity End Time (Optional)',
 '運動開始時刻（任意）':'Activity Start Time (Optional)',
 // Result, reference, output/privacy
 '前面':'Front',
 '後面':'Back',
 '足裏':'Sole',
 '画像で保存':'Save as Image',
 '印刷':'Print',
 '現在値は配色表示範囲（60〜140）の外側です。数値はそのまま表示しています。':'Current value is outside the color display range (60–140). The numeric value remains unchanged.',
 '部位内基準100との差':'Difference from This Region’s Reference of 100',
 'ROF-Jの本人回答を画像・印刷に含める（任意）':'Include Self-Reported ROF-J Answers in Image or Print (Optional)',
 '日付を画像に含める（任意）':'Include Date in Image (Optional)',
 'シューズ':'Shoes',
 '出所：本人入力':'Source: Entered by You',
 '出所：距離・時間から算出':'Source: Calculated from Distance and Duration',
 '既定では日付・疲労感・精神面・後日申告・自由記述・GPS経路を出力しません。本人が明示的に選んだ項目だけを追加できます。':'Dates, fatigue ratings, mental responses, later reports, personal notes, and GPS routes are excluded from output by default. Only items you explicitly select are added.',
 '算出対象':'Eligible for Calculation',
 '今回の記録・疲労感（本人申告）':'This Record and Self-Reported Fatigue',
 '保存・出力':'Save & Export',
 '？ 参考値の出典と条件':'? Reference Sources and Conditions',
 '前面の身体図と部位別参考値':'Front Body Diagram and Region-Specific Reference Values',
 '股関節部':'Hip Region',
 '大腿前面':'Front Thigh',
 '膝蓋大腿関節部':'Patellofemoral Region',
 '脛骨部':'Tibial Region',
 '足関節部':'Ankle Region',
 // History and storage
 'この月':'This Month',
 '今月へ':'Go to Current Month',
 '容量は未確認です':'Storage Capacity Not Verified',
 '保存容量':'Storage Capacity',
 '回':'times',
 '月':'Mon',
 '火':'Tue',
 '水':'Wed',
 '木':'Thu',
 '金':'Fri',
 '土':'Sat',
 '日':'Sun',
 '水曜日':'Wednesday',
 '保存済み 0件':'0 Saved Records',
 // Explore, guides, observations
 '疲れと回復、2026-11-11 に保存したROF-Jの入力に関連':'Fatigue & Recovery: Related to ROF-J Responses Saved on 2026-11-11',
 '走りの記録、入力中の走行距離・時間などに関連':'Running Records: Related to Entered Distance, Duration, and Other Details',
 '坂道の方向':'Hill Direction',
 '探し方':'How to Browse',
 'ふり返りノート':'Reflection Notes',
 '自分のコース入力を確認 ›':'Review Your Course Entry ›',
 'ふり返り':'Reflections',
 'テーマから探す':'Browse Topics',
 '書いてみる':'Write a Reflection',
 '選んだ分野のテーマへ':'Topics in This Category',
 'どれから読んでみる？':'Where Would You Like to Start?',
 '上りでは重力に逆らって身体を持ち上げる必要があり、平坦路とは動きや力の使い方が異なります。':'Running uphill requires lifting the body against gravity, so movement and force application differ from level running.',
 '確定できる坂道の割合はありません。走行の入力がない場合も学べます。':'No reliable hill percentage is available here. You can explore the topic even without a running record.',
 '自分の言葉で':'In Your Own Words',
 '4 テーマ · 横に動かして選ぶ':'4 Topics · Swipe to Choose',
 '記録からも広がる発見':'Discover More from Your Records',
 '選んだ分野':'Selected Category',
 '押して進む':'Select to Continue',
 '目的と':'Goals &',
 '探究の使い方':'How to Use Explore',
 '内容の根拠と注意点':'Sources and Important Limitations',
 'この情報からは言えないこと':'What This Information Cannot Tell You',
 '何を見てみる？':'What Could You Look At?',
 '次に確かめたいこと':'What to Check Next',
 '自分の記録とのつながり':'Connections to Your Own Records',
 '必要なときだけ、本人の言葉で保存できます。':'You can save reflections in your own words whenever you choose.',
 '次回の走る前に何を確かめたいですか？':'What would you like to check before your next run?',
 '特定の準備運動の効果や傷害予防を、本アプリでは検証していません。':'This application has not verified the effects of any specific warm-up or its ability to prevent injury.',
 '観察ガイド｜専門解説は出典審査前':'Observation Guide | Specialist Explanations Have Not Yet Passed Source Review',
 '走る前に何をしていたか、自分の習慣を整理しましょう。':'Reflect on what you did before running and consider your usual habits.',
 '運動前の本人の疲労感やメモを確認することができます。':'You can review your self-reported pre-activity fatigue and notes.',
 '自分の記録から考える':'Reflect Using Your Own Records',
 '例：上り坂は思っていたより息が上がった。次回はペースを意識してみたい。':'Example: Uphill running felt harder than expected. Next time I want to pay attention to my pace.',
 '気づきを書く':'Write a Reflection',
 '書き残す内容（500文字まで）':'What to Save (Up to 500 Characters)',
 '「ウォームアップ」について、感じたことや次に試したいことを自由に書けます。あとから画面下部の「ふり返り」で読み返せます。':'You may write about what you noticed or would like to try next regarding warm-ups. You can review it later under Reflections at the bottom of this screen.',
 // Daily condition and dated records
 'ホームに戻る':'Return to Home',
 '記録なし':'No Record',
 '表示期間':'Displayed Period',
 'コンディションの見方':'How to Read Condition History',
 '参考研究：Walsh ほか（2021）':'Reference Study: Walsh et al. (2021)',
 '7日':'7 Days',
 '30日':'30 Days',
 '90日':'90 Days',
 '睡眠は運動後の回復や日中の調子に関係します。ただし必要な睡眠には個人差があります。':'Sleep is related to recovery after exercise and daytime well-being, but individual sleep needs vary.',
 '運動選手を対象とする研究を含む一般的知識です。個人の記録から原因を特定するものではありません。':'This is general knowledge that includes research involving athletes. Individual records cannot establish causes.',
 // Settings and platform details
 '表示言語 / Display language':'Display Language',
 'English · 設定はこの端末に保存されます':'English · Preferences Are Stored on This Device',
 '同意記録、利用開始時の案内の完了状態及びブラウザのキャッシュはバックアップに含まれません。':'Consent records, first-use guide completion status, and browser caches are not included in the backup.',
 '外観':'Appearance',
 '記録方法に戻る':'Return to Recording Options',
 // What-if simulation
 '仮のコース距離':'Hypothetical Course Distance',
 '歩くペース':'Walking Pace',
 '歩く時間':'Walking Duration',
 '走るペース':'Running Pace',
 'GPS測定はスマートフォン専用':'GPS Measurement Is Available Only on Smartphones',
 '03 比較結果':'03 Comparison Results',
 'GPS実走履歴':'Saved GPS Activity History',
 'GPX読込':'Import GPX'
});
const MONTHS=Object.freeze(['January','February','March','April','May','June','July','August','September','October','November','December']);
const ANCHOR=Object.freeze({
 'まったく疲れていない':'Not tired at all',
 '少し疲れている':'A little tired',
 '中程度に疲れている':'Moderately tired',
 'とても疲れている':'Very tired',
 '完全な疲労困憊（何も残っていない状態）':'Completely exhausted (nothing left)'
});
const REGIONS=Object.freeze({'股関節部':'Hip region','大腿前面':'Front thigh','膝蓋大腿関節部':'Patellofemoral region','脛骨部':'Tibial region','足関節部':'Ankle region'});
export function translateResidualDynamic(text,{element=null,attribute=null}={}){
 const s=String(text??'').trim();
 let m;
 if(attribute==='aria-label'&&element?.tagName?.toLowerCase()==='path'&&(m=s.match(/^(.+?)：([0-9.]+)$/))&&REGIONS[m[1]])
  return REGIONS[m[1]]+': '+m[2];
 if(attribute==='aria-label'&&(m=s.match(/^(\d{1,2})日、(\d+)件$/)))
  return 'Day '+m[1]+', '+m[2]+' records';
 if(attribute==='aria-label'&&(m=s.match(/^(\d{4}-\d{2}-\d{2}) 記録なし$/)))
  return m[1]+': No Record';
 if(attribute==='aria-label'&&(m=s.match(/^代表位置 (.+?)：(.+)。説明を確認します。数値は変えません。$/))&&ANCHOR[m[2]])
  return 'Illustration Anchor '+m[1].replace('と',' and ').replace('の間',' (between)')+': '+ANCHOR[m[2]]+'. View its explanation; the rating does not change.';
 if(attribute==='aria-label'&&(m=s.match(/^疲れと回復、(\d{4}-\d{2}-\d{2}) に保存したROF-Jの入力に関連$/)))
  return 'Fatigue & Recovery: Related to ROF-J Responses Saved on '+m[1];
 if((m=s.match(/^(\d{4})年(\d{1,2})月(の記録)?$/))&&Number(m[2])>=1&&Number(m[2])<=12)
  return (m[3]?'Records in ':'')+MONTHS[Number(m[2])-1]+' '+m[1];
 if((m=s.match(/^保存済み手入力走行から確認 · (\d+) \/ 4 項目$/)))
  return 'Based on Saved Manually Entered Runs · '+m[1]+' / 4 Milestones';
 if((m=s.match(/^累計走行距離 ([\d.]+) km$/)))return 'Total Running Distance '+m[1]+' km';
 if((m=s.match(/^(30分以上の走行|初回の走行|累計(?:50|100) km) (達成|未達成)$/))){
  const titles={'30分以上の走行':'Run of At Least 30 min','初回の走行':'First Run','累計50 km':'Cumulative 50 km','累計100 km':'Cumulative 100 km'};
  return titles[m[1]]+': '+(m[2]==='達成'?'Reached':'Not Yet Reached');
 }
 if((m=s.match(/^(\d+) \/ 5 項目に入力あり$/)))return m[1]+' of 5 Fields Entered';
 if((m=s.match(/^保存済み (\d+)件$/)))return m[1]+' Saved Records';
 if((m=s.match(/^(\d+)件$/)))return m[1]+' Records';
 if((m=s.match(/^休養 (\d+)日$/)))return 'Rest: '+m[1]+' Days';
 if((m=s.match(/^(\d+)\/(\d+) 算出$/)))return m[1]+'/'+m[2]+' Calculated';
 if((m=s.match(/^参考値 (\d+)\/(\d+)部位$/)))return 'Reference Values: '+m[1]+'/'+m[2]+' Regions';
 if((m=s.match(/^(\d+)\s*分$/)))return m[1]+' min';
 if((m=s.match(/^（目安：(.+)）$/)))return '(Anchor: '+m[1]+')';
 if((m=s.match(/^尺度：(.+)。図：(.+)。$/)))return 'Scale Source: '+m[1]+'. Illustration Source: '+m[2]+'.';
 if((m=s.match(/^本人申告の睡眠時間：(\d+)日分 ／ 棒の基準：最大(\d+)時間(\d{2})分$/)))
  return 'Self-Reported Sleep Duration: '+m[1]+' Days / Chart Maximum: '+m[2]+' h '+m[3]+' min';
 if((m=s.match(/^(\d+)分の時間枠 · ([\d.]+)分\/km$/)))return 'Time Budget '+m[1]+' min · '+m[2]+' min/km';
 if((m=s.match(/^(\d+)分走る（一定ペース）$/)))return 'Run for '+m[1]+' min (Constant Pace)';
 if((m=s.match(/^(\d+)分走る → (\d+)分歩く · (\d+)分サイクル$/)))
  return 'Run '+m[1]+' min → Walk '+m[2]+' min · '+m[3]+' min Cycle';
 if((m=s.match(/^走る(\d+)分 ＋ 歩く(\d+)分$/)))return 'Run '+m[1]+' min + Walk '+m[2]+' min';
 if((m=s.match(/^目標距離まで ([\d.]+)分$/)))return m[1]+' min to Target Distance';
 if((m=s.match(/^(\d+)分間、入力したペースが変わらないと仮定すると、Aは([\d.]+)km、Bは([\d.]+)kmです。進行距離の差は([\d.]+)kmです。実際の道路上の到達地点は不明です。手動設定だけでは位置・坂道の順序を特定できません。$/)))
  return 'Assuming the entered paces remain unchanged for '+m[1]+' minutes, scenario A covers '+m[2]+' km and B covers '+m[3]+' km, a difference of '+m[4]+' km. The actual destination on a road is unknown. Manual settings do not determine positions or the order of hills.';
 if((m=s.match(/^活動種別：(.+)。平均速度：([\d.]+) m\/s。文献条件に合う(\d+)\/12部位のみ算出。路面・勾配は数値補正していません。 この色は各部位自身の文献基準100との差を示し、危険度や部位間の順位ではありません。個人の身体負荷を直接測定した値ではありません。$/))){
  const gait={'ランニング':'Running','ウォーキング':'Walking','ジョギング':'Jogging'}[m[1]]||m[1];
  return 'Activity: '+gait+'. Average Speed: '+m[2]+' m/s. Values are calculated only for '+m[3]+' of 12 regions meeting the source-study conditions; road surface and grade do not numerically adjust them. Each color shows the difference from that region’s own study reference of 100, not danger or rankings between regions. These values do not directly measure the individual’s physical tissue load.';
 }
 // The result's desktop disclosure is assembled from verified values, never user notes.
 if((m=s.match(/^訂正履歴 (\d+)件。訂正前の回答も保存されています。$/)))
  return 'Revision History: '+m[1]+' Entries. Earlier responses are also retained.';
 if((m=s.match(/^(運動前|運動後)：入力 ([^／]+)／評価（本人申告） ([^／]+)／評価時点の扱い：(.+)$/))){
  const basis={'評価時点は不明':'Assessment time unknown','入力した時点で評価':'Assessed at entry','過去の状態を思い出して申告':'Retrospective self-report'}[m[4]];
  if(!basis)return null;
  const when=s=>s==='不明'?'Unknown':s;
  return (m[1]==='運動前'?'Before':'After')+': Entered '+when(m[2])+' / Self-reported Assessment '+when(m[3])+' / Timing Basis: '+basis;
 }
 if((m=s.match(/^運動開始（本人申告）：([^／]+)／運動終了（本人申告）：(.+)$/))){
  const when=s=>s==='不明'?'Unknown':s;
  return 'Activity Start (Self-reported): '+when(m[1])+' / Activity End (Self-reported): '+when(m[2]);
 }
 return null;
}
