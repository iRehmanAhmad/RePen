import sys

try:
    from PIL import ImageGrab
    print("PIL imported successfully.")
    im = ImageGrab.grab()
    im.save("c:\\Users\\TOSHIBA\\.gemini\\antigravity\\scratch\\epic-pen-clone\\screenshot.png")
    print("Screenshot saved via PIL!")
except Exception as e:
    print(f"PIL grab failed: {e}", file=sys.stderr)

try:
    import mss
    print("mss imported successfully.")
    with mss.mss() as sct:
        sct.shot(output="c:\\Users\\TOSHIBA\\.gemini\\antigravity\\scratch\\epic-pen-clone\\screenshot.png")
    print("Screenshot saved via mss!")
except Exception as e:
    print(f"mss grab failed: {e}", file=sys.stderr)
