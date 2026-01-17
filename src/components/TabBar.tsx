import { useCodeStore } from '../store/codeStore';
import { X, Plus, FileCode } from 'lucide-react';
import clsx from 'clsx';
import { useRef } from 'react';

export const TabBar = () => {
    const { files, activeFileId, selectFile, closeFile, createFile } = useCodeStore();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleWheel = (e: React.WheelEvent) => {
        if (scrollContainerRef.current) {
            if (!e.shiftKey && e.deltaY !== 0) {
                scrollContainerRef.current.scrollLeft += e.deltaY;
            }
        }
    };

    return (
        <div className="flex items-center bg-[#1e1e1e] border-b border-[#2b2b2b] h-9">
            {/* Tab List Container */}
            <div
                ref={scrollContainerRef}
                onWheel={handleWheel}
                className="flex h-full flex-1 custom-scrollbar"
            >
                {files.map((file) => (
                    <div
                        key={file.id}
                        onClick={() => selectFile(file.id)}
                        className={clsx(
                            "group flex items-center gap-2 px-3 min-w-[120px] max-w-[200px] text-xs cursor-pointer border-r border-[#2b2b2b] select-none transition-colors flex-shrink-0",
                            file.id === activeFileId
                                ? "bg-[#1e1e1e] text-white border-t-2 border-t-blue-500"
                                : "bg-[#2d2d2d] text-gray-400 hover:bg-[#252526]"
                        )}
                    >
                        {/* 图标：未保存时可以用黄色/白色提示，这里保持统一 */}
                        <FileCode size={14} className={clsx("flex-shrink-0 transition-opacity", file.isDirty ? "opacity-100 text-yellow-500" : "opacity-70")} />

                        <span className={clsx("truncate flex-1", file.isDirty && "text-yellow-100")}>
              {file.name}
            </span>

                        {/* --- 状态指示器区域 (VS Code 风格) --- */}
                        <div className="w-5 h-5 flex items-center justify-center relative">

                            {/* 1. 未保存标识 (实心圆点) */}
                            {file.isDirty && (
                                <div className="w-2 h-2 rounded-full bg-white group-hover:hidden transition-all" />
                            )}

                            {/* 2. 关闭按钮 (X) */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeFile(file.id);
                                }}
                                className={clsx(
                                    "hover:bg-slate-600 rounded p-0.5 transition-all absolute",
                                    // 逻辑核心：
                                    // 如果是 Dirty: 默认隐藏(hidden)，Hover时显示(group-hover:block)
                                    // 如果是 Clean: 默认透明(opacity-0)，Hover时可见(group-hover:opacity-100)
                                    file.isDirty
                                        ? "hidden group-hover:block"
                                        : "opacity-0 group-hover:opacity-100"
                                )}
                            >
                                <X size={12} />
                            </button>
                        </div>

                    </div>
                ))}
            </div>

            {/* Add Button */}
            <button
                onClick={createFile}
                className="h-full w-9 shrink-0 hover:bg-[#2d2d2d] text-gray-400 hover:text-white transition-colors flex items-center justify-center bg-[#1e1e1e] border-l border-[#2b2b2b] z-10 shadow-[-5px_0_10px_rgba(0,0,0,0.2)]"
                title="New File"
            >
                <Plus size={16} />
            </button>
        </div>
    );
};