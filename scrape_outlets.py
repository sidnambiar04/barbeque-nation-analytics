import pandas as pd
import os
from datetime import datetime

RAW_FILE = "all_barbeque_outlets.csv"
OUTPUT_FILE = "all_barbeque_outlets.csv"

def process_and_compress_outlets_data():
    if not os.path.exists(RAW_FILE):
        print(f"❌ Cannot find '{RAW_FILE}' in this directory.")
        return

    print(f"📦 Reading raw Google Maps CSV: {RAW_FILE}")
    df = pd.read_csv(RAW_FILE, low_memory=False)
    print(f"⚠️ Raw CSV had {len(df.columns)} flattened columns.")

    # Target key Google Maps business location columns
    target_columns = [
        'title', 'totalScore', 'reviewsCount', 'street', 'city', 'state', 
        'countryCode', 'postalCode', 'phone', 'categoryName', 'website', 
        'url', 'location/lat', 'location/lng', 'placeId', 'cid'
    ]

    # Filter to columns that exist in the raw dataset
    available_cols = [c for c in target_columns if c in df.columns]
    clean_df = df[available_cols].copy()

    # Filter for Barbeque Nation entries if title exists
    title_col = 'title' if 'title' in clean_df.columns else None
    if title_col:
        clean_df = clean_df[clean_df[title_col].astype(str).str.lower().str.contains("barbeque nation", na=False)]
        clean_df.drop_duplicates(subset=[title_col, 'street' if 'street' in clean_df.columns else title_col], inplace=True)

    # Add system flags
    clean_df['is_active'] = True
    clean_df['extracted_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Rename columns for database standardization
    rename_map = {
        'title': 'outlet_title',
        'totalScore': 'average_rating',
        'reviewsCount': 'total_reviews',
        'street': 'street_address',
        'postalCode': 'pincode',
        'countryCode': 'country_code',
        'categoryName': 'category_name',
        'location/lat': 'latitude',
        'location/lng': 'longitude',
        'url': 'google_maps_url'
    }
    clean_df.rename(columns=rename_map, inplace=True)

    # Save cleaned output
    clean_df.to_csv(OUTPUT_FILE, index=False)

    print("\n" + "="*60)
    print(f"🏆 GOOGLE MAPS OUTLET DATASET COMPRESSION COMPLETE!")
    print(f"📊 Reduced from {len(df.columns)} messy columns to {len(clean_df.columns)} crisp, structured columns!")
    print(f"💾 File updated cleanly: '{OUTPUT_FILE}'")
    print("="*60 + "\n")
    print(clean_df.head(3))

if __name__ == "__main__":
    process_and_compress_outlets_data()