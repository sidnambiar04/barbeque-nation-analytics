import pandas as pd
import os
from datetime import datetime

RAW_FILE = "fbposts_scrapper.csv"
OUTPUT_FILE = "cleaned_barbeque_posts_data.csv"

def clean_posts():
    if not os.path.exists(RAW_FILE):
        print(f"⚠️ Cannot find FB/IG Posts file: {RAW_FILE}")
        return
        
    print(f"📦 Processing FB/IG Posts dataset: {RAW_FILE}")
    df = pd.read_csv(RAW_FILE, low_memory=False)
    
    keep_cols = ['postId', 'pageName', 'text', 'time', 'likes', 'comments', 'shares', 'viewsCount', 'videoPostViewCount', 'url', 'link']
    available = [c for c in keep_cols if c in df.columns]
    
    clean_df = df[available].copy()
    clean_df.dropna(subset=['text'], inplace=True)
    clean_df.drop_duplicates(subset=['postId'], inplace=True)
    clean_df['processed_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    clean_df.to_csv(OUTPUT_FILE, index=False)
    
    print("\n" + "="*60)
    print("🏆 FB/IG POSTS DATASET CLEANING COMPLETE!")
    print(f"📊 Saved {len(clean_df)} rows and {len(clean_df.columns)} columns.")
    print(f"💾 Output saved to: '{OUTPUT_FILE}'")
    print("="*60 + "\n")

if __name__ == "__main__":
    clean_posts()