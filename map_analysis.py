#!/usr/bin/env python3
"""
Powerful Map Analysis for Delivery Data
Creates interactive maps with clustering, heatmaps, and filtering capabilities
"""

import pandas as pd
import folium
from folium import plugins
import numpy as np
from collections import Counter
import json
import re
from typing import List, Tuple, Dict
import webbrowser
import os

class DeliveryMapAnalyzer:
    def __init__(self, csv_file_path: str):
        """Initialize the analyzer with CSV data"""
        self.csv_file_path = csv_file_path
        self.df = None
        self.map_center = None
        self.load_data()
    
    def load_data(self):
        """Load and preprocess the CSV data"""
        print("Loading data...")
        self.df = pd.read_csv(self.csv_file_path)
        
        # Parse coordinates
        coords = self.df['delivery_coordinates'].apply(self._parse_coordinates)
        self.df['longitude'] = [coord[0] for coord in coords]
        self.df['latitude'] = [coord[1] for coord in coords]
        
        # Calculate center point for map
        self.map_center = [self.df['latitude'].mean(), self.df['longitude'].mean()]
        
        print(f"Loaded {len(self.df)} records")
        print(f"Map center: {self.map_center}")
    
    def _parse_coordinates(self, coord_str: str) -> Tuple[float, float]:
        """Parse POINT(lon lat) format coordinates"""
        try:
            if coord_str.startswith('POINT('):
                coords = coord_str[6:-1]  # Remove 'POINT(' and ')'
                parts = coords.split()
                if len(parts) == 2:
                    return float(parts[0]), float(parts[1])
        except:
            pass
        return 0.0, 0.0
    
    def create_basic_map(self) -> folium.Map:
        """Create a basic map with all delivery points"""
        print("Creating basic map...")
        
        # Create base map
        m = folium.Map(
            location=self.map_center,
            zoom_start=12,
            tiles='OpenStreetMap'
        )
        
        # Add markers for each delivery point
        for idx, row in self.df.iterrows():
            if row['latitude'] != 0.0 and row['longitude'] != 0.0:
                # Color based on group type
                color = 'blue' if row['group_deal_category'] == 'NORMAL_GROUPS' else 'red'
                
                # Size based on total orders
                size = min(20, max(5, row['total_orders'] / 10))
                
                folium.CircleMarker(
                    location=[row['latitude'], row['longitude']],
                    radius=size,
                    popup=self._create_popup(row),
                    color=color,
                    fill=True,
                    fillOpacity=0.7
                ).add_to(m)
        
        return m
    
    def create_clustered_map(self) -> folium.Map:
        """Create a map with marker clustering for better performance"""
        print("Creating clustered map...")
        
        m = folium.Map(
            location=self.map_center,
            zoom_start=12,
            tiles='OpenStreetMap'
        )
        
        # Separate markers by group type
        normal_groups = []
        super_groups = []
        
        for idx, row in self.df.iterrows():
            if row['latitude'] != 0.0 and row['longitude'] != 0.0:
                marker_data = {
                    'location': [row['latitude'], row['longitude']],
                    'popup': self._create_popup(row),
                    'color': 'blue' if row['group_deal_category'] == 'NORMAL_GROUPS' else 'red'
                }
                
                if row['group_deal_category'] == 'NORMAL_GROUPS':
                    normal_groups.append(marker_data)
                else:
                    super_groups.append(marker_data)
        
        # Add normal groups cluster
        normal_cluster = plugins.MarkerCluster(name='Normal Groups').add_to(m)
        for marker in normal_groups:
            folium.CircleMarker(
                location=marker['location'],
                radius=5,
                popup=marker['popup'],
                color=marker['color'],
                fill=True,
                fillOpacity=0.7
            ).add_to(normal_cluster)
        
        # Add super groups cluster
        super_cluster = plugins.MarkerCluster(name='Super Groups').add_to(m)
        for marker in super_groups:
            folium.CircleMarker(
                location=marker['location'],
                radius=8,
                popup=marker['popup'],
                color=marker['color'],
                fill=True,
                fillOpacity=0.7
            ).add_to(super_cluster)
        
        # Add layer control
        folium.LayerControl().add_to(m)
        
        return m
    
    def create_heatmap(self) -> folium.Map:
        """Create a heatmap showing order density"""
        print("Creating heatmap...")
        
        m = folium.Map(
            location=self.map_center,
            zoom_start=12,
            tiles='OpenStreetMap'
        )
        
        # Prepare heatmap data
        heat_data = []
        for idx, row in self.df.iterrows():
            if row['latitude'] != 0.0 and row['longitude'] != 0.0:
                # Weight by total orders
                weight = min(1.0, row['total_orders'] / 100)
                heat_data.append([row['latitude'], row['longitude'], weight])
        
        # Add heatmap layer
        plugins.HeatMap(
            heat_data,
            name='Order Density Heatmap',
            min_opacity=0.2,
            max_zoom=18,
            radius=25,
            blur=15,
            gradient={0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red'}
        ).add_to(m)
        
        # Add markers for high-volume locations
        high_volume = self.df[self.df['total_orders'] >= 100]
        for idx, row in high_volume.iterrows():
            folium.CircleMarker(
                location=[row['latitude'], row['longitude']],
                radius=15,
                popup=self._create_popup(row),
                color='red',
                fill=True,
                fillOpacity=0.8
            ).add_to(m)
        
        folium.LayerControl().add_to(m)
        return m
    
    def create_advanced_analysis_map(self) -> folium.Map:
        """Create an advanced map with multiple analysis layers"""
        print("Creating advanced analysis map...")
        
        m = folium.Map(
            location=self.map_center,
            zoom_start=12,
            tiles='OpenStreetMap'
        )
        
        # Add different tile layers
        folium.TileLayer('CartoDB positron').add_to(m)
        folium.TileLayer('CartoDB dark_matter').add_to(m)
        
        # 1. Order volume circles
        for idx, row in self.df.iterrows():
            if row['latitude'] != 0.0 and row['longitude'] != 0.0:
                # Circle size based on total orders
                radius = min(500, max(50, row['total_orders'] * 2))
                
                # Color based on group type and activity
                if row['group_deal_category'] == 'SUPER_GROUPS':
                    color = 'red'
                elif row['total_orders'] >= 100:
                    color = 'orange'
                elif row['total_orders'] >= 50:
                    color = 'yellow'
                else:
                    color = 'green'
                
                folium.Circle(
                    location=[row['latitude'], row['longitude']],
                    radius=radius,
                    popup=self._create_advanced_popup(row),
                    color=color,
                    fill=True,
                    fillOpacity=0.3,
                    weight=2
                ).add_to(m)
        
        # 2. Add clustering for better performance
        marker_cluster = plugins.MarkerCluster().add_to(m)
        
        # Add individual markers for detailed view
        for idx, row in self.df.iterrows():
            if row['latitude'] != 0.0 and row['longitude'] != 0.0:
                folium.Marker(
                    location=[row['latitude'], row['longitude']],
                    popup=self._create_advanced_popup(row),
                    icon=folium.Icon(
                        color='blue' if row['group_deal_category'] == 'NORMAL_GROUPS' else 'red',
                        icon='info-sign'
                    )
                ).add_to(marker_cluster)
        
        # 3. Add heatmap layer
        heat_data = []
        for idx, row in self.df.iterrows():
            if row['latitude'] != 0.0 and row['longitude'] != 0.0:
                weight = min(1.0, row['total_orders'] / 200)
                heat_data.append([row['latitude'], row['longitude'], weight])
        
        plugins.HeatMap(
            heat_data,
            name='Order Density',
            min_opacity=0.2,
            radius=30,
            blur=20
        ).add_to(m)
        
        # Add layer control
        folium.LayerControl().add_to(m)
        
        return m
    
    def _create_popup(self, row) -> str:
        """Create a popup for markers"""
        return f"""
        <div style="width: 250px;">
            <h4>{row['delivery_location_name'][:50]}...</h4>
            <p><b>Group Type:</b> {row['group_deal_category']}</p>
            <p><b>Total Orders:</b> {row['total_orders']}</p>
            <p><b>Unique Members:</b> {row['unique_group_members']}</p>
            <p><b>Total Groups:</b> {row['total_groups']}</p>
            <p><b>Active Days:</b> {row['active_days']}</p>
        </div>
        """
    
    def _create_advanced_popup(self, row) -> str:
        """Create an advanced popup with more details"""
        return f"""
        <div style="width: 300px;">
            <h4>{row['delivery_location_name'][:60]}...</h4>
            <hr>
            <p><b>Group Type:</b> {row['group_deal_category']}</p>
            <p><b>Created By:</b> {row['group_created_by'][:20]}...</p>
            <hr>
            <p><b>📊 Orders Summary:</b></p>
            <p>• Total Orders: <b>{row['total_orders']}</b></p>
            <p>• Unique Members: <b>{row['unique_group_members']}</b></p>
            <p>• Total Groups: <b>{row['total_groups']}</b></p>
            <p>• Active Days: <b>{row['active_days']}</b></p>
            <hr>
            <p><b>📅 Weekly Breakdown:</b></p>
            <p>• Mon: {row['monday_orders']} | Tue: {row['tuesday_orders']} | Wed: {row['wednesday_orders']}</p>
            <p>• Thu: {row['thursday_orders']} | Fri: {row['friday_orders']} | Sat: {row['saturday_orders']}</p>
            <p>• Sun: {row['sunday_orders']}</p>
        </div>
        """
    
    def generate_statistics_dashboard(self) -> str:
        """Generate a comprehensive statistics dashboard"""
        print("Generating statistics dashboard...")
        
        stats = {
            'total_records': len(self.df),
            'normal_groups': len(self.df[self.df['group_deal_category'] == 'NORMAL_GROUPS']),
            'super_groups': len(self.df[self.df['group_deal_category'] == 'SUPER_GROUPS']),
            'total_orders': self.df['total_orders'].sum(),
            'avg_orders_per_group': self.df['total_orders'].mean(),
            'max_orders': self.df['total_orders'].max(),
            'unique_locations': self.df['delivery_location_name'].nunique(),
            'avg_members_per_group': self.df['unique_group_members'].mean(),
            'most_active_location': self.df.loc[self.df['total_orders'].idxmax(), 'delivery_location_name'],
            'geographic_bounds': {
                'min_lat': self.df['latitude'].min(),
                'max_lat': self.df['latitude'].max(),
                'min_lon': self.df['longitude'].min(),
                'max_lon': self.df['longitude'].max()
            }
        }
        
        # Create HTML dashboard
        dashboard_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Delivery Data Analysis Dashboard</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
                .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                .header {{ text-align: center; color: #333; margin-bottom: 30px; }}
                .stats-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }}
                .stat-card {{ background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }}
                .stat-value {{ font-size: 2em; font-weight: bold; color: #007bff; }}
                .stat-label {{ color: #666; margin-top: 5px; }}
                .section {{ margin-bottom: 30px; }}
                .section h3 {{ color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
                th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
                th {{ background-color: #f8f9fa; font-weight: bold; }}
                .highlight {{ background-color: #e3f2fd; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🗺️ Delivery Data Analysis Dashboard</h1>
                    <p>Comprehensive analysis of delivery groups and order patterns</p>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">{stats['total_records']:,}</div>
                        <div class="stat-label">Total Records</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{stats['total_orders']:,}</div>
                        <div class="stat-label">Total Orders</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{stats['unique_locations']:,}</div>
                        <div class="stat-label">Unique Locations</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{stats['avg_orders_per_group']:.1f}</div>
                        <div class="stat-label">Avg Orders/Group</div>
                    </div>
                </div>
                
                <div class="section">
                    <h3>📊 Group Distribution</h3>
                    <table>
                        <tr>
                            <th>Group Type</th>
                            <th>Count</th>
                            <th>Percentage</th>
                            <th>Total Orders</th>
                        </tr>
                        <tr>
                            <td>Normal Groups</td>
                            <td>{stats['normal_groups']:,}</td>
                            <td>{(stats['normal_groups']/stats['total_records']*100):.1f}%</td>
                            <td>{self.df[self.df['group_deal_category'] == 'NORMAL_GROUPS']['total_orders'].sum():,}</td>
                        </tr>
                        <tr>
                            <td>Super Groups</td>
                            <td>{stats['super_groups']:,}</td>
                            <td>{(stats['super_groups']/stats['total_records']*100):.1f}%</td>
                            <td>{self.df[self.df['group_deal_category'] == 'SUPER_GROUPS']['total_orders'].sum():,}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="section">
                    <h3>🏆 Top Performing Locations</h3>
                    <table>
                        <tr>
                            <th>Rank</th>
                            <th>Location</th>
                            <th>Total Orders</th>
                            <th>Group Type</th>
                        </tr>
        """
        
        # Add top 10 locations
        top_locations = self.df.nlargest(10, 'total_orders')
        for i, (idx, row) in enumerate(top_locations.iterrows(), 1):
            dashboard_html += f"""
                        <tr class="{'highlight' if i <= 3 else ''}">
                            <td>{i}</td>
                            <td>{row['delivery_location_name'][:60]}...</td>
                            <td>{row['total_orders']:,}</td>
                            <td>{row['group_deal_category']}</td>
                        </tr>
            """
        
        dashboard_html += f"""
                    </table>
                </div>
                
                <div class="section">
                    <h3>🌍 Geographic Coverage</h3>
                    <p><strong>Coverage Area:</strong> Addis Ababa, Ethiopia</p>
                    <p><strong>Latitude Range:</strong> {stats['geographic_bounds']['min_lat']:.6f} to {stats['geographic_bounds']['max_lat']:.6f}</p>
                    <p><strong>Longitude Range:</strong> {stats['geographic_bounds']['min_lon']:.6f} to {stats['geographic_bounds']['max_lon']:.6f}</p>
                </div>
                
                <div class="section">
                    <h3>📈 Key Metrics</h3>
                    <table>
                        <tr>
                            <th>Metric</th>
                            <th>Value</th>
                        </tr>
                        <tr>
                            <td>Average Members per Group</td>
                            <td>{stats['avg_members_per_group']:.1f}</td>
                        </tr>
                        <tr>
                            <td>Maximum Orders (Single Group)</td>
                            <td>{stats['max_orders']:,}</td>
                        </tr>
                        <tr>
                            <td>Most Active Location</td>
                            <td>{stats['most_active_location'][:80]}...</td>
                        </tr>
                    </table>
                </div>
            </div>
        </body>
        </html>
        """
        
        return dashboard_html
    
    def save_maps(self):
        """Save all maps and dashboard to files"""
        print("Saving maps and dashboard...")
        
        # Create basic map
        basic_map = self.create_basic_map()
        basic_map.save('delivery_basic_map.html')
        print("✅ Basic map saved as 'delivery_basic_map.html'")
        
        # Create clustered map
        clustered_map = self.create_clustered_map()
        clustered_map.save('delivery_clustered_map.html')
        print("✅ Clustered map saved as 'delivery_clustered_map.html'")
        
        # Create heatmap
        heatmap = self.create_heatmap()
        heatmap.save('delivery_heatmap.html')
        print("✅ Heatmap saved as 'delivery_heatmap.html'")
        
        # Create advanced analysis map
        advanced_map = self.create_advanced_analysis_map()
        advanced_map.save('delivery_advanced_map.html')
        print("✅ Advanced analysis map saved as 'delivery_advanced_map.html'")
        
        # Generate and save dashboard
        dashboard = self.generate_statistics_dashboard()
        with open('delivery_dashboard.html', 'w', encoding='utf-8') as f:
            f.write(dashboard)
        print("✅ Statistics dashboard saved as 'delivery_dashboard.html'")
        
        print("\n🎉 All maps and analysis files have been generated!")
        print("Open the HTML files in your browser to view the interactive maps.")

def main():
    """Main function to run the analysis"""
    csv_file = 'sqllab_query_chipchipall_data_20251025T131225.csv'
    
    if not os.path.exists(csv_file):
        print(f"Error: {csv_file} not found!")
        return
    
    print("🚀 Starting Delivery Data Map Analysis...")
    print("=" * 50)
    
    # Initialize analyzer
    analyzer = DeliveryMapAnalyzer(csv_file)
    
    # Generate all maps and dashboard
    analyzer.save_maps()
    
    print("\n" + "=" * 50)
    print("✅ Analysis complete! Check the generated HTML files.")

if __name__ == "__main__":
    main()
