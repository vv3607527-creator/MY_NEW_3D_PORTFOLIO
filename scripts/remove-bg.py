import os
import glob
from PIL import Image
from rembg import remove, new_session

def main():
    print("Finding composite image...")
    # Find composite file regardless of unicode ellipsis
    files = glob.glob("Generating*.jpg")
    if not files:
        raise FileNotFoundError("Could not find Generating*.jpg in current directory")
    
    src_path = files[0]
    print(f"Loading {src_path}...")
    composite = Image.open(src_path)
    print(f"Composite size: {composite.size}")

    # Exact crop coordinates:
    # Col 1 (Human): left 6, top 0, right 678, bottom 1536 (width 672, height 1536)
    # Col 2 (Machine): left 696, top 0, right 1368, bottom 1536 (width 672, height 1536)
    human_crop = composite.crop((6, 0, 678, 1536))
    machine_crop = composite.crop((696, 0, 1368, 1536))
    print(f"Human crop size: {human_crop.size}")
    print(f"Machine crop size: {machine_crop.size}")

    # Use u2net (default high quality portrait model)
    session = new_session("u2net")

    print("\nRemoving background from Human portrait...")
    human_rgba = remove(human_crop, session=session)
    print("Background removed for Human!")

    print("\nRemoving background from Machine portrait...")
    machine_rgba = remove(machine_crop, session=session)
    print("Background removed for Machine!")

    # Calculate target dimensions
    w_desk, h_desk = 1480, 3383
    w_mob, h_mob = 860, 1966

    out_dir = os.path.join("public", "assets", "img")
    os.makedirs(out_dir, exist_ok=True)

    print("\nSaving WebP with transparency...")
    # Human desktop & mobile
    human_desk = human_rgba.resize((w_desk, h_desk), Image.Resampling.LANCZOS)
    human_desk.save(os.path.join(out_dir, "hero-human.webp"), "WEBP", quality=90, method=6)
    print(f"Saved {os.path.join(out_dir, 'hero-human.webp')} ({w_desk}x{h_desk})")

    human_mob = human_rgba.resize((w_mob, h_mob), Image.Resampling.LANCZOS)
    human_mob.save(os.path.join(out_dir, "hero-human-sm.webp"), "WEBP", quality=85, method=6)
    print(f"Saved {os.path.join(out_dir, 'hero-human-sm.webp')} ({w_mob}x{h_mob})")

    # Machine desktop & mobile
    machine_desk = machine_rgba.resize((w_desk, h_desk), Image.Resampling.LANCZOS)
    machine_desk.save(os.path.join(out_dir, "hero-machine.webp"), "WEBP", quality=90, method=6)
    print(f"Saved {os.path.join(out_dir, 'hero-machine.webp')} ({w_desk}x{h_desk})")

    machine_mob = machine_rgba.resize((w_mob, h_mob), Image.Resampling.LANCZOS)
    machine_mob.save(os.path.join(out_dir, "hero-machine-sm.webp"), "WEBP", quality=85, method=6)
    print(f"Saved {os.path.join(out_dir, 'hero-machine-sm.webp')} ({w_mob}x{h_mob})")

    print("\nSUCCESS! All hero portraits now have transparent backgrounds.")

if __name__ == "__main__":
    main()
