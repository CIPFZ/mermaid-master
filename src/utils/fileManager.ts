import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { save, open } from '@tauri-apps/plugin-dialog';
import { MermaidFile, useCodeStore } from '../store/codeStore';

export const saveFile = async () => {
    const { files, activeFileId, setFilePath, markSaved } = useCodeStore.getState();

    const activeFile = files.find(f => f.id === activeFileId);
    if (!activeFile) return;

    // 🛡️ 防抖检测
    if (activeFile.path && !activeFile.isDirty) {
        return;
    }

    try {
        // 这里 savePath 类型推断为: string | undefined
        let savePath = activeFile.path;

        // 1. 如果是新文件，弹出 "另存为" 对话框
        if (!savePath) {
            // 🔥 修复点：使用临时变量 selectedPath 接收结果 (string | null)
            const selectedPath = await save({
                filters: [{ name: 'Mermaid Files', extensions: ['mmd', 'mermaid'] }],
                defaultPath: activeFile.name,
            });

            // 如果用户取消了 (selectedPath 为 null)，直接返回
            if (!selectedPath) return;

            // 此时 selectedPath 确定是 string，可以安全赋值
            savePath = selectedPath;

            // 提取文件名并更新 Store
            const fileName = savePath.split(/[/\\]/).pop() || 'Untitled.mmd';
            setFilePath(activeFile.id, savePath, fileName);
        }

        // 2. 写入硬盘
        // 经过上面的逻辑，savePath 此时必然是 string (因为如果 undefined 会进入 if 分支被赋值，如果 null 会 return)
        if (savePath) {
            await writeTextFile(savePath, activeFile.code);
            markSaved(activeFile.id);
        }
    } catch (error) {
        console.error('Failed to save file:', error);
        alert('Failed to save file: ' + error);
    }
};

export const openFile = async () => {
    try {
        const selectedPath = await open({
            multiple: false,
            filters: [{ name: 'Mermaid Files', extensions: ['mmd', 'mermaid', 'txt'] }],
        });

        if (!selectedPath) return;

        // Tauri v2 open() 返回 string | string[] | null
        const filePath = selectedPath as string;

        let content = await readTextFile(filePath);

        // 清洗旧数据的 Token (Legacy Support)
        const legacyToken = '%% MERMAID_MASTER_LAYOUT=';
        if (content.includes(legacyToken)) {
            content = content.split(legacyToken)[0].trim();
        }

        const fileName = filePath.split(/[/\\]/).pop() || 'Unknown.mmd';

        const newFile: MermaidFile = {
            id: crypto.randomUUID(),
            name: fileName,
            path: filePath,
            code: content,
            isDirty: false
        };

        useCodeStore.getState().openFileInTab(newFile);

    } catch (error) {
        console.error('Failed to open file:', error);
        alert('Failed to open file: ' + error);
    }
};