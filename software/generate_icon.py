import os
from PIL import Image, ImageDraw

def render_exact_svg_icon():
    os.makedirs("ui/assets", exist_ok=True)
    canvas_size = 512
    scale = canvas_size / 26.0

    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw a clean light/white circular backing as requested
    margin = 16
    draw.ellipse([margin, margin, canvas_size - margin, canvas_size - margin], fill=(255, 255, 255, 255), outline=(220, 225, 222, 255), width=8)

    # Shield coordinate scaling
    shield_points = [
        (13 * scale, 3.5 * scale),
        (22 * scale, 7.5 * scale),
        (22 * scale, 13.5 * scale),
        (20 * scale, 18 * scale),
        (16.5 * scale, 21.5 * scale),
        (13 * scale, 23.5 * scale),
        (9.5 * scale, 21.5 * scale),
        (6 * scale, 18 * scale),
        (4 * scale, 13.5 * scale),
        (4 * scale, 7.5 * scale),
        (13 * scale, 3.5 * scale)
    ]

    outline_width = int(1.8 * scale)
    # Draw Shield outline with #1F6F68 (Teal accent)
    draw.line(shield_points, fill=(31, 111, 104, 255), width=outline_width, joint="curve")

    # Checkmark: (8, 13.2) -> (11.3, 16.5) -> (18.2, 9)
    chk_points = [
        (8.5 * scale, 13.5 * scale),
        (11.5 * scale, 16.8 * scale),
        (17.5 * scale, 10.0 * scale)
    ]
    draw.line(chk_points, fill=(31, 111, 104, 255), width=outline_width, joint="curve")

    res_256 = img.resize((256, 256), Image.Resampling.LANCZOS)
    png_path = "ui/assets/icon.png"
    ico_path = "ui/assets/icon.ico"

    res_256.save(png_path, "PNG")
    res_256.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f"Generated brand icon with light background at {png_path} and {ico_path}")

if __name__ == "__main__":
    render_exact_svg_icon()
