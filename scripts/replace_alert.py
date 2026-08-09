import os
import re

# We need to find the relative path to AlertService from each file
def get_relative_path(file_path, base_dir="L:\\financy\\v1\\src"):
    # Target is L:\financy\v1\src\services\AlertService.ts
    target_dir = os.path.join(base_dir, "services")
    
    file_dir = os.path.dirname(file_path)
    rel_path = os.path.relpath(target_dir, file_dir)
    
    import_path = os.path.join(rel_path, "AlertService").replace("\\", "/")
    if not import_path.startswith("."):
        import_path = "./" + import_path
        
    return import_path

def process_directory(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith((".ts", ".tsx")):
                file_path = os.path.join(root, file)
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                # Skip AlertService.ts itself
                if file_path.endswith("AlertService.ts") or file_path.endswith("AlertService.tsx"):
                    continue
                
                if "Alert.alert" in content:
                    # Replace Alert.alert
                    new_content = content.replace("Alert.alert", "AlertService.alert")
                    
                    # Add import if not present
                    if "AlertService" not in content:
                        import_path = get_relative_path(file_path)
                        import_stmt = f'import {{ AlertService }} from "{import_path}";\n'
                        
                        # Find the first import
                        import_match = re.search(r'^import .*', new_content, re.MULTILINE)
                        if import_match:
                            pos = new_content.rfind('\n', 0, import_match.start()) + 1
                            if pos == 0:
                                pos = import_match.start()
                            new_content = new_content[:pos] + import_stmt + new_content[pos:]
                        else:
                            new_content = import_stmt + new_content
                    
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Updated {file_path}")

process_directory("L:\\financy\\v1\\src")
