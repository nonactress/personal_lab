# React Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate PersonaLab frontend from Alpine.js + single HTML file to React 18 + TypeScript + Vite + shadcn/ui + Tailwind, served by FastAPI via `frontend/dist/`.

**Architecture:** Root-level `frontend/` Vite project. Global state via `AppContext`. Four screen components routed by `screen` state. API calls centralized in `lib/api.ts`. FastAPI mounts `frontend/dist/` as static files (one-line change). Persona widget completely removed.

**Tech Stack:** React 18, TypeScript 5.7, Vite 6, shadcn/ui (manual), Tailwind CSS 3, Radix UI primitives, FastAPI (unchanged)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/package.json` | Create | Dependencies + scripts |
| `frontend/vite.config.ts` | Create | Vite config + dev proxy |
| `frontend/tsconfig.json` + `tsconfig.app.json` + `tsconfig.node.json` | Create | TypeScript config |
| `frontend/index.html` | Create | HTML shell + font links |
| `frontend/tailwind.config.js` | Create | Tailwind + font families |
| `frontend/postcss.config.js` | Create | PostCSS pipeline |
| `frontend/src/index.css` | Create | Tailwind directives + CSS vars (dark theme) |
| `frontend/src/lib/utils.ts` | Create | `cn()` utility |
| `frontend/src/lib/api.ts` | Create | Fetch wrappers for `/build-cast` and `/analyze` |
| `frontend/src/types.ts` | Create | All TypeScript types and interfaces |
| `frontend/src/context/AppContext.tsx` | Create | Global state via React Context |
| `frontend/src/components/ui/button.tsx` | Create | shadcn/ui Button |
| `frontend/src/components/ui/input.tsx` | Create | shadcn/ui Input |
| `frontend/src/components/ui/badge.tsx` | Create | shadcn/ui Badge |
| `frontend/src/components/ui/textarea.tsx` | Create | shadcn/ui Textarea |
| `frontend/src/components/ui/collapsible.tsx` | Create | Radix Collapsible wrapper |
| `frontend/src/components/ui/alert.tsx` | Create | Error alert |
| `frontend/src/components/screens/SourceScreen.tsx` | Create | File/localhost/URL source selection |
| `frontend/src/components/screens/TargetSelectScreen.tsx` | Create | Demographic chips + /build-cast |
| `frontend/src/components/screens/ProgressScreen.tsx` | Create | Step indicator + /analyze call |
| `frontend/src/components/screens/ResultScreen.tsx` | Create | Sidebar nav + tab content |
| `frontend/src/components/result/TldrSection.tsx` | Create | Risk banner, bias gap, friction map |
| `frontend/src/components/result/IssuesSection.tsx` | Create | Collapsible issue cards |
| `frontend/src/components/result/FixesSection.tsx` | Create | Fix prompts + copy |
| `frontend/src/components/result/CodeSection.tsx` | Create | Annotated code + iframe preview |
| `frontend/src/App.tsx` | Create | Screen router |
| `frontend/src/main.tsx` | Create | React root + AppProvider |
| `src/backend/api.py` | Modify line 160 | StaticFiles path → `frontend/dist` |
| `src/frontend/index.html` + `app.js` + `style.css` + `ui.py` | Delete | Legacy Alpine.js files |

---

### Task 1: Scaffold Vite project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.app.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/index.html`

- [ ] **Step 1: Create `frontend/package.json`**

Run from repo root:
```powershell
New-Item -ItemType Directory -Path frontend
```

Create `frontend/package.json`:
```json
{
  "name": "personalab-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.469.0",
    "tailwind-merge": "^2.6.0",
    "@radix-ui/react-collapsible": "^1.1.2",
    "@radix-ui/react-slot": "^1.1.1"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.1",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vite": "^6.0.11"
  }
}
```

- [ ] **Step 2: Create `frontend/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/analyze':    'http://localhost:8000',
      '/build-cast': 'http://localhost:8000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
```

- [ ] **Step 3: Create TypeScript configs**

Create `frontend/tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Create `frontend/tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

Create `frontend/tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create `frontend/index.html`**

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PersonaLab — UX Linter for Vibe Coders</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Install dependencies**

```bash
cd frontend && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat(frontend): scaffold Vite + React 18 + TypeScript project"
```

---

### Task 2: Tailwind + shadcn/ui base components

**Files:**
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/src/index.css`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/input.tsx`
- Create: `frontend/src/components/ui/badge.tsx`
- Create: `frontend/src/components/ui/textarea.tsx`
- Create: `frontend/src/components/ui/collapsible.tsx`
- Create: `frontend/src/components/ui/alert.tsx`

- [ ] **Step 1: Create `frontend/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

Create `frontend/postcss.config.js`:
```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

- [ ] **Step 2: Create `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    background-color: #0F172A;
    color: #F1F5F9;
  }
}
```

- [ ] **Step 3: Create `frontend/src/lib/utils.ts`**

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 4: Create `frontend/src/components/ui/button.tsx`**

```tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        default: 'bg-blue-500 text-white hover:bg-blue-600 w-full py-3',
        ghost:   'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
        outline: 'border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm:      'h-8 px-3 text-xs',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

- [ ] **Step 5: Create `frontend/src/components/ui/input.tsx`**

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-sans',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
```

- [ ] **Step 6: Create `frontend/src/components/ui/badge.tsx`**

```tsx
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-mono border',
  {
    variants: {
      variant: {
        critical: 'bg-red-500/10 text-red-400 border-red-500/20',
        warning:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
        info:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
        default:  'bg-slate-800 text-slate-300 border-slate-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
```

- [ ] **Step 7: Create `frontend/src/components/ui/textarea.tsx`**

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-mono',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

export { Textarea }
```

- [ ] **Step 8: Create `frontend/src/components/ui/collapsible.tsx`**

```tsx
export {
  Root as Collapsible,
  Trigger as CollapsibleTrigger,
  Content as CollapsibleContent,
} from '@radix-ui/react-collapsible'
```

- [ ] **Step 9: Create `frontend/src/components/ui/alert.tsx`**

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-400',
        className
      )}
      {...props}
    />
  )
)
Alert.displayName = 'Alert'

export { Alert }
```

- [ ] **Step 10: Smoke-test Tailwind**

Create a temp `frontend/src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <p className="font-mono text-blue-400 p-8">PersonaLab</p>
  </React.StrictMode>
)
```

```bash
cd frontend && npm run dev
```

Expected: http://localhost:5173 shows dark background + blue "PersonaLab" text.

- [ ] **Step 11: Commit**

```bash
cd ..
git add frontend/tailwind.config.js frontend/postcss.config.js frontend/src/index.css frontend/src/lib/utils.ts frontend/src/components/
git commit -m "feat(frontend): configure Tailwind and add shadcn/ui base components"
```

---

### Task 3: Types + AppContext

**Files:**
- Create: `frontend/src/types.ts`
- Create: `frontend/src/context/AppContext.tsx`

- [ ] **Step 1: Create `frontend/src/types.ts`**

```ts
export type Screen        = 'source' | 'target_select' | 'progress' | 'result'
export type SourceMode    = 'file' | 'localhost' | 'url'
export type ResultSection = 'tldr' | 'issues' | 'fixes' | 'code'

export interface PreviewPersona {
  age: number
  occupation: string
  province: string
}

export interface FrictionMapItem {
  element: string
  rate: number
  affected_count: number
}

export interface Top3Item {
  line_number?: number
  reason: string
  evidence: string
  severity: number
}

export interface IssuesSummary {
  critical: number
  warning: number
  info: number
}

export interface AnalysisResult {
  think_aloud: string
  think_aloud_steps: string[]
  fix_prompts: string[]
  risk_level: 'ok' | 'warning' | 'critical'
  risk_label: string
  top3: Top3Item[]
  developer_assumption: string
  friction_map: FrictionMapItem[]
  total_simulated: number
  abandonment_rate: number
  abandoned: boolean
  dropout_point?: string
  source_code?: string
  preview_html?: string
  issues_summary: IssuesSummary
}

export interface AppContextValue {
  screen: Screen
  setScreen: (s: Screen) => void

  sourceMode: SourceMode
  setSourceMode: (m: SourceMode) => void
  files: File[]
  setFiles: (f: File[]) => void
  sourcePort: string
  setSourcePort: (v: string) => void
  sourcePath: string
  setSourcePath: (v: string) => void
  sourceUrl: string
  setSourceUrl: (v: string) => void
  taskDesc: string
  setTaskDesc: (v: string) => void

  selectedAgeGroup: string
  setSelectedAgeGroup: (v: string) => void
  selectedSex: string
  setSelectedSex: (v: string) => void
  selectedEducation: string
  setSelectedEducation: (v: string) => void
  selectedRegion: string
  setSelectedRegion: (v: string) => void
  matchedStrata: string[]
  setMatchedStrata: (v: string[]) => void
  totalCount: number
  setTotalCount: (v: number) => void
  previewPersonas: PreviewPersona[]
  setPreviewPersonas: (v: PreviewPersona[]) => void
  castLoading: boolean
  setCastLoading: (v: boolean) => void

  result: AnalysisResult | null
  setResult: (v: AnalysisResult | null) => void
  resultSection: ResultSection
  setResultSection: (v: ResultSection) => void
  liveThought: string
  setLiveThought: (v: string) => void
  error: string
  setError: (v: string) => void

  reset: () => void
}
```

- [ ] **Step 2: Create `frontend/src/context/AppContext.tsx`**

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react'
import type {
  AppContextValue, Screen, SourceMode, ResultSection,
  AnalysisResult, PreviewPersona,
} from '@/types'

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen]                   = useState<Screen>('source')
  const [sourceMode, setSourceMode]           = useState<SourceMode>('file')
  const [files, setFiles]                     = useState<File[]>([])
  const [sourcePort, setSourcePort]           = useState('')
  const [sourcePath, setSourcePath]           = useState('')
  const [sourceUrl, setSourceUrl]             = useState('')
  const [taskDesc, setTaskDesc]               = useState('')
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('')
  const [selectedSex, setSelectedSex]         = useState('')
  const [selectedEducation, setSelectedEducation] = useState('')
  const [selectedRegion, setSelectedRegion]   = useState('모두')
  const [matchedStrata, setMatchedStrata]     = useState<string[]>([])
  const [totalCount, setTotalCount]           = useState(0)
  const [previewPersonas, setPreviewPersonas] = useState<PreviewPersona[]>([])
  const [castLoading, setCastLoading]         = useState(false)
  const [result, setResult]                   = useState<AnalysisResult | null>(null)
  const [resultSection, setResultSection]     = useState<ResultSection>('tldr')
  const [liveThought, setLiveThought]         = useState('')
  const [error, setError]                     = useState('')

  function reset() {
    setScreen('source')
    setSourceMode('file')
    setFiles([])
    setSourcePort('')
    setSourcePath('')
    setSourceUrl('')
    setTaskDesc('')
    setSelectedAgeGroup('')
    setSelectedSex('')
    setSelectedEducation('')
    setSelectedRegion('모두')
    setMatchedStrata([])
    setTotalCount(0)
    setPreviewPersonas([])
    setCastLoading(false)
    setResult(null)
    setResultSection('tldr')
    setLiveThought('')
    setError('')
  }

  return (
    <AppContext.Provider value={{
      screen, setScreen,
      sourceMode, setSourceMode,
      files, setFiles,
      sourcePort, setSourcePort,
      sourcePath, setSourcePath,
      sourceUrl, setSourceUrl,
      taskDesc, setTaskDesc,
      selectedAgeGroup, setSelectedAgeGroup,
      selectedSex, setSelectedSex,
      selectedEducation, setSelectedEducation,
      selectedRegion, setSelectedRegion,
      matchedStrata, setMatchedStrata,
      totalCount, setTotalCount,
      previewPersonas, setPreviewPersonas,
      castLoading, setCastLoading,
      result, setResult,
      resultSection, setResultSection,
      liveThought, setLiveThought,
      error, setError,
      reset,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
```

- [ ] **Step 3: Type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd ..
git add frontend/src/types.ts frontend/src/context/AppContext.tsx
git commit -m "feat(frontend): add TypeScript types and AppContext"
```

---

### Task 4: API layer

**Files:**
- Create: `frontend/src/lib/api.ts`

- [ ] **Step 1: Create `frontend/src/lib/api.ts`**

```ts
import type { AnalysisResult, PreviewPersona } from '@/types'

export interface BuildCastParams {
  age_group: string
  sex: string
  education: string
  region: string
}

export interface BuildCastResponse {
  matched_strata: string[]
  total_count: number
  preview_personas: PreviewPersona[]
}

export async function buildCast(params: BuildCastParams): Promise<BuildCastResponse> {
  const res = await fetch('/build-cast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error('build-cast')
  return res.json()
}

export interface AnalyzeParams {
  strataKeys: string[]
  task: string
  files?: File[]
  targetUrl?: string
}

export async function analyze(params: AnalyzeParams): Promise<AnalysisResult> {
  const formData = new FormData()
  formData.append('strata_keys', JSON.stringify(params.strataKeys))
  formData.append('task', params.task || '서비스 탐색하기')
  if (params.targetUrl) {
    formData.append('target_url', params.targetUrl)
  } else if (params.files) {
    for (const file of params.files) formData.append('files', file)
  }
  const res = await fetch('/analyze', { method: 'POST', body: formData })
  if (!res.ok) throw new Error('backend')
  return res.json()
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/src/lib/api.ts
git commit -m "feat(frontend): add API layer for /build-cast and /analyze"
```

---

### Task 5: SourceScreen

**Files:**
- Create: `frontend/src/components/screens/SourceScreen.tsx`

- [ ] **Step 1: Create `frontend/src/components/screens/SourceScreen.tsx`**

```tsx
import { useRef, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import type { SourceMode } from '@/types'

const ALLOWED_EXTS = ['.tsx', '.jsx', '.html', '.vue', '.js', '.ts', '.zip']

export function SourceScreen() {
  const {
    sourceMode, setSourceMode,
    files, setFiles,
    sourcePort, setSourcePort,
    sourcePath, setSourcePath,
    sourceUrl, setSourceUrl,
    taskDesc, setTaskDesc,
    error, setError,
    setSelectedAgeGroup, setSelectedSex, setSelectedEducation,
    setSelectedRegion, setMatchedStrata, setTotalCount, setPreviewPersonas,
    setScreen,
  } = useApp()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const sourceReady =
    (sourceMode === 'file' && files.length > 0) ||
    (sourceMode === 'localhost' && sourcePort.trim().length > 0) ||
    (sourceMode === 'url' && sourceUrl.trim().length > 0)

  function addFiles(incoming: File[]) {
    const filtered = incoming.filter(f =>
      ALLOWED_EXTS.some(ext => f.name.toLowerCase().endsWith(ext))
    )
    setFiles([...files, ...filtered])
  }

  function removeFile(i: number) {
    setFiles(files.filter((_, idx) => idx !== i))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  function proceed() {
    if (!sourceReady) return
    setError('')
    setSelectedAgeGroup('')
    setSelectedSex('')
    setSelectedEducation('')
    setSelectedRegion('모두')
    setMatchedStrata([])
    setTotalCount(0)
    setPreviewPersonas([])
    setScreen('target_select')
  }

  const chips: { mode: SourceMode; label: string }[] = [
    { mode: 'file',      label: '📄 파일 업로드' },
    { mode: 'localhost', label: '⌘ localhost' },
    { mode: 'url',       label: '🔗 URL' },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">

        <div className="text-center mb-10">
          <div className="font-mono text-xs tracking-widest uppercase mb-4 text-blue-500">PersonaLab</div>
          <h1 className="text-3xl font-bold mb-2 text-slate-100">What should I look at?</h1>
          <p className="text-sm text-slate-500">Drop a file, paste a URL, or pick a localhost server.</p>
        </div>

        {error && <Alert className="mb-4">{error}</Alert>}

        {/* Mode chips */}
        <div className="flex gap-2 mb-4">
          {chips.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setSourceMode(mode)}
              className={[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                sourceMode === mode
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* File mode */}
        {sourceMode === 'file' && (
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".tsx,.jsx,.html,.vue,.js,.ts,.zip"
              onChange={e => addFiles(Array.from(e.target.files || []))}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={[
                'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
                dragging ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 hover:border-slate-500',
              ].join(' ')}
            >
              <svg className="mx-auto mb-3 w-8 h-8 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              <p className="text-sm font-medium text-slate-300 mb-1">파일을 드래그하거나 클릭하여 업로드</p>
              <p className="text-xs text-slate-500">.tsx · .jsx · .html · .vue · .js · .ts · .zip</p>
            </div>
            {files.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/50">
                    <span className="font-mono text-xs text-slate-400 truncate">{file.name}</span>
                    <button onClick={() => removeFile(i)} className="text-slate-600 hover:text-slate-300 ml-2 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Localhost mode */}
        {sourceMode === 'localhost' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-slate-400">localhost 포트</label>
            <div className="flex gap-2 items-center">
              <span className="font-mono text-sm text-slate-500 flex-shrink-0">localhost:</span>
              <Input value={sourcePort} onChange={e => setSourcePort(e.target.value)} placeholder="5173" className="w-24 font-mono" />
              <span className="text-xs text-slate-500 flex-shrink-0">/</span>
              <Input value={sourcePath} onChange={e => setSourcePath(e.target.value)} placeholder="(선택) checkout" className="flex-1 font-mono" />
            </div>
            <p className="text-xs mt-2 text-slate-600">공통 포트: 3000 · 3001 · 5173 · 5174 · 8080 · 4200</p>
          </div>
        )}

        {/* URL mode */}
        {sourceMode === 'url' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-slate-400">URL</label>
            <Input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://your-service.com" />
          </div>
        )}

        {/* Task */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1.5 text-slate-400">
            테스트 태스크
            <span className="ml-2 text-xs font-normal text-slate-500">유저가 수행할 목표</span>
          </label>
          <Input value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="예: 회원가입하기 / 상품 장바구니에 담기 / 결제 완료하기" />
        </div>

        <Button onClick={proceed} disabled={!sourceReady}>
          다음 → 페르소나 설정
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/src/components/screens/SourceScreen.tsx
git commit -m "feat(frontend): add SourceScreen"
```

---

### Task 6: TargetSelectScreen

**Files:**
- Create: `frontend/src/components/screens/TargetSelectScreen.tsx`

- [ ] **Step 1: Create `frontend/src/components/screens/TargetSelectScreen.tsx`**

```tsx
import { useApp } from '@/context/AppContext'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { buildCast } from '@/lib/api'

const AGE_GROUPS  = ['10~20대', '30대', '40대', '50대', '60대+']
const SEX_OPTIONS = ['남자', '여자', '모두']
const EDU_OPTIONS = ['고졸이하', '전문대', '대졸', '대학원']
const REGION_OPTIONS = ['수도권', '지방', '모두']

function ChipGroup({ label, required = false, options, value, onChange }: {
  label: string
  required?: boolean
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="mb-5">
      <div className="text-xs font-medium mb-2 text-slate-400">
        {label}{required && <span className="ml-1 text-slate-600">*</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
              value === opt
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200',
            ].join(' ')}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TargetSelectScreen() {
  const {
    selectedAgeGroup, setSelectedAgeGroup,
    selectedSex, setSelectedSex,
    selectedEducation, setSelectedEducation,
    selectedRegion, setSelectedRegion,
    matchedStrata, setMatchedStrata,
    totalCount, setTotalCount,
    previewPersonas, setPreviewPersonas,
    castLoading, setCastLoading,
    error, setError,
    sourceMode, sourcePort, sourcePath, sourceUrl, files,
    setScreen, setLiveThought, setResultSection,
  } = useApp()

  const targetSelectReady = !!(selectedAgeGroup && selectedSex && selectedEducation)

  const sourceLabel =
    sourceMode === 'localhost' ? `localhost:${sourcePort}${sourcePath ? '/' + sourcePath : ''}`
    : sourceMode === 'url'    ? sourceUrl || 'URL'
    :                           `${files.length}개 파일`

  async function fetchBuildCast(age: string, sex: string, edu: string, region: string) {
    if (!age || !sex || !edu) return
    setCastLoading(true)
    setMatchedStrata([])
    setTotalCount(0)
    setPreviewPersonas([])
    try {
      const data = await buildCast({ age_group: age, sex, education: edu, region })
      setMatchedStrata(data.matched_strata ?? [])
      setTotalCount(data.total_count ?? 0)
      setPreviewPersonas(data.preview_personas ?? [])
    } catch {
      setError('매칭 중 오류가 발생했어요.')
    } finally {
      setCastLoading(false)
    }
  }

  // Each chip handler passes the new value directly so state update lag doesn't matter
  function onAge(v: string)    { setSelectedAgeGroup(v);    fetchBuildCast(v,                selectedSex,       selectedEducation, selectedRegion) }
  function onSex(v: string)    { setSelectedSex(v);         fetchBuildCast(selectedAgeGroup, v,                 selectedEducation, selectedRegion) }
  function onEdu(v: string)    { setSelectedEducation(v);   fetchBuildCast(selectedAgeGroup, selectedSex,       v,                 selectedRegion) }
  function onRegion(v: string) { setSelectedRegion(v);      fetchBuildCast(selectedAgeGroup, selectedSex,       selectedEducation, v)              }

  function runAnalysis() {
    if (!targetSelectReady || matchedStrata.length === 0) return
    setError('')
    setLiveThought('')
    setResultSection('tldr')
    setScreen('progress')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">

        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setScreen('source')} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">← 뒤로</button>
          <div className="font-mono text-xs tracking-widest uppercase text-blue-500">PersonaLab</div>
          <div className="text-xs font-mono text-slate-600">{sourceLabel}</div>
        </div>

        <h2 className="text-xl font-semibold mb-1 text-slate-100">타겟 사용자 선택</h2>
        <p className="text-sm mb-8 text-slate-500">Nemotron 100만 명 데이터셋에서 해당 조건 페르소나를 매칭합니다.</p>

        <ChipGroup label="나이대" required options={AGE_GROUPS}     value={selectedAgeGroup}  onChange={onAge} />
        <ChipGroup label="성별"   required options={SEX_OPTIONS}    value={selectedSex}        onChange={onSex} />
        <ChipGroup label="학력"   required options={EDU_OPTIONS}    value={selectedEducation}  onChange={onEdu} />
        <ChipGroup label="지역"            options={REGION_OPTIONS} value={selectedRegion}     onChange={onRegion} />

        {targetSelectReady && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700/50">
            {castLoading ? (
              <div className="text-sm text-slate-500">매칭 중…</div>
            ) : matchedStrata.length > 0 ? (
              <>
                <div className="text-sm font-medium mb-1 text-slate-100">
                  예상 매칭: <span className="text-blue-400">{totalCount.toLocaleString()}</span>명
                </div>
                <div className="text-xs text-slate-500">
                  strata {matchedStrata.length}개 · 대표 {Math.min(matchedStrata.length * 3, 15)}명 시뮬
                </div>
                {previewPersonas.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {previewPersonas.map((p, i) => (
                      <div key={i} className="text-xs text-slate-400">
                        · {p.age}세 {p.occupation} ({p.province})
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-red-400">해당 조건의 페르소나가 없습니다.</div>
            )}
          </div>
        )}

        {error && <Alert className="mb-4">{error}</Alert>}

        <Button onClick={runAnalysis} disabled={!targetSelectReady || matchedStrata.length === 0} className="w-full">
          시뮬레이션 실행 →
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/src/components/screens/TargetSelectScreen.tsx
git commit -m "feat(frontend): add TargetSelectScreen"
```

---

### Task 7: ProgressScreen

**Files:**
- Create: `frontend/src/components/screens/ProgressScreen.tsx`

- [ ] **Step 1: Create `frontend/src/components/screens/ProgressScreen.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { analyze } from '@/lib/api'

const STEPS = [
  { label: '코드 파싱',        icon: '📂' },
  { label: '페르소나 매칭',    icon: '🧬' },
  { label: 'UX 시뮬레이션',   icon: '🔍' },
  { label: '리포트 생성',      icon: '📊' },
]

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export function ProgressScreen() {
  const {
    files, sourceMode, sourcePort, sourcePath, sourceUrl,
    matchedStrata, taskDesc, totalCount,
    setResult, setScreen, setError, setLiveThought, liveThought,
  } = useApp()

  const [statusStep, setStatusStep] = useState(1)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    async function run() {
      setStatusStep(1)
      await sleep(800)
      setStatusStep(2)
      await sleep(600)
      setStatusStep(3)
      setLiveThought(`${totalCount.toLocaleString()}명 규모 페르소나가 앱을 살펴보고 있어요…`)

      const targetUrl =
        sourceMode === 'localhost'
          ? `http://localhost:${sourcePort}${sourcePath ? '/' + sourcePath.replace(/^\//, '') : ''}`
          : sourceMode === 'url' ? sourceUrl : undefined

      try {
        const result = await analyze({
          strataKeys: matchedStrata,
          task: taskDesc.trim() || '서비스 탐색하기',
          files: sourceMode === 'file' ? files : undefined,
          targetUrl,
        })
        setStatusStep(4)
        await sleep(300)
        setLiveThought('')
        setResult(result)
        setScreen('result')
      } catch (err) {
        setLiveThought('')
        setError(
          (err as Error).message === 'backend'
            ? '⚠️ 분석 중 오류가 발생했어요. 파일 형식을 확인하거나 잠시 후 다시 시도해주세요.'
            : '⚠️ 서버에 연결할 수 없어요. 백엔드가 실행 중인지 확인해주세요. (http://localhost:8000)'
        )
        setScreen('source')
      }
    }

    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="font-mono text-xs tracking-widest uppercase mb-12 text-blue-500">PersonaLab</div>

        <div className="flex items-end justify-center mb-10">
          {STEPS.map((step, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs border transition-colors',
                  statusStep > i + 1  ? 'border-blue-500 bg-blue-500/20 text-blue-400' :
                  statusStep === i + 1 ? 'border-blue-400 bg-blue-500/10 text-blue-400 animate-pulse' :
                  'border-slate-700 text-slate-600',
                ].join(' ')}>
                  {statusStep > i + 1 ? '✓' : i + 1}
                </div>
                <div className="text-xs whitespace-nowrap text-slate-600">
                  {step.icon} {step.label}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={[
                  'w-8 h-px mb-5 mx-1',
                  statusStep > i + 1 ? 'bg-blue-500/40' : 'bg-slate-700',
                ].join(' ')} />
              )}
            </div>
          ))}
        </div>

        {liveThought && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-left">
            <div className="font-mono text-xs mb-1 text-blue-400">페르소나 실시간 반응</div>
            <p className="text-xs italic text-slate-400">{liveThought}</p>
          </div>
        )}

        <div className="flex justify-center gap-1.5">
          {[0, 150, 300].map(delay => (
            <div key={delay} className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
              style={{ animationDelay: `${delay}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/src/components/screens/ProgressScreen.tsx
git commit -m "feat(frontend): add ProgressScreen with async analyze flow"
```

---

### Task 8: Result sub-sections

**Files:**
- Create: `frontend/src/components/result/TldrSection.tsx`
- Create: `frontend/src/components/result/IssuesSection.tsx`
- Create: `frontend/src/components/result/FixesSection.tsx`
- Create: `frontend/src/components/result/CodeSection.tsx`

- [ ] **Step 1: Create `frontend/src/components/result/TldrSection.tsx`**

```tsx
import { useApp } from '@/context/AppContext'
import { Badge } from '@/components/ui/badge'

const RISK = {
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)' },
  warning:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  ok:       { color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
}

export function TldrSection() {
  const { result } = useApp()
  if (!result) return null

  const rc = RISK[result.risk_level] ?? RISK.ok

  const firstSentence = (() => {
    const t = result.think_aloud || ''
    const m = t.match(/^[^.!?]+[.!?]/)
    return m ? m[0] : t.slice(0, 80) + (t.length > 80 ? '…' : '')
  })()

  return (
    <div>
      {/* Risk banner */}
      <div className="flex items-center gap-4 px-5 py-4 rounded-xl mb-6"
        style={{ background: rc.bg, border: `1px solid ${rc.border}` }}>
        <div className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: rc.color, boxShadow: `0 0 8px ${rc.color}` }} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base" style={{ color: rc.color }}>{result.risk_label}</div>
          <div className="text-xs mt-0.5 text-slate-500">{result.abandoned ? '이탈 예측됨' : '완료 가능'}</div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {(result.issues_summary?.critical ?? 0) > 0 && <Badge variant="critical">심각 {result.issues_summary.critical}</Badge>}
          {(result.issues_summary?.warning  ?? 0) > 0 && <Badge variant="warning">경고 {result.issues_summary.warning}</Badge>}
          {(result.issues_summary?.info     ?? 0) > 0 && <Badge variant="info">정보 {result.issues_summary.info}</Badge>}
        </div>
      </div>

      {/* Developer bias gap */}
      {result.developer_assumption && (
        <div className="mb-4">
          <div className="font-mono text-xs tracking-wider uppercase mb-2 text-slate-600">개발자 바이어스 갭</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="px-4 py-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
              <div className="text-xs text-slate-500 mb-1">개발자가 예상한 행동</div>
              <p className="text-sm italic text-slate-500">"{result.developer_assumption}"</p>
            </div>
            <div className="px-4 py-3 rounded-xl bg-slate-800/50 border border-blue-500/15">
              <div className="text-xs text-blue-400 mb-1">실제 페르소나 반응</div>
              <p className="text-sm italic text-slate-300">"{firstSentence}"</p>
            </div>
          </div>
        </div>
      )}

      {/* Think-aloud */}
      <div className="px-4 py-4 rounded-xl bg-slate-800/30 border border-slate-700/30 mb-4">
        <div className="font-mono text-xs mb-2 text-blue-400">페르소나 Think-aloud</div>
        <p className="text-sm leading-relaxed italic text-slate-300">{result.think_aloud}</p>
        {result.dropout_point && (
          <p className="mt-2 text-xs text-red-400">이탈 지점: {result.dropout_point}</p>
        )}
      </div>

      {/* Friction map */}
      {(result.friction_map?.length ?? 0) > 0 && (
        <div className="mb-4">
          <div className="font-mono text-xs tracking-wider uppercase mb-3 text-slate-600">
            주요 마찰 지점
            {result.total_simulated > 0 && (
              <span className="ml-2 normal-case text-slate-700">({result.total_simulated}명 시뮬 기준)</span>
            )}
          </div>
          {result.friction_map.slice(0, 8).map((item, i) => {
            const pct   = Math.round(item.rate * 100)
            const color = pct >= 70 ? '#EF4444' : pct >= 40 ? '#F59E0B' : '#60a5fa'
            const bars  = '█'.repeat(Math.round(item.rate * 8))
            return (
              <div key={i} className="mb-2.5">
                <div className="flex justify-between mb-0.5">
                  <span className="text-sm text-slate-300">{i + 1}. {item.element}</span>
                  <span className="text-xs font-mono" style={{ color }}>{item.affected_count}명</span>
                </div>
                <div className="text-xs font-mono" style={{ color, letterSpacing: '-1px' }}>{bars}</div>
              </div>
            )
          })}
          {result.abandonment_rate > 0 && (
            <div className="mt-3 text-sm text-red-400">이탈률: {Math.round(result.abandonment_rate * 100)}%</div>
          )}
        </div>
      )}

      {/* Top issues / Next steps */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-mono uppercase mb-2 text-red-400">Top Issues</div>
          {result.top3.slice(0, 3).map((item, i) => (
            <div key={i} className="flex gap-2 text-sm text-slate-300 mb-2">
              <span className="text-xs font-mono text-slate-600 flex-shrink-0 mt-0.5">{i + 1}.</span>
              <span>{item.reason}</span>
            </div>
          ))}
          {result.top3.length === 0 && <p className="text-sm text-slate-600">감지된 이슈 없음</p>}
        </div>
        <div>
          <div className="text-xs font-mono uppercase mb-2 text-blue-400">Next Steps</div>
          {result.fix_prompts.slice(0, 3).map((prompt, i) => (
            <div key={i} className="flex gap-2 text-sm text-slate-300 mb-2">
              <span className="text-xs font-mono text-slate-600 flex-shrink-0 mt-0.5">{i + 1}.</span>
              <span>{prompt.split('\n')[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/components/result/IssuesSection.tsx`**

```tsx
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'

function sevVariant(sev: number): 'critical' | 'warning' | 'info' {
  return sev > 0.7 ? 'critical' : sev > 0.4 ? 'warning' : 'info'
}

export function IssuesSection() {
  const { result } = useApp()
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  if (!result) return null

  const top3 = result.top3 ?? []
  if (top3.length === 0) return <p className="text-sm text-slate-600">감지된 이슈 없음</p>

  return (
    <div>
      <div className="font-semibold text-base mb-4 text-slate-100">이슈 상세</div>
      <div className="space-y-2">
        {top3.map((item, i) => {
          const variant = sevVariant(item.severity)
          const borderColor = item.severity > 0.7
            ? 'rgba(239,68,68,0.3)'
            : item.severity > 0.4
            ? 'rgba(245,158,11,0.3)'
            : 'rgba(59,130,246,0.3)'
          return (
            <Collapsible key={i} open={openIdx === i} onOpenChange={o => setOpenIdx(o ? i : null)}>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor }}>
                <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left">
                  <div className="flex items-center gap-2 text-sm text-slate-200 min-w-0">
                    <Badge variant={variant} className="flex-shrink-0">
                      {item.severity > 0.7 ? 'HIGH' : item.severity > 0.4 ? 'MED' : 'LOW'}
                    </Badge>
                    <span className="truncate">line {item.line_number ?? '?'} — {item.reason}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-500 ml-2 flex-shrink-0">
                    {Math.round(item.severity * 100)}%
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 py-3 bg-slate-900/50 text-sm text-slate-400 border-t border-slate-700/50">
                    <b className="text-slate-300">근거</b> — {item.evidence}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `frontend/src/components/result/FixesSection.tsx`**

```tsx
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export function FixesSection() {
  const { result } = useApp()
  const [copied, setCopied] = useState(false)
  if (!result) return null

  const text = (result.fix_prompts ?? []).join('\n\n---\n\n')

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-semibold text-base text-slate-100">Vibe Coding Fix Prompts</div>
          <div className="text-xs mt-0.5 text-slate-500">Cursor / v0 / Claude에 붙여넣으세요</div>
        </div>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? '✓ 복사됨' : '복사'}
        </Button>
      </div>
      <Textarea readOnly rows={10} value={text} />
    </div>
  )
}
```

- [ ] **Step 4: Create `frontend/src/components/result/CodeSection.tsx`**

```tsx
import { useApp } from '@/context/AppContext'
import { Badge } from '@/components/ui/badge'

export function CodeSection() {
  const { result } = useApp()
  if (!result) return null

  const source = result.source_code ?? ''
  if (!source) return <p className="text-sm text-slate-600">소스 코드 없음</p>

  const issueMap = new Map(
    (result.top3 ?? []).filter(i => i.line_number).map(i => [i.line_number!, i])
  )

  return (
    <div>
      <div className="font-semibold text-base mb-4 text-slate-100">코드 이슈 · UI 미리보기</div>
      <div className="rounded-xl overflow-hidden border border-slate-700/50">
        <div className="px-4 py-2 font-mono text-xs bg-slate-800 border-b border-slate-700/50 text-slate-500">
          소스 코드 — 이슈 라인 하이라이트
        </div>
        <div className="overflow-auto max-h-96 bg-slate-900">
          <table className="w-full border-collapse text-xs font-mono">
            <tbody>
              {source.split('\n').map((line, i) => {
                const n     = i + 1
                const issue = issueMap.get(n)
                const sev   = issue?.severity ?? 0
                const rowBg = issue
                  ? sev > 0.7 ? '#3d1515' : sev > 0.4 ? '#3d2b0a' : '#1a2d3d'
                  : 'transparent'
                return (
                  <tr key={n} style={{ background: rowBg }}>
                    <td className="text-right px-3 py-0.5 text-slate-600 select-none w-10 align-top">{n}</td>
                    <td className="px-3 py-0.5 text-slate-300 whitespace-pre align-top">{line}</td>
                    <td className="px-2 py-0.5 align-top">
                      {issue && (
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Badge variant={sev > 0.7 ? 'critical' : sev > 0.4 ? 'warning' : 'info'}>
                            {sev > 0.7 ? 'HIGH' : sev > 0.4 ? 'MED' : 'LOW'}
                          </Badge>
                          <span className="text-slate-400">{issue.reason}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {result.preview_html && (
        <div className="rounded-xl overflow-hidden mt-4 border border-slate-700/50">
          <div className="px-4 py-2 font-mono text-xs bg-slate-800 border-b border-slate-700/50 text-slate-500">
            UI 미리보기 (375px 기준)
          </div>
          <iframe
            srcDoc={result.preview_html}
            className="w-full border-none block bg-white"
            style={{ height: 520 }}
            title="UI Preview"
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
cd ..
git add frontend/src/components/result/
git commit -m "feat(frontend): add result sub-sections (TldrSection, IssuesSection, FixesSection, CodeSection)"
```

---

### Task 9: ResultScreen

**Files:**
- Create: `frontend/src/components/screens/ResultScreen.tsx`

- [ ] **Step 1: Create `frontend/src/components/screens/ResultScreen.tsx`**

```tsx
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Button } from '@/components/ui/button'
import { TldrSection } from '@/components/result/TldrSection'
import { IssuesSection } from '@/components/result/IssuesSection'
import { FixesSection } from '@/components/result/FixesSection'
import { CodeSection } from '@/components/result/CodeSection'
import type { ResultSection } from '@/types'

const NAV: { value: ResultSection; icon: string; label: string }[] = [
  { value: 'tldr',   icon: '📋', label: 'TL;DR' },
  { value: 'issues', icon: '⚠️', label: 'Issues' },
  { value: 'fixes',  icon: '🔧', label: 'Fixes' },
  { value: 'code',   icon: '💻', label: 'Code' },
]

export function ResultScreen() {
  const { result, reset, resultSection, setResultSection } = useApp()
  const [copied, setCopied] = useState(false)

  async function copyAll() {
    const text = (result?.fix_prompts ?? []).join('\n\n---\n\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-44 flex-shrink-0 border-r border-slate-800 flex flex-col items-start py-6 px-3 gap-1">
        <div
          className="font-mono text-xs text-blue-500 mb-6 self-center"
          style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', letterSpacing: '0.1em' }}
        >
          PersonaLab
        </div>
        {NAV.map(tab => (
          <button
            key={tab.value}
            onClick={() => setResultSection(tab.value)}
            className={[
              'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              resultSection === tab.value
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50',
            ].join(' ')}
          >
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* Main */}
      <div className="flex-1 overflow-auto px-8 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <button onClick={reset} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
            ← 새 분석
          </button>
          <Button variant="outline" size="sm" onClick={copyAll}>
            {copied ? '✓ 복사됨' : '⤓ Export'}
          </Button>
        </div>

        {resultSection === 'tldr'   && <TldrSection />}
        {resultSection === 'issues' && <IssuesSection />}
        {resultSection === 'fixes'  && <FixesSection />}
        {resultSection === 'code'   && <CodeSection />}

        <Button variant="ghost" className="w-full mt-8" onClick={reset}>
          새로운 분석 시작
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/src/components/screens/ResultScreen.tsx
git commit -m "feat(frontend): add ResultScreen with sidebar navigation"
```

---

### Task 10: App.tsx + main.tsx

**Files:**
- Create: `frontend/src/App.tsx`
- Replace: `frontend/src/main.tsx`

- [ ] **Step 1: Create `frontend/src/App.tsx`**

```tsx
import { useApp } from '@/context/AppContext'
import { SourceScreen }       from '@/components/screens/SourceScreen'
import { TargetSelectScreen } from '@/components/screens/TargetSelectScreen'
import { ProgressScreen }     from '@/components/screens/ProgressScreen'
import { ResultScreen }       from '@/components/screens/ResultScreen'

export function App() {
  const { screen } = useApp()
  return (
    <>
      {screen === 'source'        && <SourceScreen />}
      {screen === 'target_select' && <TargetSelectScreen />}
      {screen === 'progress'      && <ProgressScreen />}
      {screen === 'result'        && <ResultScreen />}
    </>
  )
}
```

- [ ] **Step 2: Replace `frontend/src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProvider } from '@/context/AppContext'
import { App } from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
)
```

- [ ] **Step 3: Full type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Dev smoke test**

```bash
cd frontend && npm run dev
```

Walk through all 4 screens manually:
- SourceScreen: chips switch modes, file upload works, disabled button until source ready
- TargetSelectScreen: chips select, back button returns to source
- ProgressScreen: steps advance (needs backend running for full flow)
- ResultScreen: sidebar tabs switch sections

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/App.tsx frontend/src/main.tsx
git commit -m "feat(frontend): wire App.tsx screen router and AppProvider in main.tsx"
```

---

### Task 11: Update FastAPI static path

**Files:**
- Modify: `src/backend/api.py:160`

- [ ] **Step 1: Update static files mount**

In `src/backend/api.py`, change line 160:

```python
# Before
app.mount("/", StaticFiles(directory="src/frontend", html=True), name="frontend")

# After
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
```

- [ ] **Step 2: Commit**

```bash
git add src/backend/api.py
git commit -m "feat(api): serve frontend from frontend/dist"
```

---

### Task 12: Build, verify, cleanup

**Files:**
- Delete: `src/frontend/index.html`, `app.js`, `style.css`, `ui.py`

- [ ] **Step 1: Production build**

```bash
cd frontend && npm run build
```

Expected output (no errors):
```
✓ built in Xs
dist/index.html
dist/assets/index-[hash].js
dist/assets/index-[hash].css
```

- [ ] **Step 2: Verify FastAPI serves the built frontend**

```bash
cd ..
uvicorn src.backend.api:app --reload --port 8000
```

Open http://localhost:8000. Verify:
- Dark background, blue "PersonaLab" monospace label
- No 404 errors in browser console for JS/CSS assets

- [ ] **Step 3: Full golden path test**

With backend running, upload a `.html` test file:
1. Select file → "다음" button enables
2. Select age + sex + education → matching count appears
3. "시뮬레이션 실행" → ProgressScreen steps advance → ResultScreen loads
4. Switch TL;DR / Issues / Fixes / Code tabs
5. Export button copies prompts to clipboard
6. "새 분석" resets to SourceScreen

- [ ] **Step 4: Delete legacy frontend files**

```powershell
Remove-Item src/frontend/index.html, src/frontend/app.js, src/frontend/style.css, src/frontend/ui.py
```

- [ ] **Step 5: Final commit**

```bash
git add src/frontend/ frontend/
git commit -m "feat: complete React migration — remove legacy Alpine.js frontend"
```
