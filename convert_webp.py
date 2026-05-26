"""
批量 PNG → WebP 转换脚本
质量 80%，保留原始尺寸，输出到 output_webp/ 目录
用法: python convert_webp.py
"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("正在安装 Pillow...")
    os.system("pip install pillow -q")
    from PIL import Image

# === 配置 ===
SOURCE_DIR = r"D:\ZHIJIGozgewan\COC人物图"
OUTPUT_DIR = r"D:\ZHIJIGozgewan\COC\assets\webp"
QUALITY = 80          # WebP 质量 (1-100), 推荐 75-80
MAX_DIM = None        # 最大尺寸限制, None = 不缩放 (如需限制可设 1920)

# ====================

def convert_png_to_webp(src_dir: str, dst_dir: str, quality: int, max_dim: int | None):
    src_path = Path(src_dir)
    dst_path = Path(dst_dir)
    dst_path.mkdir(parents=True, exist_ok=True)

    png_files = list(src_path.glob("*.png"))
    total = len(png_files)
    
    if total == 0:
        print(f"[!] {src_dir} 中没有找到 PNG 文件")
        return

    print(f"[*] 找到 {total} 张 PNG 图片")
    print(f"[*] 输出目录: {dst_dir}")
    print(f"[*] 质量: {quality}% | 尺寸限制: {max_dim or '不缩放'}")
    print("-" * 60)

    total_src_size = 0
    total_dst_size = 0
    success = 0
    fail = 0

    for i, png_file in enumerate(sorted(png_files), 1):
        try:
            img = Image.open(png_file)

            # 处理 RGBA/P 模式（透明通道）
            if img.mode in ("RGBA", "P"):
                # 如果是调色板模式，先转 RGBA
                if img.mode == "P":
                    img = img.convert("RGBA")
                # WebP 支持透明，直接保存
                save_kwargs = {"quality": quality}
            else:
                img = img.convert("RGB")
                save_kwargs = {"quality": quality}

            # 可选：限制最大尺寸
            if max_dim:
                w, h = img.size
                if max(w, h) > max_dim:
                    ratio = max_dim / max(w, h)
                    new_size = (int(w * ratio), int(h * ratio))
                    img = img.resize(new_size, Image.LANCZOS)
                    print(f"  [{i}/{total}] {png_file.name} -> {new_size[0]}x{new_size[1]} (已缩小)")

            # 输出文件名
            out_file = dst_path / (png_file.stem + ".webp")
            img.save(out_file, "WEBP", **save_kwargs)

            # 统计
            src_kb = png_file.stat().st_size / 1024
            dst_kb = out_file.stat().st_size / 1024
            ratio = (1 - dst_kb / src_kb) * 100 if src_kb > 0 else 0
            
            total_src_size += src_kb
            total_dst_size += dst_kb
            success += 1

            print(f"  [{i:3d}/{total}] {png_file.name[:45]:45s} {src_kb:7.0f}KB -> {dst_kb:6.0f}KB  ({ratio:+.0f}%)")

            img.close()

        except Exception as e:
            fail += 1
            print(f"  [FAIL] {png_file.name}: {e}")

    # 总结
    print("-" * 60)
    print(f"\n[完成] 成功 {success}/{total}, 失败 {fail}")
    print(f"  原始总大小: {total_src_size / 1024:.1f} MB")
    print(f"  转换后大小: {total_dst_size / 1024:.1f} MB")
    print(f"  总压缩率:   {(1 - total_dst_size / total_src_size) * 100:.1f}%")
    print(f"\n输出位置: {dst_path}")


if __name__ == "__main__":
    # 支持命令行参数覆盖配置
    import argparse
    parser = argparse.ArgumentParser(description="PNG → WebP 批量转换")
    parser.add_argument("--src", default=SOURCE_DIR, help="源图片目录")
    parser.add_argument("--dst", default=OUTPUT_DIR, help="输出目录")
    parser.add_argument("-q", "--quality", type=int, default=QUALITY, help="WebP 质量 (1-100)")
    parser.add_argument("--max-size", type=int, default=MAX_DIM, help="最大边长像素 (不缩放则不填)")
    args = parser.parse_args()

    convert_png_to_webp(args.src, args.dst, args.quality, args.max_size)
