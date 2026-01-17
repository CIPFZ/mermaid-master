import { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowUp, Square } from 'lucide-react';
import { useAIStore } from '../store/aiStore';
import { useCodeStore } from '../store/codeStore';
import { streamChatCompletion } from '../utils/aiService';

export const CommandBar = () => {
    const { isCommandBarOpen, setCommandBarOpen, provider, setGenerating } = useAIStore();
    const { activeFileId, files, updateActiveCode } = useCodeStore();

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // 引用 AbortController，用于中断请求
    const abortControllerRef = useRef<AbortController | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isCommandBarOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isCommandBarOpen]);

    // 监听点击外部关闭
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                // 生成时，点击外部也不许关闭
                const { isGenerating } = useAIStore.getState();
                if (isGenerating) return;

                if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                    setCommandBarOpen(false);
                }
            }
        };
        if (isCommandBarOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isCommandBarOpen, setCommandBarOpen]);

    // 监听 ESC 关闭
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                const { isGenerating } = useAIStore.getState();

                if (isGenerating) {
                    // 正在生成，无视 Esc (或者在这里调用 handleStop() 如果你改变主意想让它中断)
                    console.log("Esc ignored during generation");
                    return;
                }

                // 只有空闲时，Esc 才关闭窗口
                setCommandBarOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setCommandBarOpen]);

    // 停止生成的方法
    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort(); // 杀掉网络请求
            abortControllerRef.current = null;
        }
        setIsLoading(false);
        setGenerating(false); // 解锁编辑器
    };

    const handleExecute = async () => {
        // ... 逻辑保持不变 ...
        if (!input.trim() || isLoading) return;
        if (!provider.apiKey) {
            alert('Please configure API Key in Settings first (Ctrl+,)');
            return;
        }

        const activeFile = files.find(f => f.id === activeFileId);
        if (!activeFile) return;

        // 1. 设置状态
        setIsLoading(true);
        setGenerating(true);
        // 2. 创建中断控制器
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const originalCode = activeFile.code;
        let newGeneratedCode = '';

        try {
            const messages = [
                {
                    role: 'user' as const,
                    content: `Requirement: ${input}. \nOutput the FULL updated Mermaid code based on the current code.`
                }
            ];

            // 3. 传入 signal
            const stream = streamChatCompletion(messages, provider, originalCode, controller.signal);

            for await (const chunk of stream) {
                newGeneratedCode += chunk;

                // --- 更加智能的清洗逻辑 ---
                let cleanCode = newGeneratedCode;

                // 1. 去掉开头的 ```mermaid 或 ``` (忽略大小写)
                // 这里的正则意思是：匹配开头的 ```，后面可选跟 mermaid，再后面可选跟换行
                cleanCode = cleanCode.replace(/^```(mermaid)?\s*\n?/i, '');

                // 2. 去掉结尾的 ```
                // 这里的正则意思是：匹配字符串末尾的 ```，以及之前可能的空白
                cleanCode = cleanCode.replace(/```\s*$/, '');

                // 3. 只有当代码有实际内容时才更新，避免开头闪烁
                if (cleanCode.trim().length > 0) {
                    updateActiveCode(cleanCode);
                }
            }

            // 成功完成后
            // setCommandBarOpen(false);
            setInput('');
            inputRef.current?.focus();

        } catch (error: any) {
            console.log(error)
            if (error === 'Request canceled') {
                console.log('AI Generation Aborted by User');
                // 中断不回滚，保留 AI 写了一半的代码（用户可能觉得写了一半的也挺好）
                // 或者你可以选择回滚 updateActiveCode(originalCode);
            } else {
                console.error(error);
                alert('AI Execution Failed');
                // updateActiveCode(originalCode); // 错误回滚
            }
        } finally {
            setIsLoading(false);
            setGenerating(false); // 解锁编辑器
            abortControllerRef.current = null;
        }
    };

    if (!isCommandBarOpen) return null;

    return (
        // 1. 外层容器：去掉背景色和模糊，使用 flex 布局定位到底部
        // pointer-events-none 确保点击空白处穿透（虽然我们加了 click outside 监听，但这样更保险）
        <div className="fixed inset-0 z-200 flex items-end justify-center pb-12 pointer-events-none">

            {/* 2. Bar 本体：恢复指针事件，添加 slide-in 动画 */}
            <div
                ref={containerRef}
                className="w-150 bg-[#1e1e1e]/90 backdrop-blur-xl border border-[#3e3e3e] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200 pointer-events-auto ring-1 ring-white/10"
            >

                {/* Input Area */}
                <div className="relative flex items-center px-4 h-14">
                    <Sparkles className={`w-5 h-5 mr-3 ${isLoading ? 'text-blue-400 animate-pulse' : 'text-blue-400'}`} />

                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                        placeholder={isLoading ? "AI is rewriting your diagram..." : "Ask AI to edit... (e.g. 'Make it horizontal')"}
                        disabled={isLoading}
                        className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 text-lg h-full"
                    />

                    {isLoading ? (
                        // 显示停止按钮
                        <button
                            onClick={handleStop}
                            className="bg-red-500/20 hover:bg-red-500/40 text-red-400 p-1.5 rounded transition-colors group"
                            title="Stop Generation (Esc)"
                        >
                            <Square size={14} fill="currentColor" className="group-hover:scale-110 transition-transform" />
                        </button>
                    ) : (
                        <button onClick={handleExecute} className="...">
                            <ArrowUp size={18} />
                        </button>
                    )}
                </div>

                {/* 极简 Footer: 只有 Loading 时或有内容时才显示，保持轻量 */}
                {(!isLoading && input.length > 0) && (
                    <div className="bg-[#252526]/50 px-4 py-1.5 flex items-center justify-between border-t border-white/5">
                        <div className="flex gap-2 text-[10px] text-gray-500 font-mono">
                            <span className="bg-[#333] px-1 rounded text-gray-300">Enter</span> to execute
                            <span className="bg-[#333] px-1 rounded text-gray-300">Esc</span> to cancel
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};