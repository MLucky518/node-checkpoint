#!/bin/bash

# Clean up all test data from databases

echo "🧹 Cleaning up test databases..."

# PostgreSQL cleanup
echo "Cleaning PostgreSQL..."
docker exec checkpoint-test-postgres psql -U postgres -d checkpoint_test -c "
  DROP TABLE IF EXISTS pg_test_users CASCADE;
  DROP TABLE IF EXISTS pg_test_posts CASCADE;
  DROP TABLE IF EXISTS table_one CASCADE;
  DROP TABLE IF EXISTS table_two CASCADE;
  DROP TABLE IF EXISTS test_table CASCADE;
  DELETE FROM test_schema_migrations;
" 2>&1 | grep -v "does not exist"

# MySQL cleanup
echo "Cleaning MySQL..."
docker exec checkpoint-test-mysql mysql -uroot -ppassword checkpoint_test -e "
  DROP TABLE IF EXISTS mysql_test_users;
  DROP TABLE IF EXISTS mysql_test_posts;
  DROP TABLE IF EXISTS test_table;
  DELETE FROM test_schema_migrations;
" 2>&1 | grep -v "Using a password"

echo "✅ Cleanup complete!"
echo ""
echo "Verify with: node verify-tables.js"
