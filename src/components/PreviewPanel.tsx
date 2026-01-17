import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useCodeStore, MermaidTheme } from '../store/codeStore';
import { AlertTriangle, ZoomIn, ZoomOut, RotateCcw, Maximize, Download, Image as ImageIcon, Palette } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import clsx from 'clsx';

export const PreviewPanel = () => {
    // 获取主题状态和设置方法
    const { activeFileId, files, chartTheme, setChartTheme } = useCodeStore();
    const containerRef = useRef<HTMLDivElement>(null);

    // 用于存储渲染后的 SVG HTML
    const [svgHtml, setSvgHtml] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [isThemeMenuOpen, setThemeMenuOpen] = useState(false); // 控制主题菜单显示

    const activeFile = files.find(f => f.id === activeFileId);
    const codeToRender = activeFile?.code || '';

    // 支持的主题列表
    const themes: MermaidTheme[] = ['dark', 'default', 'neutral', 'forest', 'base'];

    // 🔥 核心逻辑：当 chartTheme 变化时，重新初始化 Mermaid 🔥
    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: chartTheme, // 使用 store 里的动态主题
            securityLevel: 'loose',
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            flowchart: { htmlLabels: false },
            sequence: { useMaxWidth: false },
        });

        // 主题改变时强制重绘
        renderChart();
    }, [chartTheme]);

    // 监听代码变化重绘
    useEffect(() => {
        renderChart();
    }, [codeToRender]);

    const renderChart = async () => {
        if (!codeToRender) {
            setSvgHtml('');
            setError(null);
            return;
        }

        try {
            const id = `mermaid-${Date.now()}`;
            const { svg } = await mermaid.render(id, codeToRender);
            setSvgHtml(svg);
            setError(null);
        } catch (err: any) {
            console.error('Mermaid Render Error:', err);
            setError(err.message || 'Syntax Error');
        }
    };

    // 🔥 导出功能 (包含主题背景色逻辑) 🔥
    const handleExport = async (format: 'png' | 'svg') => {
        const svgElement = containerRef.current?.querySelector('svg');
        if (!svgElement || !activeFile) return;

        try {
            const suggestedName = activeFile.name.replace('.mmd', '') + `.${format}`;
            const filePath = await save({
                defaultPath: suggestedName,
                filters: [{ name: format.toUpperCase(), extensions: [format] }]
            });

            if (!filePath) return;

            if (format === 'svg') {
                await writeTextFile(filePath, svgHtml);
            } else {
                // --- PNG 导出 ---
                const clonedSvg = svgElement.cloneNode(true) as SVGElement;
                const box = svgElement.getBoundingClientRect();
                const originalWidth = box.width;
                const originalHeight = box.height;

                // 高清放大倍数
                const scaleFactor = 4;
                const width = originalWidth * scaleFactor;
                const height = originalHeight * scaleFactor;

                clonedSvg.setAttribute('width', `${width}px`);
                clonedSvg.setAttribute('height', `${height}px`);
                clonedSvg.style.maxWidth = 'none';

                const serializer = new XMLSerializer();
                const highResSvgString = serializer.serializeToString(clonedSvg);

                const img = new Image();
                img.crossOrigin = 'Anonymous';
                const base64Svg = btoa(unescape(encodeURIComponent(highResSvgString)));
                img.src = `data:image/svg+xml;base64,${base64Svg}`;

                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;

                    // 🔥 智能背景色填充 🔥
                    // 如果是暗色主题，背景填深色；如果是亮色主题，背景填白色
                    ctx.fillStyle = chartTheme === 'dark' ? '#1e1e1e' : '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(async (blob) => {
                        if (!blob) return;
                        const arrayBuffer = await blob.arrayBuffer();
                        await writeFile(filePath, new Uint8Array(arrayBuffer));
                        alert('Export Successful!');
                    }, 'image/png');
                };

                img.onerror = (e) => {
                    console.error("Image export failed", e);
                    alert("Failed to render PNG.");
                };
            }
        } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed: ' + err);
        }
    };

    if (!activeFile) {
        return (
            <div className="h-full w-full bg-[#1e1e1e] flex items-center justify-center text-gray-500 text-sm select-none">
                <div className="flex flex-col items-center gap-2 opacity-50">
                    <Maximize size={48} />
                    <span>No Diagram to Preview</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-[#1e1e1e] relative overflow-hidden flex flex-col select-none">

            {/* 1. 画布背景点阵 */}
            <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: 'radial-gradient(#4a4a4a 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            />

            <TransformWrapper
                initialScale={1}
                minScale={0.2}
                maxScale={4}
                centerOnInit={true}
                wheel={{ step: 0.1 }}
                onTransformed={(e) => setScale(e.state.scale)}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        {/* 2. 悬浮工具栏 */}
                        <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
                            <div className="bg-[#2d2d2d] border border-[#3e3e3e] rounded-lg shadow-xl p-1.5 flex flex-col gap-1">
                                {/* 缩放控制 */}
                                <button
                                    onClick={() => zoomIn()}
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-[#3e3e3e] rounded transition-colors"
                                    title="Zoom In (+)"
                                >
                                    <ZoomIn size={18} />
                                </button>
                                <button
                                    onClick={() => zoomOut()}
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-[#3e3e3e] rounded transition-colors"
                                    title="Zoom Out (-)"
                                >
                                    <ZoomOut size={18} />
                                </button>
                                <button
                                    onClick={() => resetTransform()}
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-[#3e3e3e] rounded transition-colors border-t border-[#3e3e3e] mt-1 pt-2"
                                    title="Reset View"
                                >
                                    <RotateCcw size={18} />
                                </button>

                                <div className="h-px bg-[#3e3e3e] my-0.5 mx-1" />

                                {/* 🔥 主题切换按钮 🔥 */}
                                <div className="relative">
                                    <button
                                        onClick={() => setThemeMenuOpen(!isThemeMenuOpen)}
                                        className={clsx(
                                            "p-1.5 rounded transition-colors group relative w-full flex justify-center",
                                            isThemeMenuOpen ? "bg-purple-500/20 text-purple-400" : "text-purple-400 hover:text-white hover:bg-purple-600"
                                        )}
                                        title="Change Theme"
                                    >
                                        <Palette size={18} />
                                    </button>

                                    {/* 主题下拉菜单 */}
                                    {isThemeMenuOpen && (
                                        <div className="absolute right-full top-0 mr-2 bg-[#2d2d2d] border border-[#3e3e3e] rounded-lg shadow-xl overflow-hidden min-w-[100px] flex flex-col z-[60]">
                                            {themes.map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => {
                                                        setChartTheme(t);
                                                        setThemeMenuOpen(false);
                                                    }}
                                                    className={clsx(
                                                        "px-3 py-2 text-xs text-left capitalize hover:bg-[#3e3e3e] transition-colors",
                                                        chartTheme === t ? "text-blue-400 font-bold bg-[#333]" : "text-gray-400"
                                                    )}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="h-px bg-[#3e3e3e] my-0.5 mx-1" />

                                {/* 导出按钮 (已移除文字角标) */}
                                <button
                                    onClick={() => handleExport('png')}
                                    className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 rounded transition-colors"
                                    title="Export PNG"
                                >
                                    <ImageIcon size={18} />
                                </button>

                                <button
                                    onClick={() => handleExport('svg')}
                                    className="p-1.5 text-green-400 hover:text-white hover:bg-green-600 rounded transition-colors"
                                    title="Export SVG"
                                >
                                    <Download size={18} />
                                </button>
                            </div>

                            {/* 比例显示 */}
                            <div className="bg-[#1e1e1e]/80 backdrop-blur border border-[#3e3e3e] rounded px-2 py-1 text-[10px] text-gray-400 text-center font-mono">
                                {Math.round(scale * 100)}%
                            </div>
                        </div>

                        {/* 3. 可交互画布区域 */}
                        <TransformComponent
                            wrapperClass="w-full h-full"
                            contentClass="w-full h-full"
                            wrapperStyle={{ width: "100%", height: "100%" }}
                        >
                            {/* 🔥 动态背景色：暗色主题透明，亮色主题白底 🔥 */}
                            <div
                                className={clsx(
                                    "w-full h-full flex items-center justify-center min-w-max min-h-max p-20 transition-colors duration-300",
                                    chartTheme === 'dark' ? "bg-transparent" : "bg-white/95"
                                )}
                            >
                                {svgHtml ? (
                                    <div
                                        ref={containerRef}
                                        dangerouslySetInnerHTML={{ __html: svgHtml }}
                                        className="mermaid-svg-container"
                                    />
                                ) : (
                                    <div className="text-gray-600 text-sm animate-pulse">Rendering...</div>
                                )}
                            </div>
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>

            {/* 4. 错误提示 */}
            {error && (
                <div className="absolute bottom-4 left-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg shadow-2xl flex items-start gap-3 max-w-md backdrop-blur-sm">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                        <div className="text-xs font-mono whitespace-pre-wrap wrap-break-word">
                            {error.split('\n')[0]}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};