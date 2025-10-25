#!/usr/bin/env python3
"""
Quick launcher for all generated maps and dashboard
"""

import webbrowser
import os
import time

def open_maps():
    """Open all generated HTML files in the default browser"""
    
    files = [
        'delivery_dashboard.html',
        'delivery_advanced_map.html', 
        'delivery_clustered_map.html',
        'delivery_heatmap.html',
        'delivery_basic_map.html'
    ]
    
    print("🗺️ Opening Delivery Data Maps and Dashboard...")
    print("=" * 50)
    
    for i, file in enumerate(files, 1):
        if os.path.exists(file):
            print(f"{i}. Opening {file}...")
            webbrowser.open(f'file://{os.path.abspath(file)}')
            time.sleep(1)  # Small delay between opening files
        else:
            print(f"❌ {file} not found!")
    
    print("\n✅ All available maps have been opened in your browser!")
    print("\n📋 Map Descriptions:")
    print("• delivery_dashboard.html - Comprehensive statistics dashboard")
    print("• delivery_advanced_map.html - Multi-layer analysis with circles and heatmap")
    print("• delivery_clustered_map.html - Clustered markers for better performance")
    print("• delivery_heatmap.html - Order density heatmap visualization")
    print("• delivery_basic_map.html - Simple marker view of all locations")

if __name__ == "__main__":
    open_maps()
