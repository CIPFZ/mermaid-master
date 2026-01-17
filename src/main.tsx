import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// 1. 定义 Worker 环境
self.MonacoEnvironment = {
    getWorker(_, label) {
        if (label === 'json') {
            return new jsonWorker();
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
            return new cssWorker();
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return new htmlWorker();
        }
        if (label === 'typescript' || label === 'javascript') {
            return new tsWorker();
        }
        return new editorWorker();
    },
};

// 2. 告诉 react-monaco-editor 使用我们本地安装的 monaco 实例，而不是去下载
loader.config({ monaco });

// --- 新增: 生产环境禁用右键菜单 ---
// 逻辑: 只有在非开发环境 (!import.meta.env.DEV) 下，
// 且点击的目标不是 Input/Textarea 时，才禁用默认菜单。
// if (!import.meta.env.DEV) {
//     document.addEventListener('contextmenu', (event) => {
//         const target = event.target as HTMLElement;
//         // 允许原生输入框使用右键菜单 (复制/粘贴)
//         if (['INPUT', 'TEXTAREA'].includes(target.tagName)) {
//             return;
//         }
//         // 禁用默认的浏览器右键菜单
//         event.preventDefault();
//     });
// }

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
