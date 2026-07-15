import pandas as pd
import os
from datetime import datetime

RAW_INPUT_FILE = "all_barbeque_outlets.csv"

def clean_and_format_dataset():
    if not os.path.exists(RAW_INPUT_FILE):
        print(f"❌ Error: Could not find '{RAW_INPUT_FILE}' in this directory.")
        return

    print(f"📦 Processing raw dataset: {RAW_INPUT_FILE}")
    
    # Read the file
    raw_df = pd.read_csv(RAW_INPUT_FILE)
    cleaned_records = []
    
    for idx, row in raw_df.iterrows():
        # Map fields handling variations in scraper output headers
        title = str(row.get('title', row.get('name', 'Unknown Outlet'))).strip()
        
        # Build comprehensive address fields
        full_address = str(row.get('address', row.get('street', 'Address not listed'))).strip()
        city = str(row.get('city', 'India')).strip()
        pincode = str(row.get('postalCode', 'N/A')).strip()
        phone = str(row.get('phone', row.get('internationalPhone', 'N/A'))).strip()
        url = str(row.get('url', 'Google Maps'))
        
        # Clean up missing value formatting from pandas
        if phone == 'nan' or not phone: phone = 'N/A'
        if pincode == 'nan' or not pincode: pincode = 'N/A'
        
        # Focus strictly on the core target brand rows
        if "barbeque nation" in title.lower():
            cleaned_records.append({
                "outlet_id": len(cleaned_records) + 1,
                "city_name": city.title(),
                "outlet_title": title.replace("Barbeque Nation - ", "").strip(),
                "full_address": full_address,
                "pincode": pincode,
                "contact_info": phone,
                "is_active": True,
                "source_url": url,
                "extracted_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })

    if cleaned_records:
        cleaned_df = pd.DataFrame(cleaned_records)
        cleaned_df.drop_duplicates(subset=["outlet_title", "full_address"], inplace=True)
        
        # Overwrite file with the clean target data layout
        cleaned_df.to_csv("all_barbeque_outlets.csv", index=False)
        
        print("\n" + "="*60)
        print(f"🏆 CLEAN DATA PROCESSING PIPELINE COMPLETE!")
        print(f"📊 Extracted {len(cleaned_df)} pristine branch records.")
        print(f"💾 File formatted and saved: 'all_barbeque_outlets.csv'")
        print("="*60 + "\n")
    else:
        print("❌ Processing error: No valid 'Barbeque Nation' entries found. Please verify the raw file contents.")

if __name__ == "__main__":
    clean_and_format_dataset()