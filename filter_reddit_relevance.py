import pandas as pd

# Load reddit.csv
df = pd.read_csv('reddit1.csv')
print(f"📦 Original Dataset Rows: {len(df)}")

# List of valid food & regional Indian subreddits
RELEVANT_SUBREDDITS = [
    'Aajmainekhaya', 'IndianFoodPhotos', 'indiafood', 'BBQ', 'bangalorefoodies', 
    '1200isplenty', 'foodiefam', 'foodquestions', 'FoodPorn', 'burgers', 'snacking', 
    'Zomato', 'MaaOoriVanta', 'hyderabad', 'pune', 'DubaiMallus', 'Bhopal', 'kolkata', 
    'delhi', 'kalyan_dombivli', 'Patna', 'mumbai', 'indiasocial', 'gurgaon', 
    'Jamshedpur', 'Visakhapatnam', 'Bengaluru', 'Indore', 'india'
]

def is_relevant(row):
    sub = str(row.get('subreddit', ''))
    content = str(row.get('content_clean', '')).lower()
    url = str(row.get('url', '')).lower()

    # 1. Must belong to a food or Indian regional subreddit
    if sub not in RELEVANT_SUBREDDITS:
        return False

    # 2. Drop bot boilerplate and rule disclaimers
    if any(bot_term in content for bot_term in ['automoderator', 'sub rules', 'rule-breaking']):
        return False

    # 3. Must relate to BBQ, buffet, food, or dining context
    has_food_context = any(kw in url or kw in content for kw in ['barbeque', 'bbq', 'buffet', 'food', 'restaurant', 'grill', 'eat', 'starter'])
    return has_food_context

# Filter dataset
df_clean = df[df.apply(is_relevant, axis=1)].copy()

# Save cleaned output
df_clean.to_csv('reddit.csv', index=False)

print("\n" + "="*50)
print(f"🏆 CLEANING COMPLETE!")
print(f"📊 Retained {len(df_clean)} strictly relevant Barbeque Nation / food comments.")
print("💾 Overwritten 'reddit.csv' successfully!")
print("="*50)