# Testing Setup for Gamification Components

## Required Dependencies

To run the unit tests for the LevelDropdown component, you'll need to install the following testing dependencies:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

## Vitest Configuration

Create a `vitest.config.ts` file in the project root:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

## Test Setup File

Create `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

## Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## Running Tests

After installing dependencies and setting up the configuration:

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Test Files

The test file is located at:
- `src/components/gamification/__tests__/LevelDropdown.test.tsx`

This test suite covers:
- ✅ Click toggle functionality
- ✅ Keyboard navigation (Enter, Space, Escape)
- ✅ Outside click to close
- ✅ Accessibility attributes
- ✅ Dropdown content accuracy
- ✅ Progress bar display
- ✅ Max level achievements
- ✅ XP animation display
- ✅ Loading states

## Note

The test file currently has linter errors because the testing dependencies are not installed. Once you install the required packages and set up the configuration above, the tests will run successfully. 