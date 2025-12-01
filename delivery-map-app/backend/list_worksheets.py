"""List all worksheets in the Google Sheet."""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))
load_dotenv()

from services.google_sheets import GoogleSheetsClient

sheet_id = os.getenv("GSHEET_DAILY_OPERATIONAL_COST_ID")
if not sheet_id:
    print("❌ GSHEET_DAILY_OPERATIONAL_COST_ID not set!")
    sys.exit(1)

try:
    client = GoogleSheetsClient.get_instance()
    spreadsheet = client._client.open_by_key(sheet_id)
    
    print(f"📊 Sheet: {spreadsheet.title}")
    print(f"📋 Available worksheets:")
    print("=" * 60)
    
    for i, worksheet in enumerate(spreadsheet.worksheets(), 1):
        print(f"{i}. '{worksheet.title}' (ID: {worksheet.id})")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

