use usvg::fontdb;

#[tauri::command]
fn export_image(svg_content: String, file_path: String, scale: f64) -> Result<(), String> {
    // 1. 初始化字体数据库
    let mut db = fontdb::Database::new();
    db.load_system_fonts();

    // 2. 配置解析选项
    let opt = usvg::Options::default();

    // 3. 解析 SVG
    let tree = usvg::Tree::from_str(&svg_content, &opt, &db)
        .map_err(|e| format!("Failed to parse SVG: {}", e))?;

    // 4. 计算尺寸
    let pixmap_size = tree
        .size()
        .to_int_size()
        .scale_by(scale as f32)
        .ok_or("Invalid image size".to_string())?;

    // 5. 创建画布
    let mut pixmap = tiny_skia::Pixmap::new(pixmap_size.width(), pixmap_size.height())
        .ok_or("Failed to create pixmap".to_string())?;

    // 6. 渲染
    let transform = tiny_skia::Transform::from_scale(scale as f32, scale as f32);
    resvg::render(&tree, transform, &mut pixmap.as_mut());

    // 7. 保存
    pixmap
        .save_png(&file_path)
        .map_err(|e| format!("Failed to save PNG: {}", e))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![export_image])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
