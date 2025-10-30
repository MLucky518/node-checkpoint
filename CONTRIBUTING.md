# Contributing to node-checkpoint

Thank you for considering contributing to node-checkpoint! This document outlines the process for contributing to this project.

## Code of Conduct

Be respectful and professional in all interactions. We aim to maintain a welcoming and inclusive environment.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in the [Issues](https://github.com/yourusername/node-checkpoint/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Node.js version and database type
   - Any relevant error messages

### Suggesting Features

1. Check if the feature has already been suggested
2. Create a new issue describing:
   - The problem you're trying to solve
   - Your proposed solution
   - Any alternative solutions considered

### Pull Requests

1. Fork the repository
2. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes following the code style
4. Test your changes thoroughly
5. Commit with clear, descriptive messages
6. Push to your fork
7. Create a pull request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/node-checkpoint.git
cd node-checkpoint

# Install dependencies
npm install

# Set up test database (optional)
# Create a PostgreSQL or MySQL database for testing
```

## Code Style

- Use ES modules (import/export)
- Follow existing code patterns
- Add JSDoc comments for all public functions and classes
- Use meaningful variable and function names
- Keep functions focused and single-purpose

## Testing

Before submitting a PR:

1. Test with both PostgreSQL and MySQL if possible
2. Test all CLI commands
3. Ensure migrations work both up and down
4. Check that error handling works correctly

## Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Reference issues and pull requests when relevant
- Keep first line under 72 characters

## Documentation

- Update README.md if you change functionality
- Add JSDoc comments for new functions/classes
- Include examples for new features

## Questions?

Feel free to open an issue with the "question" label if you need help or clarification.
