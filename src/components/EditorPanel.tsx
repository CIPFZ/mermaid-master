import Editor, {OnMount} from '@monaco-editor/react';
import { Command, FilePlus, Save, Settings, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useCodeStore } from '../store/codeStore';
import { useAIStore } from '../store/aiStore'; // 1. 引入 AI store 用于打开设置

export const EditorPanel = () => {
    const { files, activeFileId, updateActiveCode } = useCodeStore();
    const { isCommandBarOpen, setCommandBarOpen, isGenerating, setSettingsOpen } = useAIStore(); // 确保获取 isGenerating
    const activeFile = files.find(f => f.id === activeFileId);
    const modelPath = activeFile?.path || activeFile?.id;

    // --- 空状态 (Empty State) ---
    if (!activeFile) {
        return (
            <div className="h-full w-full bg-[#1e1e1e] flex flex-col items-center justify-center select-none text-gray-400">
                <div className="mb-8 flex flex-col items-center opacity-50">
                    <div className="text-xl font-bold tracking-widest text-gray-300 mb-2">MERMAID MASTER</div>
                    <div className="text-xs">Next-Gen Graph Editor</div>
                </div>

                <div className="flex flex-col gap-4 text-sm w-72">
                    {/* ... 原有的快捷键列表 (New/Open/Save/Export) 保持不变 ... */}
                    <div className="flex items-center justify-between group"><div className="flex items-center gap-3"><FilePlus size={16} /><span>New File</span></div><span className="bg-[#2d2d2d] border border-[#3e3e3e] px-2 py-0.5 rounded text-xs font-mono text-gray-300 shadow-sm">Click +</span></div>
                    <div className="flex items-center justify-between group"><div className="flex items-center gap-3"><Command size={16} /><span>Open File</span></div><div className="flex gap-1"><span className="bg-[#2d2d2d] border border-[#3e3e3e] px-1.5 py-0.5 rounded text-xs font-mono text-gray-300 shadow-sm">Ctrl</span><span className="bg-[#2d2d2d] border border-[#3e3e3e] px-1.5 py-0.5 rounded text-xs font-mono text-gray-300 shadow-sm">O</span></div></div>
                    <div className="flex items-center justify-between group"><div className="flex items-center gap-3"><Save size={16} /><span>Save File</span></div><div className="flex gap-1"><span className="bg-[#2d2d2d] border border-[#3e3e3e] px-1.5 py-0.5 rounded text-xs font-mono text-gray-300 shadow-sm">Ctrl</span><span className="bg-[#2d2d2d] border border-[#3e3e3e] px-1.5 py-0.5 rounded text-xs font-mono text-gray-300 shadow-sm">S</span></div></div>

                    {/* --- 新增：Settings 入口 --- */}
                    <div className="mt-4 pt-4 border-t border-[#2b2b2b]">
                        <button
                            onClick={() => setSettingsOpen(true)}
                            className="flex items-center gap-3 hover:text-white transition-colors w-full group"
                        >
                            <Settings size={16} className="group-hover:rotate-45 transition-transform duration-300" />
                            <span>Settings</span>
                        </button>
                    </div>

                </div>
            </div>
        );
    }

    // 2. 定义 onMount 回调
    // 这里的 editor 是编辑器实例，monaco 是全局对象
    const handleEditorDidMount: OnMount = (editor, monaco) => {
        // 注册 Ctrl + K (Windows/Linux) 或 Cmd + K (Mac)
        // KeyMod.CtrlCmd 会自动适配系统
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
            const { isCommandBarOpen, setCommandBarOpen } = useAIStore.getState(); // 获取最新状态
            setCommandBarOpen(!isCommandBarOpen);
        });

        // 顺手把 Ctrl + S 也注入进去，防止 Monaco 偶尔拦截保存
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            // 这里需要调用保存逻辑，但由于闭包问题，直接触发 DOM 事件最稳妥
            // 或者引入 saveFile 方法调用
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
        });
    };

    // --- 编辑器状态 (Active State) ---
    return (
        <div className="h-full w-full bg-[#1e1e1e] flex flex-col">

            {/* Editor Container (占满剩余空间) */}
            <div className="flex-1 overflow-hidden relative">
                <Editor
                    height="100%"
                    defaultLanguage="markdown"
                    theme="vs-dark"
                    path={modelPath}
                    value={activeFile.code}
                    onChange={(value) => updateActiveCode(value || '')}
                    onMount={handleEditorDidMount}
                    loading={<div className="text-gray-500 text-xs p-4">Initializing Core...</div>}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        padding: { top: 16, bottom: 16 }, // 增加底部内边距
                        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                        renderLineHighlight: 'none', //更干净的视图
                        // 生成时开启只读模式
                        readOnly: isGenerating,
                        // 可选：把光标改成“禁止”样式，但 Monaco 原生 readOnly 已经有提示了
                        domReadOnly: isGenerating,
                    }}
                />

                {/* 🌟 视觉增强：加一个覆盖层，让编辑器变暗，提示不可编辑 🌟 */}
                {isGenerating && (
                    <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] z-10 pointer-events-none flex items-center justify-center">
                        <div className="bg-[#1e1e1e] border border-blue-500/30 text-blue-400 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-mono animate-pulse">
                            <Sparkles size={12} />
                            <span>AI Writing...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* --- 新增：极简状态栏 (Status Bar) --- */}
            <div
                className="h-7 bg-[#1e1e1e] border-t border-[#2b2b2b] flex items-center justify-between px-3 shrink-0 select-none">
                {/* 左侧：文件信息 */}
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                    <span className={clsx("transition-colors", activeFile.isDirty ? "text-yellow-500" : "")}>
                       {activeFile.isDirty ? "Unsaved*" : "Saved"}
                    </span>
                </div>

                {/* 右侧：工具栏 */}
                <div className="flex items-center">
                    {/* AI Edit 按钮 */}
                    <button
                        // 拦截 mousedown，阻止冒泡，防止触发 CommandBar 的“点击外部关闭”逻辑
                        onMouseDown={(e) => {
                            e.preventDefault(); // 防止抢走编辑器的焦点
                            e.stopPropagation(); // 🔥 核心修复：阻止事件冒泡到 document
                        }}

                        // 2. 修复逻辑：取反 (!isCommandBarOpen) 实现开关切换
                        onClick={() => {
                            console.log("is commandbar open: ", isCommandBarOpen)
                            setCommandBarOpen(!isCommandBarOpen)
                        }}

                        disabled={isGenerating}
                        // 3. 视觉优化：根据状态切换样式
                        className={clsx(
                            "flex items-center gap-1.5 px-2 py-0.5 rounded transition-all text-[11px] font-medium border",
                            isGenerating ? "opacity-50 cursor-not-allowed text-gray-500 border-transparent" : (
                                isCommandBarOpen
                                    ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                                    : "border-transparent text-gray-400 hover:text-white hover:bg-[#252526]"
                            )
                        )}
                        title="Toggle AI Command (Ctrl+K)"
                    >
                        {/* 图标也稍微加点特效 */}
                        <Sparkles
                            size={12}
                            className={clsx(
                                "transition-colors",
                                isCommandBarOpen ? "text-purple-400 fill-purple-400/20" : "text-purple-400"
                            )}
                        />
                        <span>AI Edit</span>
                    </button>

                    <button
                        onClick={() => setSettingsOpen(true)}
                        disabled={isGenerating}
                        className="p-1 text-gray-500 hover:text-gray-300 transition-colors rounded hover:bg-[#252526] group"
                        title="Settings"
                    >
                        {/* Hover 时图标轻轻转动，增加精致感 */}
                        <Settings size={14} className="group-hover:rotate-45 transition-transform duration-300" />
                    </button>
                </div>
            </div>
        </div>
    );
};