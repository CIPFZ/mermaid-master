import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'; // 1. 引入持久化中间件

export interface MermaidFile {
    id: string;
    name: string;
    code: string;
    path?: string;
    isDirty: boolean;
}

// 定义支持的主题
export type MermaidTheme = 'default' | 'neutral' | 'dark' | 'forest' | 'base';

interface CodeState {
    files: MermaidFile[];
    activeFileId: string | null;
    // 图表主题
    chartTheme: MermaidTheme;
    // ... Actions ...
    createFile: () => void;
    closeFile: (id: string) => void;
    selectFile: (id: string) => void;
    updateActiveCode: (newCode: string) => void;
    setFilePath: (id: string, path: string, name: string) => void;
    markSaved: (id: string) => void;
    openFileInTab: (fileObj: MermaidFile) => void;
    // 🔥 新增 setter 🔥
    setChartTheme: (theme: MermaidTheme) => void;
}

const DEFAULT_CODE = `graph TD
  A[Start] --> B{Is it working?}
  B -- Yes --> C[Great!]
  B -- No --> D[Debug]`;

// 2. 使用 persist 包裹
export const useCodeStore = create<CodeState>()(
    persist(
        (set, get) => ({
            // 3. 初始状态改为空！
            // 这样第一次启动（或清空缓存后）会显示你的“帮助/快捷键”页面
            // 如果 localStorage 有数据，Zustand 会自动覆盖这里
            files: [],
            activeFileId: null,
            chartTheme: 'dark',
            setChartTheme: (theme) => set({ chartTheme: theme }),

            createFile: () => {
                const newFile: MermaidFile = {
                    id: crypto.randomUUID(),
                    name: `Untitled-${get().files.length + 1}.mmd`,
                    code: DEFAULT_CODE, // 使用默认模板
                    isDirty: true,      // 新文件默认脏
                };
                set((state) => ({
                    files: [...state.files, newFile],
                    activeFileId: newFile.id,
                }));
            },

            closeFile: (id) => {
                set((state) => {
                    const newFiles = state.files.filter((f) => f.id !== id);
                    let newActiveId = state.activeFileId;
                    // 如果关闭的是当前激活的，切换到临近的一个
                    if (id === state.activeFileId) {
                        newActiveId = newFiles.length > 0 ? newFiles[newFiles.length - 1].id : null;
                    }
                    return { files: newFiles, activeFileId: newActiveId };
                });
            },

            selectFile: (id) => set({ activeFileId: id }),

            updateActiveCode: (newCode) => {
                set((state) => {
                    const activeFile = state.files.find(f => f.id === state.activeFileId);
                    if (!activeFile) return state;
                    if (activeFile.code === newCode) return state; // 防抖

                    return {
                        files: state.files.map((f) => {
                            if (f.id === state.activeFileId) {
                                return { ...f, code: newCode, isDirty: true };
                            }
                            if (activeFile.path && f.path === activeFile.path) {
                                return { ...f, code: newCode, isDirty: true };
                            }
                            return f;
                        }),
                    };
                });
            },

            setFilePath: (id, path, name) => {
                set((state) => ({
                    files: state.files.map((f) =>
                        f.id === id ? { ...f, path, name, isDirty: false } : f
                    ),
                }));
            },

            markSaved: (id) => {
                set((state) => {
                    const targetFile = state.files.find(f => f.id === id);
                    const targetPath = targetFile?.path;
                    return {
                        files: state.files.map((f) => {
                            if (f.id === id) return { ...f, isDirty: false };
                            if (targetPath && f.path === targetPath) {
                                return { ...f, isDirty: false, code: targetFile?.code || '' };
                            }
                            return f;
                        }),
                    };
                });
            },

            openFileInTab: (newFile) => {
                set((state) => {
                    const existingFile = state.files.find(f => f.path === newFile.path);
                    if (existingFile) return { activeFileId: existingFile.id };

                    // 这里的逻辑可以保留：如果是唯一的空 Untitled，则替换
                    // 但因为现在允许空 files，所以直接 push 更好
                    return {
                        files: [...state.files, newFile],
                        activeFileId: newFile.id
                    };
                });
            },
        }),
        {
            name: 'mermaid-master-session', // localStorage key
            storage: createJSONStorage(() => localStorage), // 指定存储引擎
            // 可选：只持久化部分字段，比如 files 和 activeFileId
            partialize: (state) => ({ files: state.files, activeFileId: state.activeFileId }),
        }
    )
);