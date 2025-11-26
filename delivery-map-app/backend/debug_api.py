import requests
import json

def check(url):
    print(f"Checking {url}...")
    try:
        r = requests.get(url)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            try:
                data = r.json()
                if "window" in data:
                    print(f"Window: {data['window']}")
                elif "metrics" in data and "window" not in data:
                     print("Metrics found, no window key at root.")
                else:
                     keys = list(data.keys())[:5]
                     print(f"Keys: {keys}")
            except:
                print("Not JSON")
        else:
            print(f"Error: {r.text[:100]}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    check("http://localhost:8001/api/products/metrics")
