import pandas as pd
import os
from datetime import datetime

RAW_FILE = "filtered_reddit_data.csv"
OUTPUT_FILE = "cleaned_filtered_reddit_data.csv"

def clean_filtered_reddit():
    if not os.path.exists(RAW_FILE):
        print(f"❌ Cannot find '{RAW_FILE}' in your project folder.")
        return

    print(f"📦 Reading raw dataset: {RAW_FILE}")
    df = pd.read_csv(RAW_FILE, low_memory=False)
    print(f"⚠️ Raw file had {len(df.columns)} columns across {len(df)} records.")

    # Target essential analytical columns
    target_cols = ['id', 'type', 'content', 'author', 'subreddit', 'created_at', 'scraped_at', 'url']
    available = [c for c in target_cols if c in df.columns]
    
    clean_df = df[available].copy()

    # Consolidate upvote / score metrics
    if 'upvotes' in df.columns and 'score' in df.columns:
        clean_df['upvotes_score'] = df['score'].fillna(df['upvotes'])
    elif 'score' in df.columns:
        clean_df['upvotes_score'] = df['score']
    elif 'upvotes' in df.columns:
        clean_df['upvotes_score'] = df['upvotes']

    # Remove deleted or empty comment rows
    if 'content' in clean_df.columns:
        clean_df = clean_df[~clean_df['content'].isin(['[removed]', '[deleted]']) & clean_df['content'].notna()]
        clean_df = clean_df[clean_df['content'].astype(str).str.strip() != '']

    clean_df.drop_duplicates(subset=['id'], inplace=True)
    clean_df['processed_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Save output
    clean_df.to_csv(OUTPUT_FILE, index=False)

    print("\n" + "="*60)
    print("🏆 FILTERED REDDIT DATASET CLEANING COMPLETE!")
    print(f"📊 Reduced to {len(clean_df.columns)} clean columns and {len(clean_df)} valid discussion records.")
    print(f"💾 File generated cleanly: '{OUTPUT_FILE}'")
    print("="*60 + "\n")
    print(clean_df[['type', 'subreddit', 'author', 'upvotes_score', 'content']].head(5))

if __name__ == "__main__":
    clean_filtered_reddit()