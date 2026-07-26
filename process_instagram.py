import pandas as pd
import os
from datetime import datetime

RAW_FILE = "raw_instagram_data.csv"
OUTPUT_FILE = "cleaned_instagram_data.csv"

def process_and_compress_instagram_data():
    if not os.path.exists(RAW_FILE):
        print(f"❌ Cannot find '{RAW_FILE}' in this directory.")
        return

    print(f"📦 Reading raw Apify CSV: {RAW_FILE}")
    df = pd.read_csv(RAW_FILE, low_memory=False)
    print(f"⚠️ Raw CSV had {len(df.columns)} flattened columns.")

    # 1. Identify and consolidate Hashtags into a single clean column
    hashtag_cols = [c for c in df.columns if c.startswith('hashtags/')]
    if hashtag_cols:
        df['hashtags'] = df[hashtag_cols].apply(
            lambda row: ', '.join([str(val).strip() for val in row if pd.notna(val) and str(val).strip() != '']), 
            axis=1
        )

    # 2. Identify and consolidate Mentions into a single clean column
    mention_cols = [c for c in df.columns if c.startswith('mentions/')]
    if mention_cols:
        df['mentions'] = df[mention_cols].apply(
            lambda row: ', '.join([str(val).strip() for val in row if pd.notna(val) and str(val).strip() != '']), 
            axis=1
        )

    # 3. Target top-level core post metadata columns
    target_columns = [
        'id', 'type', 'productType', 'shortCode', 'url', 'timestamp', 
        'caption', 'likesCount', 'commentsCount', 'videoViewCount', 'videoPlayCount',
        'ownerUsername', 'ownerFullName', 'ownerId', 'locationName', 
        'isCommentsDisabled', 'isPinned', 'hashtags', 'mentions'
    ]

    # Filter to columns actually present in the dataset
    available_cols = [c for c in target_columns if c in df.columns]
    clean_df = df[available_cols].copy()

    # 4. Filter out blank rows and add processing timestamp
    if 'caption' in clean_df.columns:
        clean_df = clean_df[clean_df['caption'].notna()]
        clean_df.drop_duplicates(subset=['caption'], inplace=True)

    clean_df['processed_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 5. Save clean output
    clean_df.to_csv(OUTPUT_FILE, index=False)

    print("\n" + "="*60)
    print(f"🏆 INSTAGRAM DATASET COMPRESSION COMPLETE!")
    print(f"📊 Reduced from {len(df.columns)} messy columns to {len(clean_df.columns)} crisp, structured columns!")
    print(f"💾 File updated cleanly: '{OUTPUT_FILE}'")
    print("="*60 + "\n")
    print(clean_df.head(3))

if __name__ == "__main__":
    process_and_compress_instagram_data()