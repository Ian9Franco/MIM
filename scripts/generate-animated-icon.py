import os
from PIL import Image

def solve_bezier_y(keyframes, t_val):
    for i in range(len(keyframes) - 1):
        t0, sx0, sy0, dy0 = keyframes[i]
        t1, sx1, sy1, dy1 = keyframes[i+1]
        if t0 <= t_val <= t1:
            segment_t = (t_val - t0) / (t1 - t0) if t1 > t0 else 0
            ease = 3 * segment_t**2 - 2 * segment_t**3
            sx = sx0 + (sx1 - sx0) * ease
            sy = sy0 + (sy1 - sy0) * ease
            dy = dy0 + (dy1 - dy0) * ease
            return sx, sy, dy
    return keyframes[-1][1], keyframes[-1][2], keyframes[-1][3]

def main():
    src_path = "public/icon.png"
    icon = Image.open(src_path).convert("RGBA")
    
    # Scale down the master icon to ~180px high for crisp 2x Retina rendering at width="100" in markdown
    target_h = 180
    aspect = icon.width / icon.height
    target_w = int(round(target_h * aspect))
    icon = icon.resize((target_w, target_h), Image.Resampling.LANCZOS)
    w, h = icon.size

    pad_b = 12
    canvas_w = int(w * 1.45)
    canvas_h = int(h * 1.55)
    base_x = canvas_w / 2
    base_y = canvas_h - pad_b

    # Physics keyframes (exact MIM slime squish & bounce)
    keyframes = [
        (0.00, 1.00, 1.00, 0.0),
        (0.15, 1.22, 0.78, 0.0625 * h),
        (0.35, 0.88, 1.18, -0.26 * h),
        (0.55, 1.14, 0.86, 0.0),
        (0.72, 0.98, 1.04, -0.05 * h),
        (0.85, 1.00, 1.00, 0.0),
        (1.00, 1.00, 1.00, 0.0),
    ]

    total_duration_sec = 2.4
    fps = 24
    total_frames = int(total_duration_sec * fps)

    frames = []
    for f in range(total_frames):
        t = f / total_frames
        sx, sy, dy = solve_bezier_y(keyframes, t)

        new_w = max(1, int(round(w * sx)))
        new_h = max(1, int(round(h * sy)))

        resized = icon.resize((new_w, new_h), Image.Resampling.LANCZOS)
        dest_x = int(round(base_x - new_w / 2))
        dest_y = int(round(base_y - new_h + dy))

        frame = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
        frame.paste(resized, (dest_x, dest_y), resized)
        frames.append(frame)

    # Bounding box crop
    min_x, min_y, max_x, max_y = canvas_w, canvas_h, 0, 0
    for frame in frames:
        bbox = frame.getbbox()
        if bbox:
            min_x = min(min_x, bbox[0])
            min_y = min(min_y, bbox[1])
            max_x = max(max_x, bbox[2])
            max_y = max(max_y, bbox[3])

    pad = 6
    crop_box = (
        max(0, min_x - pad),
        max(0, min_y - pad),
        min(canvas_w, max_x + pad),
        min(canvas_h, max_y + pad)
    )

    cropped_frames = [f.crop(crop_box) for f in frames]
    frame_duration_ms = int(1000 / fps)

    # Animated WebP
    webp_path = "public/icon.webp"
    cropped_frames[0].save(
        webp_path,
        save_all=True,
        append_images=cropped_frames[1:],
        duration=frame_duration_ms,
        loop=0,
        quality=92,
        method=4
    )
    print(f"Saved {webp_path}: {os.path.getsize(webp_path)} bytes")

    # Animated GIF with clean alpha threshold & palette
    gif_frames = []
    for cf in cropped_frames:
        alpha = cf.split()[3]
        # Clean up semi-transparent boundary for crisp look on both dark & light GitHub themes
        # Binary threshold on alpha:
        clean_alpha = Image.eval(alpha, lambda a: 255 if a >= 64 else 0)
        
        # Create RGB base
        rgb = Image.new("RGB", cf.size, (24, 24, 27))
        rgb.paste(cf, mask=clean_alpha)
        
        # Convert to P with 128 colors for optimal size and smoothness
        p_img = rgb.convert("P", palette=Image.Palette.ADAPTIVE, colors=128)
        
        # Mark transparent pixels
        trans_mask = Image.eval(clean_alpha, lambda a: 255 if a == 0 else 0)
        p_img.paste(255, trans_mask)
        p_img.info["transparency"] = 255
        gif_frames.append(p_img)

    gif_path = "public/icon.gif"
    gif_frames[0].save(
        gif_path,
        save_all=True,
        append_images=gif_frames[1:],
        duration=frame_duration_ms,
        loop=0,
        transparency=255,
        disposal=2
    )
    print(f"Saved {gif_path}: {os.path.getsize(gif_path)} bytes")
    print("FINISHED")

if __name__ == "__main__":
    main()
