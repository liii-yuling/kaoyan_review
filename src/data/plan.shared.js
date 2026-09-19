/*!
 * plan.shared.js —— 共享每日计划（运营者写，使用者看）
 *
 * 本文件由「运营台 → 每日计划 → 导出计划文件」自动生成。
 * 生成时间：2026-09-19 08:39:06
 * 天数：1　任务数：3
 *
 * 覆盖项目里的 src/data/plan.shared.js，然后双击「发布.cmd」并上传 dist，
 * 她刷新页面即可看到今天的任务并在页面上打勾。她的打勾进度存在她自己浏览器里。
 *
 * 格式规范见 SCHEMA.md 第 11 节。手改也行，但不建议。
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});

  KY.sharedPlan = {
    "updatedAt": "2026-09-19 08:39:06",
    "note": "",
    "plans": [
      {
        "id": "plan-2026-09-19",
        "date": "2026-09-19",
        "dayIndex": 1,
        "title": "2026-09-19",
        "tasks": [
          {
            "id": "t7a4s",
            "seq": 0,
            "text": "线性代数第五、六讲",
            "kind": "plain",
            "subject": "",
            "points": [],
            "count": 0,
            "paperId": "",
            "paperTitle": "",
            "estMin": 150,
            "inferred": false,
            "issues": []
          },
          {
            "id": "t1094",
            "seq": 0,
            "text": "英语19年真题阅读部分",
            "kind": "practice",
            "subject": "english1",
            "points": [],
            "count": 0,
            "paperId": "",
            "paperTitle": "",
            "estMin": 90,
            "inferred": true,
            "issues": [
              "没识别出具体考点，她会看到任务但点「去刷题」只能按整科推题"
            ]
          },
          {
            "id": "tga0s",
            "seq": 0,
            "text": "政治视频",
            "kind": "practice",
            "subject": "politics",
            "points": [],
            "count": 0,
            "paperId": "",
            "paperTitle": "",
            "estMin": 60,
            "inferred": true,
            "issues": [
              "没识别出具体考点，她会看到任务但点「去刷题」只能按整科推题"
            ]
          }
        ]
      }
    ]
  };

  KY.sharedPlanMeta = {
    "builtAt": "2026-09-19 08:39:06",
    "dayCount": 1,
    "taskCount": 3,
    "withDateCount": 1,
    "source": "console"
  };
})(window);
