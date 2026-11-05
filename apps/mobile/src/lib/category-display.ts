// Emoji shown for a category: its own emoji, a dot when it has none, or "?" when the category is unknown.
export function categoryEmoji(category: { emoji: string } | undefined): string {
  if (!category) return '❓';
  return category.emoji.trim() || '•';
}

// "🍔 Food", or just "Gifts" when the category has no emoji.
export function categoryLabel(category: { emoji: string; name: string }): string {
  const e = category.emoji.trim();
  return e ? `${e} ${category.name}` : category.name;
}
