/*!
 * plan.shared.js —— 共享每日计划（运营者写，使用者看）
 *
 * 本文件由「运营台 → 每日计划 → 导出计划文件」自动生成。
 * 生成时间：2026-09-17 09:08:21
 * 天数：1　任务数：4
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
    "updatedAt": "2026-09-17 09:08:21",
    "note": "",
    "plans": [
      {
        "id": "plan-2026-09-17",
        "date": "2026-09-17",
        "dayIndex": 1,
        "title": "2026-09-17",
        "tasks": [
          {
            "id": "taxjc",
            "seq": 0,
            "text": "数学 线性代数复习第5讲",
            "kind": "practice",
            "subject": "math1",
            "points": [],
            "count": 0,
            "paperId": "",
            "paperTitle": "",
            "estMin": 120,
            "inferred": true,
            "issues": [
              "没识别出具体考点，她会看到任务但点「去刷题」只能按整科推题"
            ]
          },
          {
            "id": "t7s",
            "seq": 0,
            "text": "英语 21年四篇阅读题目做完并核对答案",
            "kind": "practice",
            "subject": "english1",
            "points": [],
            "count": 0,
            "paperId": "",
            "paperTitle": "",
            "estMin": 90,
            "inferred": true,
            "issues": [
              "指定的套卷 id「en1-2021」在题库里找不到",
              "没识别出具体考点，她会看到任务但点「去刷题」只能按整科推题"
            ]
          },
          {
            "id": "tds7c",
            "seq": 0,
            "text": "英语 单词背诵",
            "kind": "practice",
            "subject": "english1",
            "points": [],
            "count": 0,
            "paperId": "",
            "paperTitle": "",
            "estMin": 30,
            "inferred": true,
            "issues": [
              "没识别出具体考点，她会看到任务但点「去刷题」只能按整科推题"
            ]
          },
          {
            "id": "thvmw",
            "seq": 0,
            "text": "政治 观看史纲部分视频",
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
    "builtAt": "2026-09-17 09:08:21",
    "dayCount": 1,
    "taskCount": 4,
    "withDateCount": 1,
    "source": "console"
  };
})(window);
