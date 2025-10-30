# Examples

This directory contains example migration files demonstrating common use cases.

## Migration Files

### 1. `20250130120000_create_users_table.js`
Creates a users table with:
- Auto-incrementing ID
- Username and email (both unique)
- Password hash field
- First and last name
- Active status flag
- Timestamps
- Email index for faster lookups

### 2. `20250130120100_create_posts_table.js`
Creates a posts table with:
- Foreign key relationship to users
- Title, content, and URL slug
- Published status and timestamp
- Multiple indexes for common queries
- Cascade delete (when user is deleted, their posts are too)

### 3. `20250130120200_add_bio_to_users.js`
Adds a bio column to the existing users table
- Demonstrates ALTER TABLE syntax
- Shows a simple column addition/removal

## Using These Examples

You can copy these files to your own migrations directory and modify them as needed.

**Note**: These examples use PostgreSQL syntax. For MySQL, you would need to adjust:
- `SERIAL` → `INT AUTO_INCREMENT`
- Column types may vary slightly

## Testing the Examples

1. Copy `migration.config.example.js` to `migration.config.js`
2. Update database credentials
3. Copy example migrations to your migrations directory
4. Run migrations:
   ```bash
   checkpoint up
   ```

5. Check status:
   ```bash
   checkpoint status
   ```

6. Rollback if needed:
   ```bash
   checkpoint down
   ```
