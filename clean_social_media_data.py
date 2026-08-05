import pandas as pd
import numpy as np
import re
import os

# ======================================================
# File Paths
# ======================================================

FB_POSTS_FILE = "cleaned_fb_posts_data.csv"
FB_REELS_FILE = "cleaned_fb_reels_data.csv"
LINKEDIN_FILE = "cleaned_linkedin_data.csv"

OUTPUT_FOLDER = "cleaned_output"

os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# ======================================================
# Text Cleaning Function
# ======================================================

def clean_text(text):

    if pd.isna(text):
        return ""

    text = str(text)

    # lowercase
    text = text.lower()

    # remove urls
    text = re.sub(r"http\S+|www\S+", "", text)

    # remove mentions
    text = re.sub(r"@\w+", "", text)

    # remove hashtag symbol
    text = text.replace("#", "")

    # remove punctuation
    text = re.sub(r"[^\w\s]", "", text)

    # remove numbers (optional)
    text = re.sub(r"\d+", "", text)

    # remove extra spaces
    text = re.sub(r"\s+", " ", text).strip()

    return text


# ======================================================
# FACEBOOK POSTS
# ======================================================

def clean_facebook_posts():

    print("\nCleaning Facebook Posts...")

    df = pd.read_csv(FB_POSTS_FILE)

    print("Original Shape:", df.shape)

    # -------------------------------------------
    # Remove duplicate rows
    # -------------------------------------------

    df.drop_duplicates(inplace=True)

    # Remove duplicate Post IDs

    if "postId" in df.columns:
        df.drop_duplicates(subset="postId", inplace=True)

    # -------------------------------------------
    # Fill Missing Values
    # -------------------------------------------

    numeric_cols = [
        "likes",
        "comments",
        "shares",
        "viewsCount",
        "videoPostViewCount"
    ]

    for col in numeric_cols:

        if col in df.columns:
            df[col] = df[col].fillna(0)

    if "link" in df.columns:
        df["link"] = df["link"].fillna("No Link")

    # -------------------------------------------
    # Convert datetime
    # -------------------------------------------

    if "time" in df.columns:

        df["time"] = pd.to_datetime(df["time"], errors="coerce")

        df["year"] = df["time"].dt.year
        df["month"] = df["time"].dt.month_name()
        df["weekday"] = df["time"].dt.day_name()
        df["hour"] = df["time"].dt.hour

    # -------------------------------------------
    # Text Cleaning
    # -------------------------------------------

    if "text" in df.columns:

        df["clean_text"] = df["text"].apply(clean_text)

        df["word_count"] = df["clean_text"].apply(
            lambda x: len(x.split())
        )

        df["character_count"] = df["clean_text"].str.len()

    # -------------------------------------------
    # Engagement
    # -------------------------------------------

    if {"likes", "comments", "shares"}.issubset(df.columns):

        df["engagement"] = (
            df["likes"]
            + df["comments"]
            + df["shares"]
        )

    if {"engagement", "viewsCount"}.issubset(df.columns):

        df["engagement_rate"] = np.where(
            df["viewsCount"] > 0,
            df["engagement"] / df["viewsCount"],
            0
        )

    # -------------------------------------------
    # Remove unnecessary columns
    # -------------------------------------------

    df.drop(
        columns=["processed_at"],
        inplace=True,
        errors="ignore"
    )

    output = os.path.join(
        OUTPUT_FOLDER,
        "facebook_posts_cleaned.csv"
    )

    df.to_csv(output, index=False)

    print("Saved:", output)
    print("Final Shape:", df.shape)


# ======================================================
# FACEBOOK REELS
# ======================================================

def clean_facebook_reels():

    print("\nCleaning Facebook Reels...")

    df = pd.read_csv(FB_REELS_FILE)

    print("Original Shape:", df.shape)

    df.drop_duplicates(inplace=True)

    # Remove useless text column
    df.drop(columns=["text"], inplace=True, errors="ignore")

    # Missing music
    if "track_title" in df.columns:
        df["track_title"] = df["track_title"].fillna("Unknown")

    # Convert play count if needed
    if "play_count_reduced" in df.columns:

        def convert_views(x):

            if pd.isna(x):
                return np.nan

            x = str(x).upper().replace(",", "")

            if x.endswith("K"):
                return float(x[:-1]) * 1000

            elif x.endswith("M"):
                return float(x[:-1]) * 1000000

            elif x.endswith("B"):
                return float(x[:-1]) * 1000000000

            try:
                return float(x)

            except:
                return np.nan

        df["play_count_numeric"] = df[
            "play_count_reduced"
        ].apply(convert_views)

    # Convert datetime

    if "time" in df.columns:

        df["time"] = pd.to_datetime(
            df["time"],
            errors="coerce"
        )

        df["year"] = df["time"].dt.year
        df["month"] = df["time"].dt.month_name()
        df["weekday"] = df["time"].dt.day_name()
        df["hour"] = df["time"].dt.hour

    # Extract Reel ID

    if "shareable_url" in df.columns:

        df["reel_id"] = df["shareable_url"].str.extract(
            r"reel/(\d+)"
        )

    df.drop(
        columns=["processed_at", "inputUrl"],
        inplace=True,
        errors="ignore"
    )

    output = os.path.join(
        OUTPUT_FOLDER,
        "facebook_reels_cleaned.csv"
    )

    df.to_csv(output, index=False)

    print("Saved:", output)
    print("Final Shape:", df.shape)


# ======================================================
# LINKEDIN
# ======================================================

def clean_linkedin():

    print("\nCleaning LinkedIn...")

    df = pd.read_csv(LINKEDIN_FILE)

    print("Original Shape:", df.shape)

    df.drop_duplicates(inplace=True)

    # Datetime

    if "createdAt" in df.columns:

        df["createdAt"] = pd.to_datetime(
            df["createdAt"],
            errors="coerce"
        )

        df["year"] = df["createdAt"].dt.year
        df["month"] = df["createdAt"].dt.month_name()
        df["weekday"] = df["createdAt"].dt.day_name()
        df["hour"] = df["createdAt"].dt.hour

    # Missing Authors

    author_cols = [
        "author/name",
        "author/linkedinUrl",
        "author/info"
    ]

    for col in author_cols:

        if col in df.columns:
            df[col] = df[col].fillna("Unknown")

    # Repost

    if "repostId" in df.columns:
        df["repostId"] = df["repostId"].fillna(0)

    # Text

    if "post_text" in df.columns:

        df["clean_text"] = df["post_text"].apply(clean_text)

        df["word_count"] = df["clean_text"].apply(
            lambda x: len(x.split())
        )

        df["character_count"] = df["clean_text"].str.len()

    df.drop(
        columns=["processed_at"],
        inplace=True,
        errors="ignore"
    )

    output = os.path.join(
        OUTPUT_FOLDER,
        "linkedin_cleaned.csv"
    )

    df.to_csv(output, index=False)

    print("Saved:", output)
    print("Final Shape:", df.shape)


# ======================================================
# MAIN
# ======================================================

if __name__ == "__main__":

    print("=" * 60)
    print("SOCIAL MEDIA DATA CLEANING")
    print("=" * 60)

    clean_facebook_posts()

    clean_facebook_reels()

    clean_linkedin()

    print("\nCleaning Completed Successfully!")

    print("\nCleaned datasets are saved inside:")
    print("cleaned_output/")