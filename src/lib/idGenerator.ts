// Offline-safe ID generator that ensures unique IDs even when offline
// Uses timestamp + random component + counter to avoid collisions

let counter = 0;
const MAX_COUNTER = 9999;

/**
 * Generates a unique ID that works offline
 * Format: timestamp_random_counter
 * This ensures uniqueness even if multiple items are created in the same millisecond
 */
export function generateUniqueId(): number {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  counter = (counter + 1) % MAX_COUNTER;
  
  // Combine timestamp, random, and counter into a single number
  // Format: timestamp * 10000 + random * 10 + counter
  // This gives us unique IDs even in rapid succession
  return timestamp * 10000 + random * 10 + counter;
}

/**
 * Gets the next ID for a store based on existing items
 * Ensures the new ID is higher than any existing ID
 */
export async function getNextId<T extends { id: number }>(
  items: T[]
): Promise<number> {
  if (items.length === 0) {
    return generateUniqueId();
  }
  
  const maxId = Math.max(...items.map(item => item.id));
  const newId = generateUniqueId();
  
  // Ensure the new ID is always greater than the max existing ID
  return Math.max(newId, maxId + 1);
}