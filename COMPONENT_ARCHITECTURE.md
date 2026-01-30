# Component Architecture

## 📁 Folder Structure

```
src/
├── components/
│   ├── ui/                    # Reusable UI components (following React Aria patterns)
│   │   ├── TabGroup.jsx       # Accessible tab navigation
│   │   ├── Select.jsx         # Accessible dropdown select
│   │   ├── Slider.jsx         # Accessible range slider
│   │   ├── TextField.jsx      # Accessible text input
│   │   ├── Tooltip.jsx        # Accessible tooltip
│   │   ├── ErrorBanner.jsx    # Error display component
│   │   └── index.js           # Barrel export
│   └── features/              # Feature-specific components (future)
│       └── OptionsParameters/ # Options parameter controls
├── hooks/                     # Custom React hooks
│   └── useOptionsData.js      # Options data fetching & state management
├── App.jsx                    # Main application (to be refactored)
└── RiskGraph.jsx             # Chart component

```

## 🎯 Design Principles

### 1. **React Aria Patterns (No Library)**
- ✅ Proper ARIA attributes
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Screen reader support
- ❌ No React Aria library (keeping bundle small)

### 2. **Component Philosophy**
- **Composable**: Small, focused components
- **Accessible**: WCAG 2.1 AA compliant
- **Reusable**: Can be used across the app
- **Typed**: Ready for TypeScript migration
- **Documented**: Clear props and usage

### 3. **Separation of Concerns**
- **UI Components** (`components/ui/`): Pure presentation
- **Feature Components** (`components/features/`): Business logic
- **Hooks** (`hooks/`): Data fetching & state
- **App**: Composition & layout

## 📚 Component API

### TabGroup & Tab
```jsx
import { TabGroup, Tab } from '@/components/ui';

<TabGroup ariaLabel="Options strategy selector">
  <Tab 
    isSelected={mode === 'CSP'}
    onSelect={() => setMode('CSP')}
    ariaControls="strategy-panel"
  >
    Cash Secured Put
  </Tab>
  <Tab isSelected={mode === 'CC'} onSelect={() => setMode('CC')}>
    Covered Call
  </Tab>
</TabGroup>
```

**Features:**
- Arrow key navigation (Left/Right)
- Auto tab index management
- ARIA roles and states

### Select
```jsx
import { Select } from '@/components/ui';

<Select
  label="Strike Price"
  value={strike}
  onChange={(e) => setStrike(e.target.value)}
  options={strikeOptions.map(s => ({ value: s, label: `$${s}` }))}
  ariaLabel="Select strike price"
/>
```

**Features:**
- Automatic ID generation
- Label association
- Custom option rendering
- Keyboard accessible

### Slider
```jsx
import { Slider } from '@/components/ui';

<Slider
  label="Available Capital"
  value={cash}
  onChange={(e) => setCash(e.target.value)}
  min={1000}
  max={1000000}
  formatValue={(val) => `$${val.toLocaleString()}`}
/>
```

**Features:**
- Keyboard support (Arrow keys, Home, End)
- ARIA value announcements
- Custom value formatting

### TextField
```jsx
import { TextField } from '@/components/ui';

<TextField
  label="Stock Symbol"
  value={ticker}
  onChange={(e) => setTicker(e.target.value)}
  onKeyDown={(e) => e.key === 'Enter' && search()}
  maxLength={10}
  hint="Press Enter to search"
  hideLabel={false}
/>
```

**Features:**
- Associated labels
- Hint text for screen readers
- Focus ring
- Validation support

### Tooltip
```jsx
import { Tooltip } from '@/components/ui';

<Tooltip content="Strike is 5% below current price">
  Safety Buffer
</Tooltip>
```

**Features:**
- Mouse hover support
- Keyboard focus support
- ARIA tooltip role

### ErrorBanner
```jsx
import { ErrorBanner } from '@/components/ui';

<ErrorBanner 
  message={error} 
  onDismiss={() => setError(null)} 
/>
```

**Features:**
- ARIA live region
- Dismissible
- Alert role

## 🔧 Custom Hooks

### useOptionsData
```jsx
import { useOptionsData } from '@/hooks/useOptionsData';

const {
  ticker,
  setTicker,
  loading,
  error,
  mode,
  setMode,
  strike,
  premium,
  fetchMarketData,
  currentPrice
} = useOptionsData('TSLA', 'CSP');
```

**Encapsulates:**
- API calls
- State management
- Error handling
- Mode switching logic

## 🚀 Next Steps

1. **Refactor App.jsx** to use new components
2. **Create feature components**:
   - `OptionsParameters` - Left sidebar
   - `MetricsDisplay` - Metrics section
   - `PriceHeader` - Header with current price
3. **Add PropTypes** or migrate to TypeScript
4. **Create Storybook** for component documentation
5. **Add unit tests** for components

## 📊 Benefits

✅ **Maintainable**: Clear separation of concerns
✅ **Scalable**: Easy to add new components
✅ **Accessible**: Built-in a11y
✅ **Testable**: Isolated components
✅ **Documented**: Self-documenting API
✅ **Future-proof**: Ready for React Aria migration if needed

## 🎨 Styling Approach

- **Tailwind CSS** for all styling
- **Consistent patterns** across components
- **Focus states** on all interactive elements
- **Dark theme** optimized
- **Responsive** by default

## 🔍 Code Quality

- **ESLint compliant**
- **No console.logs** in production
- **Error boundaries** ready
- **Performance optimized**
- **Accessibility audited**
