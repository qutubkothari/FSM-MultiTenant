# Contributing to FSM Mobile App

## Development Workflow

### Getting Started
1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

### Code Style

#### TypeScript
- Use strict mode
- No `any` types
- Prefer interfaces over types for object shapes
- Use meaningful variable names

#### React Native
- Functional components only
- Use hooks
- Avoid inline styles for complex components
- Use StyleSheet.create()

#### File Organization
```
- One component per file
- Services in /src/services
- Types in /src/types
- Utils in /src/utils
- Screens in /src/screens
```

### Naming Conventions

#### Files
- Components: `PascalCase.tsx` (e.g., `LoginScreen.tsx`)
- Services: `kebab-case.service.ts` (e.g., `ai.service.ts`)
- Utils: `kebab-case.ts` (e.g., `analytics.ts`)
- Types: `kebab-case.types.ts` (e.g., `database.types.ts`)

#### Code
- Components: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `PascalCase` prefixed with `I` if needed
- Types: `PascalCase`

### Commit Messages

Format: `type(scope): message`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

Examples:
```
feat(visits): add photo attachment support
fix(sync): resolve offline sync race condition
docs(readme): update installation instructions
```

### Testing

Run before committing:
```bash
npm run lint          # Check code style
npm run type-check    # TypeScript validation
npm test             # Run tests (when available)
```

### Pull Request Process

1. Update documentation if needed
2. Test on both Android and iOS if possible
3. Ensure no lint errors
4. Update CHANGELOG.md
5. Create PR with clear description
6. Link related issues

### Adding New Features

#### New Screen
1. Create in `/src/screens/NewScreen.tsx`
2. Add navigation type in `/src/types/index.ts`
3. Register in `App.tsx`
4. Update documentation

#### New Service
1. Create in `/src/services/new.service.ts`
2. Follow singleton pattern
3. Add types in `/src/types/`
4. Write JSDoc comments
5. Export from service file

#### New Store
1. Create in `/src/store/newStore.ts`
2. Use Zustand
3. Type all state and actions
4. Document state shape

### Database Changes

1. Update `/database/schema.sql`
2. Add migration SQL if needed
3. Update TypeScript types
4. Update Supabase service
5. Test with real database
6. Document changes

### API Integrations

1. Add service in `/src/services/`
2. Add configuration in `/src/config/`
3. Type all responses
4. Handle errors gracefully
5. Add offline fallback if applicable

### Performance Guidelines

- Use React.memo for expensive components
- Avoid anonymous functions in render
- Use useCallback for event handlers
- Lazy load heavy components
- Optimize images
- Profile with React DevTools

### Security

- Never commit API keys
- Use environment variables
- Validate all inputs
- Sanitize user data
- Follow RLS policies
- Use HTTPS only

### Documentation

Update these when adding features:
- README.md - High-level overview
- SETUP_GUIDE.md - Setup instructions
- Code comments - Complex logic
- Type definitions - New data structures

### Questions?

- Check existing issues
- Review documentation
- Ask in discussions
- Contact maintainers

## Code Review Checklist

- [ ] Code follows style guide
- [ ] No console.logs in production code
- [ ] Types are properly defined
- [ ] Error handling implemented
- [ ] Documentation updated
- [ ] No performance regressions
- [ ] Tested on real device
- [ ] No security vulnerabilities
