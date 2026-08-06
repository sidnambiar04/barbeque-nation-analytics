import pandas as pd
import os
from datetime import datetime

# Define file mappings: (Raw input filename, Cleaned output filename)
DATASET_MAP = {
    "youtube": ("ytacc_scrapper.csv", "cleaned_ytacc_data.csv"),
    "linkedin": ("linkedin_scrapper.csv", "cleaned_linkedin_data.csv"),
    "reels": ("fbreels_scrapper.csv", "cleaned_fb_reels_data.csv"),
    "posts": ("fbposts_scrapper.csv", "cleaned_fb_posts_data.csv")
}

def clean_youtube(raw_path, out_path):
    if not os.path.exists(raw_path):
        print(f"⚠️ Cannot find YouTube file: {raw_path}")
        return
    
    print(f"📦 Processing YouTube dataset: {raw_path}")
    df = pd.read_csv(raw_path, low_memory=False)
    
    keep_cols = ['id', 'title', 'text', 'channelName', 'channelId', 'viewCount', 'likes', 'commentsCount', 'date', 'url']
    available = [c for c in keep_cols if c in df.columns]
    
    clean_df = df[available].copy()
    clean_df.rename(columns={'text': 'description_text'}, inplace=True)
    clean_df.drop_duplicates(subset=['id'], inplace=True)
    clean_df['processed_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    clean_df.to_csv(out_path, index=False)
    print(f"✅ Saved cleaned YouTube file: '{out_path}' ({len(clean_df)} rows, {len(clean_df.columns)} columns)\n")

def clean_linkedin(raw_path, out_path):
    if not os.path.exists(raw_path):
        print(f"⚠️ Cannot find LinkedIn file: {raw_path}")
        return
        
    print(f"📦 Processing LinkedIn dataset: {raw_path}")
    df = pd.read_csv(raw_path, low_memory=False)
    
    # Consolidate post text from 'content' and 'commentary'
    df['post_text'] = df['content'].fillna(df['commentary']) if 'content' in df.columns and 'commentary' in df.columns else df.get('content', df.get('commentary', ''))
    
    keep_cols = ['id', 'type', 'createdAt', 'post_text', 'linkedinUrl', 'author/name', 'author/linkedinUrl', 'author/info', 'repostId']
    available = [c for c in keep_cols if c in df.columns]
    
    clean_df = df[available].copy()
    clean_df.dropna(subset=['post_text'], inplace=True)
    clean_df = clean_df[clean_df['post_text'].astype(str).str.strip() != '']
    clean_df.drop_duplicates(subset=['id'], inplace=True)
    clean_df['processed_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    clean_df.to_csv(out_path, index=False)
    print(f"✅ Saved cleaned LinkedIn file: '{out_path}' ({len(clean_df)} rows, {len(clean_df.columns)} columns)\n")

def clean_posts(raw_path, out_path):
    if not os.path.exists(raw_path):
        print(f"⚠️ Cannot find Posts file: {raw_path}")
        return
        
    print(f"📦 Processing FB/IG Posts dataset: {raw_path}")
    df = pd.read_csv(raw_path, low_memory=False)
    
    keep_cols = ['postId', 'pageName', 'text', 'time', 'likes', 'comments', 'shares', 'viewsCount', 'videoPostViewCount', 'url', 'link']
    available = [c for c in keep_cols if c in df.columns]
    
    clean_df = df[available].copy()
    clean_df.dropna(subset=['text'], inplace=True)
    clean_df.drop_duplicates(subset=['postId'], inplace=True)
    clean_df['processed_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    clean_df.to_csv(out_path, index=False)
    print(f"✅ Saved cleaned FB/IG Posts file: '{out_path}' ({len(clean_df)} rows, {len(clean_df.columns)} columns)\n")

def clean_reels(raw_path, out_path):
    if not os.path.exists(raw_path):
        print(f"⚠️ Cannot find Reels file: {raw_path}")
        return
        
    print(f"📦 Processing Reels dataset: {raw_path}")
    df = pd.read_csv(raw_path, low_memory=False)
    
    keep_cols = ['topLevelReelUrl', 'shareable_url', 'text', 'time', 'playCountRounded', 'play_count_reduced', 'track_title', 'inputUrl']
    available = [c for c in keep_cols if c in df.columns]
    
    clean_df = df[available].copy()
    clean_df.drop_duplicates(subset=['shareable_url'], inplace=True)
    clean_df['processed_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    clean_df.to_csv(out_path, index=False)
    print(f"✅ Saved cleaned Reels file: '{out_path}' ({len(clean_df)} rows, {len(clean_df.columns)} columns)\n")

if __name__ == "__main__":
    print("="*60)
    print("🚀 COMPRESSING AND CLEANING NEW SOCIAL MEDIA DATASETS")
    print("="*60 + "\n")
    
    clean_youtube(DATASET_MAP["youtube"][0], DATASET_MAP["youtube"][1])
    clean_linkedin(DATASET_MAP["linkedin"][0], DATASET_MAP["linkedin"][1])
    clean_posts(DATASET_MAP["posts"][0], DATASET_MAP["posts"][1])
    clean_reels(DATASET_MAP["reels"][0], DATASET_MAP["reels"][1])
    
    print("="*60)
    print("🏆 ALL DATASETS PROCESSED AND CLEANED SUCCESSFULLY!")
    print("="*60)