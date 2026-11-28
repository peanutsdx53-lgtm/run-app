// Presentation-only catalog; stable legacy category/topic IDs remain the persistence contract.
export const EXPLORE_THEMES={
 "A1": {
  "title": [
   "ペースと走り方",
   "Pace and pacing"
  ],
  "question": [
   "平均ペースが近い日でも、走り方や感じ方は違いましたか？",
   "On runs with a similar average pace, did the way you ran or felt differ?"
  ],
  "insight": [
   "平均ペースは、走行全体の経過時間を距離で割った値です。3 kmを6・6・6分で走っても、5・6・7分で走っても、平均は6分/kmになります。途中の配分は異なります。",
   "Average pace is total elapsed time divided by distance. Running three 1 km segments in 6, 6 and 6 minutes or in 5, 6 and 7 minutes gives the same average of 6 min/km, despite different pacing."
  ],
  "review": [
   "距離・経過時間・平均ペースを確認し、途中で速さを変えた場面があれば思い出してみましょう。",
   "Check distance, elapsed time and average pace, and recall any moments when you changed speed."
  ],
  "consider": [
   "平均値だけでは分からない走り方はありましたか？",
   "What aspects of your run are not captured by its average pace?"
  ],
  "limit": [
   "この例は仮想の計算例です。区間の記録がなければ実際の途中のペースは分かりません。",
   "This is a hypothetical arithmetic example. Without segment records, the actual pace within the run is unknown."
  ],
  "sources": [
   [
    "本人の記録した距離と経過時間から求めた算術値です。個人の身体状態を予測した値ではありません。",
    "An arithmetic value calculated from recorded distance and elapsed time, not a prediction of bodily state."
   ]
  ],
  "example": [
   "5分/kmは7分/kmより速いペースです。",
   "A pace of 5 min/km is faster than 7 min/km."
  ]
 },
 "A2": {
  "title": [
   "過去の走りとの違い",
   "Differences between runs"
  ],
  "question": [
   "前の走りと比べて、数値や感じ方はどのように違いましたか？",
   "Compared with an earlier run, what differed in the recorded values or how you felt?"
  ],
  "insight": [
   "ペースが速くなったという記録と、走りやすくなったという感覚は別の情報です。距離や条件を確認すると、二つの走行のどこが似ていて、どこが違うかを整理できます。",
   "A faster pace and a feeling that running was easier are different kinds of information. Distance and conditions help you consider what was similar or different between two runs."
  ],
  "review": [
   "結果画面で比較したい走行を自分で選び、同じ意味の項目を見返しましょう。",
   "Choose the run you want to compare on the result screen and review items with the same meaning."
  ],
  "consider": [
   "数値と感覚の変化は一致していましたか？ 分からない点は何ですか？",
   "Did the changes in the values and your feelings agree? What remains unknown?"
  ],
  "limit": [
   "違いだけでは原因や能力の向上は判断できません。文献参考値の比較には同じ部位・指標・系列・基準・計算方法が必要です。",
   "Differences alone do not establish causes or improved ability. Comparing literature reference values requires the same body region, measure, series, reference basis and calculation method."
  ],
  "sources": [
   [
    "設計の参考：Liら（2011）個人が記録に求める情報（現在・履歴・差異・文脈など）を質的に調べた研究。比較機能の効果を検証したものではありません。",
    "Design background: Li et al. (2011), qualitative research on information needs such as status, history, discrepancies and context. This does not establish the effects of this comparison feature."
   ]
  ],
  "example": [
   "説明用の例：Aは5 km・30分で余裕があった。Bは5 km・29分で最後がきつかった。Bの平均ペースは速くても、走りやすさが増したとは限りません。",
   "Illustrative example: A was 5 km in 30 min and felt comfortable. B was 5 km in 29 min and felt difficult at the end. B was faster on average, but may not have felt easier."
  ]
 },
 "A3": {
  "title": [
   "文献参考値の意味",
   "Understanding literature reference values"
  ],
  "question": [
   "参考値の100は、何を表すのでしょうか？",
   "What does 100 mean in a literature reference value?"
  ],
  "insight": [
   "100は、その部位・指標・系列の参照基準です。本人の正常値や安全な負荷を示すものではありません。同じ平均速度などの参照条件で同じ値が表示されても、本人の疲労感や身体の状態まで同じとは限りません。",
   "100 is the reference for that region, measure and series, not your normal value or a safe load. Matching reference values under the same conditions, including average speed, do not establish that your fatigue or bodily state was the same."
  ],
  "review": [
   "結果画面で部位・指標・適用条件・表示の可否を確認し、必要なら本人の疲労感や走行条件も別に確認しましょう。",
   "Check the region, measure, applicable conditions and whether a value is available in Results. Review your fatigue rating and running conditions separately if useful."
  ],
  "consider": [
   "その参考値の基準や計算条件を、自分の記録と区別できますか？",
   "Can you distinguish the reference basis and calculation conditions from your own records?"
  ],
  "limit": [
   "参考値は本人の組織負荷や傷害危険度の測定値ではありません。適用条件外では算出せず、比較条件を満たさなければ比較しません。異なる部位の大小比較はできません。",
   "Reference values are not measurements of your tissue loading or injury risk. Values outside applicable conditions are not calculated; ineligible comparisons are not made. Values cannot be ranked across regions."
  ],
  "sources": [
   [
    "研究の根拠：部位ごとに測定量・適用条件が異なります。結果画面で該当する文献と条件を確認できます。",
    "Research basis: measures and applicable conditions differ by region; see Results for the relevant study and conditions."
   ]
  ],
  "example": [
   "例：同じ部位・指標・基準で100と120なら、後者は参照基準の1.2倍に相当します。本人の身体への負荷が20％増えたという意味ではありません。",
   "Example: for the same region, measure and reference basis, 120 corresponds to 1.2 times the reference of 100. It does not mean your own tissue load increased by 20%."
  ]
 },
 "B1": {
  "title": [
   "疲労感と走った感覚",
   "Fatigue and how running felt"
  ],
  "question": [
   "走り終えたときの疲労感が同じでも、走った経験は同じでしょうか？",
   "If two runs have the same after-exercise fatigue rating, were the experiences the same?"
  ],
  "insight": [
   "坂道で息が上がる「運動のきつさ」と、止まって休んでいるときにも残る「疲労感」は、同じとは限りません。自転車運動の研究では、運動中は両者が対応しましたが、休んでいる間は同じ変化を示しませんでした。",
   "Effort, such as feeling out of breath on a hill, and fatigue that may remain while resting are not necessarily the same. In a cycling study they corresponded during exercise but did not follow the same pattern while resting."
  ],
  "review": [
   "運動前後の疲労感と、覚えている場面・入力方法を確認しましょう。0は有効な回答で、未回答ではありません。",
   "Review your before/after fatigue ratings and the circumstances you remember, including how the answers were recorded. Zero is a valid answer, not a missing response."
  ],
  "consider": [
   "疲れの数字だけでは表せない感じ方はありますか？",
   "Was there anything about how you felt that the rating alone does not capture?"
  ],
  "limit": [
   "両者の主観的な区別には難しさもあります。「運動前／後」は回答区分で、実際の時間的順序を証明しません。同一走行内の時間的な前後差は判定しません。筋損傷や安全性も判定しません。",
   "The two sensations can be difficult to distinguish. “Before/after exercise” are response categories, not proof of actual timing. The app does not determine temporal change within a run, muscle damage or safety."
  ],
  "sources": [
   [
    "Micklewrightら（2017）疲労感尺度ROFの開発・妥当性。自転車漸増運動と30分の安静回復で検討。",
    "Micklewright et al. (2017), development and validity of ROF; graded cycling and 30 minutes of resting recovery."
   ],
   [
    "Suzuki・Arai（2026）日本語版ROF-Jの妥当性。大学生85人・大学運動部員35人で検討。原著の測定手順（運動前後の比較）と本アプリの後からの回答入力は異なります。初心者個人への予測検査ではありません。",
    "Suzuki & Arai (2026), validation of ROF-J; 85 university students and 35 university team athletes. The study’s pre/post exercise measurement protocol differs from retrospective entries in this app. Not a predictive test for individual beginner runners."
   ]
  ],
  "example": [
   "説明用の例：運動前の回答が1と4、運動後がどちらも5なら、後の回答だけでは前の回答の違いは分かりません。0という回答も未回答とは異なります。",
   "Illustrative example: before-exercise answers of 1 and 4 can both have an after-exercise answer of 5. Looking at the latter alone hides the difference in the earlier answers. A response of 0 is different from no response."
  ]
 },
 "B2": {
  "title": [
   "身体の動き",
   "Body movement"
  ],
  "question": [
   "速さや走った場面が違うと、脚や上半身の動きはどう感じましたか？",
   "How did your leg or upper-body movement feel at different speeds or in different situations?"
  ],
  "insight": [
   "足が地面に接している間は身体を支え、進む動きにつながります。地面から離れた脚は次の接地へ向かいます。定期的に走る28人のトレッドミル実験では、速度が高い条件で股関節や膝の曲げ伸ばしの角度の一部が大きくなりましたが、接地タイプへの有意な速度効果は検出されませんでした。",
   "While a foot is on the ground, the leg supports the body and contributes to forward motion. After leaving the ground, the leg moves toward its next contact. In a treadmill experiment with 28 regular runners, some hip and knee flexion or extension angles were larger at higher speeds, but no significant speed effect on foot-strike type was detected."
  ],
  "review": [
   "関節の既存図解を見ながら、気になった動きと本人のメモを確認しましょう。腕・体幹は本人の観察として扱います。",
   "Use the existing joint illustration to consider the movement that caught your attention and any notes. Arm and trunk movement are considered as your own observations."
  ],
  "consider": [
   "実際に見たことと、身体で感じたことには違いがありましたか？",
   "Was there a difference between what you observed and what you felt?"
  ],
  "limit": [
   "本人の関節角度・筋活動・正しいフォームは測定・判定していません。下肢の研究結果を腕や体幹へそのまま適用しません。",
   "The app does not measure your joint angles or muscle activation, or judge correct form. The lower-limb study is not directly applied to the arms or trunk."
  ],
  "sources": [
   [
    "Fukuchiら（2017）走行速度と下肢の動き・力学。定期ランナー28人のトレッドミル実験（2.5・3.5・4.5 m/s）。",
    "Fukuchi et al. (2017), running speed and lower-limb mechanics; treadmill experiment with 28 regular runners at 2.5, 3.5 and 4.5 m/s."
   ]
  ]
 },
 "B3": {
  "title": [
   "痛み・違和感の記録",
   "Recording pain and discomfort"
  ],
  "question": [
   "どこで、いつ、どんな感覚が気になりましたか？",
   "Where, when and what kind of sensation caught your attention?"
  ],
  "insight": [
   "感覚の場所・時期・内容は別々の情報です。走った後で思い出して書いた内容は後日申告であり、当日に測った情報ではありません。",
   "Location, timing and the nature of a sensation are separate pieces of information. A note written from memory later is a retrospective report, not a measurement made during the run."
  ],
  "review": [
   "本人の身体に関する記述があれば、元の走行記録と後日申告を区別して読み返しましょう。",
   "If you recorded a bodily sensation, distinguish the original run record from later reports when reviewing it."
  ],
  "consider": [
   "覚えていることと、時期や内容が分からないことを分けてみましょう。",
   "Consider what you remember and what remains uncertain about the timing or sensation."
  ],
  "limit": [
   "病名・原因・傷害の有無は判断しません。強い痛みや持続する症状は医療者に相談してください。",
   "The app does not diagnose conditions, causes or injuries. Seek medical advice for severe pain or persistent symptoms."
  ],
  "sources": [],
  "example": [
   "記述例：走行中に膝周辺が張る感じがした。翌朝は別の場所が気になった。覚えている場所・時期・感覚を分けると、あとから読み返したときの手掛かりになります。",
   "Example note: tightness around the knee during a run; another area caught my attention the next morning. Separating remembered location, timing and sensation gives you something more specific to revisit."
  ]
 },
 "C1": {
  "title": [
   "坂道・路面と走り方",
   "Hills, surfaces and running"
  ],
  "question": [
   "坂道や路面が違うと、走り方や感覚はどう変わりましたか？",
   "How did your running or sensations differ on different slopes or surfaces?"
  ],
  "insight": [
   "坂道の向きによって、身体を高い位置へ運ぶ働きや、下る際に勢いを制御する働きが異なります。",
   "Uphill and downhill running differ in how the body is raised and how motion is controlled when descending."
  ],
  "review": [
   "コースの坂道の割合・路面・平均ペースを見返し、速度を変えたり着地が気になったりした場面を思い出しましょう。",
   "Review the course's hill proportions, surface and average pace. Recall moments when you changed speed or noticed your landing."
  ],
  "consider": [
   "坂道や路面以外に、ペースや距離なども違っていましたか？",
   "Besides the slope or surface, did pace, distance or other conditions differ?"
  ],
  "limit": [
   "坂道の割合は傾斜角度ではありません。模式図は関節の位置を示すもので、負荷の強さではありません。研究で観察された関節の働きから本人の筋力・筋活動・傷害リスクは判断できません。",
   "Hill proportions are not slope angles. The schematic identifies joint locations, not loading intensity. Joint mechanics observed in research do not establish your muscle force, muscle activation or injury risk."
  ],
  "sources": [
   [
    "Nuckolsら（2020）坂道での歩行・走行における関節の力学。健康な成人8人、2.25 m/s、0・±2.86・±5.71度のトレッドミル走行。",
    "Nuckols et al. (2020), joint mechanics in uphill and downhill walking and running. Eight healthy adults ran on a treadmill at 2.25 m/s and 0, ±2.86 and ±5.71 degrees."
   ],
   [
    "Vernilloら（2020）勾配走の生体力学。成人19人を対象に、速度2.50・3.33・4.17 m/s、傾斜0・±5・±10度で地面反力等を検討。",
    "Vernillo et al. (2020), biomechanics of graded running. Ground reaction forces and other measures were studied in 19 adults at 2.50, 3.33 and 4.17 m/s and 0, ±5 and ±10 degrees."
   ]
  ]
 },
 "C2": {
  "title": [
   "気温・天候・走行場所",
   "Temperature, weather and location"
  ],
  "question": [
   "走った場所や天候が違うと、どんな感じ方の違いがありましたか？",
   "What differences did you feel when running in different locations or weather?"
  ],
  "insight": [
   "気温が同じ日でも、日差しのある道路、日陰、風のある場所、室内では経験した条件が異なり得ます。気温の記録と、その場の暑さや走りやすさを思い出すことは別の手掛かりです。",
   "Even at the same recorded temperature, a sunny road, shade, wind and an indoor location can involve different conditions. The temperature entry and your remembered heat or ease of running offer different clues."
  ],
  "review": [
   "走行条件の本人入力や後日申告を確認しましょう。",
   "Review your entered running conditions and any retrospective reports."
  ],
  "consider": [
   "記録上の条件と、覚えている体感に違いはありますか？",
   "How do the recorded conditions relate to the sensations you remember?"
  ],
  "limit": [
   "気温は本人入力であり、気象観測値ではありません。GPSから未記録の環境や身体反応を推定せず、原因も断定しません。",
   "Entered temperature is not a meteorological measurement. Unrecorded conditions, bodily reactions and causes are not inferred from GPS."
  ],
  "sources": [],
  "example": [
   "説明用の例：同じ20℃と入力した2回の走行。一方は日陰の公園、もう一方は日差しのある道路だったと覚えているなら、気温以外の状況も見返せます。",
   "Illustrative example: two runs both recorded as 20°C. If you remember one being in a shaded park and the other on a sunny road, you have more context to review than temperature alone."
  ]
 },
 "C3": {
  "title": [
   "睡眠と日々のコンディション",
   "Sleep and daily condition"
  ],
  "question": [
   "眠った時間が近い日でも、起きたときや走ったときの調子は違いましたか？",
   "On days with similar sleep durations, did you feel different when waking or running?"
  ],
  "insight": [
   "競技者の睡眠に関する研究・専門家の合意では、全員に同じ睡眠時間を当てはめるのではなく、個人の必要性を考慮することが重視されています。本アプリでは就床から起床までの時間と、本人が申告した睡眠時間を区別します。",
   "Research and expert consensus on athletes' sleep emphasize considering individual needs rather than applying one sleep duration to everyone. This app distinguishes time between going to bed and getting up from self-reported sleep duration."
  ],
  "review": [
   "生活履歴から見たい日を自分で選び、入力方式・時間・起床時の調子を見返しましょう。食事や水分など覚えている状況も考える材料にできます。",
   "Choose a day in your daily history and review the entry method, duration and how you felt on waking. Other remembered circumstances, such as food or drink, may also inform your reflection."
  ],
  "consider": [
   "時間と調子の記録が似ていた日でも、走った感覚は同じでしたか？",
   "Even when the recorded duration and waking condition were similar, did running feel the same?"
  ],
  "limit": [
   "未記録日は0時間ではありません。異なる睡眠入力方式を同一として比較せず、生活記録は日付だけで走行に自動関連づけません。個人の必要睡眠時間、摂取量、因果関係を判定しません。",
   "An unrecorded day is not zero hours. Different sleep entry methods are not treated as equivalent, and daily entries are not automatically linked to runs by date. Individual sleep requirements, intake amounts and causation are not determined."
  ],
  "sources": [
   [
    "Walshら（2021）競技者の睡眠に関するレビュー・専門家合意。",
    "Walsh et al. (2021), review and expert consensus on athlete sleep."
   ]
  ],
  "example": [
   "説明用の例：23時に就床し7時に起床した場合、就床から起床までは8時間です。眠るまでにかかった時間や途中で起きた時間は、この入力だけでは分かりません。",
   "Illustrative example: going to bed at 23:00 and getting up at 07:00 gives eight hours in bed. This entry alone does not reveal how long it took to fall asleep or time awake during the night."
  ]
 },
 "C4": {
  "title": [
   "休養・走行中の判断",
   "Rest and decisions around running"
  ],
  "question": [
   "走る前・途中・後、または休んだ日に、どんな判断や工夫をしましたか？",
   "What decisions or adjustments did you make before, during or after a run, or on a day you rested?"
  ],
  "insight": [
   "走らなかったことと回復したと感じたことは別です。平均ペースから途中の休憩や速さの変更は特定できません。準備や運動後に行ったことも、そのときの感じ方と区別できます。",
   "Not running and feeling recovered are different things. Average pace does not establish when you stopped or changed speed. What you did before or after exercise can also be considered separately from how you felt."
  ],
  "review": [
   "本人の行動メモ・走行記録・疲労感を必要に応じて見返しましょう。",
   "Review your notes about actions, run records and fatigue ratings when useful."
  ],
  "consider": [
   "行動を変えた理由について、覚えていることは何ですか？",
   "What do you remember about why you changed your actions?"
  ],
  "limit": [
   "記録がない日を休養日とみなしません。準備・ストレッチの効果、回復の成立、必要休養日数、運動の安全性や継続可否を判定しません。",
   "A day without a record is not assumed to be a rest day. The app does not judge the effects of warm-up or stretching, recovery, required rest days, safety or whether to continue exercising."
  ],
  "sources": []
 },
 "D1": {
  "title": [
   "自分にとっての走る意味",
   "What running means to you"
  ],
  "question": [
   "走ることの中で、今の自分が大切にしたいことは何ですか？",
   "What matters to you about running at the moment?"
  ],
  "insight": [
   "距離や時間は走行の結果を示しますが、目的や楽しさまで表す数値ではありません。新たに走り始めた人の研究では、走る理由や生活上の制約、走れるという実感がさまざまに報告されました。",
   "Distance and time describe a run but do not quantify its purpose or enjoyment. Research with new runners reported varied personal reasons for running, life constraints and feelings of capability."
  ],
  "review": [
   "以前の感想や目標についての言葉があれば、走行記録と合わせて見返しましょう。",
   "If you recorded earlier thoughts or goals, review them alongside your runs."
  ],
  "consider": [
   "数字が目標と違った日にも、自分にとって意味のある経験はありましたか？",
   "Did a run still mean something to you when its numbers differed from your goal?"
  ],
  "limit": [
   "目的・心理状態・努力・満足度は記録から推定しません。",
   "The app does not infer your purpose, psychological state, effort or satisfaction from records."
  ],
  "sources": [
   [
    "McCormickら（2024）新たに走り始めた人の経験。20人の質的縦断研究。",
    "McCormick et al. (2024), experiences of new runners; qualitative longitudinal study with 20 participants."
   ]
  ],
  "example": [
   "説明用の例：距離の目標には届かなかったが、初めての道を楽しめた日。予定どおり走れなかったが、生活に合う時間帯を見つけた日。数字とは別に、自分にとって意味のあったことを見つけられます。",
   "Illustrative examples: a run fell short of a distance goal but you enjoyed a new route; a plan changed but you discovered a time that fits your life. You can notice what mattered to you beyond the numbers."
  ]
 },
 "D2": {
  "title": [
   "気づきや考えの変化",
   "Changes in your understanding"
  ],
  "question": [
   "以前の気づきを見返すと、今も同じように考えますか？",
   "Looking back at an earlier observation, do you still think about it in the same way?"
  ],
  "insight": [
   "以前のメモは、その時点での自分の考えです。別の走行や知識によって考えが変わっても、前の考えを消す必要はありません。気になる情報だけを確認し、後から戻ることもできます。",
   "An earlier note reflects what you thought at that time. New runs or knowledge may change your view without making it necessary to erase the earlier one. You can review only the information that matters to you and return later."
  ],
  "review": [
   "ふり返りノートから以前の言葉、日付、関連する走行を確認しましょう。修正履歴がある場合はその内容も見返せます。",
   "Review your earlier words, dates and associated runs in Reflection notes. If revision history exists, review it too."
  ],
  "consider": [
   "以前の疑問が解消した点、変わった点、まだ分からない点はありますか？",
   "Is there anything you have clarified, changed your mind about or still do not know?"
  ],
  "limit": [
   "記述や再訪は任意です。アプリが本人の結論や理解度を判定することはありません。",
   "Writing and revisiting are optional. The app does not determine your conclusions or level of understanding."
  ],
  "sources": [
   [
    "設計の参考：Epsteinら（2015）日常生活における自己記録の中断・再開を扱う研究。アプリの効果を検証したものではありません。",
    "Design background: Epstein et al. (2015), lived personal informatics, including lapses and resumption; not an evaluation of this app."
   ]
  ],
  "example": [
   "仮想例：以前「坂道のある日に疲れを強く感じた」と書いた後、別の日には違うと感じたら、その考えも追記できます。",
   "Hypothetical example: After noting that a hilly run felt tiring, you may feel differently on another day and add that observation."
  ]
 }
};
export const EXPLORE_LEGACY={
 "01|距離・時間・ペース": {
  "id": "distance-time-pace",
  "main": "A1",
  "default": true
 },
 "01|自分が感じた疲れ": {
  "id": "felt-fatigue",
  "main": "B1",
  "default": true
 },
 "01|過去の走りとの比較": {
  "id": "saved-comparison",
  "main": "A2",
  "default": true
 },
 "01|気付きと次の確認": {
  "id": "voluntary-reflection",
  "main": "D2",
  "default": true
 },
 "02|姿勢と走る動作": {
  "id": "body-posture",
  "main": "B2",
  "default": false
 },
 "02|足・膝・股関節": {
  "id": "body-movement",
  "main": "B2",
  "default": true
 },
 "02|体幹と腕の動き": {
  "id": "body-upper",
  "main": "B2",
  "default": false
 },
 "02|12部位の参考値の見方": {
  "id": "reference-reading",
  "main": "A3",
  "default": true
 },
 "03|上り坂・下り坂": {
  "id": "slope-running",
  "main": "C1",
  "default": true
 },
 "03|路面": {
  "id": "course-surface",
  "main": "C1",
  "default": false
 },
 "03|気温・天候": {
  "id": "course-weather",
  "main": "C2",
  "default": true
 },
 "03|屋外・室内": {
  "id": "course-location",
  "main": "C2",
  "default": false
 },
 "04|疲れの感じ方": {
  "id": "fatigue-reading",
  "main": "B1",
  "default": false
 },
 "04|筋肉痛・違和感": {
  "id": "recovery-discomfort",
  "main": "B3",
  "default": true
 },
 "04|休養と回復": {
  "id": "recovery-rest",
  "main": "C4",
  "default": true
 },
 "04|疲れを考える視点": {
  "id": "recovery-context",
  "main": "B1",
  "default": false
 },
 "05|食事・水分": {
  "id": "life-food",
  "main": "C3",
  "default": false
 },
 "05|日々のコンディション": {
  "id": "life-daily",
  "main": "C3",
  "default": true
 },
 "05|睡眠": {
  "id": "sleep-recovery",
  "main": "C3",
  "default": false
 },
 "06|ウォームアップ": {
  "id": "practice-warmup",
  "main": "C4",
  "default": false
 },
 "06|走行中の対応": {
  "id": "practice-during",
  "main": "C4",
  "default": false
 },
 "06|クールダウン・ストレッチ": {
  "id": "practice-after",
  "main": "C4",
  "default": false
 },
 "06|無理をしない判断": {
  "id": "practice-boundaries",
  "main": "C4",
  "default": false
 },
 "07|走る目的": {
  "id": "goal-meaning",
  "main": "D1",
  "default": true
 },
 "07|目標との付き合い方": {
  "id": "goal-choices",
  "main": "D1",
  "default": false
 },
 "07|楽しみ方": {
  "id": "goal-enjoyment",
  "main": "D1",
  "default": false
 },
 "07|自分に合う記録の使い方": {
  "id": "personal-record-use",
  "main": "D2",
  "default": false
 }
};
export const EXPLORE_VARIANTS={
 "body-posture": {
  "review": [
   "姿勢について、実際に見たことと身体で感じたことを分けて思い出してみましょう。",
   "Recall what you actually observed about posture separately from what you felt."
  ]
 },
 "body-upper": {
  "insight": [
   "腕の振り、上半身の傾き、肩周りの感覚などは、本人が覚えている範囲で別々に考えられます。見た動きと感じた動きは異なる情報です。",
   "Consider arm swing, upper-body lean and sensations around the shoulders separately, as far as you remember. Observed motion and felt motion are different kinds of information."
  ],
  "review": [
   "腕の振りや上半身の感覚が気になった場面を、覚えている範囲で整理できます。",
   "Consider any moments when you noticed your arms or upper body, as far as you remember."
  ],
  "sources": [],
  "question": [
   "脚以外では、肩や腕、上半身の動きで何が気になりましたか？",
   "Apart from your legs, what caught your attention about your shoulders, arms or trunk?"
  ],
  "example": [
   "観察例：肩に力を入れていたように感じたが、実際の腕の振りは見ていない。感じたことと観察できたことを区別して振り返れます。",
   "Observation example: you felt your shoulders tense, but did not observe your actual arm swing. Consider what you felt and what you actually observed separately."
  ]
 },
 "course-surface": {
  "insight": [
   "同じ未舗装路でも、締まった土・砂・凹凸など、路面の状態は一様ではありません。種類を選んだだけでは硬さや滑りやすさは分かりません。足元の感覚や速度を変えた場面は別の手掛かりです。",
   "Unpaved surfaces can include compacted dirt, sand or uneven ground. A surface category alone does not measure hardness or slipperiness. Remembered footing and moments when you adjusted speed provide other clues."
  ],
  "review": [
   "コース入力に路面があれば見返し、足元の凹凸や着地の感覚、速度を調整した場面を思い出してみましょう。",
   "Review the surface in your course entry, if available, and recall uneven ground, landing sensations or moments when you adjusted speed."
  ],
  "limit": [
   "路面の記録だけから部位別負荷や傷害リスクは判断できません。",
   "Surface records alone cannot establish regional loading or injury risk."
  ],
  "sources": [],
  "question": [
   "いつもの舗装路と違う路面で、足元の感覚や速度の調整は変わりましたか？",
   "On a different surface from your usual paved route, did your footing or pacing feel different?"
  ],
  "example": [
   "観察例：舗装路では着地を意識しなかったが、凹凸のある道では足元をよく見て速度を調整した。違いを感じなかった場合も、そのまま振り返れます。",
   "Observation example: you paid little attention to landing on a paved route but watched your footing and changed speed on uneven ground. Not noticing a difference is also a valid observation."
  ]
 },
 "course-location": {
  "review": [
   "屋内・屋外の違いに加え、道の広さや風など覚えている条件を考えられます。",
   "Besides indoor or outdoor setting, consider conditions you remember, such as path width or wind."
  ]
 },
 "life-food": {
  "insight": [
   "食事や水分について、何を口にしたか、量が分かるか、そのときどう感じたかは別々の情報です。",
   "What you ate or drank, whether you know the amount, and how you felt are separate pieces of information."
  ],
  "review": [
   "本人のメモがあれば見返し、なければ覚えている範囲で考えられます。",
   "Review your own notes if available, or consider what you remember."
  ],
  "limit": [
   "食事量・水分摂取量を測定していません。脱水、栄養不足、必要摂取量や走行への効果を判定しません。",
   "Food and fluid intake are not measured. The app does not determine dehydration, nutrient deficiency, required intake or effects on running."
  ],
  "example": [
   "観察例：走る前に飲み物を飲んだことは覚えているが量は覚えていない。摂取量を推測せず、覚えていることだけを手掛かりにできます。",
   "Observation example: you remember drinking something before running but not how much. Use what you remember without guessing the amount."
  ],
  "sources": [],
  "question": [
   "走る前後に口にしたものと、そのときの感覚を覚えていますか？",
   "Do you remember what you ate or drank around a run and how you felt?"
  ],
  "consider": [
   "摂取した時期や内容の記憶はありますか？ 量や成分が分からなければ、分からないままにしておけます。",
   "Do you remember what you consumed and when? If the amount or composition is unknown, it can remain unknown."
  ]
 },
 "life-daily": {
  "review": [
   "生活履歴で日付を選び、本人の疲れ・気分、起床時の調子と入力方式を確認できます。",
   "Choose a date in daily history and review your reported fatigue, mood, waking condition and input method."
  ],
  "question": [
   "同じ朝の調子と回答した日でも、一日を通して同じように感じましたか？",
   "On days with the same waking-condition answer, did you feel the same throughout the day?"
  ],
  "insight": [
   "起床時の調子は朝の回答であり、その日の疲れ・気分は別の記録です。朝の調子が似ていても、一日の中で感じ方が変わったことを思い出す場合があります。",
   "Waking condition is a morning response, while fatigue and mood are recorded separately. Similar waking responses need not capture how you remember feeling throughout the day."
  ],
  "consider": [
   "朝の調子とその日の疲れ・気分のうち、走った経験を振り返る手掛かりになったものはありますか？",
   "Which, if any, of your waking condition, daily fatigue or mood helped you reflect on the run?"
  ],
  "example": [
   "説明用の例：起床時は良いと回答していても、夕方には眠気があったと覚えている日。朝の回答だけで一日の状態を代表させません。",
   "Illustrative example: a day when you reported feeling good on waking but remember feeling sleepy in the evening. A morning response does not represent the entire day."
  ],
  "sources": []
 },
 "recovery-context": {
  "review": [
   "運動前後の疲労感と、本人が選んだ生活記録・走行条件を別々に見返せます。",
   "Review before/after fatigue ratings and any daily records or running conditions you choose separately."
  ]
 },
 "personal-record-use": {
  "review": [
   "以前のメモや履歴から、考えるときに役立った情報を選べます。",
   "Choose information from earlier notes or history that helped you think."
  ],
  "consider": [
   "次に何を確かめたいですか？ 記録を追加しない選択もできます。",
   "What would you like to check next? You may choose not to add any records."
  ]
 },
 "goal-choices": {
  "review": [
   "以前の目標やその日の感想があれば、距離・時間と別に見返しましょう。",
   "If you recorded a goal or thoughts about a run, review them separately from distance and time."
  ]
 },
 "goal-enjoyment": {
  "review": [
   "印象に残った景色、場所、同行した人など、本人が覚えていることも手掛かりになります。",
   "Scenery, places, people you ran with and other things you remember can also be useful context."
  ]
 },
 "recovery-rest": {
  "question": [
   "休んだ日、どのように過ごし、どう感じましたか？",
   "How did you spend a rest day, and how did you feel?"
  ],
  "insight": [
   "走らなかったことと回復したと感じたことは別です。",
   "Not running and feeling recovered are different things."
  ],
  "review": [
   "休んだと覚えている日の前後の本人メモや疲労感を見返せます。",
   "Review your notes and fatigue ratings around a day you remember resting."
  ],
  "limit": [
   "未記録日を休養日とみなしません。回復の成立や必要な休養日数は判定しません。",
   "A day without a record is not assumed to be a rest day. The app does not determine recovery or required rest days."
  ],
  "consider": [
   "休む前後で、感じ方に変化がありましたか？",
   "Did you notice any change in how you felt before and after resting?"
  ],
  "sources": [],
  "example": [
   "説明用の例：走らなかった日でも疲れを感じた日と、休んだと感じた日があり得ます。記録がないことを休養した証拠にはしません。",
   "Illustrative example: a day without running may be one when you felt tired or one when you felt rested. A missing run record does not establish that you rested."
  ]
 },
 "practice-warmup": {
  "question": [
   "走る前に何をして、走り始めにどう感じましたか？",
   "What did you do before running, and how did the start feel?"
  ],
  "insight": [
   "準備した行動と走り始めの感覚は別の情報です。",
   "Preparation and how the start of a run felt are distinct pieces of information."
  ],
  "review": [
   "覚えている準備の内容、走り始めの感覚、本人の運動前回答を別々に確認できます。",
   "Review the preparation you remember, how starting felt, and your before-exercise response separately."
  ],
  "limit": [
   "準備運動の効果や傷害予防、安全性は判定しません。",
   "The app does not judge the effects of warm-up, injury prevention or safety."
  ],
  "consider": [
   "準備の内容と走り始めの感覚で、覚えていることは何ですか？",
   "What do you remember about your preparation and how starting felt?"
  ],
  "sources": [],
  "example": [
   "観察例：歩いてから走り始めた日と、すぐに走り始めた日。走り始めの感覚を思い出し、距離や時間帯など異なった条件も見返せます。",
   "Observation example: a day when you walked before running and a day when you began running immediately. Recall how the start felt and other differing conditions, such as distance or time of day."
  ]
 },
 "practice-during": {
  "question": [
   "途中で速さや行動を変えた場面はありましたか？",
   "Did you change speed or what you were doing during the run?"
  ],
  "insight": [
   "行動を変えたことと、そのとき本人が考えた理由は別の情報です。",
   "Changing an action and your reason for doing so are distinct pieces of information."
  ],
  "review": [
   "速さを変えた場面、その前に感じたこと、覚えている理由を考えられます。",
   "Consider moments when you changed speed, what you felt beforehand, and the reason you remember."
  ],
  "limit": [
   "平均値から途中の判断や区間ペースは復元せず、判断の正しさを評価しません。",
   "Average values do not reconstruct mid-run decisions or segment pace, and decisions are not scored."
  ],
  "consider": [
   "速さを変える前に感じたことと、変えた理由は区別できますか？",
   "Can you distinguish what you felt before changing pace from why you changed it?"
  ],
  "sources": [],
  "example": [
   "観察例：交差点で止まった、坂道で速さを落とした、途中で予定を短くした。平均値だけではその判断の場面は分かりません。",
   "Observation examples: stopping at a crossing, slowing on a hill or shortening a planned run. An average alone does not capture those decisions."
  ]
 },
 "practice-after": {
  "question": [
   "走り終えた後に何をして、どう感じましたか？",
   "What did you do after the run, and how did you feel?"
  ],
  "insight": [
   "運動後に行ったことと疲労感の回答は別の情報です。",
   "Actions after exercise and a fatigue rating are separate pieces of information."
  ],
  "review": [
   "ストレッチなどの行動と、そのときや後から感じたことを覚えている範囲で区別できます。",
   "Distinguish actions such as stretching from what you felt then or later, as far as you remember."
  ],
  "limit": [
   "ストレッチの効果や筋肉痛の予防、回復は判定しません。",
   "The app does not determine stretching effects, soreness prevention or recovery."
  ],
  "consider": [
   "走り終えたときと、後から感じたことを区別できますか？",
   "Can you distinguish how you felt immediately after the run from how you felt later?"
  ],
  "sources": [],
  "example": [
   "観察例：走った直後に歩いたり、帰宅後にストレッチをしたりしたときの記憶。行動の時期とそのときの感覚を分けて振り返れます。",
   "Observation example: walking right after running or stretching after returning home. Recall the timing of the action separately from how you felt."
  ]
 },
 "practice-boundaries": {
  "question": [
   "中断したり変更したりしたとき、何を手掛かりにしましたか？",
   "What did you consider when stopping or changing a run?"
  ],
  "insight": [
   "中断したという行動と、そのとき本人が考えていた理由は別です。",
   "Stopping and the reason you considered at the time are distinct."
  ],
  "review": [
   "覚えている状況、感覚、本人の判断を分けて考えられます。",
   "Consider the situation, sensations and your decision separately."
  ],
  "limit": [
   "安全な運動強度、継続可否、判断の正しさは判定しません。",
   "The app does not judge safe intensity, whether to continue, or whether a decision was correct."
  ],
  "consider": [
   "何を手掛かりに中断や変更を決めたか、覚えている範囲で考えてみましょう。",
   "Consider what led you to stop or change the run, as far as you remember."
  ],
  "sources": [],
  "example": [
   "観察例：予定の距離を短くした日。数字だけでは、時間の都合、天候、感じ方のどれが理由だったのか分かりません。",
   "Observation example: a day when you shortened the planned distance. The numbers alone do not tell whether time, weather or how you felt was the reason."
  ]
 }
};
export const EXPLORE_GROUPS=[
 {
  "id": "A",
  "name": [
   "記録を読み解く",
   "Understanding records"
  ],
  "themes": [
   "A1",
   "A2",
   "A3"
  ],
  "accent": "#86d4df"
 },
 {
  "id": "B",
  "name": [
   "身体と感覚",
   "Body and sensations"
  ],
  "themes": [
   "B1",
   "B2",
   "B3"
  ],
  "accent": "#adc4ec"
 },
 {
  "id": "C",
  "name": [
   "走行条件と生活",
   "Running and daily context"
  ],
  "themes": [
   "C1",
   "C2",
   "C3",
   "C4"
  ],
  "accent": "#c6b6ed"
 },
 {
  "id": "D",
  "name": [
   "経験を振り返る",
   "Reflecting on your experience"
  ],
  "themes": [
   "D1",
   "D2"
  ],
  "accent": "#99dbbf"
 }
];
const labels=[
 [
  "記録を読み解く",
  "Understanding records"
 ],
 [
  "身体と感覚",
  "Body and sensations"
 ],
 [
  "走行条件と生活",
  "Running and daily context"
 ],
 [
  "経験を振り返る",
  "Reflecting on your experience"
 ],
 [
  "理解の手掛かり",
  "A way to understand"
 ],
 [
  "記録・経験を見返す",
  "Review your records and experience"
 ],
 [
  "参考文献・研究条件",
  "Sources and study context"
 ],
 [
  "読み取り上の注意",
  "Interpretation limits"
 ],
 [
  "観点を選ぶ",
  "Choose a perspective"
 ],
 [
  "4つの分野から探す",
  "Explore four areas"
 ],
 [
  "4つの分野",
  "4 areas"
 ],
 [
  "関連する記録あり",
  "Related records available"
 ],
 [
  "関連する記録の出所",
  "Source of related records"
 ],
 [
  "観察の視点",
  "Observation perspective"
 ],
 [
  "本人の経験を整理するための案内です。研究出典に基づく専門解説ではありません。",
  "A guide to reflecting on your own experience, not a research-based technical explanation."
 ],
 [
  "模式図：関節の位置を示します。負荷の強さを示すものではありません。",
  "Schematic: joint locations, not loading intensity."
 ],
 [
  "股関節",
  "Hip"
 ],
 [
  "膝関節",
  "Knee"
 ],
 [
  "足関節",
  "Ankle"
 ],
 [
  "進行方向",
  "Direction of travel"
 ],
 [
  "説明用の仮想例",
  "Hypothetical example"
 ],
 [
  "1kmごとの時間",
  "Time per kilometre"
 ],
 [
  "一定の配分",
  "Even pacing"
 ],
 [
  "変化する配分",
  "Variable pacing"
 ],
 [
  "平均 6分/km",
  "Average 6 min/km"
 ],
 [
  "自分の記録と照らす",
  "Relate to your records"
 ],
 [
  "記録がなくても利用できます。",
  "You can explore without records."
 ],
 [
  "上りの動き",
  "Uphill Movement"
 ],
 [
  "下りの動き",
  "Downhill Movement"
 ],
 [
  "上りで注目する例",
  "Things to notice uphill"
 ],
 [
  "下りで注目する例",
  "Things to notice downhill"
 ],
 [
  "股関節：上りでは、平坦より機械的なエネルギーを生み出す働きへの寄与が増えた実験結果があります。",
  "Hip: an experiment found a greater share of positive joint power uphill than on level ground."
 ],
 [
  "足関節：同じ実験では、上りでも身体を動かす正の関節仕事率に大きく寄与していました。",
  "Ankle: it continued to contribute substantially to positive joint power uphill."
 ],
 [
  "膝関節：急な下りでは、機械的なエネルギーを吸収する働きの大きさが増えた実験結果があります。",
  "Knee: an experiment found greater net negative joint power on steeper downhill slopes."
 ],
 [
  "脚を前に運ぶ感覚、お尻やふくらはぎの感じ方、歩幅や速さの変化。",
  "How moving your leg forward felt, sensations around the buttocks or calves, changes in step length or pace."
 ],
 [
  "着地から膝が曲がるとき、太ももの前側や膝周辺の感じ方、速度を調整した場面。",
  "Landing and knee flexion, sensations around the front of the thigh or knee, moments when you adjusted speed."
 ],
 [
  "特に違いがない場合や、分からない場合も含めて、覚えている範囲で考えられます。",
  "Consider what you remember, including no noticeable difference or uncertainty."
 ],
 [
  "脚の関節",
  "Leg joints"
 ],
 [
  "路面",
  "Surface"
 ],
 [
  "自分の走行記録を確認",
  "Review your run records"
 ],
 [
  "元の観点",
  "Original perspective"
 ],
 [
  "研究の参考",
  "Research background"
 ]
];
labels.push(
 ["計算の根拠","Calculation basis"], ["設計の参考文献","Design references"], ["文献参考値の根拠","Literature reference basis"],
 ["接地している脚","Leg in contact"], ["地面を離れた脚","Leg off the ground"], ["身体を支え、進む動きに関わる","Supports the body and contributes to motion"], ["次の接地へ向かう","Moves toward the next contact"], ["同じ脚の動きを考える模式図。関節角度や負荷を測定した図ではありません。","Schematic positions of the same leg, not measured joint angles or loads."],
 ["以前の考え","Earlier understanding"], ["新しい経験","New experience"], ["今の考え","Current understanding"],
 ["仮想例：23時に就床し7時に起床しても、その間ずっと眠っていたとは限りません。","Hypothetical example: going to bed at 11 pm and getting up at 7 am does not mean sleeping throughout that interval."],
 ["坂道のある日に疲れを強く感じた。","I felt especially tired on a hilly run."],
 ["別の日は坂道だけでなく距離や速さも違っていた。","On another day, distance and speed differed as well as the hills."],
 ["坂道以外の条件も関係しているかもしれない。","Other conditions besides the hills may matter."],
 ["本人が考えを更新する場合の仮想例。アプリが結論を作るものではありません。","Hypothetical example of revisiting one's own understanding. The app does not generate conclusions."],
 ["参照基準","Reference basis"],["本人の身体状態ではない","Not your bodily state"],
 ["100は安全・健康の基準ではありません。","100 is not a safety or health threshold."],
 ["読み取り上の注意","Interpretation limits"]
);
labels.push(["テーマを検索","Search topics"],["履歴で選ぶ","Select in History"],["指定された記録を安全に照合できません。ほかの走行の値で代用しません。","The selected record could not be verified. Other runs are not substituted."],["指定した元の走行記録を安全に照合できません。ほかの記録に自動で切り替えません。","The original run could not be verified. The app does not automatically switch to another record."],["元の走行記録を安全に照合できません。別の記録に自動で切り替えません。","The original run could not be verified. The app does not automatically switch to another record."],["走行 A","Run A"],["走行 B","Run B"],["後の回答は同じでも、前の回答は異なります。回答区分は実際の評価時刻を証明しません。","The after-exercise answers match but the before-exercise answers differ. Response categories do not establish the actual assessment time."],["就床から起床まで：8時間","Time in bed: 8 hours"],["実際に眠った時間：不明","Actual time asleep: unknown"],["準備","Preparation"],["運動後","After exercise"],["テーマを選ぶ","Choose a topic"],["腕・体幹","Arms & trunk"],["坂道","Hills"],["日々の調子","Daily condition"],["走る前","Before running"],["走行中","During running"],["走った後","After running"],["休養","Rest"],["中断・変更","Stop or adjust"],["分野とテーマを選ぶか、検索で探せます。淡い丸印は関連する記録があることを示し、枠線は選択中の項目です。記録と記述は任意です。個別の医学的判断は行いません。","Choose an area and topic, or search. A pale dot marks related records; an outline marks the selection. Recording and writing are optional. The app does not make individual medical judgments."]);
const pairs=[...labels,...Object.values(EXPLORE_THEMES).flatMap(t=>Object.entries(t).flatMap(([k,v])=>k==="sources"?v:v?[v]:[])),...Object.values(EXPLORE_VARIANTS).flatMap(t=>Object.entries(t).flatMap(([k,v])=>k==="sources"?v:v?[v]:[]))];
export const ENGLISH_EXPLORE_REDESIGN=Object.freeze(Object.fromEntries(pairs));
export function themeFor(category,topic){const link=EXPLORE_LEGACY[category+"|"+topic];return link?{...EXPLORE_THEMES[link.main],...(EXPLORE_VARIANTS[link.id]||{}),...link}:null;}
export function availableViews(categories){return Object.entries(EXPLORE_LEGACY).flatMap(([key,value])=>{const [category,topic]=key.split("|");return categories.some(c=>c.id===category&&c.topics.includes(topic))?[{category,topic,...value}]:[]});}
