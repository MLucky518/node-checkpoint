# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-30

### Added
- Initial release
- Support for PostgreSQL and MySQL databases
- CLI commands: init, up, down, status, create
- Timestamp-based migration files
- Connection pooling for PostgreSQL
- Environment variable support
- Rails-like migration workflow
- JSDoc documentation
- Comprehensive README with examples
- Example migrations
- Input validation and error handling
- SQL injection prevention for table names
- MIT License

### Security
- Table name validation to prevent SQL injection
- Parameterized queries for migration tracking
