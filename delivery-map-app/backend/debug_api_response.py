
import requests
import json

def check_api():
    try:
        response = requests.get('http://localhost:8001/api/products/metrics')
        data = response.json()
        
        metrics = data.get('metrics', [])
        found = False
        for m in metrics:
            if 'ሃበሻ' in m['product_name']:
                print(f"Found: {m['product_name']}")
                found = True
        
        if not found:
            print("Product with 'ሃበሻ' not found in API response.")
            
        # Also check for generic Red Onion
        for m in metrics:
            if m['product_name'] == 'Red Onion':
                print("Found: Red Onion")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_api()

