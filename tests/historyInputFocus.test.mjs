import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {HISTORY_STYLES} from "../ui/historyInlineStyles.js";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const styles=HISTORY_STYLES;
const history=read("ui/historyExperience.js");
const app=read("app.js");
const html=read("index.html");

test("history bundled shadow styles set mobile editable fields to 16px",()=>{
 assert.match(read("ui/historyExperience.js"),/data-history-inline-styles/);
 assert.match(styles,/@media\(max-width:800px\)\{[^}]*#hx-search/);
 assert.match(styles,/#hx-search[^}]*font-size:16px!important/);
 assert.match(app,/historyExperience\.js\?v=20261110-p14-visual-v4/);
 assert.match(html,/mobileInputFocus\.css\?v=20261026-ios-input-v25/);
});
test("typing in history retains a single focused field, not repeated draw and focus",()=>{
 const handler=history.slice(history.lastIndexOf("root.addEventListener('input'"),history.lastIndexOf('\n });')+5);
 assert.ok(handler.includes("event.target.value"));
 assert.ok(handler.includes("template.content.querySelector('.list-panel')"));
 assert.ok(handler.includes("previous.replaceWith(replacement)"));
 assert.ok(!handler.includes("input?.focus()"));
 assert.ok(!handler.includes("window.scrollTo"));
 assert.ok(!handler.includes("draw()"));
});
