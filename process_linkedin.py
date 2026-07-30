import pandas as pd
import os
from datetime import datetime

RAW_FILE = "linkedin_scrapper.csv"
OUTPUT_FILE = "cleaned_linkedin_data.csv"

def clean_linkedin():
    if not os.path.exists(RAW_FILE):
        print(f"⚠️ Cannot find LinkedIn file: {RAW_FILE}")
        return
        
    print(f"📦 Processing LinkedIn dataset: {RAW_FILE}")
    df = pd.read_csv(RAW_FILE, low_memory=False)
    
    # Consolidate post text from 'content' and 'commentary'
    if 'content' in df.columns and 'commentary' in df.columns:
        df['post_text'] = df['content'].fillna(df['commentary'])
    else:
        df['post_text'] = df.get('content', df.get('commentary', ''))
    
    keep_cols = ['id', 'type', 'createdAt', 'post_text', 'linkedinUrl', 'author/name', 'author/linkedinUrl', 'author/info', 'repostId']
    available = [c for c in keep_cols if c in df.columns]
    
    clean_df = df[available].copy()
    clean_df.dropna(subset=['post_text'], inplace=True)
    clean_df = clean_df[clean_df['post_text'].astype(str).str.strip() != '']
    clean_df.drop_duplicates(subset=['id'], inplace=True)
    clean_df['processed_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    clean_df.to_csv(OUTPUT_FILE, index=False)
    
    print("\n" + "="*60)
    print("🏆 LINKEDIN DATASET CLEANING COMPLETE!")
    print(f"📊 Saved {len(clean_df)} rows and {len(clean_df.columns)} columns.")
    print(f"💾 Output saved to: '{OUTPUT_FILE}'")
    print("="*60 + "\n")

if __name__ == "__main__":
    clean_linkedin()