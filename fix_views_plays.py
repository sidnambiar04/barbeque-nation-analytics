import pandas as pd
import numpy as np

def fix_views_and_plays():
    print("📦 Reading 'instagramclean.csv'...")
    df = pd.read_csv('instagramclean.csv', low_memory=False)

    # -------------------------------------------------------------
    # STEP 1: FIX MISSING 'videoPlayCount' FOR VIDEO POSTS
    # -------------------------------------------------------------
    # Calculate median Play-to-View ratio for valid video posts (~4.55x)
    video_play_mask = (df['type'] == 'Video') & (df['videoPlayCount'] > 0)
    
    if video_play_mask.sum() > 0:
        median_play_view_ratio = (
            df.loc[video_play_mask, 'videoPlayCount'] / (df.loc[video_play_mask, 'videoViewCount'] + 1)
        ).median()
        
        print(f"📊 Calculated Median Play-to-View Ratio: {median_play_view_ratio:.2f}x")

        # Impute missing videoPlayCount for Video posts proportional to their views
        zero_play_videos = (df['type'] == 'Video') & (df['videoPlayCount'] == 0)
        df.loc[zero_play_videos, 'videoPlayCount'] = (
            (df.loc[zero_play_videos, 'videoViewCount'] + 1) * median_play_view_ratio
        ).round().astype(int)
        
        print(f"✅ Dynamically imputed {zero_play_videos.sum()} video posts with estimated play counts!")

    # -------------------------------------------------------------
    # STEP 2: HANDLE PHOTO / CAROUSEL POSTS (Image / Sidecar)
    # -------------------------------------------------------------
    
    # -------------------------------------------------------------
    # STEP 3: SAVE UPDATED DATASET
    # -------------------------------------------------------------
    df.to_csv('instagram.csv', index=False)
    print("💾 Updated 'instagramclean.csv' saved successfully!")

if __name__ == "__main__":
    fix_views_and_plays()