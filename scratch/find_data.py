import os

def find_files(start_dirs, extensions):
    for sdir in start_dirs:
        print(f"Searching {sdir}...")
        for root, dirs, files in os.walk(sdir):
            if any(skip in root.lower() for skip in ["node_modules", ".git", "appdata\\local\\microsoft", "windows"]):
                continue
            for f in files:
                if any(f.lower().endswith(ext) for ext in extensions):
                    full = os.path.join(root, f)
                    try:
                        sz = os.path.getsize(full)
                        if sz > 500:
                            print(f"  {full} ({sz} bytes)")
                    except:
                        pass

find_files([r"d:\LMS", r"D:\CMS", r"C:\Users\acer\Desktop", r"C:\Users\acer\Downloads", r"C:\Users\acer\Documents"], [".sql", ".dump", ".db", ".sqlite3"])
